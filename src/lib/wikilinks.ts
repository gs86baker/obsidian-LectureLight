// Minimal subset of the Obsidian App API needed for wikilink resolution.
// The real Obsidian App satisfies this interface structurally.
export interface VaultResolver {
	metadataCache: {
		getFirstLinkpathDest(linkpath: string, sourcePath: string): { path: string } | null;
	};
	vault: {
		getResourcePath(file: { path: string }): string;
	};
}

/**
 * Converts Obsidian wikilink image syntax (![[file.png]]) to standard markdown
 * image syntax (![alt](vault-uri)) using the Obsidian vault API to resolve paths.
 *
 * Wikilinks that cannot be resolved (file not found in vault) are replaced with
 * an empty src so the parser can still extract media metadata.
 */
export function resolveWikilinks(markdown: string, app: VaultResolver): string {
	const wikilinkRegex = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;
	return markdown.replace(wikilinkRegex, (_match, filename: string, altText?: string) => {
		const name = filename.trim();
		const file = app.metadataCache.getFirstLinkpathDest(name, '');
		const alt = altText ?? name;
		if (!file) {
			return `![${alt}]()`;
		}
		const src = app.vault.getResourcePath(file);
		return `![${alt}](${src})`;
	});
}
