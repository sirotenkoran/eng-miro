// Eng Lessons — Miro App entrypoint.
// Click icon → open panel with lesson picker.
// Click App Card on the board → open the chosen lesson in the chosen mode.

const ENG_VERSION = '2026-05-18-v8';
console.log('%c[eng app] version ' + ENG_VERSION + ' loaded at ' + new Date().toISOString(),
            'color:#4262ff;font-weight:bold');

async function init() {
  if (typeof miro === 'undefined' || !miro.board) {
    console.warn('[eng app] miro SDK not available');
    return;
  }

  await miro.board.ui.on('icon:click', async () => {
    const url = 'panel.html?v=' + Date.now();
    console.log('[eng app] icon clicked → openPanel', url);
    try {
      await miro.board.ui.openPanel({ url });
    } catch (e) {
      console.error('[eng app] openPanel failed:', e, '— name:', e && e.name, '— message:', e && e.message);
    }
  });

  await miro.board.ui.on('app_card:open', async (event) => {
    const card = event && event.appCard;
    let lessonId = null;
    let mode = 'modal';
    if (card && Array.isArray(card.fields)) {
      const lf = card.fields.find(f => f && f.tooltip === 'lessonId');
      const mf = card.fields.find(f => f && f.tooltip === 'mode');
      if (lf) lessonId = lf.value;
      if (mf && (mf.value === 'panel' || mf.value === 'modal')) mode = mf.value;
    }
    console.log('[eng app] app_card:open — lessonId:', lessonId, 'mode:', mode);
    if (!lessonId) {
      console.warn('[eng app] app_card has no lessonId, ignoring');
      return;
    }
    const url = `${lessonId}.html?mode=${mode}&v=${Date.now()}`;
    try {
      if (mode === 'panel') {
        await miro.board.ui.openPanel({ url });
      } else {
        await miro.board.ui.openModal({ url, fullscreen: true });
      }
    } catch (e) {
      console.error('[eng app] open from card failed:', e, '— name:', e && e.name, '— message:', e && e.message);
    }
  });

  console.log('[eng app] init complete — icon + app_card:open listeners armed');
}

init().catch(err => console.error('[eng app] init failed', err));
