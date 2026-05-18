// Show a floating button to switch between Miro modal (fullscreen) and
// side panel when this page is loaded inside a Miro app frame.
// Activated only when the URL has ?mode=modal or ?mode=panel and we're
// inside an iframe — standalone usage stays untouched.
//
// Switching is done by asking app.js (running in a separate Miro frame)
// to close the current container and open the other one — doing it
// ourselves would tear down our own iframe mid-call.

const ENG_VERSION = '2026-05-18-v9';

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode !== 'modal' && mode !== 'panel') return;
  if (window.parent === window) return;

  console.log('%c[eng toggle] version ' + ENG_VERSION + ' loaded — mode=' + mode,
              'color:#4262ff;font-weight:bold');

  const here = window.location.pathname.split('/').pop() || 'lead-in.html';
  const lessonId = (here.match(/^([\w-]+)\.html$/) || [])[1] || 'lead-in';

  let bc = null;
  try {
    bc = new BroadcastChannel('eng-app');
  } catch (e) {
    console.warn('[eng toggle] BroadcastChannel not available', e);
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

  btn.onclick = () => {
    btn.disabled = true;
    btn.textContent = 'Switching…';
    const next = mode === 'modal' ? 'panel' : 'modal';
    const payload = { type: 'switch', from: mode, to: next, lessonId };
    console.log('[eng toggle] requesting switch', payload);
    if (bc) {
      bc.postMessage(payload);
    } else {
      console.error('[eng toggle] no BroadcastChannel — cannot ask app.js to switch');
    }
  };

  function mount() {
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
