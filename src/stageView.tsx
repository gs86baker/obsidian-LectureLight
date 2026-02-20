import { ItemView, WorkspaceLeaf } from 'obsidian';

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
    cursor: none;
  }

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
  .ls-content img { max-width: 100%; max-height: 800px; image-rendering: high-quality; border-radius: 12px; }

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

		// ── Scale canvas to fill window at any resolution ─────────────────────
		const rescale = (): void => {
			const scale = Math.min(win.innerWidth / 1920, win.innerHeight / 1080);
			canvas.style.transform = `scale(${scale})`;
		};
		rescale();
		this.registerDomEvent(win as Window & typeof globalThis, 'resize', rescale);

		// ── BroadcastChannel ──────────────────────────────────────────────────
		const ch = new BroadcastChannel('lecturelight-stage');
		this.channel = ch;

		ch.addEventListener('message', (e: MessageEvent) => {
			const msg = e.data as { type: string; htmlContent: string; index: number; total: number };
			if (msg.type !== 'slide-change') return;
			waiting.style.display = 'none';
			content.style.display = 'block';
			content.innerHTML     = msg.htmlContent ?? '';
		});

		// ── Fullscreen toggle: click anywhere or press F ──────────────────────
		// Request fullscreen on the viewport element (not documentElement) so
		// the request originates from within Obsidian's popout window context.
		// Listen on doc so clicks on injected slide HTML always reach the handler.
		const toggleFullscreen = (): void => {
			if (!doc.fullscreenElement) {
				viewport.requestFullscreen().catch(() => { /* ignored */ });
			} else {
				doc.exitFullscreen().catch(() => { /* ignored */ });
			}
		};

		this.registerDomEvent(doc as Document, 'click', toggleFullscreen);
		this.registerDomEvent(doc as Document, 'keydown', (e: KeyboardEvent) => {
			if (e.key === 'f' || e.key === 'F') toggleFullscreen();
		});
	}

	async onClose(): Promise<void> {
		this.channel?.close();
		this.channel = null;
	}
}
