// vite `?url` asset imports (no `vite/client` ambient types in this package) — the import resolves to the
// asset's deployed URL string at build time.
declare module '*?url' {
	const url: string;
	export default url;
}
