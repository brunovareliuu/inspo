import fs from 'node:fs/promises';
import path from 'node:path';
import { getContext, dismissOverlays, autoScroll, UA } from './browser.js';
import { assetsDir, shortId } from './session.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4', 'image/svg+xml': 'svg' };

/** Download a remote image into the session's assets folder. Returns "assets/<file>" or null. */
export async function downloadAsset(sessionId, url, { referer, name } = {}) {
  if (!url) return null;
  const context = await getContext();
  const headers = { 'User-Agent': UA, Referer: referer || new URL(url).origin + '/', Accept: 'image/avif,image/webp,image/*,video/*,*/*' };
  const save = async (type, body) => {
    type = (type || '').split(';')[0].trim();
    const ext = EXT[type] || (type.startsWith('image/') ? type.slice(6) : null);
    if (!ext || body.length < 1500) return null; // not an image, or a tracking pixel/placeholder
    const file = `${name || shortId(10)}.${ext}`;
    await fs.writeFile(path.join(assetsDir(sessionId), file), body);
    return `assets/${file}`;
  };
  try {
    const res = await context.request.get(url, { headers, timeout: 25000 });
    if (res.ok()) {
      const saved = await save(res.headers()['content-type'], await res.body());
      if (saved) return saved;
    }
  } catch {
    /* fall through to the real browser */
  }
  // Some CDNs (Cloudflare) reject non-browser clients: load the image in a real tab instead.
  const page = await context.newPage();
  try {
    await page.setExtraHTTPHeaders({ Referer: headers.Referer });
    const res = await page.goto(url, { waitUntil: 'load', timeout: 25000 });
    if (!res?.ok()) return null;
    return await save(res.headers()['content-type'], await res.body());
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/** Runs in the page: pull fonts, colors, radii and the tech behind the site. */
function analyzeInPage() {
  const toHex = (c) => {
    const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!m || (m[4] !== undefined && +m[4] < 0.5)) return null;
    return '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('');
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < 12000;
  };
  const tally = (map, key, w = 1) => key && map.set(key, (map.get(key) || 0) + w);
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  const fonts = new Map();
  const typeScale = [];
  for (const sel of ['h1', 'h2', 'h3', 'p', 'a', 'button', 'li']) {
    for (const el of [...document.querySelectorAll(sel)].filter(vis).slice(0, 40)) {
      const cs = getComputedStyle(el);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      tally(fonts, `${fam}|${sel.startsWith('h') ? 'display' : 'body'}`, (el.textContent || '').length || 1);
      if (sel.startsWith('h') && typeScale.length < 8) typeScale.push({ tag: sel, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, transform: cs.textTransform });
    }
  }

  const bg = new Map();
  const fg = new Map();
  const radii = new Map();
  for (const el of [...document.querySelectorAll('body, body *')].slice(0, 2500)) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    tally(bg, toHex(cs.backgroundColor), Math.min(r.width * r.height, 1440 * 900) / 1000);
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) tally(fg, toHex(cs.color), (el.textContent || '').length);
    if (cs.borderRadius && cs.borderRadius !== '0px') tally(radii, cs.borderRadius);
  }
  const bodyBg = toHex(getComputedStyle(document.body).backgroundColor) || toHex(getComputedStyle(document.documentElement).backgroundColor) || '#ffffff';
  if (!bg.size) bg.set(bodyBg, 1);

  const w = window;
  const has = (s) => !!document.querySelector(s);
  const scripts = [...document.scripts].map((s) => s.src).join(' ');
  const tech = Object.entries({
    'three.js': !!w.THREE || /three(\.module)?(\.min)?\.js/.test(scripts),
    WebGL: [...document.querySelectorAll('canvas')].some((c) => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }),
    GSAP: !!w.gsap || /gsap/.test(scripts),
    Lenis: !!w.lenis || !!w.Lenis || has('.lenis') || /lenis/.test(scripts),
    Locomotive: has('[data-scroll-container]'),
    Spline: has('spline-viewer') || /spline/.test(scripts),
    Lottie: has('lottie-player, dotlottie-player') || /lottie/.test(scripts),
    Webflow: has('html[data-wf-site]'),
    Framer: /framer/i.test(document.querySelector('meta[name="generator"]')?.content || '') || has('[data-framer-name]'),
    'Next.js': !!w.__NEXT_DATA__ || has('#__next') || /_next\//.test(scripts),
    Nuxt: !!w.__NUXT__,
    Shopify: !!w.Shopify,
    Tailwind: /\b(px-\d|flex|grid-cols-\d)\b/.test(document.body.className + ' ' + (document.querySelector('main, div')?.className || '')),
    video: has('video'),
  }).filter(([, v]) => v).map(([k]) => k);

  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    fonts: top(fonts, 6).map(([k, n]) => { const [family, role] = k.split('|'); return { family, role, weight: n }; }),
    typeScale,
    colors: { background: top(bg, 6).map(([c]) => c), text: top(fg, 5).map(([c]) => c), body: bodyBg },
    radii: top(radii, 4).map(([r]) => r),
    tech,
    sections: document.querySelectorAll('section').length,
    height: document.documentElement.scrollHeight,
  };
}

/**
 * Screenshot a live website (above the fold + tall page) and analyze its design tokens.
 * Returns an item ready to add to a session.
 */
export async function captureSite(sessionId, url, { fullPage = true, mobile = false, maxHeight = 7000 } = {}) {
  const context = await getContext();
  const page = await context.newPage();
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  const id = `r-${shortId()}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1800); // intro animations / preloaders
    await dismissOverlays(page);
    const dir = assetsDir(sessionId);
    const hero = `${id}-hero.jpg`;
    await page.screenshot({ path: path.join(dir, hero), type: 'jpeg', quality: 82 });
    let full = null;
    if (fullPage) {
      await autoScroll(page, { maxPx: maxHeight });
      const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
      full = `${id}-full.jpg`;
      await page
        .screenshot({ path: path.join(dir, full), type: 'jpeg', quality: 70, fullPage: true, clip: h > maxHeight ? { x: 0, y: 0, width: mobile ? 390 : 1440, height: maxHeight } : undefined })
        .catch(async () => {
          full = null;
        });
    }
    const analysis = await page.evaluate(analyzeInPage).catch(() => null);
    return {
      id,
      kind: 'reference',
      source: 'live',
      title: analysis?.title?.split(/[|–—-]/)[0]?.trim() || new URL(url).hostname,
      url: page.url(),
      liveUrl: page.url(),
      image: `assets/${hero}`,
      fullImage: full ? `assets/${full}` : null,
      analysis,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Analyze without saving anything (used for "look at my current app"). */
export async function analyzeUrl(url, { screenshotTo } = {}) {
  const context = await getContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await dismissOverlays(page);
    let shot = null;
    if (screenshotTo) {
      await page.screenshot({ path: screenshotTo, type: 'jpeg', quality: 80 });
      shot = screenshotTo;
    } else {
      shot = await page.screenshot({ type: 'jpeg', quality: 60 });
    }
    const analysis = await page.evaluate(analyzeInPage);
    return { url: page.url(), analysis, screenshot: shot };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Openverse: CC-licensed images, no API key. Used for style moodboards. */
export async function searchImages(query, { count = 6, orientation, page = 1, mustMatch } = {}) {
  // Stock first, then commercial-use photos, then relax filters and shorten the query until something comes back.
  const words = query.trim().split(/\s+/);
  const attempts = [
    { q: query, source: 'stocksnap' }, // CC0 professional stock: best quality when it covers the subject
    { q: query, strict: true },
    { q: query, strict: false },
    ...(words.length > 2 ? [{ q: words.slice(0, 2).join(' '), strict: false }] : []),
  ];
  let data = { results: [] };
  for (const a of attempts) {
    const params = new URLSearchParams({ q: a.q, page_size: '20', page: String(page), mature: 'false' }); // 20 = anonymous API max
    if (a.source) params.set('source', a.source);
    if (a.strict) {
      params.set('license_type', 'commercial');
      params.set('category', 'photograph');
      params.set('size', 'large');
    }
    if (orientation === 'wide') params.set('aspect_ratio', 'wide');
    if (orientation === 'tall') params.set('aspect_ratio', 'tall');
    const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers: { 'User-Agent': 'inspo-mcp (https://github.com/brunovareliuu/inspo)' } });
    if (!res.ok) throw new Error(`Openverse ${res.status}`);
    data = await res.json();
    if ((data.results || []).length >= Math.min(count, 4)) break;
  }
  // Openverse ranks loosely; keep only results whose title/tags actually mention the subject.
  const must = (mustMatch || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const relevant = (r) => !must.length || must.some((w) => `${r.title || ''} ${(r.tags || []).map((t) => t.name).join(' ')}`.toLowerCase().includes(w));
  return (data.results || [])
    .filter((r) => r.url && (r.width || 1000) >= 800 && relevant(r))
    .map((r) => ({
      src: r.url,
      alt: r.title || query,
      credit: `${r.title || 'Untitled'} by ${r.creator || 'unknown'} (${(r.license || '').toUpperCase()} ${r.license_version || ''}, via ${r.source || 'Openverse'})`.replace(/\s+\)/, ')'),
      link: r.foreign_landing_url,
    }));
}

/** Download the first `count` candidates that actually download. */
export async function downloadImages(sessionId, candidates, count) {
  const out = [];
  for (let i = 0; i < candidates.length && out.length < count; i += 3) {
    const batch = candidates.slice(i, i + 3);
    const saved = await Promise.all(batch.map((img) => downloadAsset(sessionId, img.src, { referer: img.link })));
    batch.forEach((img, j) => saved[j] && out.length < count && out.push({ ...img, remote: img.src, src: saved[j] }));
  }
  return out;
}

/** Search + download a set of images. */
export async function fetchImages(sessionId, query, { count = 4, orientation, mustMatch } = {}) {
  try {
    return await downloadImages(sessionId, await searchImages(query, { count, orientation, mustMatch }), count);
  } catch {
    return [];
  }
}
