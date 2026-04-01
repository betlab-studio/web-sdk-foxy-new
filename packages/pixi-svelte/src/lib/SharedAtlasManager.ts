import {
	AtlasAttachmentLoader,
	SkeletonJson,
	SpineTexture,
	TextureAtlas,
	type TextureRegion,
	type SkeletonData,
} from '@esotericsoftware/spine-pixi-v8';
import { Assets } from 'pixi.js';

export interface SequenceMapping {
	/** Source base name in shared atlas (e.g., "band_light_") */
	sourceBaseName: string;
	/** Target base name expected by skeleton (e.g., "one_pixel") */
	targetBaseName: string;
	/** Number of frames in sequence */
	frameCount: number;
	/** Start index (default: 0) */
	startIndex?: number;
	/** Number of digits for padding (default: auto) */
	digits?: number;
}

export interface RegionMapping {
	/** Source region name in shared atlas */
	sourceName: string;
	/** Target region name expected by skeleton (defaults to sourceName if not provided) */
	targetName?: string;
}

export interface SharedAtlasConfig {
	atlasPath: string;
	imagePath: string;
	sequences?: SequenceMapping[];
	/** Individual region mappings (for non-sequence assets like individual numbers) */
	regions?: RegionMapping[];
}

export interface LoadSkeletonOptions {
	atlasPath: string;
	imagePath: string;
	skeletonPath: string;
	injectSequences?: string[];
	/** Individual region names to inject */
	injectRegions?: string[];
	scale?: number;
}

export class SharedAtlasManager {
	private sharedAtlases: Map<string, TextureAtlas> = new Map();
	private sequenceMappings: Map<string, SequenceMapping> = new Map();
	private regionMappings: Map<string, RegionMapping> = new Map();
	private configs: Map<string, SharedAtlasConfig> = new Map();
	private initialized = false;

	private async loadAtlas(atlasPath: string, imagePath: string): Promise<TextureAtlas> {
		const response = await fetch(atlasPath);
		if (!response.ok) {
			throw new Error(`Failed to fetch atlas: ${atlasPath} (${response.status})`);
		}
		const atlasText = await response.text();

		const texture = await Assets.load(imagePath);

		const atlas = new TextureAtlas(atlasText);

		for (const page of atlas.pages) {
			page.setTexture(SpineTexture.from(texture.source));
		}

		return atlas;
	}

	private formatFrameName(baseName: string, index: number, digits?: number): string {
		if (digits && digits > 1) {
			return `${baseName}${index.toString().padStart(digits, '0')}`;
		}
		return `${baseName}${index}`;
	}

	async registerSharedAtlas(name: string, config: SharedAtlasConfig): Promise<void> {
		if (this.sharedAtlases.has(name)) {
			return;
		}

		const atlas = await this.loadAtlas(config.atlasPath, config.imagePath);
		this.sharedAtlases.set(name, atlas);
		this.configs.set(name, config);

		if (config.sequences) {
			for (const sequence of config.sequences) {
				this.sequenceMappings.set(sequence.targetBaseName, {
					...sequence,
					startIndex: sequence.startIndex ?? 0,
				});
			}
		}

		if (config.regions) {
			for (const region of config.regions) {
				const targetName = region.targetName ?? region.sourceName;
				this.regionMappings.set(targetName, region);
			}
		}
	}

	private findAtlasForSequence(
		targetBaseName: string,
	): { atlas: TextureAtlas; mapping: SequenceMapping } | null {
		const mapping = this.sequenceMappings.get(targetBaseName);
		if (!mapping) return null;

		for (const [name, config] of this.configs.entries()) {
			const hasSequence = config.sequences?.some((s) => s.targetBaseName === targetBaseName);
			if (hasSequence) {
				const atlas = this.sharedAtlases.get(name);
				if (atlas) {
					return { atlas, mapping };
				}
			}
		}

		return null;
	}

	private findAtlasForRegion(
		targetName: string,
	): { atlas: TextureAtlas; mapping: RegionMapping } | null {
		const mapping = this.regionMappings.get(targetName);
		if (!mapping) return null;

		for (const [name, config] of this.configs.entries()) {
			const hasRegion = config.regions?.some(
				(r) => (r.targetName ?? r.sourceName) === targetName,
			);
			if (hasRegion) {
				const atlas = this.sharedAtlases.get(name);
				if (atlas) {
					return { atlas, mapping };
				}
			}
		}

		return null;
	}

	injectRegion(targetAtlas: TextureAtlas, targetName: string): boolean {
		const found = this.findAtlasForRegion(targetName);
		if (!found) {
			console.warn(`[SharedAtlasManager] Region "${targetName}" not found in mappings`);
			return false;
		}

		const { atlas: sourceAtlas, mapping } = found;
		const sourceRegion = sourceAtlas.findRegion(mapping.sourceName);

		if (!sourceRegion) {
			console.warn(
				`[SharedAtlasManager] Source region "${mapping.sourceName}" not found in atlas`,
			);
			return false;
		}

		const newRegion = Object.create(Object.getPrototypeOf(sourceRegion)) as TextureRegion;
		Object.assign(newRegion, sourceRegion);
		newRegion.name = targetName;

		targetAtlas.regions.push(newRegion);
		return true;
	}

	injectRegionsIntoAtlas(atlas: TextureAtlas, regionNames: string[]): number {
		let injectedCount = 0;
		for (const regionName of regionNames) {
			if (this.injectRegion(atlas, regionName)) {
				injectedCount++;
			}
		}
		return injectedCount;
	}

	injectSequence(targetAtlas: TextureAtlas, targetBaseName: string): number {
		const found = this.findAtlasForSequence(targetBaseName);
		if (!found) {
			console.warn(`[SharedAtlasManager] Sequence "${targetBaseName}" not found in mappings`);
			return 0;
		}

		const { atlas: sourceAtlas, mapping } = found;

		const startIndex = mapping.startIndex ?? 0;
		let injectedCount = 0;

		for (let i = 0; i < mapping.frameCount; i++) {
			const frameIndex = startIndex + i;
			const sourceRegionName = this.formatFrameName(
				mapping.sourceBaseName,
				frameIndex,
				mapping.digits,
			);
			const targetRegionName = this.formatFrameName(
				mapping.targetBaseName,
				frameIndex,
				mapping.digits,
			);

			const sourceRegion = sourceAtlas.findRegion(sourceRegionName);
			if (sourceRegion) {
				const newRegion = Object.create(Object.getPrototypeOf(sourceRegion)) as TextureRegion;
				Object.assign(newRegion, sourceRegion);
				newRegion.name = targetRegionName;

				targetAtlas.regions.push(newRegion);
				injectedCount++;
			}
		}

		return injectedCount;
	}

	injectSequencesIntoAtlas(atlas: TextureAtlas, sequenceNames: string[]): void {
		for (const sequenceName of sequenceNames) {
			this.injectSequence(atlas, sequenceName);
		}
	}

	async loadSpine(options: LoadSkeletonOptions): Promise<SkeletonData> {
		const skeletonAtlas = await this.loadAtlas(options.atlasPath, options.imagePath);

		if (options.injectSequences) {
			for (const sequenceName of options.injectSequences) {
				this.injectSequence(skeletonAtlas, sequenceName);
			}
		}

		if (options.injectRegions) {
			this.injectRegionsIntoAtlas(skeletonAtlas, options.injectRegions);
		}

		const skeletonJson = await fetch(options.skeletonPath).then((r) => r.json());
		const attachmentLoader = new AtlasAttachmentLoader(skeletonAtlas);
		const jsonParser = new SkeletonJson(attachmentLoader);

		if (options.scale) {
			jsonParser.scale = options.scale;
		}

		return jsonParser.readSkeletonData(skeletonJson);
	}

	getAvailableSequences(): string[] {
		return Array.from(this.sequenceMappings.keys());
	}

	hasSequence(targetBaseName: string): boolean {
		return this.sequenceMappings.has(targetBaseName);
	}

	hasRegion(targetName: string): boolean {
		return this.regionMappings.has(targetName);
	}

	getAvailableRegions(): string[] {
		return Array.from(this.regionMappings.keys());
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	setInitialized(): void {
		this.initialized = true;
	}

	dispose(): void {
		for (const atlas of this.sharedAtlases.values()) {
			atlas.dispose();
		}
		this.sharedAtlases.clear();
		this.sequenceMappings.clear();
		this.regionMappings.clear();
		this.configs.clear();
		this.initialized = false;
	}
}
