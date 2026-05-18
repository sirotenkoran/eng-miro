// Eng Lessons — Miro App entrypoint.
// Registered as the SDK URI of the app. Runs on every board where the app is installed.

async function init() {
  if (typeof miro === 'undefined' || !miro.board) {
    console.warn('[eng] miro SDK not available');
    return;
  }

  await miro.board.ui.on('icon:click', async () => {
    await miro.board.ui.openPanel({ url: 'panel.html' });
  });

  await miro.board.ui.on('app_card:open', async (event) => {
    const card = event && event.appCard;
    let lessonId = null;
    if (card && Array.isArray(card.fields)) {
      const f = card.fields.find(x => x && x.value);
      if (f) lessonId = f.value;
    }
    const url = lessonId
      ? `panel.html?lesson=${encodeURIComponent(lessonId)}`
      : 'panel.html';
    await miro.board.ui.openPanel({ url });
  });
}

init().catch(err => console.error('[eng] init failed', err));
