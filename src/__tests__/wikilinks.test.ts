import { describe, it, expect } from 'vitest';
import { resolveWikilinks, VaultResolver } from '../lib/wikilinks';

// ---------------------------------------------------------------------------
// Mock app factory
// ---------------------------------------------------------------------------

function makeApp(resolvedFiles: Record<string, string>): VaultResolver {
	return {
		metadataCache: {
			getFirstLinkpathDest(linkpath: string) {
				const path = resolvedFiles[linkpath];
				return path ? { path } : null;
			},
		},
		vault: {
			getResourcePath(file: { path: string }) {
				return `app://vault/${file.path}`;
			},
		},
	};
}

// ---------------------------------------------------------------------------
// resolveWikilinks
// ---------------------------------------------------------------------------

describe('resolveWikilinks', () => {
	it('returns markdown unchanged when no wikilinks are present', () => {
		const app = makeApp({});
		const input = '# Hello\n![alt](normal-image.png)';
		expect(resolveWikilinks(input, app)).toBe(input);
	});

	it('replaces a resolved wikilink with a vault URI', () => {
		const app = makeApp({ 'photo.png': 'assets/photo.png' });
		const result = resolveWikilinks('![[photo.png]]', app);
		expect(result).toBe('![photo.png](app://vault/assets/photo.png)');
	});

	it('uses the pipe alias as alt text when provided', () => {
		const app = makeApp({ 'photo.png': 'assets/photo.png' });
		const result = resolveWikilinks('![[photo.png|My Photo]]', app);
		expect(result).toBe('![My Photo](app://vault/assets/photo.png)');
	});

	it('replaces an unresolved wikilink with an empty src', () => {
		const app = makeApp({});
		const result = resolveWikilinks('![[missing.png]]', app);
		expect(result).toBe('![missing.png]()');
	});

	it('resolves multiple wikilinks in one string', () => {
		const app = makeApp({ 'a.png': 'imgs/a.png', 'b.png': 'imgs/b.png' });
		const input = '![[a.png]]\n![[b.png]]';
		const result = resolveWikilinks(input, app);
		expect(result).toBe('![a.png](app://vault/imgs/a.png)\n![b.png](app://vault/imgs/b.png)');
	});

	it('does not affect standard markdown image syntax', () => {
		const app = makeApp({ 'photo.png': 'assets/photo.png' });
		const input = '![alt](standard/path.png)';
		expect(resolveWikilinks(input, app)).toBe(input);
	});

	it('does not affect regular (non-image) wikilinks', () => {
		const app = makeApp({ 'My Note': 'My Note.md' });
		const input = '[[My Note]]';
		expect(resolveWikilinks(input, app)).toBe(input);
	});

	it('trims whitespace from the filename', () => {
		const app = makeApp({ 'photo.png': 'assets/photo.png' });
		const result = resolveWikilinks('![[  photo.png  ]]', app);
		expect(result).toBe('![photo.png](app://vault/assets/photo.png)');
	});
});
