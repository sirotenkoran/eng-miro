// Eng Lessons — Miro App entrypoint.
// Registered as the SDK URI of the app. Runs on every board where the app is installed.

console.log('[eng] app.js loaded at', new Date().toISOString(),
            '— miro present:', typeof miro,
            '— miro.board present:', typeof (typeof miro !== 'undefined' && miro.board));

async function init() {
  if (typeof miro === 'undefined' || !miro.board) {
    console.warn('[eng] miro SDK not available — Miro did not inject it. Is this running inside a board?');
    return;
  }

  console.log('[eng] registering UI event listeners');

  const cb = () => 'v=' + Date.now();

  await miro.board.ui.on('icon:click', async () => {
    const url = `panel.html?${cb()}`;
    console.log('[eng] icon clicked, opening panel', url);
    await miro.board.ui.openPanel({ url });
  });

  await miro.board.ui.on('app_card:open', async (event) => {
    console.log('[eng] app_card:open', event);
    const card = event && event.appCard;
    let lessonId = null;
    if (card && Array.isArray(card.fields)) {
      const f = card.fields.find(x => x && x.value);
      if (f) lessonId = f.value;
    }
    const url = lessonId
      ? `panel.html?lesson=${encodeURIComponent(lessonId)}&${cb()}`
      : `panel.html?${cb()}`;
    await miro.board.ui.openPanel({ url });
  });

  console.log('[eng] init complete — icon should now be live');
}

init().catch(err => console.error('[eng] init failed', err));
