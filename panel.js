// Eng Lessons — lesson picker panel.
// Lists available lessons; clicking one drops an App Card on the board
// with the lessonId and chosen open-mode (modal/panel) encoded into fields.

const ENG_VERSION = '2026-05-18-v10';
console.log('%c[eng panel] version ' + ENG_VERSION + ' loaded at ' + new Date().toISOString(),
            'color:#4262ff;font-weight:bold');

const DEFAULT_LESSONS = {
  lessons: [
    { id: 'lead-in', title: 'Lead-in', file: 'lead-in.html',
      description: 'Numbers, alphabet, colours, days, classroom objects.' },
  ],
};

(async function bootstrap() {
  const versionTag = document.getElementById('version-tag');
  if (versionTag) versionTag.textContent = 'v' + ENG_VERSION;

  if (typeof miro === 'undefined' || !miro.board) {
    showError('Miro SDK is not loaded. Open this through the Miro app icon, not directly.');
    return;
  }

  let lessons = DEFAULT_LESSONS;
  try {
    const r = await fetch('lessons.json?v=' + Date.now(), { cache: 'no-cache' });
    if (r.ok) lessons = await r.json();
  } catch (e) {
    console.warn('[eng panel] lessons.json fetch failed, using default', e);
  }

  renderPicker(lessons);
})();

function getSelectedMode() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return (checked && checked.value) === 'panel' ? 'panel' : 'modal';
}

function renderPicker(lessons) {
  const list = document.getElementById('picker-list');
  list.innerHTML = '';
  for (const lesson of (lessons.lessons || [])) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-item';
    btn.innerHTML = `<strong>${escapeHtml(lesson.title)}</strong>` +
      (lesson.description ? `<span>${escapeHtml(lesson.description)}</span>` : '');
    btn.addEventListener('click', () => addLessonCard(lesson, btn));
    li.appendChild(btn);
    list.appendChild(li);
  }
}

async function addLessonCard(lesson, btn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Adding…';
  const mode = getSelectedMode();
  console.log('[eng panel] creating app card for', lesson.id, 'mode:', mode);
  try {
    await miro.board.createAppCard({
      title: lesson.title,
      description: (lesson.description || '') + (mode === 'panel' ? ' (side panel)' : ' (fullscreen)'),
      status: 'connected',
      fields: [
        { value: lesson.id, tooltip: 'lessonId' },
        { value: mode,      tooltip: 'mode' },
      ],
    });
    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1200);
  } catch (e) {
    console.error('[eng panel] createAppCard failed', e, '— name:', e && e.name, '— message:', e && e.message);
    btn.textContent = 'Failed — see console';
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2000);
  }
}

function showError(text) {
  const box = document.getElementById('error');
  if (!box) return;
  box.style.display = 'block';
  box.textContent = text;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
