# pixi-effekseer

Render [Effekseer](https://effekseer.github.io/) (`.efk`) particle effects **inside** a pixi v8 +
pixi-svelte render — composited at a real scene-graph position (single pass, no texture copy), on both
the WebGPU (desktop) and WebGL2 (mobile) backends.

## Usage

```svelte
<script>
	import { EfkPixi } from 'pixi-effekseer';
	import effectUrl from './assets/my-effect.efk?url';
	import textureUrl from './assets/particle.png?url';
</script>

<Container>
	<!-- a child of the container it should sit behind/in-front-of -->
	<EfkPixi {effectUrl} {textureUrl} zIndex={-100} />
	<!-- … board / characters / hud … -->
</Container>
```

### Props

| Prop         | Type                        | Default       | Notes                                                            |
| ------------ | --------------------------- | ------------- | ---------------------------------------------------------------- |
| `effectUrl`  | `string` (required)         | —             | Pass a vite `?url` import so the `.efk` ships with the bundle.   |
| `textureUrl` | `string`                    | —             | Every `.png` the effect references is redirected to it.          |
| `position`   | `{x,y,z}`                   | `{0,0,0}`     | World position fed to `play()`.                                  |
| `zIndex`     | `number`                    | `-100`        | zIndex of the render node within its parent container.           |

## Requirements / constraints

- **pixi antialias must be OFF.** Effekseer's `drawToRenderPass` cannot draw into pixi's MSAA(4) pass; the
  main render pass must be sampleCount 1.
- **Glue is consumed as a module, never `<script src>`.** The vendored emscripten glue
  (`effekseer-runtime/effekseer-web{gl,gpu}.js`) is ESM (`export default <factory>`) and passed to the
  runtime as `moduleFactory`. This is mandatory under the stake build (`assetsInlineLimit: Infinity` →
  assets become `data:` URIs) + CSP (`script-src` forbids `data:` scripts). `.wasm` stays a `?url` data
  URI, loaded by `fetch()`.

The runtime is **EffekseerForWeb 0.1.0**, vendored under `src/lib/effekseer-runtime/`.
