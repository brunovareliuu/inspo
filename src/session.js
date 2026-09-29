import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Sessions live next to the project that asked for them: <cwd>/.inspo/<id>/ */
export const SESSIONS_DIR = process.env.INSPO_DIR || path.join(process.cwd(), '.inspo');

export function slugify(s, max = 48) {
  return (
    String(s || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/g, '') || 'session'
  );
}

export const shortId = (n = 6) => crypto.randomBytes(8).toString('base64url').replace(/[-_]/g, '').slice(0, n).toLowerCase();

export const sessionDir = (id) => path.join(SESSIONS_DIR, id);
export const assetsDir = (id) => path.join(SESSIONS_DIR, id, 'assets');

const locks = new Map();
/** Serialize read-modify-write cycles per file so parallel tool calls don't clobber each other. */
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJSON(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

export async function createSession({ title, idea, context = {}, copy = null }) {
  let id = slugify(title || idea, 40);
  if (existsSync(sessionDir(id))) id = `${id}-${shortId(4)}`;
  await fs.mkdir(assetsDir(id), { recursive: true });
  const now = new Date().toISOString();
  const session = { id, title: title || idea.slice(0, 60), idea, context, copy, round: 1, createdAt: now, updatedAt: now, items: [], brief: null };
  await writeJSON(path.join(sessionDir(id), 'session.json'), session);
  await writeJSON(path.join(sessionDir(id), 'feedback.json'), emptyFeedback());
  await ensureGitignore();
  return session;
}

async function ensureGitignore() {
  const file = path.join(SESSIONS_DIR, '.gitignore');
  if (!existsSync(file)) await fs.writeFile(file, '# inspo research sessions (screenshots, votes)\n*\n').catch(() => {});
}

export const emptyFeedback = () => ({ items: {}, general: '', submittedAt: null, submissions: 0, updatedAt: null });

export async function loadSession(id) {
  if (!id) id = await latestSessionId();
  if (!id) throw new Error('No inspo session yet. Call inspo_start first.');
  const s = await readJSON(path.join(sessionDir(id), 'session.json'), null);
  if (!s) throw new Error(`Session "${id}" not found in ${SESSIONS_DIR}`);
  return s;
}

export function updateSession(id, mutate) {
  const file = path.join(sessionDir(id), 'session.json');
  return withLock(file, async () => {
    const s = await readJSON(file, null);
    if (!s) throw new Error(`Session "${id}" not found`);
    const out = (await mutate(s)) ?? s;
    s.updatedAt = new Date().toISOString();
    await writeJSON(file, s);
    return out;
  });
}

/** Append items, skipping ones whose url/image we already have. Returns the items actually added. */
export function addItems(id, items) {
  return updateSession(id, (s) => {
    const seen = new Set(s.items.flatMap((i) => [i.url, i.liveUrl, i.image && !i.image.startsWith('assets/') ? i.image : null].filter(Boolean)));
    const added = [];
    for (const item of items) {
      const keys = [item.url, item.liveUrl].filter(Boolean);
      if (item.kind === 'reference' && keys.some((k) => seen.has(k))) continue;
      keys.forEach((k) => seen.add(k));
      const full = { id: item.id || `${item.kind[0]}-${shortId()}`, round: s.round, addedAt: new Date().toISOString(), tags: [], ...item };
      s.items.push(full);
      added.push(full);
    }
    return added;
  });
}

export function patchItem(id, itemId, patch) {
  return updateSession(id, (s) => {
    const item = s.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    Object.assign(item, patch);
    return item;
  });
}

export async function loadFeedback(id) {
  return readJSON(path.join(sessionDir(id), 'feedback.json'), emptyFeedback());
}

export function saveFeedback(id, incoming) {
  const file = path.join(sessionDir(id), 'feedback.json');
  return withLock(file, async () => {
    const fb = await readJSON(file, emptyFeedback());
    if (incoming.items && typeof incoming.items === 'object') {
      for (const [itemId, v] of Object.entries(incoming.items)) {
        if (!v || typeof v !== 'object') continue;
        fb.items[itemId] = {
          vote: [1, 0, -1].includes(v.vote) ? v.vote : 0,
          star: Boolean(v.star),
          note: String(v.note || '').slice(0, 2000),
          reasons: Array.isArray(v.reasons) ? v.reasons.map(String).slice(0, 12) : [],
          at: new Date().toISOString(),
        };
      }
    }
    if (typeof incoming.general === 'string') fb.general = incoming.general.slice(0, 5000);
    if (incoming.submit) {
      fb.submittedAt = new Date().toISOString();
      fb.submissions = (fb.submissions || 0) + 1;
    }
    fb.updatedAt = new Date().toISOString();
    await writeJSON(file, fb);
    return fb;
  });
}

export async function listSessions() {
  let names = [];
  try {
    names = await fs.readdir(SESSIONS_DIR);
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    const s = await readJSON(path.join(SESSIONS_DIR, n, 'session.json'), null);
    if (s) out.push({ id: s.id, title: s.title, idea: s.idea, round: s.round, items: s.items.length, updatedAt: s.updatedAt });
  }
  return out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function latestSessionId() {
  return (await listSessions())[0]?.id;
}
