// Eng Lessons — MVP entrypoint.
// Single-user, no storage, no dashboard. Click the icon → fullscreen modal
// with the lead-in lesson. Solve, close, done.

console.log('[eng] app.js loaded at', new Date().toISOString());

async function init() {
  if (typeof miro === 'undefined' || !miro.board) {
    console.warn('[eng] miro SDK not available');
    return;
  }

  await miro.board.ui.on('icon:click', async () => {
    const url = 'lead-in.html?mode=modal&v=' + Date.now();
    console.log('[eng] icon clicked, opening modal:', url);
    try {
      await miro.board.ui.openModal({ url, fullscreen: true });
      console.log('[eng] openModal resolved');
    } catch (e) {
      console.error('[eng] openModal failed:', e, '— name:', e && e.name, '— message:', e && e.message);
    }
  });

  console.log('[eng] init complete — icon ready');
}

init().catch(err => console.error('[eng] init failed', err));
