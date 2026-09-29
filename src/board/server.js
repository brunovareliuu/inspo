import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { SESSIONS_DIR, loadSession, loadFeedback, saveFeedback, listSessions, latestSessionId, removeItems, assetsDir, shortId } from '../session.js';
import { listLibrary, readLibraryComponent } from '../components.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mjs': 'text/javascript',
};

let running = null;

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function sendFile(res, file) {
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' });
    res.end(data);
  } catch {
    send(res, 404, { error: 'not found' });
  }
}

/** Resolve a path inside a base dir, refusing anything that escapes it. */
function inside(base, rel) {
  const full = path.resolve(base, rel);
  return full.startsWith(path.resolve(base) + path.sep) ? full : null;
}

async function readBody(req, limit = 2_000_000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  if (p === '/' || p === '/index.html') return sendFile(res, path.join(HERE, 'app.html'));

  if (p === '/api/state') {
    const id = url.searchParams.get('session') || (await latestSessionId());
    if (!id) return send(res, 200, { session: null, sessions: [] });
    const [session, feedback, library, sessions] = await Promise.all([loadSession(id), loadFeedback(id), listLibrary(), listSessions()]);
    return send(res, 200, { session, feedback, library, sessions });
  }

  if (p === '/api/feedback' && req.method === 'POST') {
    const id = url.searchParams.get('session');
    if (!id || !/^[a-z0-9-]+$/.test(id)) return send(res, 400, { error: 'session required' });
    try {
      const fb = await saveFeedback(id, await readBody(req));
      return send(res, 200, { ok: true, updatedAt: fb.updatedAt, submittedAt: fb.submittedAt });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  // Image the user attaches to a comment (raw body, image/*). Saved as assets/u-<id>.<ext>.
  if (p === '/api/upload' && req.method === 'POST') {
    const id = url.searchParams.get('session');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }[(req.headers['content-type'] || '').split(';')[0]];
    if (!id || !/^[a-z0-9-]+$/.test(id) || !ext) return send(res, 400, { error: 'session and an image content-type required' });
    try {
      let size = 0;
      const chunks = [];
      for await (const c of req) {
        size += c.length;
        if (size > 12_000_000) return send(res, 413, { error: 'image too large (12 MB max)' });
        chunks.push(c);
      }
      const file = `u-${shortId(10)}.${ext}`;
      await fs.mkdir(assetsDir(id), { recursive: true });
      await fs.writeFile(path.join(assetsDir(id), file), Buffer.concat(chunks));
      return send(res, 200, { path: `assets/${file}` });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  // "Not a footer": the user removes a misfiled reference from the board.
  if (p === '/api/remove' && req.method === 'POST') {
    const id = url.searchParams.get('session');
    if (!id || !/^[a-z0-9-]+$/.test(id)) return send(res, 400, { error: 'session required' });
    try {
      const { ids } = await readBody(req);
      if (!Array.isArray(ids) || !ids.length) return send(res, 400, { error: 'ids required' });
      return send(res, 200, { removed: await removeItems(id, ids.map(String).slice(0, 200)) });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  // Built-in component library: /lib/<file>.html
  if (p.startsWith('/lib/')) {
    try {
      return send(res, 200, await readLibraryComponent(p.slice(5)), MIME['.html']);
    } catch {
      return send(res, 404, { error: 'not found' });
    }
  }

  // Built page served from the user's project folder: /b/<session>/<version>/<file>
  const bm = p.match(/^\/b\/([a-z0-9-]+)\/(\d+)\/(.*)$/);
  if (bm) {
    const s = await loadSession(bm[1]).catch(() => null);
    const build = s?.builds?.find((x) => x.v === Number(bm[2]) && x.kind === 'file');
    if (!build) return send(res, 404, { error: 'no such build' });
    const root = path.dirname(build.path);
    const file = inside(root, bm[3] || path.basename(build.path));
    return file ? sendFile(res, file) : send(res, 403, { error: 'forbidden' });
  }

  // Session files: /s/<session>/<assets|styles|components|builds>/<file>
  const m = p.match(/^\/s\/([a-z0-9-]+)\/((?:assets|styles|components|builds)\/.+)$/);
  if (m) {
    const file = inside(path.join(SESSIONS_DIR, m[1]), m[2]);
    return file ? sendFile(res, file) : send(res, 403, { error: 'forbidden' });
  }

  send(res, 404, { error: 'not found' });
}

export async function startBoard({ port = Number(process.env.INSPO_PORT) || 4777 } = {}) {
  if (running) return running;
  for (let p = port; p < port + 30; p++) {
    const server = http.createServer((req, res) =>
      handle(req, res).catch((err) => send(res, 500, { error: err.message })),
    );
    const ok = await new Promise((resolve) => {
      server.once('error', () => resolve(false));
      server.listen(p, '127.0.0.1', () => resolve(true));
    });
    if (ok) {
      running = { server, port: p, url: `http://localhost:${p}` };
      return running;
    }
  }
  throw new Error('No free port for the inspo board');
}

export function boardUrl(base, sessionId, tab) {
  const q = new URLSearchParams({ session: sessionId });
  if (tab) q.set('tab', tab);
  return `${base}/?${q}`;
}

export function openInBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
    return true;
  } catch {
    return false;
  }
}
