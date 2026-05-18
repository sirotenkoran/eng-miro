// Thin wrapper around the Miro Web SDK v2.
// Loaded as an ES module from panel.html / dashboard view.
// Assumes `window.miro` exists; if not, calls throw — caller should handle.

export function debounce(fn, ms) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

let _user = null;
let _board = null;

export async function getIdentity() {
  if (_user) return _user;
  _user = await miro.board.getUserInfo();
  return _user;
}

export async function getBoard() {
  if (_board) return _board;
  _board = await miro.board.getInfo();
  return _board;
}

export async function getKey(key) {
  return await miro.board.getAppData(key);
}

export async function setKey(key, value) {
  return await miro.board.setAppData(key, value);
}

export async function getAll() {
  return await miro.board.getAppData();
}

export async function readByPrefix(prefix) {
  const all = await getAll();
  const out = {};
  if (!all || typeof all !== 'object') return out;
  for (const k of Object.keys(all)) {
    if (k.indexOf(prefix) === 0) out[k] = all[k];
  }
  return out;
}

const SETTINGS_KEY = 'eng:settings';

export async function getSettings() {
  const s = await getKey(SETTINGS_KEY);
  return s || { teacherIds: [], shareProgressWithStudents: false };
}

export async function setSettings(next) {
  await setKey(SETTINGS_KEY, next);
}

export async function isTeacher() {
  const me = await getIdentity();
  let ownerId = null;
  try {
    const b = await getBoard();
    ownerId = (b && b.owner && (b.owner.id || b.owner)) || b?.ownerId || null;
  } catch (_) {}
  if (ownerId && String(me.id) === String(ownerId)) return true;
  const settings = await getSettings();
  return Array.isArray(settings.teacherIds) && settings.teacherIds.includes(me.id);
}

export function progressKey(lessonId, userId) {
  return `eng:progress:${lessonId}:${userId}`;
}

export async function getProgress(lessonId, userId) {
  return (await getKey(progressKey(lessonId, userId))) || null;
}

export async function setProgress(lessonId, userId, payload) {
  return await setKey(progressKey(lessonId, userId), payload);
}

export async function readAllProgress() {
  const data = await readByPrefix('eng:progress:');
  const rows = [];
  for (const [key, val] of Object.entries(data)) {
    const parts = key.split(':');
    if (parts.length !== 4) continue;
    const [, , lessonId, userId] = parts;
    rows.push({ lessonId, userId, ...val });
  }
  return rows;
}
