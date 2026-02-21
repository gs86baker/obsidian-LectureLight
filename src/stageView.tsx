import { ItemView } from 'obsidian';
import DOMPurify from 'dompurify';

export const VIEW_TYPE_STAGE = 'lecturelight-stage';

const STAGE_STYLES = `
  .ls-viewport {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Show cursor while windowed so the user can interact with the hint bar.
       Hide it only when truly fullscreen (audience view). */
    cursor: default;
    outline: none;  /* suppress focus ring when viewport is programmatically focused */
  }

  /* Hide cursor and fullscreen bar when the viewport is in OS fullscreen */
  .ls-viewport:fullscreen { cursor: none; }
  .ls-viewport:fullscreen .ls-fs-bar { display: none; }

  .ls-canvas {
    width: 1920px;
    height: 1080px;
    background: #000;
    position: relative;
    overflow: hidden;
    transform-origin: center center;
    will-change: transform;
    -webkit-font-smoothing: antialiased;
  }

  .ls-waiting {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    color: rgba(255,255,255,0.25);
    font-family: system-ui, sans-serif;
    font-size: 48px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .ls-waiting-icon { font-size: 120px; opacity: 0.4; }
  .ls-waiting.ls-hidden { display: none; }

  .ls-content {
    position: absolute;
    inset: 0;
    padding: 80px 96px;
    color: #f1f5f9;
    font-family: system-ui, sans-serif;
    font-size: 40px;
    line-height: 1.5;
    overflow: hidden;
    display: none;
  }
  .ls-content.ls-visible { display: block; }

  .ls-content h1 { font-size: 96px; font-weight: 900; line-height: 1.1; margin: 0 0 32px; color: #f8fafc; }
  .ls-content h2 { font-size: 72px; font-weight: 800; line-height: 1.15; margin: 0 0 24px; color: #e2e8f0; }
  .ls-content h3 { font-size: 56px; font-weight: 700; line-height: 1.2; margin: 0 0 20px; color: #cbd5e1; }
  .ls-content p  { margin: 0 0 24px; }
  .ls-content ul,
  .ls-content ol  { padding-left: 64px; margin: 0 0 24px; }
  .ls-content li  { margin-bottom: 12px; }
  .ls-content strong { font-weight: 800; }
  .ls-content code {
    font-family: monospace;
    background: rgba(255,255,255,0.12);
    padding: 4px 14px;
    border-radius: 8px;
    font-size: 0.85em;
  }
  .ls-content pre {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 32px 40px;
    margin: 0 0 24px;
    overflow: hidden;
  }
  .ls-content pre code { background: none; padding: 0; border-radius: 0; font-size: 36px; line-height: 1.5; }
  .ls-content img { max-width: 80%; max-height: 800px; image-rendering: high-quality; border-radius: 12px; display: block; margin: 24px auto; }

  /* Bleed layout — images fill the slide edge-to-edge; text retains side padding */
  .ls-content.ls-layout-bleed { padding-left: 0; padding-right: 0; }
  .ls-content.ls-layout-bleed img {
    width: 100%; max-width: 100%; max-height: none; display: block; margin: 0; border-radius: 0;
  }
  .ls-content.ls-layout-bleed h1,
  .ls-content.ls-layout-bleed h2,
  .ls-content.ls-layout-bleed h3,
  .ls-content.ls-layout-bleed p,
  .ls-content.ls-layout-bleed ul,
  .ls-content.ls-layout-bleed ol { padding-left: 96px; padding-right: 96px; }

  /* ── Light theme ── */

  .ls-canvas.ls-light { background: #f8fafc; }

  .ls-canvas.ls-light .ls-content { color: #0f172a; }
  .ls-canvas.ls-light .ls-content h1 { color: #0f172a; }
  .ls-canvas.ls-light .ls-content h2 { color: #1e293b; }
  .ls-canvas.ls-light .ls-content h3 { color: #334155; }
  .ls-canvas.ls-light .ls-content code {
    background: rgba(0,0,0,0.07);
  }
  .ls-canvas.ls-light .ls-content pre {
    background: rgba(0,0,0,0.05);
    border-color: rgba(0,0,0,0.12);
  }

  .ls-canvas.ls-light .ls-waiting { color: rgba(0,0,0,0.25); }

  /* ── Fullscreen hint bar ── */

  /* Sits above the canvas inside the viewport, always visible when windowed.
     CSS :fullscreen rule above hides it automatically when in fullscreen. */
  .ls-fs-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 28px;
    background: linear-gradient(transparent, rgba(0,0,0,0.75));
    pointer-events: none;
  }

  .ls-fs-btn {
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 99px;
    padding: 9px 22px;
    letter-spacing: 0.04em;
    cursor: pointer;
    pointer-events: auto;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  }

  .ls-fs-btn:hover {
    background: rgba(255,255,255,0.22);
    border-color: rgba(255,255,255,0.5);
  }
`;

export class LectureLightStageView extends ItemView {
	private channel: BroadcastChannel | null = null;

	getViewType(): string  { return VIEW_TYPE_STAGE; }
	getDisplayText(): string { return 'Stage'; }
	getIcon(): string      { return 'monitor'; }

	async onOpen(): Promise<void> {
		// Use the ownerDocument/window of the container so this works correctly
		// in both the main window and popout windows.
		const doc = this.contentEl.ownerDocument;
		const win = doc.defaultView!;

		this.contentEl.empty();

		// Inject styles into this window's <head> (auto-removed on close via register)
		const styleEl = doc.createElement('style');
		styleEl.id    = 'll-stage-styles';
		styleEl.textContent = STAGE_STYLES;
		doc.head.appendChild(styleEl);
		this.register(() => styleEl.remove());

		// ── DOM ──────────────────────────────────────────────────────────────
		const viewport = this.contentEl.createDiv({ cls: 'ls-viewport' });
		const canvas   = viewport.createDiv({ cls: 'ls-canvas' });

		const waiting  = canvas.createDiv({ cls: 'ls-waiting' });
		waiting.createDiv({ cls: 'ls-waiting-icon', text: '🎞' });
		waiting.createSpan({ text: 'Waiting for presenter\u2026' });

		const content = canvas.createDiv({ cls: 'ls-content' });

		// Fullscreen hint bar — hidden by CSS when :fullscreen, visible otherwise.
		// No JS show/hide needed; toggling is handled entirely by the CSS rule
		// `.ls-viewport:fullscreen .ls-fs-bar { display: none }` above.
		const fsBar = viewport.createDiv({ cls: 'ls-fs-bar' });
		const fsBtn = fsBar.createEl('button', {
			cls:  'ls-fs-btn',
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			text: '⊡  Go fullscreen  ·  F',
		});

		// ── Scale canvas to fill window at any resolution ─────────────────────
		const rescale = (): void => {
			const scale = Math.min(win.innerWidth / 1920, win.innerHeight / 1080);
			canvas.style.transform = `scale(${scale})`;
		};
		rescale();
		this.registerDomEvent(win, 'resize', rescale);

		// ── BroadcastChannel ──────────────────────────────────────────────────
		const ch = new BroadcastChannel('lecturelight-stage');
		this.channel = ch;

		ch.addEventListener('message', (e: MessageEvent) => {
			const msg = e.data as { type: string; htmlContent?: string; light?: boolean; layout?: string };
			if (msg.type === 'slide-change') {
				waiting.addClass('ls-hidden');
				content.addClass('ls-visible');
				// eslint-disable-next-line @microsoft/sdl/no-inner-html
				content.innerHTML = DOMPurify.sanitize(msg.htmlContent ?? '');
				content.toggleClass('ls-layout-bleed', msg.layout === 'bleed');
			} else if (msg.type === 'theme-change') {
				canvas.toggleClass('ls-light', msg.light ?? false);
			}
		});

		// ── Fullscreen helpers ────────────────────────────────────────────────
		const enterFullscreen = (): void => {
			viewport.requestFullscreen().catch(() => { /* browser may deny on some platforms */ });
		};
		const toggleFullscreen = (): void => {
			if (doc.fullscreenElement) doc.exitFullscreen().catch(() => { /* ignored */ });
			else enterFullscreen();
		};

		// Give the viewport keyboard focus so the F key works without the user
		// having to click first.  tabIndex = -1 means focusable by script only
		// (not reachable via Tab), and outline: none (in CSS above) suppresses
		// the browser focus ring.
		viewport.tabIndex = -1;
		viewport.focus();

		// Re-focus the viewport after Esc exits fullscreen so F still works.
		this.registerDomEvent(doc, 'fullscreenchange', () => {
			if (!doc.fullscreenElement) viewport.focus();
		});

		// Button is the primary affordance (especially after moving to a new display)
		this.registerDomEvent(fsBtn, 'click', (e: MouseEvent) => {
			e.stopPropagation();
			enterFullscreen();
		});

		// F key — listen on win rather than doc; in Obsidian's Electron popout
		// the window-level listener fires even when doc focus is ambiguous.
		this.registerDomEvent(win, 'keydown', (e: KeyboardEvent) => {
			if (e.key === 'f' || e.key === 'F') toggleFullscreen();
		});
	}

	async onClose(): Promise<void> {
		this.channel?.close();
		this.channel = null;
	}
}
