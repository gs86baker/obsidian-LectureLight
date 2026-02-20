# Obsidian LectureLight Pro

Professional presentation console for Obsidian. Turn any Markdown note into a slide deck with a built-in teleprompter, traffic-light timer, film strip, speaker notes, and audience-facing stage window.

---

## Features

### Slide authoring

Write slides directly in any Markdown note using fenced `:::slide` blocks. The plugin parses them live as you edit — no save or reload required.

```markdown
:::slide Introduction
# Hello, world

Opening remarks go here.
:::

:::slide Key points
- First point
- Second point
:::
```

### Speaker notes

Add presenter-only notes to any slide using `:::notes` blocks. Notes appear in the teleprompter in a distinct teal callout and are **never transmitted to the stage window**.

**Positional** — attaches to the slide immediately above:

```markdown
:::slide [Intro]
# Hello, world
:::

:::notes
Remember to pause here and ask if anyone has questions.
Start with the story about the conference in Austin.
:::
```

**Label-matched** — can appear anywhere in the document, matched by slide label:

```markdown
:::notes [Key points]
Emphasize the third bullet. The audience usually pushes back here — have the Q4 data ready.
:::
```

### Presenter console

A dedicated side panel with everything you need to run a talk:

| Panel | What it does |
|---|---|
| **Navigation** | ← → buttons + slide counter; keyboard ← → and Page Up/Down also work |
| **Teleprompter** | Full script with "Slide X of Y" markers; click any marker to jump; speaker notes shown below each trigger |
| **Stage preview** | 16:9 thumbnail of the current slide in the sidebar |
| **Film strip** | Collapsible thumbnail row of every slide at the bottom |

### Keyboard shortcuts (presenter console)

| Key | Action |
|---|---|
| `←` / `Page Up` | Previous slide |
| `→` / `Page Down` | Next slide |
| `←` to slide 1 (timer running) | Resets elapsed time to zero |

### Traffic-light timer

Counts down from your target time. Color changes signal how you're tracking:

| Color | State | Trigger |
|---|---|---|
| Neutral | Ready | Timer not started |
| **Green** `#059669` | On track | Timer running, above warning threshold |
| **Orange** `#fc7e14` | Warning | ≤ warning minutes remaining |
| **Red** `#dc3444` | Wrap up | ≤ wrapup minutes remaining |
| **Red ↔ Orange** pulse | Overtime | Past zero |

Configure per note with a `:::lecturelight` block, or set defaults in **Settings → LectureLight Pro**:

```markdown
:::lecturelight
target: 45
warning: 40
wrapup: 43
:::
```

Values are in minutes. The block is optional — plugin settings are used when it is absent. Navigating back to slide 1 while the timer is running resets it automatically.

### Stage window

Click **⊡ Stage** in the presenter console header to open a separate audience-facing window.

- Opens as a native Obsidian popout at 1280 × 720
- Scales to any resolution up to 4K via GPU-accelerated CSS transforms
- Slides update in real time as you navigate (via `BroadcastChannel` — no network required)
- **⊡ Go fullscreen · F** button is always visible when windowed; disappears in fullscreen
- Press **Esc** to exit fullscreen — button reappears so you can re-enter on any display
- Press **F** to toggle fullscreen from the keyboard
- The **⊡ Stage** button pulses amber while the stage is live; returns to inactive when the window closes

### Stage theme

The **☀** button in the presenter console header switches the stage between dark (default) and light backgrounds. The theme is applied instantly and is re-sent automatically when a new stage window opens.

---

## Installation

1. Download `main.js` and `manifest.json` from the latest release.
2. Create a folder named `lecturelight` inside your vault's `.obsidian/plugins/` directory.
3. Copy the two files into that folder.
4. Reload Obsidian and enable **LectureLight Pro** in **Settings → Community plugins**.

---

## Development

```bash
npm install
npm run dev      # watch mode (rebuilds on save)
npm run build    # production build
npm test         # 49 Vitest unit tests
npm run lint     # ESLint (0 errors expected)
```

Copy `main.js` and `manifest.json` into your vault's plugin folder after each build to test live.

---

## Architecture

```
src/
  main.ts                      # Plugin lifecycle, view and command registration
  view.tsx                     # LectureLightView — Obsidian ItemView wrapper for the console
  stageView.tsx                # LectureLightStageView — audience-facing popout window
  presenterStyles.ts           # All console CSS, injected programmatically at load
  settings.ts                  # Settings interface, defaults, settings tab
  types.ts                     # ParseResult, Slide, TimerSettings
  components/
    PresenterConsole.tsx        # Root console component — layout, state, stage control
    TrafficLightTimer.tsx       # Countdown timer with color states
    FilmStrip.tsx               # Thumbnail row
    Teleprompter.tsx            # Scrollable script with slide triggers and speaker notes
  lib/
    parser.ts                   # :::slide / :::lecturelight / :::notes block parser
    wikilinks.ts                # [[wikilink]] resolver
  __tests__/
    parser.test.ts              # 40 parser unit tests
    wikilinks.test.ts           # 8 wikilink unit tests
    setup.test.ts               # Environment sanity check
```

### BroadcastChannel message protocol

All inter-window communication uses `BroadcastChannel('lecturelight-stage')`. No network required.

| Message `type` | Payload | Sent when |
|---|---|---|
| `slide-change` | `{ htmlContent, index, total, label }` | Slide advances; stage window first opens |
| `theme-change` | `{ light: boolean }` | ☀ button toggled; stage window first opens |

---

## Roadmap

### Next — Recording features

The next development phase adds **session recording** so a talk can be reviewed, trimmed, and published without leaving Obsidian.

| Item | Description |
|---|---|
| **Audio capture** | Record microphone input via the Web Audio API during a session; display a live level meter in the presenter console |
| **Slide-timestamp log** | Write a JSON sidecar (`.lecturelight.json`) alongside the note that maps each slide index to the wall-clock time it was shown |
| **Playback console** | A read-only mode that replays the timestamp log against the recorded audio, highlighting the active slide in the teleprompter as it plays |
| **Export** | Render each slide as a PNG frame (using the existing stage canvas) and mux with the audio into an MP4 via a WASM FFmpeg bundle |
| **Chapter markers** | Embed slide labels as ID3/MP4 chapter markers in the exported file so video players display a chapter list |

### Backlog

| Item | Description |
|---|---|
| **Slide transitions** | Optional CSS transition between slides on the stage (fade, slide-left) controlled by a per-deck `:::lecturelight` setting |
| **Remote clicker support** | Map HID presentation remote buttons (Next, Back, Black screen) to plugin commands via Obsidian's hotkey system |
| **Presenter notes on secondary display** | A mirror of the presenter console (timer + notes only) sized for a laptop screen while the stage runs fullscreen on the projector |
| **PDF export** | Print each slide as a page to a PDF using Electron's `webContents.printToPDF` API |
| **Community plugin submission** | Prepare manifest, icon, and changelog for the official Obsidian community plugin registry |

---

## License

MIT
