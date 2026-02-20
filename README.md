# Obsidian LectureLight Pro

Professional presentation console for Obsidian. Turn any Markdown note into a slide deck with a built-in teleprompter, traffic-light timer, film strip, and audience-facing stage window.

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

### Presenter console
A dedicated side panel with everything you need to run a talk:

| Panel | What it does |
|---|---|
| **Navigation** | ← → buttons + slide counter |
| **Teleprompter** | Full script, per-slide sections, click any section to jump to that slide |
| **Stage preview** | 16:9 thumbnail of the current slide in the sidebar |
| **Film strip** | Collapsible thumbnail row of every slide at the bottom |

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

Values are in minutes. The block is optional — plugin settings are used when it is absent.

### Stage window
Click **⊡ Stage** in the presenter console header to open a separate audience-facing window.

- Opens as a native Obsidian popout at 1280 × 720
- Scales to any resolution up to 4K via GPU-accelerated CSS transforms
- Slides update in real time as you navigate (via `BroadcastChannel` — no network required)
- **⊡ Go fullscreen · F** button is always visible when windowed; disappears in fullscreen
- Press **Esc** to exit fullscreen — button reappears so you can re-enter on any display
- Press **F** to toggle fullscreen from the keyboard
- The **⊡ Stage** button in the presenter console pulses amber while the stage is live
- Closing the stage window returns the button to its inactive state

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
npm test         # 43 Vitest unit tests
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
  stageContent.ts              # (reserved)
  settings.ts                  # Settings interface, defaults, settings tab
  types.ts                     # ParseResult, Slide, TimerSettings
  components/
    PresenterConsole.tsx        # Root console component — layout, state, stage control
    TrafficLightTimer.tsx       # Countdown timer with color states
    FilmStrip.tsx               # Thumbnail row
    Teleprompter.tsx            # Scrollable script with slide triggers
  lib/
    parser.ts                   # :::slide / :::lecturelight block parser
    wikilinks.ts                # [[wikilink]] resolver
  __tests__/
    parser.test.ts              # 34 parser unit tests
    wikilinks.test.ts           # 8 wikilink unit tests
    setup.test.ts               # Environment sanity check
```

---

## License

MIT
