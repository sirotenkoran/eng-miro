import {
  debounce,
  getIdentity,
  isTeacher,
  getSettings,
  setSettings,
  getProgress,
  setProgress,
  readAllProgress,
} from './sdk-bridge.js';

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('lesson');

const frame = document.getElementById('lesson-frame');
const emptyMsg = document.getElementById('lesson-empty');

let me = null;
let lessons = null;
let local = { tasks: {}, completed: 0, total: 0 };
let initialized = false;

(async function bootstrap() {
  console.log('[eng panel] bootstrap start',
    '— miro present:', typeof window.miro,
    '— miro.board present:', typeof (window.miro && window.miro.board),
    '— miro.board.getUserInfo present:', typeof (window.miro && window.miro.board && window.miro.board.getUserInfo));

  try {
    me = await getIdentity();
    console.log('[eng panel] getIdentity ok', me);
  } catch (e) {
    console.error('[eng panel] getIdentity failed:', e, '— name:', e && e.name, '— message:', e && e.message, '— code:', e && e.code);
    showError('Cannot read Miro user info: ' + ((e && (e.message || e.name)) || String(e)));
    return;
  }

  try {
    const r = await fetch('lessons.json', { cache: 'no-cache' });
    lessons = await r.json();
  } catch (e) {
    lessons = { lessons: [{ id: 'lead-in', title: 'Lead-in', file: 'lead-in.html' }] };
  }

  if (lessonId) {
    const lesson = (lessons.lessons || []).find(l => l.id === lessonId);
    const file = lesson ? lesson.file : `${lessonId}.html`;
    frame.src = `${file}?embed=miro&lesson=${encodeURIComponent(lessonId)}`;

    const existing = await getProgress(lessonId, me.id);
    if (existing) {
      local = {
        tasks: existing.tasks || {},
        completed: existing.completed || 0,
        total: existing.total || 0,
      };
    }
  } else {
    frame.classList.add('hidden');
    let teacher = false;
    try {
      teacher = await isTeacher();
      console.log('[eng panel] isTeacher returned', teacher);
    } catch (e) {
      console.error('[eng panel] isTeacher threw', e);
    }
    try {
      const boardInfo = await window.miro.board.getInfo();
      console.log('[eng panel] miro.board.getInfo() →', boardInfo);
    } catch (e) {
      console.error('[eng panel] getInfo threw', e);
    }
    // For the prototype: always show the picker. Role-based gating returns once
    // we know what fields getInfo() actually exposes for owner detection.
    renderPicker();
  }

  setupTabs();
  initialized = true;
})();

function renderPicker() {
  const picker = document.getElementById('lesson-picker');
  const list = document.getElementById('picker-list');
  picker.classList.remove('hidden');
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
  try {
    await miro.board.createAppCard({
      title: lesson.title,
      description: lesson.description || '',
      fields: [{ value: lesson.id, tooltip: 'lessonId' }],
    });
    btn.textContent = 'Added ✓';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
    }, 1200);
  } catch (e) {
    console.error('[eng] createAppCard failed', e);
    btn.textContent = 'Failed — see console';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
    }, 2000);
  }
}

function showError(text) {
  document.body.innerHTML = `<div class="fatal">${text}</div>`;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panes = document.querySelectorAll('.tab-pane');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panes.forEach(p =>
        p.classList.toggle('active', p.id === 'tab-' + t.dataset.tab)
      );
      if (t.dataset.tab === 'dashboard') renderDashboard();
    });
  });
  document.getElementById('refresh-btn').addEventListener('click', renderDashboard);
}

const persist = debounce(async () => {
  if (!me || !lessonId) return;
  await setProgress(lessonId, me.id, {
    name: me.name || 'Anonymous',
    tasks: local.tasks,
    completed: local.completed,
    total: local.total,
    updatedAt: Date.now(),
  });
}, 800);

window.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || msg.source !== 'eng-tracker') return;
  if (msg.lessonId && lessonId && msg.lessonId !== lessonId) return;

  if (msg.type === 'init') {
    local.total = msg.total || 0;
    persist();
  } else if (msg.type === 'task-complete' && msg.taskId) {
    local.tasks[msg.taskId] = 'done';
    local.completed = Object.values(local.tasks).filter(s => s === 'done').length;
    persist();
  } else if (msg.type === 'attempt' && msg.taskId && msg.correct) {
    if (!local.tasks[msg.taskId]) {
      local.tasks[msg.taskId] = 'attempted';
      persist();
    }
  }
});

async function renderDashboard() {
  const root = document.getElementById('dashboard-content');
  const settingsBox = document.getElementById('dashboard-settings');
  root.innerHTML = 'Loading…';

  let teacher = false;
  try {
    teacher = await isTeacher();
  } catch (_) {}

  const settings = await getSettings();
  const canSeeAll = teacher || !!settings.shareProgressWithStudents;

  const rows = await readAllProgress();
  const visible = canSeeAll ? rows : rows.filter(r => r.userId === me.id);

  if (visible.length === 0) {
    root.innerHTML = '<p class="empty">No progress recorded yet. Solve a task to see it here.</p>';
  } else {
    const byUser = {};
    for (const r of visible) {
      byUser[r.userId] = byUser[r.userId] || { name: r.name || '(unnamed)', byLesson: {} };
      byUser[r.userId].byLesson[r.lessonId] = r;
    }
    const lessonIds = Array.from(new Set(visible.map(r => r.lessonId))).sort();

    let html = '<table class="dash"><thead><tr><th>Student</th>';
    for (const lid of lessonIds) html += `<th>${escapeHtml(lid)}</th>`;
    html += '</tr></thead><tbody>';
    for (const [uid, info] of Object.entries(byUser)) {
      const isMe = uid === me.id;
      html += `<tr${isMe ? ' class="me"' : ''}><td>${escapeHtml(info.name)}${isMe ? ' (you)' : ''}</td>`;
      for (const lid of lessonIds) {
        const cell = info.byLesson[lid];
        html += `<td>${cell ? `${cell.completed} / ${cell.total}` : '—'}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    root.innerHTML = html;
  }

  if (teacher) {
    settingsBox.classList.remove('hidden');
    const toggle = document.getElementById('share-toggle');
    toggle.checked = !!settings.shareProgressWithStudents;
    toggle.onchange = async () => {
      await setSettings(Object.assign({}, settings, {
        shareProgressWithStudents: toggle.checked,
      }));
    };
  } else {
    settingsBox.classList.add('hidden');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
