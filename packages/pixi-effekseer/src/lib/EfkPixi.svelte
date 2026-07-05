<script lang="ts">
	// Render an Effekseer (.efk) effect INSIDE the pixi v8 render, composited at this component's
	// scene-graph position (true z-order, single pass, no texture copy). Mount it as a child of the
	// container it should sit behind/in-front-of; it adds a RenderContainer node (zIndex prop) and draws
	// the effect using pixi's OWN GPU context. The hard part — done here — is restoring pixi's state after
	// the foreign draw so pixi's own draws after it render correctly.
	//
	// Runs on BOTH pixi backends (auto-detected): WebGPU (desktop) + WebGL2 (mobile).
	//
	// WEBGPU: runtime EffekseerForWeb 0.1.0 (webgpu), shares renderer.gpu.device.
	//  - createContext gets an OffscreenCanvas + its webgpu context so the runtime does NOT make a native
	//    canvas surface (usesNativeWebGPUCanvasSurface returns false → InitWebGPU(...,0); else it hunts
	//    #canvas = null → "getContext of null" crash). The offscreen is never presented.
	//  - formats MUST match pixi's pass: color bgra8unorm + depth depth24plus-stencil8.
	//  - drawToRenderPass(pass) draws into pixi's ACTIVE pass. CRITICAL: it leaves the pass in a state that
	//    makes the FIRST pixi draws after it render invisibly (valid draws, no error, self-healing later).
	//    Fix = ISOLATE the foreign draw: finishRenderPass() (end effekseer's pass) THEN restoreRenderPass()
	//    (begin a fresh pixi pass, loadOp=load → pixels preserved + viewport/pipeline/buffers/bindgroups
	//    re-established). restoreRenderPass() REQUIRES the pass ended first.
	//  - Requires the main pass to be sampleCount 1 → consumers must run pixi with antialias OFF
	//    (effekseer can't draw into an MSAA(4) pass).
	//
	// WEBGL: runtime EffekseerForWeb 0.1.0 (webgl), shares renderer.gl (WebGL2).
	//  - createContext({backend:'webgl', graphicsContext: gl}); draw via ctx.draw().
	//  - setRestorationOfStatesFlag(true) → effekseer restores the GL state IT changed.
	//  - we also save+restore the bound FBO + viewport + VAO and resetState pixi's per-system caches.
	//
	// ── Loading under the stake build (READ before touching the imports) ───────────────────────────────
	// The consuming app builds with `assetsInlineLimit: Infinity` (packages/config-vite): stake serves only
	// index.html + the JS bundle, NOT separate asset files, so every `?url` asset becomes a `data:` URI.
	//  - The emscripten GLUE must be a MODULE, never a `<script src>`: as an asset it'd be a `data:` URI and
	//    the runtime's loadScript() would inject `<script src="data:…">`, which stake CSP
	//    (`script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`, no `data:`) BLOCKS. So the glue files are
	//    ESM (`export default <factory>`) and dynamic-imported here → bundled as JS chunks → handed to
	//    initRuntime as `moduleFactory` (the runtime then skips its scriptPath/<script> path entirely).
	//  - .wasm stays `?url` → data: URI, loaded by emscripten via fetch (fetch supports data:). The effect
	//    (.efk) + texture URLs come from props (the consumer passes vite `?url` imports → also data: URIs,
	//    loaded by fetch). The main effekseer.js ESM is dynamic-imported (a JS chunk too). All SSR-safe.
	import { onMount, onDestroy } from 'svelte';
	import { RenderContainer, getContextApp, getContextParent } from 'pixi-svelte';

	import efkWebgpuWasmUrl from './effekseer-runtime/effekseer-webgpu.wasm?url';
	import efkWebglWasmUrl from './effekseer-runtime/effekseer-webgl.wasm?url';

	type Vec3 = { x: number; y: number; z: number };
	type Props = {
		/** URL of the .efk effect (pass a vite `?url` import so it ships with the bundle). */
		effectUrl: string;
		/** Optional texture URL; every .png the effect references is redirected to it. */
		textureUrl?: string;
		/** World position fed to play()/loop. */
		position?: Vec3;
		/** zIndex of the render node within its parent container. */
		zIndex?: number;
		/**
		 * Milliseconds to wait after an effect instance FINISHES before auto-replaying it. Called once
		 * per replay so it can return a fresh (e.g. random) value each cycle. `0` (default) = replay
		 * immediately = continuous loop. Only applies to effects that actually end (one-shot bursts).
		 */
		replayDelayMs?: () => number;
		/** Camera field-of-view in degrees. SMALLER = zoomed in = effect appears BIGGER. Default 30. */
		fov?: number;
		/** Camera eye position. eye.z = distance (smaller = closer = bigger); eye.x/y pan the view. Default {0,0,30}. */
		eye?: Vec3;
		/** Camera look-at target. Default {0,0,0}. */
		target?: Vec3;
		/**
		 * When false, the effect is PAUSED: its render/update is skipped (zero cost) but the context stays
		 * ALIVE. Toggle this instead of mounting/unmounting to avoid the expensive re-init (runtime + context
		 * + loadEffect, incl. a ticker stop on WebGL) that causes a freeze at scene transitions. Default true.
		 */
		visible?: boolean;
	};
	const {
		effectUrl,
		textureUrl,
		position = { x: 0, y: 0, z: 0 },
		zIndex = -100,
		replayDelayMs,
		fov = 30,
		eye = { x: 0, y: 0, z: 30 },
		target = { x: 0, y: 0, z: 0 },
		visible = true,
	}: Props = $props();

	const COLOR_FORMAT = 'bgra8unorm'; // pixi v8 webgpu canvas format
	const DEPTH_FORMAT = 'depth24plus-stencil8'; // pixi v8 depth-stencil format

	const app = getContextApp();
	const parent = getContextParent();

	let backend: 'webgpu' | 'webgl' | null = null;
	let gl: WebGL2RenderingContext | null = null; // webgl backend only
	let efkContext: any = null;
	let effect: any = null;
	let handle: any = null;
	let lastTs = 0;
	let destroyed = false;
	// When the current instance ends, the timestamp at which to replay (null = not yet scheduled).
	let pendingReplayAt: number | null = null;

	const advance = () => {
		const now = performance.now();
		let dt = ((now - lastTs) / 1000) * 60;
		lastTs = now;
		if (dt > 4) dt = 4; // clamp
		efkContext.update(dt);
	};

	const setCamera = (aspect: number) => {
		efkContext.setProjectionPerspective(fov, aspect, 1, 1000);
		efkContext.setCameraLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, 0, 1, 0);
	};

	// The custom-render node. Created synchronously so addToParent() (which registers its mount/cleanup
	// during component init) wires it into the scene graph at this mount position. The render fn guards
	// on efkContext until the async init below finishes.
	const node: any = new RenderContainer({
		render: (renderer: any) => {
			if (!efkContext || destroyed || !visible) return;

			if (backend === 'webgpu') {
				const pass = renderer.encoder?.renderPassEncoder;
				if (!pass) return;

				advance();
				setCamera(renderer.width / renderer.height);

				efkContext.drawToRenderPass(pass, { colorFormat: COLOR_FORMAT, depthFormat: DEPTH_FORMAT });

				// Isolate the foreign draw so the following pixi draws render correctly: end effekseer's pass,
				// then begin a fresh pixi pass (loadOp=load preserves pixels) + full state restore. See
				// header. finishRenderPass MUST come before restoreRenderPass.
				renderer.encoder.finishRenderPass?.();
				renderer.encoder.restoreRenderPass?.();
			} else if (backend === 'webgl' && gl) {
				advance();
				setCamera(renderer.width / renderer.height);

				// pixi's batcher (GlBatchAdaptor) binds its shader PROGRAM + geometry VAO once in start(),
				// then issues many draw() calls that re-bind ONLY blend + textures per execute — NOT the
				// program or VAO. Two things must therefore happen after the foreign draw:
				//  (a) pixi's cached GL state must be invalidated so the NEXT batch start() fully re-binds
				//      (effekseer disturbs more than we can hand-restore) → renderer.*.resetState().
				//  (b) the batch that was ALREADY mid-flight when our node ran keeps issuing execute()s that
				//      DON'T re-call start() → its program + VAO must be the exact ones bound before us, or
				//      those draws fail ("no valid shader program" / "Must have element array buffer bound").
				const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
				const prevVp = gl.getParameter(gl.VIEWPORT) as Int32Array;
				const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);

				// Bind null so effekseer (no VAO of its own) sets ELEMENT_ARRAY_BUFFER on the default VAO (0)
				// instead of corrupting pixi's currently-bound VAO's index binding.
				gl.bindVertexArray(null);

				efkContext.draw();

				gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
				gl.viewport(prevVp[0], prevVp[1], prevVp[2], prevVp[3]);
				gl.disable(gl.SCISSOR_TEST);

				// Invalidate pixi's cached GL state so the NEXT batch start() re-binds everything (effekseer
				// disturbs more than we hand-restore; effekseer itself restores the shader program correctly,
				// so we must NOT override it). resetState() (whole renderer) is avoided — it nulls the active
				// renderTarget → "reading 'uid'".
				renderer.geometry?.resetState?.();
				renderer.shader?.resetState?.();
				renderer.state?.resetState?.();
				renderer.texture?.resetState?.();
				renderer.buffer?.resetState?.();
				renderer.stencil?.resetState?.();

				// geometry.resetState() above unbound the VAO; re-bind the one that was active so the batch
				// that is mid-flight (its remaining execute()s don't re-call start()) keeps a valid index
				// buffer.
				gl.bindVertexArray(prevVao);
			}

			// loop the effect, optionally with a caller-controlled delay between plays (replayDelayMs).
			if (handle && !handle.exists) {
				if (pendingReplayAt === null) pendingReplayAt = performance.now() + (replayDelayMs?.() ?? 0);
				if (performance.now() >= pendingReplayAt) {
					handle = efkContext.play(effect, position.x, position.y, position.z);
					pendingReplayAt = null;
				}
			}
		},
		// large bounds so pixi never culls the node
		addBounds: (b: any) => b.addFrame(-1e5, -1e5, 1e5, 1e5),
	});
	node.zIndex = zIndex;
	node.cullable = false;
	parent.addToParent(node);

	onMount(async () => {
		const pixi: any = app.stateApp.pixiApplication;
		const renderer: any = pixi?.renderer;
		if (!renderer) return;

		const device = renderer.gpu?.device;
		const glCtx: WebGL2RenderingContext | null = renderer.gl ?? null;
		if (device) backend = 'webgpu';
		else if (glCtx) backend = 'webgl';
		else {
			console.warn('[EfkPixi] no WebGPU device nor WebGL context on the renderer — skipping');
			return;
		}

		try {
			const efk: any = await import('./effekseer-runtime/effekseer.js');

			// The emscripten factory, imported as a module (lib), passed as moduleFactory → the runtime skips
			// its loadScript()/<script src> path entirely. Only the backend in use is fetched (code-split).
			const glueFactory = (
				backend === 'webgpu'
					? await import('./effekseer-runtime/effekseer-webgpu.js')
					: await import('./effekseer-runtime/effekseer-webgl.js')
			).default;
			if (destroyed) return;

			let ctx: any;
			if (backend === 'webgpu') {
				await efk.initRuntime({
					backend: 'webgpu',
					device,
					moduleFactory: glueFactory,
					wasmPath: efkWebgpuWasmUrl,
				});
				if (destroyed) return;

				const w = Math.max(1, Math.floor(renderer.width));
				const h = Math.max(1, Math.floor(renderer.height));
				const offscreen = new OffscreenCanvas(w, h);
				const offscreenCtx: any = offscreen.getContext('webgpu');
				if (!offscreenCtx) throw new Error('OffscreenCanvas webgpu context unavailable');

				ctx = await efk.createContext({
					backend: 'webgpu',
					device,
					canvas: offscreen,
					canvasContext: offscreenCtx,
					colorFormat: COLOR_FORMAT,
					depthFormat: DEPTH_FORMAT,
					width: w,
					height: h,
				});
			} else {
				gl = glCtx;
				await efk.initRuntime({
					backend: 'webgl',
					moduleFactory: glueFactory,
					wasmPath: efkWebglWasmUrl,
				});
				if (destroyed) return;

				// createContext runs effekseer's InitWebGL (synchronous GL) which binds its index buffer
				// onto whatever VAO is active → corrupts pixi's batch VAO's element binding (one burst of
				// "Must have element array buffer bound" warnings until pixi recreates that VAO). It uses the
				// already-loaded runtime (no network), so guard it tightly: stop pixi's ticker (no frame can
				// render with the transient GL state), bind null so InitWebGL lands on the default VAO (pixi's
				// VAOs stay intact), then resetState so pixi re-binds its (intact) VAO on the next frame.
				pixi?.ticker?.stop();
				try {
					gl.bindVertexArray(null);
					ctx = await efk.createContext({ backend: 'webgl', graphicsContext: gl });
					// Let effekseer restore the GL state it mutates (we also restore FBO/viewport + resetState).
					ctx.setRestorationOfStatesFlag?.(true);
				} finally {
					gl.bindVertexArray(null);
					gl.disable(gl.SCISSOR_TEST);
					// createContext (InitWebGL) disturbs MORE than the VAO — it touches texture bindings,
					// program, blend, etc. Invalidate ALL of pixi's cached GL state (same set as the per-frame
					// restore, NOT the whole-renderer resetState which nulls the active render target) so the
					// next batch fully re-binds. Without texture.resetState() here, the FIRST sprites drawn after
					// this init (e.g. a loading-screen sprite that appears the same moment) keep a STALE texture
					// binding and render as a solid rect on WebGL (mobile) — WebGPU is unaffected.
					renderer.geometry?.resetState?.();
					renderer.shader?.resetState?.();
					renderer.state?.resetState?.();
					renderer.texture?.resetState?.();
					renderer.buffer?.resetState?.();
					renderer.stencil?.resetState?.();
					pixi?.ticker?.start();
				}
			}
			if (destroyed) return;

			const buf = await (await fetch(effectUrl)).arrayBuffer();
			effect = await ctx.loadEffect(buf, {
				redirect: (url: string) =>
					textureUrl && url.toLowerCase().endsWith('.png') ? textureUrl : url,
			});
			if (destroyed) return;

			efkContext = ctx;
			handle = ctx.play(effect, position.x, position.y, position.z);
			lastTs = performance.now();
		} catch (e) {
			console.error('[EfkPixi] init failed:', e);
		}
	});

	onDestroy(() => {
		destroyed = true;
		try {
			efkContext?.stopAll?.();
			efkContext?.release?.();
		} catch {}
		efkContext = null;
	});
</script>
