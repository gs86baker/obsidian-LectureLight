# Obsidian LectureLight Pro

Professional presentation console for Obsidian. Turn any Markdown note into a slide deck with a built-in teleprompter, traffic-light timer, film strip, and audience-facing stage window.

## Features

- **Slide authoring in Markdown** — wrap content in `:::slide [Label] … :::` fenced blocks; the plugin parses them live as you edit.
- **Presenter console** — a dedicated side panel showing:
  - Slide navigation (← →) with keyboard shortcuts
  - Full teleprompter script with per-slide sections and click-to-jump
  - Sidebar preview (16:9 thumbnail of the current slide)
  - Film strip (collapsible row of all slide thumbnails)
- **Traffic-light timer** — green / amber / red background signals configured per note (`:::lecturelight … :::` block) or via plugin settings.
- **Stage window** — click **⊡ Stage** to open a separate audience-facing window in its own popout. The stage:
  - Scales to any resolution from 1280×720 to 4K using GPU-accelerated CSS transforms
  - Updates in real time as you navigate slides (via `BroadcastChannel`)
  - Toggles fullscreen on click or **F** key
  - Button pulses amber while the stage is live

## Slide syntax

~~~markdown
:::slide Introduction
# Hello, World

Opening remarks go here.
:::

:::slide Key Points
- First point
- Second point
:::
~~~

## Timer configuration

Add a `:::lecturelight` block anywhere in your note:

~~~markdown
:::lecturelight
target: 45
warning: 40
wrapup: 43
:::
~~~

Values are in minutes. Falls back to plugin settings if the block is absent.

## Installation

1. Download `main.js` and `manifest.json` from the latest release.
2. Create a folder named `lecturelight` in your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable **LectureLight Pro** in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
npm test         # vitest unit tests
```

Copy `main.js` and `manifest.json` into your vault's plugin folder after each build to test.

## License

MIT
