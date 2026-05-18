// Show a floating button to switch between Miro modal (fullscreen) and
// side panel when this page is loaded inside a Miro app frame.
// Activated only when the URL has ?mode=modal or ?mode=panel and we're
// inside an iframe — standalone usage stays untouched.

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode !== 'modal' && mode !== 'panel') return;
  if (window.parent === window) return;

  const sdk = document.createElement('script');
  sdk.src = 'https://miro.com/app/static/sdk/v2/miro.js';
  sdk.onload = mount;
  sdk.onerror = () => console.warn('[eng toggle] failed to load Miro SDK');
  document.head.appendChild(sdk);

  function mount() {
    if (typeof miro === 'undefined' || !miro.board || !miro.board.ui) {
      console.warn('[eng toggle] miro.board.ui not available');
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'eng-mode-toggle';
    btn.textContent = mode === 'modal' ? '← Side panel' : 'Fullscreen ⤢';
    btn.title = mode === 'modal' ? 'Reopen as side panel' : 'Reopen as fullscreen';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '99999',
      padding: '8px 14px',
      background: '#1a1a1a',
      color: '#fff',
      border: '0',
      borderRadius: '8px',
      font: '500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      opacity: '0.85',
    });
    btn.onmouseenter = () => (btn.style.opacity = '1');
    btn.onmouseleave = () => (btn.style.opacity = '0.85');

    btn.onclick = async () => {
      btn.disabled = true;
      const here = window.location.pathname.split('/').pop() || 'lead-in.html';
      const next = mode === 'modal' ? 'panel' : 'modal';
      const url = `${here}?mode=${next}&v=${Date.now()}`;
      // Don't call closeModal/closePanel — that tears down our iframe
      // mid-await and the open* call below never fires. Miro auto-closes
      // the currently-open container when a different kind is opened.
      try {
        if (mode === 'modal') {
          await miro.board.ui.openPanel({ url });
        } else {
          await miro.board.ui.openModal({ url, fullscreen: true });
        }
      } catch (e) {
        console.error('[eng toggle] switch failed', e, '— name:', e && e.name, '— message:', e && e.message);
        btn.disabled = false;
      }
    };

    document.body.appendChild(btn);
  }
})();
