/**
 * Full HTML document for the stage (audience-facing) window.
 * Content is laid out at a 1920×1080 reference canvas, then scaled via
 * CSS transform to fill the actual window — works from 1280×720 up to 4K.
 *
 * Communication with the presenter console uses BroadcastChannel('lecturelight-stage').
 */
export const STAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LectureLight Stage</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 100%; height: 100%;
    background: #000;
    overflow: hidden;
    cursor: none;
  }

  /* Viewport wrapper — always fills the window */
  #viewport {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  /* Reference canvas at 1920×1080; scaled to fill actual window */
  #canvas {
    width: 1920px;
    height: 1080px;
    background: #000;
    position: relative;
    overflow: hidden;
    transform-origin: center center;
    will-change: transform;
    -webkit-font-smoothing: antialiased;
  }

  /* Slide content area */
  #content {
    position: absolute;
    inset: 0;
    padding: 80px 96px;
    color: #f1f5f9;
    font-family: system-ui, sans-serif;
    font-size: 40px;
    line-height: 1.5;
    overflow: hidden;
  }

  #content h1 { font-size: 96px; font-weight: 900; line-height: 1.1; margin-bottom: 32px; color: #f8fafc; }
  #content h2 { font-size: 72px; font-weight: 800; line-height: 1.15; margin-bottom: 24px; color: #e2e8f0; }
  #content h3 { font-size: 56px; font-weight: 700; line-height: 1.2; margin-bottom: 20px; color: #cbd5e1; }
  #content p  { margin-bottom: 24px; }
  #content ul,
  #content ol  { padding-left: 64px; margin-bottom: 24px; }
  #content li  { margin-bottom: 12px; }
  #content strong { font-weight: 800; }
  #content code {
    font-family: monospace;
    background: rgba(255,255,255,0.12);
    padding: 4px 14px;
    border-radius: 8px;
    font-size: 0.85em;
  }
  #content pre {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 32px 40px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  #content pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 36px;
    line-height: 1.5;
  }
  #content img {
    max-width: 100%;
    max-height: 800px;
    image-rendering: high-quality;
    border-radius: 12px;
  }

  /* Waiting state */
  #waiting {
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

  #waiting .icon { font-size: 120px; opacity: 0.4; }

  /* Slide counter */
  #counter {
    position: absolute;
    bottom: 32px;
    right: 48px;
    font-family: system-ui, sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: rgba(255,255,255,0.2);
    display: none;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
  }
</style>
</head>
<body>
<div id="viewport">
  <div id="canvas">
    <div id="waiting">
      <span class="icon">🎞</span>
      Waiting for presenter\u2026
    </div>
    <div id="content" style="display:none"></div>
    <div id="counter"></div>
  </div>
</div>

<script>
  // ── Scale canvas to fill window ──────────────────────────────────────────
  const canvas = document.getElementById('canvas');

  function rescale() {
    const scaleX = window.innerWidth  / 1920;
    const scaleY = window.innerHeight / 1080;
    const scale  = Math.min(scaleX, scaleY);
    canvas.style.transform = 'scale(' + scale + ')';
  }

  rescale();
  window.addEventListener('resize', rescale);

  // ── BroadcastChannel ─────────────────────────────────────────────────────
  const channel = new BroadcastChannel('lecturelight-stage');
  const waiting = document.getElementById('waiting');
  const content = document.getElementById('content');
  const counter = document.getElementById('counter');

  channel.addEventListener('message', function(e) {
    const msg = e.data;
    if (msg.type !== 'slide-change') return;

    waiting.style.display = 'none';
    content.style.display  = 'block';
    counter.style.display  = 'block';

    content.innerHTML = msg.htmlContent || '';
    counter.textContent = (msg.index + 1) + ' / ' + msg.total;
  });

  // ── Fullscreen toggle (click or F key) ───────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function() {});
    } else {
      document.exitFullscreen().catch(function() {});
    }
  }

  document.addEventListener('click', toggleFullscreen);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
</script>
</body>
</html>`;
