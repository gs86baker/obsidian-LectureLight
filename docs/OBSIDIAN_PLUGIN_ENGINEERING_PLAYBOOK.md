# Obsidian Plugin Engineering Playbook (LectureLight)

Last reviewed: February 21, 2026
Primary source focus: Obsidian official docs for building plugins

## Why this exists

This is the working reference for implementing and releasing this plugin correctly.
It condenses the official Obsidian plugin docs into actionable engineering rules for this repository.

## Canonical sources

- Build a plugin:
  - https://docs.obsidian.md/Plugins/Getting%20started/Build%20a%20plugin
- Manifest:
  - https://docs.obsidian.md/Reference/Manifest
- versions.json:
  - https://docs.obsidian.md/Reference/Versions
- Create a release:
  - https://docs.obsidian.md/Plugins/Releasing/Create%20a%20release
- Plugin guidelines:
  - https://docs.obsidian.md/Plugins/Releasing/Plugin%20guidelines
- Developer policies:
  - https://docs.obsidian.md/Developer%20policies
- Optimize plugin load time:
  - https://docs.obsidian.md/Plugins/Guides/Optimizing%20plugin%20load%20time
- TypeScript API (`Plugin` class):
  - https://docs.obsidian.md/Reference/TypeScript%20API/Plugin
- Submission checklist:
  - https://docs.obsidian.md/oo/plugin

## Official build model (what must always be true)

1. The plugin is bundled to a top-level `main.js`.
2. `manifest.json` is present and valid.
3. `styles.css` is optional, but if used, ships as a top-level artifact.
4. Local test install path is:
   - `<Vault>/.obsidian/plugins/<plugin-id>/`
5. Obsidian loads plugin code from `main.js` and metadata from `manifest.json`.

## Project baseline for this repo

- Package manager: `npm`
- Bundler: `esbuild`
- Entry source: `src/main.ts`
- Built artifact: `main.js`
- Plugin ID: `lecturelight`
- Current manifest version: `1.0.0`
- Current compatibility map (`versions.json`): `"1.0.0": "0.15.0"`

## Lifecycle rules (engineering-grade)

From Obsidian API and guidelines:

1. `onload()` should do fast setup only.
2. Register everything that needs cleanup:
   - `this.registerEvent(...)`
   - `this.registerDomEvent(...)`
   - `this.registerInterval(...)`
   - `this.register(...)` for custom teardown callbacks
3. `onunload()` should not leave listeners, timers, views, or DOM side effects behind.
4. Heavy work should be deferred/lazy, not done at startup.

LectureLight implementation note:
- `src/main.ts` currently follows this correctly by registering view types and workspace/vault listeners, and by registering style-element cleanup.

## Manifest and versioning rules

From `Manifest`, `Versions`, and release docs:

1. Keep `id` stable forever after release.
2. `version` must be valid SemVer (`x.y.z`).
3. `minAppVersion` must reflect actual API requirements.
4. `versions.json` must map every plugin version to its minimum app version.
5. GitHub release tag must exactly match `manifest.json` version (no leading `v`).

Release assets required:

1. `main.js`
2. `manifest.json`
3. `styles.css` (if used)

## Policy and security guardrails

From Plugin guidelines + Developer policies:

1. No remote code execution or dynamic code loading/eval from untrusted sources.
2. Default local-first behavior; network access only when necessary and clearly disclosed.
3. No hidden telemetry.
4. Respect privacy and data minimization principles.
5. Keep user-visible behavior transparent and consent-based.

## Performance rules

From load-time guidance:

1. Keep startup path minimal and deterministic.
2. Defer expensive parsing, scans, or indexing until needed.
3. Avoid synchronous heavy work in `onload()`.
4. Debounce noisy event sources where appropriate.
5. Profile first; optimize measured bottlenecks.

LectureLight-specific implication:
- Active-note parsing on `modify` is correct behavior, but optimization should focus on parser cost and event frequency before adding complexity.

## Architecture conventions for this repo

Use this module split consistently:

1. `src/main.ts`
   - Lifecycle + registration only.
2. `src/view.tsx`, `src/stageView.tsx`
   - Obsidian `ItemView` integration boundaries.
3. `src/components/*`
   - React UI concerns only.
4. `src/lib/*`
   - Parser, logging, vault persistence, utility logic.
5. `src/hooks/*`
   - Browser/media side-effect hooks (`useAudioRecorder`).
6. `src/settings.ts`
   - Settings schema + settings tab rendering.

Rule of thumb:
- If a file starts mixing plugin lifecycle, parsing, and UI rendering concerns, split it.

## Implementation checklist (for any new feature)

1. Define user-visible behavior and syntax contract first.
2. Add/adjust types in `src/types.ts`.
3. Implement pure logic in `src/lib/*` with tests.
4. Wire behavior in UI/components with minimal side effects.
5. Register cleanup paths for every listener/timer/resource.
6. Run:
   - `npm run lint`
   - `npm test`
   - `npm run build`
7. Verify manually in Obsidian:
   - load/unload plugin
   - switch notes
   - reopen workspace
   - check command palette and settings persistence

## Release checklist (community-safe)

1. Bump `manifest.json` version.
2. Update `versions.json` mapping.
3. Build production artifact (`npm run build`).
4. Validate no policy violations (network/privacy/disclosure).
5. Create GitHub release with exact tag = version.
6. Attach `main.js`, `manifest.json`, and `styles.css` if present.
7. Smoke-test install in a clean vault.

## High-value gotchas

1. Renaming command IDs is a breaking change for users with hotkeys/workflows.
2. Lowering `minAppVersion` without testing older APIs causes runtime failures.
3. Feature code that only works on desktop must either be guarded or `isDesktopOnly` must be true.
4. Build success is not enough; plugin unload/reload safety is required.
5. Docs URLs with `+` can 404 in some contexts; canonical docs links use `%20`.

## Working commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Current status snapshot (for quick context)

The current codebase already implements:

1. Presenter view + stage popout view.
2. Slide/timer/notes parser and wikilink handling.
3. Recording + session log persistence to vault.
4. Settings + command registration.

Primary remaining risk area is release/compliance discipline, not core architecture.
