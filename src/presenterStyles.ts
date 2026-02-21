/**
 * Presenter console CSS, injected programmatically on plugin load.
 * Keeping styles here (bundled into main.js) guarantees they are always
 * in sync with the code and never subject to Obsidian's CSS caching.
 *
 * All visual properties use hardcoded hex values (not var()) so that
 * Obsidian's own styles.css cannot override them via CSS variable cascade.
 */
export const PRESENTER_CSS = `
/* =============================================================
   LectureLight Presenter Console
   All classes prefixed with .ll- to avoid Obsidian conflicts
   ============================================================= */

/* Palette (for reference):
   bg:           #060f1e
   bg-card:      #0d1b2e
   bg-elevated:  #1a2e45
   bg-trigger:   #0f2033
   border:       #2d4a6b
   border-faint: #1a2e45
   text:         #f1f5f9
   text-dim:     #94a3b8
   text-muted:   #4a7a9b
   accent:       #3b82f6
   accent-dim:   #1d4ed8
   accent-bg:    #0c1d40
*/

.ll-presenter-root {
	height: 100%;
	overflow: hidden;
	color-scheme: dark;
}

/* ── Layout ── */

.ll-presenter-root .ll-presenter {
	display: flex !important;
	flex-direction: column !important;
	height: 100% !important;
	background: #060f1e !important;
	color: #f1f5f9 !important;
	font-family: var(--font-interface, system-ui, sans-serif) !important;
	overflow: hidden !important;
}

.ll-presenter-root .ll-body {
	display: flex !important;
	flex: 1 !important;
	overflow: hidden !important;
	min-height: 0 !important;
}

/* ── Header ── */

.ll-presenter-root .ll-header {
	display: flex !important;
	align-items: flex-start !important;
	justify-content: space-between !important;
	padding: 10px 16px !important;
	background: #0d1b2e !important;
	border-bottom: 2px solid #2d4a6b !important;
	flex-shrink: 0 !important;
	gap: 10px !important;
}

.ll-presenter-root .ll-header-left,
.ll-presenter-root .ll-header-right {
	display: flex !important;
	align-items: center !important;
	gap: 8px !important;
}

.ll-presenter-root .ll-header-right {
	flex-wrap: wrap !important;
	justify-content: flex-end !important;
}

.ll-presenter-root .ll-slide-counter {
	font-size: 14px !important;
	font-weight: 700 !important;
	color: #94a3b8 !important;
	min-width: 56px !important;
	text-align: center !important;
	margin: 0 2px !important;
}

/* ── Buttons ── */

.ll-presenter-root .ll-btn {
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	padding: 7px 12px !important;
	border-radius: 6px !important;
	border: 1px solid #2d4a6b !important;
	background: #1a2e45 !important;
	color: #f1f5f9 !important;
	font-size: 12px !important;
	font-weight: 600 !important;
	cursor: pointer !important;
	transition: background 0.15s !important;
	line-height: 1.4 !important;
	white-space: nowrap !important;
	box-shadow: none !important;
	min-height: 34px !important;
}

.ll-presenter-root .ll-btn:hover:not(:disabled) {
	background: #475569 !important;
}

.ll-presenter-root .ll-btn:disabled {
	opacity: 0.35 !important;
	cursor: not-allowed !important;
}

.ll-presenter-root .ll-btn-sm {
	padding: 7px 11px !important;
	font-size: 12px !important;
}

.ll-presenter-root .ll-btn-nav {
	font-size: 12px !important;
	font-weight: 700 !important;
	padding: 7px 12px !important;
	min-width: 96px !important;
}

.ll-presenter-root .ll-btn-start {
	background: #166534 !important;
	border-color: #16a34a !important;
	color: #bbf7d0 !important;
	font-weight: 700 !important;
}

.ll-presenter-root .ll-btn-start:hover:not(:disabled) {
	background: #15803d !important;
}

.ll-presenter-root .ll-btn-stop {
	background: #991b1b !important;
	border-color: #ef4444 !important;
	color: #fecaca !important;
	font-weight: 700 !important;
	animation: ll-pulse 1.2s ease-in-out infinite !important;
}

.ll-presenter-root .ll-btn-stop:hover:not(:disabled) {
	background: #b91c1c !important;
}

.ll-presenter-root .ll-btn-active {
	background: #1d4ed8 !important;
	border-color: #3b82f6 !important;
	color: #bfdbfe !important;
}

.ll-presenter-root .ll-btn-stage-active {
	background: #78350f !important;
	border-color: #f59e0b !important;
	color: #fef3c7 !important;
	animation: ll-pulse 2s ease-in-out infinite !important;
}

.ll-presenter-root .ll-btn-content {
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	gap: 7px !important;
}

.ll-presenter-root .ll-btn-icon {
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
}

.ll-presenter-root .ll-btn-icon-svg {
	width: 14px !important;
	height: 14px !important;
	stroke: currentColor !important;
	fill: none !important;
}

.ll-presenter-root .ll-btn-text {
	font-size: 12px !important;
	font-weight: 700 !important;
	letter-spacing: 0.01em !important;
}

.ll-presenter-root .ll-btn-record {
	width: 100% !important;
}

@keyframes ll-pulse {
	0%, 100% { opacity: 1; }
	50%       { opacity: 0.65; }
}

/* ── Teleprompter panel ── */

.ll-presenter-root .ll-teleprompter-panel {
	flex: 1 !important;
	overflow-y: auto !important;
	border-right: 2px solid #2d4a6b !important;
	min-width: 0 !important;
	scrollbar-width: thin !important;
	scrollbar-color: #2d4a6b transparent !important;
}

.ll-presenter-root .ll-teleprompter {
	padding: 32px 40px 140px !important;
	max-width: 800px !important;
	margin: 0 auto !important;
}

/* ── Notes prose ── */

.ll-presenter-root .ll-notes {
	color: #f1f5f9 !important;
	line-height: 1.85 !important;
	margin-bottom: 24px !important;
}

.ll-presenter-root .ll-notes p          { margin: 0 0 14px !important; }
.ll-presenter-root .ll-notes p:last-child { margin-bottom: 0 !important; }
.ll-presenter-root .ll-notes h1,
.ll-presenter-root .ll-notes h2,
.ll-presenter-root .ll-notes h3         { color: #93c5fd !important; margin: 24px 0 10px !important; font-weight: 700 !important; }
.ll-presenter-root .ll-notes strong     { color: #f1f5f9 !important; }
.ll-presenter-root .ll-notes em         { color: #cbd5e1 !important; }
.ll-presenter-root .ll-notes ul,
.ll-presenter-root .ll-notes ol         { padding-left: 28px !important; margin: 10px 0 14px !important; }
.ll-presenter-root .ll-notes li         { margin-bottom: 6px !important; }

/* ── Slide triggers ── */

.ll-presenter-root .ll-slide-trigger {
	display: flex !important;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100% !important;
	min-width: 0 !important;
	overflow: hidden !important;
	text-align: left !important;
	background: #0f2033 !important;
	border: 1px solid #2d4a6b !important;
	border-left: 5px solid #4a7a9b !important;
	border-radius: 0 8px 8px 0 !important;
	padding: 14px 18px !important;
	margin: 28px 0 !important;
	cursor: pointer !important;
	transition: border-color 0.15s, background 0.15s, box-shadow 0.15s !important;
	color: #f1f5f9 !important;
	box-shadow: none !important;
}

.ll-presenter-root .ll-slide-trigger:hover {
	background: #1a2e45 !important;
	border-left-color: #60a5fa !important;
	border-color: #60a5fa !important;
}

.ll-presenter-root .ll-slide-trigger--active {
	background: rgba(59, 130, 246, 0.18) !important;
	border-color: #60a5fa !important;
	border-left: 5px solid #60a5fa !important;
	box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3) !important;
}

.ll-presenter-root .ll-slide-trigger-meta {
	display: block !important;
	font-size: 9px !important;
	font-weight: 800 !important;
	text-transform: uppercase !important;
	letter-spacing: 0.14em !important;
	color: #4a7a9b !important;
	margin-bottom: 6px !important;
}

.ll-presenter-root .ll-slide-trigger--active .ll-slide-trigger-meta {
	color: #60a5fa !important;
}

.ll-presenter-root .ll-slide-trigger-title {
	display: block !important;
	font-size: 17px !important;
	font-weight: 700 !important;
	color: #f1f5f9 !important;
	line-height: 1.3 !important;
}

.ll-presenter-root .ll-slide-trigger-snippet {
	display: block !important;
	box-sizing: border-box !important;
	width: 100% !important;
	min-width: 0 !important;
	font-size: 11px !important;
	font-family: var(--font-monospace, monospace) !important;
	color: #4a7a9b !important;
	margin-top: 8px !important;
	white-space: nowrap !important;
	overflow: hidden !important;
	text-overflow: ellipsis !important;
	background: rgba(0,0,0,0.3) !important;
	padding: 4px 8px !important;
	border-radius: 4px !important;
}

/* ── Sidebar ── */

.ll-presenter-root .ll-sidebar {
	width: 264px !important;
	flex-shrink: 0 !important;
	display: flex !important;
	flex-direction: column !important;
	overflow: hidden !important;
	background: #0d1b2e !important;
	border-left: 1px solid #1a2e45 !important;
}

.ll-presenter-root .ll-preview-section {
	padding: 14px !important;
	border-bottom: 1px solid #2d4a6b !important;
	flex-shrink: 0 !important;
}

.ll-presenter-root .ll-section-label {
	font-size: 9px !important;
	font-weight: 800 !important;
	text-transform: uppercase !important;
	letter-spacing: 0.14em !important;
	color: #4a7a9b !important;
	margin-bottom: 10px !important;
}

.ll-presenter-root .ll-slide-canvas {
	aspect-ratio: 16 / 9 !important;
	background: #000 !important;
	border: 1px solid #2d4a6b !important;
	border-radius: 6px !important;
	overflow: hidden !important;
	position: relative !important;
}

.ll-presenter-root .ll-slide-html {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	width: 333% !important;
	height: 333% !important;
	transform: scale(0.3) !important;
	transform-origin: top left !important;
	/* Proportional to stage (inner ~786 × 443, scale 0.41):
	   stage padding 80px/96px × 0.41 ≈ 33px/40px; stage font 40px × 0.41 ≈ 16px */
	padding: 33px 40px !important;
	color: #f1f5f9 !important;
	pointer-events: none !important;
	font-size: 16px !important;
	line-height: 1.5 !important;
	overflow: hidden !important;
}

.ll-presenter-root .ll-slide-html h1 {
	font-size: 39px !important; font-weight: 900 !important;
	line-height: 1.1 !important; margin: 0 0 13px !important; color: #f8fafc !important;
}
.ll-presenter-root .ll-slide-html h2 {
	font-size: 29px !important; font-weight: 800 !important;
	line-height: 1.15 !important; margin: 0 0 10px !important; color: #e2e8f0 !important;
}
.ll-presenter-root .ll-slide-html h3 {
	font-size: 23px !important; font-weight: 700 !important;
	margin: 0 0 8px !important; color: #cbd5e1 !important;
}
.ll-presenter-root .ll-slide-html p  { margin: 0 0 10px !important; }
.ll-presenter-root .ll-slide-html ul,
.ll-presenter-root .ll-slide-html ol { padding-left: 26px !important; margin: 0 0 10px !important; }
.ll-presenter-root .ll-slide-html li { margin-bottom: 5px !important; }
.ll-presenter-root .ll-slide-html strong { font-weight: 800 !important; }
.ll-presenter-root .ll-slide-html img { max-width: 100% !important; border-radius: 5px !important; }

.ll-presenter-root .ll-slide-html.ll-layout-standard img {
	max-width: 80% !important; display: block !important; margin: 0 auto !important;
}
.ll-presenter-root .ll-slide-html.ll-layout-bleed img {
	width: 100% !important; max-width: 100% !important; display: block !important;
	margin: 0 !important; border-radius: 0 !important;
}

/* Light-theme preview styling (matches stage light mode) */
.ll-presenter-root .ll-slide-canvas.ll-theme-light {
	background: #f8fafc !important;
	border-color: #cbd5e1 !important;
}

.ll-presenter-root .ll-slide-html.ll-theme-light {
	color: #0f172a !important;
}

.ll-presenter-root .ll-slide-html.ll-theme-light h1 { color: #0f172a !important; }
.ll-presenter-root .ll-slide-html.ll-theme-light h2 { color: #1e293b !important; }
.ll-presenter-root .ll-slide-html.ll-theme-light h3 { color: #334155 !important; }
.ll-presenter-root .ll-slide-html.ll-theme-light code {
	background: rgba(0,0,0,0.07) !important;
}
.ll-presenter-root .ll-slide-html.ll-theme-light pre {
	background: rgba(0,0,0,0.05) !important;
	border-color: rgba(0,0,0,0.12) !important;
}

.ll-presenter-root .ll-slide-label {
	font-size: 11px !important;
	font-weight: 600 !important;
	color: #94a3b8 !important;
	margin-top: 8px !important;
	text-align: center !important;
	white-space: nowrap !important;
	overflow: hidden !important;
	text-overflow: ellipsis !important;
}

/* ── Traffic-light timer ── */

.ll-presenter-root .ll-timer {
	flex: 1 !important;
	display: flex !important;
	flex-direction: column !important;
	align-items: stretch !important;
	justify-content: flex-start !important;
	padding: 14px 14px 12px !important;
	gap: 10px !important;
	transition: background 0.4s !important;
	min-height: 0 !important;
	overflow-y: auto !important;
}

.ll-presenter-root .ll-timer--ready    { background: #1a2e45 !important; }
.ll-presenter-root .ll-timer--green    { background: #059669 !important; }
.ll-presenter-root .ll-timer--yellow   { background: #fc7e14 !important; }
.ll-presenter-root .ll-timer--red      { background: #dc3444 !important; }
.ll-presenter-root .ll-timer--overtime {
	background: #dc3444 !important;
	animation: ll-urgent-pulse 0.6s ease-in-out infinite !important;
}

@keyframes ll-urgent-pulse {
	/* background: !important on the element blocks background animation.
	   Animate filter instead — hue-rotate shifts red toward orange,
	   brightness adds subtle glow. White text is unaffected (no hue). */
	0%, 100% { filter: hue-rotate(0deg) brightness(1); }
	50%       { filter: hue-rotate(25deg) brightness(1.15); }
}

.ll-presenter-root .ll-timer-label {
	font-size: 11px !important;
	font-weight: 700 !important;
	color: rgba(255, 255, 255, 0.85) !important;
	margin-top: 3px !important;
	text-transform: none !important;
	letter-spacing: 0.02em !important;
	text-align: center !important;
}

.ll-presenter-root .ll-timer-header {
	display: flex !important;
	align-items: center !important;
	justify-content: flex-start !important;
}

.ll-presenter-root .ll-timer-title {
	display: inline-flex !important;
	align-items: center !important;
	gap: 6px !important;
	font-size: 14px !important;
	font-weight: 700 !important;
	color: rgba(255, 255, 255, 0.92) !important;
}

.ll-presenter-root .ll-timer-title-icon {
	width: 16px !important;
	height: 16px !important;
	stroke: currentColor !important;
	fill: none !important;
}

.ll-presenter-root .ll-timer-main {
	display: flex !important;
	flex-direction: column !important;
	align-items: center !important;
	justify-content: center !important;
	padding: 6px 0 2px !important;
}

.ll-presenter-root .ll-timer-display {
	font-size: 42px !important;
	font-weight: 900 !important;
	font-family: var(--font-monospace, monospace) !important;
	font-variant-numeric: tabular-nums !important;
	line-height: 1 !important;
	color: #fff !important;
}

.ll-presenter-root .ll-timer-target {
	font-size: 10px !important;
	font-weight: 600 !important;
	color: rgba(255, 255, 255, 0.4) !important;
	margin-top: 2px !important;
	text-transform: uppercase !important;
	letter-spacing: 0.1em !important;
	text-align: center !important;
}

.ll-presenter-root .ll-timer-extra {
	margin-top: 6px !important;
}

/* ── Film strip ── */

.ll-presenter-root .ll-filmstrip {
	display: flex !important;
	gap: 10px !important;
	padding: 10px 14px !important;
	overflow-x: auto !important;
	background: #0d1b2e !important;
	border-top: 2px solid #2d4a6b !important;
	flex-shrink: 0 !important;
	align-items: flex-start !important;
	scrollbar-width: thin !important;
	scrollbar-color: #2d4a6b transparent !important;
}

.ll-presenter-root .ll-filmstrip-item {
	display: flex !important;
	flex-direction: column !important;
	align-items: center !important;
	gap: 5px !important;
	cursor: pointer !important;
	flex-shrink: 0 !important;
	background: #1a2e45 !important;
	border: 2px solid #2d4a6b !important;
	border-radius: 6px !important;
	padding: 5px !important;
	transition: border-color 0.15s, background 0.15s !important;
	color: #f1f5f9 !important;
	box-shadow: none !important;
}

.ll-presenter-root .ll-filmstrip-item:hover {
	background: #1a2e45 !important;
	border-color: #60a5fa !important;
}

.ll-presenter-root .ll-filmstrip-item--active {
	background: rgba(59, 130, 246, 0.18) !important;
	border-color: #60a5fa !important;
}

.ll-presenter-root .ll-filmstrip-thumb {
	width: 108px !important;
	aspect-ratio: 16 / 9 !important;
	background: #000 !important;
	border: 1px solid #1a2e45 !important;
	border-radius: 3px !important;
	overflow: hidden !important;
	position: relative !important;
}

.ll-presenter-root .ll-filmstrip-thumb.ll-theme-light {
	background: #f8fafc !important;
	border-color: #cbd5e1 !important;
}

.ll-presenter-root .ll-filmstrip-thumb-inner {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	width: 400% !important;
	height: 400% !important;
	transform: scale(0.25) !important;
	transform-origin: top left !important;
	/* Proportional to stage (1920 × 1080 → inner 432 × 243, scale 0.225):
	   stage padding 80px/96px × 0.225; stage font 40px × 0.225 = 9px */
	padding: 18px 22px !important;
	color: #f1f5f9 !important;
	pointer-events: none !important;
	font-size: 9px !important;
	line-height: 1.5 !important;
	overflow: hidden !important;
}

.ll-presenter-root .ll-filmstrip-thumb-inner h1 {
	font-size: 22px !important; font-weight: 900 !important;
	line-height: 1.1 !important; margin: 0 0 7px !important; color: #f8fafc !important;
}
.ll-presenter-root .ll-filmstrip-thumb-inner h2 {
	font-size: 16px !important; font-weight: 800 !important;
	line-height: 1.15 !important; margin: 0 0 5px !important; color: #e2e8f0 !important;
}
.ll-presenter-root .ll-filmstrip-thumb-inner h3 {
	font-size: 13px !important; font-weight: 700 !important;
	margin: 0 0 4px !important; color: #cbd5e1 !important;
}
.ll-presenter-root .ll-filmstrip-thumb-inner p  { margin: 0 0 5px !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner ul,
.ll-presenter-root .ll-filmstrip-thumb-inner ol { padding-left: 14px !important; margin: 0 0 5px !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner li { margin-bottom: 2px !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner strong { font-weight: 800 !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner img { max-width: 100% !important; border-radius: 3px !important; }

.ll-presenter-root .ll-filmstrip-thumb-inner.ll-layout-standard img {
	max-width: 80% !important; display: block !important; margin: 0 auto !important;
}
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-layout-bleed img {
	width: 100% !important; max-width: 100% !important; display: block !important;
	margin: 0 !important; border-radius: 0 !important;
}

/* Light-theme filmstrip styling (matches stage light mode) */
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-theme-light {
	color: #0f172a !important;
}
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-theme-light h1 { color: #0f172a !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-theme-light h2 { color: #1e293b !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-theme-light h3 { color: #334155 !important; }
.ll-presenter-root .ll-filmstrip-thumb-inner.ll-theme-light code {
	background: rgba(0,0,0,0.07) !important;
}

.ll-presenter-root .ll-filmstrip-label {
	font-size: 10px !important;
	font-weight: 600 !important;
	color: #94a3b8 !important;
	max-width: 108px !important;
	white-space: nowrap !important;
	overflow: hidden !important;
	text-overflow: ellipsis !important;
	text-align: center !important;
}

/* ── Empty state ── */

.ll-presenter-root .ll-empty {
	display: flex !important;
	flex-direction: column !important;
	align-items: center !important;
	justify-content: center !important;
	height: 100% !important;
	gap: 10px !important;
	padding: 40px !important;
	text-align: center !important;
	background: #060f1e !important;
}

.ll-presenter-root .ll-empty-icon {
	font-size: 52px !important;
	opacity: 0.2 !important;
	margin-bottom: 8px !important;
}

.ll-presenter-root .ll-empty-title {
	font-size: 18px !important;
	font-weight: 700 !important;
	color: #94a3b8 !important;
	margin: 0 !important;
}

.ll-presenter-root .ll-empty-hint {
	font-size: 13px !important;
	color: #4a7a9b !important;
	margin: 0 !important;
	line-height: 1.6 !important;
}

.ll-presenter-root .ll-empty-hint code {
	background: #1a2e45 !important;
	border: 1px solid #2d4a6b !important;
	padding: 1px 7px !important;
	border-radius: 4px !important;
	font-family: var(--font-monospace) !important;
	font-size: 12px !important;
	color: #93c5fd !important;
}

/* ── Speaker notes ── */

.ll-presenter-root .ll-speaker-notes {
	background: #071a1a !important;
	border-left: 4px solid #0d9488 !important;
	border-radius: 0 6px 6px 0 !important;
	padding: 12px 16px !important;
	margin: 16px 0 28px !important;
}

.ll-presenter-root .ll-speaker-notes-label {
	display: block !important;
	font-size: 9px !important;
	font-weight: 800 !important;
	text-transform: uppercase !important;
	letter-spacing: 0.14em !important;
	color: #0d9488 !important;
	margin-bottom: 8px !important;
}

.ll-presenter-root .ll-speaker-notes-body {
	font-size: 13px !important;
	line-height: 1.7 !important;
	color: #94a3b8 !important;
}

.ll-presenter-root .ll-speaker-notes-body p          { margin: 0 0 10px !important; }
.ll-presenter-root .ll-speaker-notes-body p:last-child { margin-bottom: 0 !important; }
.ll-presenter-root .ll-speaker-notes-body ul,
.ll-presenter-root .ll-speaker-notes-body ol          { padding-left: 22px !important; margin: 6px 0 10px !important; }
.ll-presenter-root .ll-speaker-notes-body li          { margin-bottom: 4px !important; }
.ll-presenter-root .ll-speaker-notes-body strong      { color: #cbd5e1 !important; }

/* ── Stage theme toggle ── */

.ll-presenter-root .ll-btn-theme-active {
	background: #1e3a5f !important;
	border-color: #60a5fa !important;
	color: #bfdbfe !important;
}

/* ── Mic / recording button ── */

.ll-presenter-root .ll-btn-mic-active {
	background: #4c1d95 !important;
	border-color: #a78bfa !important;
	color: #ede9fe !important;
}

/* ── Recording panel (inside timer) ── */

.ll-presenter-root .ll-recording-card {
	background: rgba(255,255,255,0.12) !important;
	border: 1px solid rgba(255,255,255,0.25) !important;
	border-radius: 10px !important;
	padding: 10px !important;
	backdrop-filter: blur(2px) !important;
}

.ll-presenter-root .ll-recording-card-head {
	display: flex !important;
	align-items: center !important;
	justify-content: space-between !important;
	gap: 8px !important;
}

.ll-presenter-root .ll-recording-card-title {
	display: inline-flex !important;
	align-items: center !important;
	gap: 6px !important;
	font-size: 12px !important;
	font-weight: 700 !important;
	color: #f8fafc !important;
}

.ll-presenter-root .ll-recording-enable {
	display: inline-flex !important;
	align-items: center !important;
	gap: 6px !important;
	font-size: 11px !important;
	color: rgba(255,255,255,0.85) !important;
}

.ll-presenter-root .ll-recording-enable input {
	width: 14px !important;
	height: 14px !important;
}

.ll-presenter-root .ll-recording-ready {
	display: inline-flex !important;
	align-items: center !important;
	gap: 6px !important;
	font-size: 11px !important;
	font-weight: 700 !important;
	color: #bbf7d0 !important;
	margin-top: 8px !important;
}

.ll-presenter-root .ll-recording-ready-dot {
	width: 7px !important;
	height: 7px !important;
	border-radius: 50% !important;
	background: #22c55e !important;
}

.ll-presenter-root .ll-recording-controls {
	display: grid !important;
	grid-template-columns: 1fr !important;
	gap: 8px !important;
	margin-top: 8px !important;
}

/* Level meter */

.ll-presenter-root .ll-level-meter-wrap {
	margin-top: 8px !important;
	display: flex !important;
	align-items: center !important;
	gap: 8px !important;
}

.ll-presenter-root .ll-level-meter-grid {
	flex: 1 !important;
	height: 16px !important;
	padding: 2px !important;
	display: grid !important;
	grid-template-columns: repeat(24, minmax(0, 1fr)) !important;
	gap: 2px !important;
	background: #122237 !important;
	border: 1px solid #2d4a6b !important;
	border-radius: 4px !important;
}

.ll-presenter-root .ll-level-segment {
	border-radius: 1px !important;
	background: #27435e !important;
	transition: background-color 0.04s linear, box-shadow 0.04s linear !important;
}

.ll-presenter-root .ll-level-segment.ll-level-segment--active {
	background: #10b981 !important;
	box-shadow: 0 0 4px rgba(16, 185, 129, 0.45) !important;
}

.ll-presenter-root .ll-level-segment.ll-level-segment--warn-zone.ll-level-segment--active {
	background: #fc7e14 !important;
	box-shadow: 0 0 4px rgba(252, 126, 20, 0.5) !important;
}

.ll-presenter-root .ll-level-segment.ll-level-segment--peak-zone.ll-level-segment--active {
	background: #dc3444 !important;
	box-shadow: 0 0 5px rgba(220, 52, 68, 0.55) !important;
}

.ll-presenter-root .ll-level-meter-value {
	width: 34px !important;
	font-size: 10px !important;
	font-weight: 700 !important;
	letter-spacing: 0.02em !important;
	color: #cbd5e1 !important;
	text-align: right !important;
	font-variant-numeric: tabular-nums !important;
}

/* Recording status row */

.ll-presenter-root .ll-recording-status {
	display: flex !important;
	align-items: center !important;
	gap: 6px !important;
	font-size: 10px !important;
	font-weight: 700 !important;
	text-transform: uppercase !important;
	letter-spacing: 0.12em !important;
	color: #f1f5f9 !important;
	margin-top: 8px !important;
}

.ll-presenter-root .ll-recording-status--dim {
	color: #94a3b8 !important;
	font-weight: 600 !important;
}

/* Pulsing red dot for active recording */

.ll-presenter-root .ll-recording-dot {
	width: 7px !important;
	height: 7px !important;
	border-radius: 50% !important;
	background: #dc3444 !important;
	flex-shrink: 0 !important;
	animation: ll-pulse 1s ease-in-out infinite !important;
}

/* Mic permission error */

.ll-presenter-root .ll-recording-error {
	margin-top: 8px !important;
	padding: 6px 8px !important;
	font-size: 11px !important;
	line-height: 1.5 !important;
	color: #fca5a5 !important;
	background: rgba(220, 52, 68, 0.12) !important;
	border: 1px solid rgba(220, 52, 68, 0.35) !important;
	border-radius: 4px !important;
}
`;
