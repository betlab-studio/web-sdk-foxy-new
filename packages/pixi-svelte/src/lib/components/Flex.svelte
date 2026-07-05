<script lang="ts" module>
	import * as PIXI from 'pixi.js';
	import type { Snippet } from 'svelte';

	// Yoga-flexbox layout object (see @pixi/layout). Typed loosely: @pixi/layout augments
	// PIXI.ContainerOptions with `layout` at runtime, but the augmented keys aren't always
	// visible to consumers, so we accept a permissive record here.
	export type FlexLayout = Record<string, unknown>;

	export type Props = Omit<PIXI.ContainerOptions, 'children' | 'layout'> & {
		/** Full Yoga layout object — merged over the flex-column defaults. */
		layout?: FlexLayout;
		children: Snippet;
	};
</script>

<script lang="ts">
	import { propsSyncEffect } from '../utils.svelte';
	import { getContextParent, createContextParent } from '../context.svelte';

	const props: Props = $props();
	const parentContext = getContextParent();
	const container = new PIXI.Container();

	// Default = vertical flex column. Caller `layout` overrides/extends (direction, gap,
	// justifyContent, alignItems, width, height, padding, ...). Reactive so a changing box
	// (per-card size, responsive) re-lays out.
	$effect(() => {
		// @ts-ignore — `layout` is added to Container by @pixi/layout's runtime mixin.
		container.layout = {
			display: 'flex',
			flexDirection: 'column',
			...(props.layout ?? {}),
		};
	});

	// Sync all other container props (x/y/alpha/scale/...) except children + layout.
	propsSyncEffect({ props, target: container, ignore: ['children', 'layout'] });
	parentContext.addToParent(container);
	createContextParent(container);
</script>

{@render props.children()}
