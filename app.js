// Eng Lessons — Miro App entrypoint.
// Click icon → open panel with lesson picker.
// Click App Card on the board → open the chosen lesson in the chosen mode.

const ENG_VERSION = '2026-05-18-v11';
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
    const url = `lesson-frame.html?lesson=${encodeURIComponent(lessonId)}&mode=${mode}&v=${Date.now()}`;
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

  // Listen for switch requests from the lesson iframe (miro-toggle.js).
  // The iframe can't close its own container and open another without
  // tearing itself down — so it broadcasts the intent and we do it here.
  try {
    const bc = new BroadcastChannel('eng-app');
    bc.onmessage = async (e) => {
      const m = e && e.data;
      if (!m || m.type !== 'switch') return;
      console.log('[eng app] switch request:', m);
      const url = `lesson-frame.html?lesson=${encodeURIComponent(m.lessonId)}&mode=${m.to}&v=${Date.now()}`;
      try {
        if (m.from === 'modal') await miro.board.ui.closeModal();
        if (m.from === 'panel') await miro.board.ui.closePanel();
      } catch (err) {
        console.warn('[eng app] close before switch failed (ignoring):', err && err.message);
      }
      try {
        if (m.to === 'panel') {
          await miro.board.ui.openPanel({ url });
        } else {
          await miro.board.ui.openModal({ url, fullscreen: true });
        }
        console.log('[eng app] switch done →', m.to);
      } catch (err) {
        console.error('[eng app] open after switch failed:', err, '— name:', err && err.name, '— message:', err && err.message);
      }
    };
    console.log('[eng app] BroadcastChannel(eng-app) listener armed');
  } catch (e) {
    console.warn('[eng app] BroadcastChannel not available', e);
  }

  console.log('[eng app] init complete — icon + app_card:open + switch listeners armed');
}

init().catch(err => console.error('[eng app] init failed', err));
