# Obsidian LectureLight Pro

Professional presentation and teleprompter integration for Obsidian. 

This plugin bridges the **LectureLight Pro** interface into your Obsidian vault, allowing you to turn any Markdown note into a professional slide deck with integrated audio recording, canvas-scaled slides, and a real-time teleprompter.

## Features (Planned)

- **Canvas-Scaled Slides**: Strict 16:9 aspect ratio using Container Query Width (`cqw`) for perfect scaling on any display.
- **Live Sync**: Instant updates from your Obsidian note to the presenter view.
- **Integrated Recording**: Capture your lecture audio directly to your vault.
- **Teleprompter**: High-performance interactive script with slide triggers.

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a folder named `obsidian-lecturelight` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

1. `npm install`
2. `npm run dev` to start compilation in watch mode.
3. Make changes to `src/main.ts` or other files.

## License

MIT
