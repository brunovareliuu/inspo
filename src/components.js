import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'components');

/** Read the `<!--inspo {json} -->` header every component file starts with. */
export function parseMeta(html, fallbackId) {
  const m = html.match(/<!--inspo\s*([\s\S]*?)-->/);
  let meta = {};
  if (m) {
    try {
      meta = JSON.parse(m[1]);
    } catch {
      /* keep defaults */
    }
  }
  return { id: fallbackId, name: fallbackId, category: 'motion', tags: [], description: '', deps: [], ...meta };
}

let cache = null;
export async function listLibrary() {
  if (cache) return cache;
  let files = [];
  try {
    files = (await fs.readdir(LIBRARY_DIR)).filter((f) => f.endsWith('.html'));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files.sort()) {
    const html = await fs.readFile(path.join(LIBRARY_DIR, f), 'utf8');
    const meta = parseMeta(html, f.replace(/\.html$/, ''));
    out.push({ ...meta, id: `lib-${f.replace(/\.html$/, '')}`, file: f, library: true });
  }
  cache = out;
  return out;
}

export async function readLibraryComponent(file) {
  const safe = path.basename(file);
  return fs.readFile(path.join(LIBRARY_DIR, safe), 'utf8');
}
