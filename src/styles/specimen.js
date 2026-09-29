// Renders the user's landing page in a given style direction ("specimen").
// Pure string templating: no deps, no build. Output is one standalone HTML doc.

import { FONT_META, contrastRatio, mixHex, toHex6, isDark, parseColor } from './presets.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = esc;
const cssStr = (s) => String(s ?? '').replace(/["\\<>\n]/g, '');
const safeSrc = (s) => (/^(https?:\/\/|\/)/.test(String(s || '')) ? String(s).replace(/["'<>\s]/g, encodeURIComponent) : '');

// Seeded PRNG so a style always renders the same artwork.
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Fonts ────────────────────────────────────────────────────────────────

// Two-weight entries in FONT_META are ambiguous (variable range vs. two static
// cuts). These are the static ones; everything else with [min,max] is variable.
const STATIC_PAIRS = new Set(['Space Mono', 'Silkscreen', 'Courier Prime']);

/** Explicit weight list (always valid for both static and variable fonts). */
function weightsFor(name, wanted) {
  const meta = FONT_META[name];
  if (!meta) return [400, 700];
  const range = meta.w.length === 2 && meta.w[1] - meta.w[0] > 100 && !STATIC_PAIRS.has(name);
  const avail = range ? Array.from({ length: (meta.w[1] - meta.w[0]) / 100 + 1 }, (_, i) => meta.w[0] + i * 100) : meta.w;
  const snap = (w) => avail.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  return [...new Set(wanted.map(snap))].sort((a, b) => a - b);
}

function familyParam(name, wanted, italic) {
  const fam = encodeURIComponent(name).replace(/%20/g, '+');
  const ws = weightsFor(name, wanted);
  if (italic && FONT_META[name]?.ital) return `family=${fam}:ital,wght@${ws.map((w) => `0,${w}`).join(';')};${ws.map((w) => `1,${w}`).join(';')}`;
  return `family=${fam}:wght@${ws.join(';')}`;
}

export function googleFontsHref(style) {
  const f = style.fonts || {};
  const dw = Number(style.displayWeight) || 600;
  const wanted = new Map();
  const add = (n, ws, ital) => n && wanted.set(n, { ws: [...(wanted.get(n)?.ws || []), ...ws], ital: wanted.get(n)?.ital || ital });
  add(f.display, [dw, 600, 700], style.accentText === 'italic' && !f.accent);
  add(f.body, [400, 500, 600, 700], false);
  add(f.mono, [400, 500], false);
  add(f.accent, [dw, 400], true);
  return `https://fonts.googleapis.com/css2?${[...wanted].map(([n, v]) => familyParam(n, v.ws, v.ital)).join('&')}&display=swap`;
}

const fontStack = (name, kind) =>
  `"${cssStr(name)}", ${kind === 'mono' ? 'ui-monospace, monospace' : FONT_META[name]?.width < 0.5 && /Serif|Garamond|Mincho|Bodoni|Playfair|Fraunces|Newsreader|Lora|Cormorant/.test(name) ? 'Georgia, serif' : 'system-ui, sans-serif'}`;

// ─── Tokens ───────────────────────────────────────────────────────────────

function derived(style) {
  const p = style.palette;
  const bg = toHex6(p.bg) || '#ffffff';
  const fg = toHex6(p.fg) || '#111111';
  const accent = toHex6(p.accent) || fg;
  const onAccent = contrastRatio(accent, bg) > contrastRatio(accent, fg) ? bg : fg;
  const onAccentFinal = contrastRatio(accent, onAccent) < 3 ? (contrastRatio(accent, '#ffffff') > contrastRatio(accent, '#0b0b0b') ? '#ffffff' : '#0b0b0b') : onAccent;
  return {
    bg, fg, accent, onAccent: onAccentFinal,
    surface: p.surface || mixHex(bg, fg, 0.04),
    muted: p.muted || mixHex(fg, bg, 0.45),
    accent2: p.accent2 || fg,
    accent3: p.accent3 || p.accent2 || accent,
    border: p.border || (toHex6(fg) + '22'),
    dark: isDark(bg),
  };
}

export function styleTokensCSS(style) {
  const d = derived(style);
  const f = style.fonts || {};
  return `:root{
  --bg:${d.bg};--surface:${d.surface};--fg:${d.fg};--muted:${d.muted};
  --accent:${d.accent};--accent2:${d.accent2};--accent3:${d.accent3};--on-accent:${d.onAccent};--border:${d.border};
  --radius:${cssStr(style.radius || '0px')};--bw:${cssStr(style.borderWidth || '1px')};--shadow:${cssStr(style.shadow || 'none')};
  --font-display:${fontStack(f.display || 'Inter', 'display')};--font-body:${fontStack(f.body || 'Inter', 'body')};
  --font-mono:${fontStack(f.mono || 'JetBrains Mono', 'mono')};--font-accent:${fontStack(f.accent || f.display || 'Inter', 'display')};
  --display-weight:${Number(style.displayWeight) || 600};--display-tracking:${cssStr(style.displayTracking || '-0.03em')};
  --display-case:${style.displayCase === 'uppercase' ? 'uppercase' : 'none'};
}`;
}

// ─── Headline sizing (avoid overflow without JS) ─────────────────────────

function fit(text, style, { width, maxPx, maxLines = 3, minPx = 30 }) {
  const dm = FONT_META[style.fonts?.display] || { width: 0.55 };
  const am = style.fonts?.accent ? FONT_META[style.fonts.accent] || dm : dm;
  const meta = { width: Math.max(dm.width, am.width * (style.accentText === 'italic' ? 1.05 : 1)) };
  const w = Number(style.displayWeight) || 600;
  const tracking = parseFloat(style.displayTracking) || 0;
  const cw = meta.width * (w >= 800 ? 1.12 : w >= 650 ? 1.06 : 1) * (style.displayCase === 'uppercase' ? 1.2 : 1) + tracking;
  const plain = text.replace(/\*/g, '');
  const longest = Math.max(...plain.split(/\s+/).map((x) => x.length), 4);
  const byWord = (width * 0.96) / (longest * cw);
  const byLines = (width * maxLines * 0.86) / (plain.length * cw);
  return Math.max(minPx, Math.min(maxPx, byWord, byLines));
}
const vw = (px) => `${((px / 1440) * 100).toFixed(2)}vw`;
const sizeCss = (text, style, o) => {
  const desk = fit(text, style, o);
  const mob = fit(text, style, { ...o, width: o.mobileWidth || 330, maxPx: Math.min(o.maxPx, 76), maxLines: (o.maxLines || 3) + 2, minPx: 24 });
  return { desk: `clamp(${Math.round(mob)}px, ${vw(desk)}, ${Math.round(desk)}px)`, mob: `${Math.round(mob)}px` };
};

function headlineHtml(text) {
  const t = String(text || '');
  if (t.includes('*')) return esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const words = t.trim().split(/\s+/);
  if (words.length < 3) return esc(t);
  const n = words.at(-1).length < 5 && words.length > 3 ? 2 : 1;
  return `${esc(words.slice(0, -n).join(' '))} <em>${esc(words.slice(-n).join(' '))}</em>`;
}

// ─── Generated artwork (used when there are no images, and as decoration) ─

function art(style, d, key = 'hero') {
  const r = rng(style.id + key);
  const A = d.accent, B = d.accent2, C = d.accent3, F = d.fg, BG = d.bg;
  const svg = (inner, vb = '0 0 800 600', extra = '') => `<svg class="art-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" ${extra}>${inner}</svg>`;
  switch (style.art) {
    case 'grid': {
      let s = '';
      for (let x = 0; x <= 800; x += 50) s += `<line x1="${x}" y1="0" x2="${x}" y2="600" stroke="${F}" stroke-opacity=".12"/>`;
      for (let y = 0; y <= 600; y += 50) s += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${F}" stroke-opacity=".12"/>`;
      s += `<circle cx="520" cy="300" r="210" fill="none" stroke="${F}" stroke-width="1.5"/><circle cx="520" cy="300" r="120" fill="${A}"/>`;
      s += `<rect x="100" y="100" width="150" height="150" fill="${F}"/><line x1="0" y1="300" x2="800" y2="300" stroke="${A}" stroke-width="2"/>`;
      s += `<text x="110" y="520" font-family="var(--font-mono)" font-size="14" fill="${F}">52.3676° N, 4.9041° E — GRID 12/8</text>`;
      return svg(s);
    }
    case 'beam':
      return `<div class="art-css" style="background:radial-gradient(60% 55% at 50% 0%, ${A}66, transparent 70%),radial-gradient(30% 40% at 50% 0%, ${F}33, transparent 70%),linear-gradient(180deg, ${BG}, ${BG})"><div class="beam-grid"></div></div>`;
    case 'aurora':
      return `<div class="art-css aurora"><i style="background:${A}"></i><i style="background:${C}"></i><i style="background:${B}"></i></div>`;
    case 'mesh':
      return `<div class="art-css mesh" style="background:radial-gradient(40% 60% at 20% 30%, ${A}, transparent 70%),radial-gradient(45% 55% at 80% 20%, ${C}, transparent 70%),radial-gradient(50% 60% at 60% 90%, #ffb86b, transparent 70%),radial-gradient(40% 50% at 10% 90%, #00d4ff, transparent 70%),${mixHex(A, '#ffffff', 0.5)}"></div>`;
    case 'shapes': {
      const cols = [A, C, B, F];
      let s = '';
      for (let i = 0; i < 7; i++) {
        const x = 60 + r() * 640, y = 60 + r() * 460, sz = 60 + r() * 120, c = cols[i % cols.length];
        const shape = i % 3;
        const sh = `<g transform="translate(6 6)" fill="${F}">`;
        if (shape === 0) s += `${sh}<circle cx="${x}" cy="${y}" r="${sz / 2}"/></g><circle cx="${x}" cy="${y}" r="${sz / 2}" fill="${c}" stroke="${F}" stroke-width="3"/>`;
        else if (shape === 1) s += `${sh}<rect x="${x}" y="${y}" width="${sz}" height="${sz * 0.7}" rx="14"/></g><rect x="${x}" y="${y}" width="${sz}" height="${sz * 0.7}" rx="14" fill="${c}" stroke="${F}" stroke-width="3"/>`;
        else {
          const pts = Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? sz / 4 : sz / 2; return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`; }).join(' ');
          s += `<polygon points="${pts}" fill="${c}" stroke="${F}" stroke-width="3"/>`;
        }
      }
      return svg(s);
    }
    case 'bauhaus':
      return svg(`<rect width="800" height="600" fill="${BG}"/><circle cx="260" cy="260" r="190" fill="${A}"/><path d="M430 60 h320 v320 z" fill="${F}"/><rect x="430" y="400" width="320" height="60" fill="${C}"/><path d="M60 560 a200 200 0 0 1 400 0z" fill="${C}"/><rect x="600" y="480" width="150" height="80" fill="${A}"/><circle cx="600" cy="220" r="60" fill="${BG}"/>`);
    case 'blobs': {
      const blob = (cx, cy, rad, fill, k) => {
        const n = 7, pts = [];
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = rad * (0.75 + r() * 0.45); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        let dStr = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < n; i++) { const p0 = pts[i], p1 = pts[(i + 1) % n]; const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; dStr += ` Q${p0[0]},${p0[1]} ${mx},${my}`; }
        return `<path d="${dStr}Z" fill="${fill}" class="blob b${k}"/>`;
      };
      return svg(`<rect width="800" height="600" fill="${mixHex(BG, C, 0.35)}"/>${blob(300, 280, 230, C, 1)}${blob(520, 340, 190, A, 2)}${blob(420, 180, 90, mixHex(BG, '#ffffff', 0.5), 3)}`);
    }
    case 'sun-grid': {
      let s = `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}"/><stop offset="1" stop-color="${A}"/></linearGradient></defs><rect width="800" height="600" fill="${BG}"/>`;
      s += `<circle cx="400" cy="300" r="170" fill="url(#sun)"/>`;
      for (let i = 0; i < 6; i++) s += `<rect x="200" y="${318 + i * 26}" width="400" height="${4 + i * 2.2}" fill="${BG}"/>`;
      s += `<rect x="0" y="360" width="800" height="240" fill="${BG}"/>`;
      for (let i = 0; i <= 16; i++) s += `<line x1="${400 + (i - 8) * 18}" y1="360" x2="${400 + (i - 8) * 140}" y2="600" stroke="${A}" stroke-width="1.5" stroke-opacity=".9"/>`;
      for (let i = 0; i < 9; i++) { const y = 360 + Math.pow(i / 8, 2) * 240; s += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${A}" stroke-width="1.5"/>`; }
      return svg(s);
    }
    case 'chrome':
      return svg(`<defs><radialGradient id="ch" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c9cfdc"/><stop offset=".5" stop-color="#4b5263"/><stop offset=".62" stop-color="#e9edf5"/><stop offset=".85" stop-color="#8d95a8"/><stop offset="1" stop-color="#2a2f3a"/></radialGradient><linearGradient id="ch2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${C}"/></linearGradient></defs>
        <rect width="800" height="600" fill="url(#ch2)" opacity=".25"/><circle cx="400" cy="300" r="190" fill="url(#ch)"/><ellipse cx="400" cy="300" rx="330" ry="70" fill="none" stroke="url(#ch)" stroke-width="16" transform="rotate(-18 400 300)"/>
        ${[[130, 110], [660, 140], [620, 480], [170, 470]].map(([x, y]) => `<path d="M${x} ${y - 26} C${x + 3} ${y - 3} ${x + 3} ${y - 3} ${x + 26} ${y} C${x + 3} ${y + 3} ${x + 3} ${y + 3} ${x} ${y + 26} C${x - 3} ${y + 3} ${x - 3} ${y + 3} ${x - 26} ${y} C${x - 3} ${y - 3} ${x - 3} ${y - 3} ${x} ${y - 26}Z" fill="${F}"/>`).join('')}`);
    case 'terminal':
      return `<div class="art-term"><div class="term-bar"><i></i><i></i><i></i></div><pre>$ init --project <b>${esc(style.name || 'app')}</b>
<span>✓</span> fonts ......... ${esc(style.fonts?.display || '')}
<span>✓</span> palette ....... ${esc(d.accent)}
<span>✓</span> layout ........ ${esc(style.layout)}
<span>→</span> deploying to edge [${'█'.repeat(14)}${'░'.repeat(6)}] 70%
$ <i class="cur">█</i></pre></div>`;
    case 'lines': {
      let s = '';
      for (let i = 0; i < 26; i++) {
        let dStr = `M-20 ${40 + i * 22}`;
        for (let x = 0; x <= 840; x += 40) dStr += ` L${x} ${40 + i * 22 + Math.sin(x / 90 + i * 0.35) * 26 + Math.cos(x / 37 + i) * 6}`;
        s += `<path d="${dStr}" fill="none" stroke="${i % 7 === 3 ? A : F}" stroke-opacity="${i % 7 === 3 ? 0.9 : 0.35}" stroke-width="${i % 7 === 3 ? 1.6 : 1}"/>`;
      }
      return svg(s);
    }
    case 'enso':
      return svg(`<rect width="800" height="600" fill="${mixHex(BG, F, 0.04)}"/><path d="M520 150 C 640 220 650 420 500 480 C 360 540 230 450 240 320 C 250 200 360 140 470 150" fill="none" stroke="${F}" stroke-width="34" stroke-linecap="round" opacity=".88"/><path d="M515 150 C 600 190 640 300 610 380" fill="none" stroke="${F}" stroke-width="12" stroke-linecap="round" opacity=".5"/><rect x="600" y="470" width="44" height="44" fill="${A}"/><text x="610" y="500" font-size="22" fill="${BG}" font-family="serif">印</text>`);
    case 'halftone': {
      let s = `<rect width="800" height="600" fill="${BG}"/>`;
      for (let y = 10; y < 600; y += 16) for (let x = 10; x < 800; x += 16) {
        const dd = Math.hypot(x - 470, y - 280) / 280;
        const rr = Math.max(0, 7 * (1 - dd));
        if (rr > 0.4) s += `<circle cx="${x}" cy="${y}" r="${rr.toFixed(1)}" fill="${A}"/>`;
      }
      s += `<rect x="70" y="330" width="300" height="200" fill="${C}" transform="rotate(-6 220 430)" style="mix-blend-mode:multiply"/><circle cx="220" cy="190" r="110" fill="${F}"/>`;
      return svg(s);
    }
    default:
      return `<div class="art-css" style="background:linear-gradient(135deg, ${A}, ${C})"></div>`;
  }
}

// ─── Media blocks ────────────────────────────────────────────────────────

function media(style, d, img, key, cls = '') {
  const t = style.imageTreatment || 'none';
  if (img && safeSrc(img.src)) {
    return `<figure class="media t-${t} ${cls}"><img src="${attr(safeSrc(img.src))}" alt="${attr(img.alt || '')}" loading="lazy"></figure>`;
  }
  return `<figure class="media art ${cls}">${art(style, d, key)}</figure>`;
}

// ─── Main renderer ──────────────────────────────────────────────────────

const DEFAULT_COPY = {
  brand: 'Northwind',
  headline: 'Everything your team needs to *ship faster*',
  subheadline: 'One calm place to plan, build and launch. Less busywork, more of the work that matters.',
  cta: 'Get started',
  secondaryCta: 'See how it works',
  nav: ['Product', 'Pricing', 'Stories', 'About'],
  features: [
    { title: 'Built for focus', body: 'A workspace that gets out of the way, so ideas turn into shipped work.' },
    { title: 'Fast by default', body: 'Every interaction answers in under 100ms. Your flow never breaks.' },
    { title: 'Made for teams', body: 'Share, review and decide together, in real time or on your own time.' },
  ],
  stats: [
    { value: '12k+', label: 'teams' },
    { value: '99.9%', label: 'uptime' },
    { value: '4.9★', label: 'rating' },
  ],
  quote: { text: 'It feels like the tool was designed by people who actually do the work.', author: 'Ana López, Head of Design' },
};

export function renderSpecimen({ style, copy = {}, images = [] }) {
  const c = { ...DEFAULT_COPY, ...Object.fromEntries(Object.entries(copy || {}).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length))) };
  const d = derived(style);
  const imgs = (images || []).filter((i) => i && safeSrc(i.src));
  const layout = style.layout || 'split';
  const features = (c.features || []).slice(0, 4);
  const stats = (c.stats || []).slice(0, 4);
  const nav = (c.nav || []).slice(0, 5);

  const heroWidth = { split: 700, centered: 1150, editorial: 1340, bento: 780, fullbleed: 1100, poster: 1360 }[layout];
  const heroMax = { split: 104, centered: 112, editorial: 190, bento: 96, fullbleed: 150, poster: 230 }[layout];
  const heroLines = { split: 4, centered: 3, editorial: 3, bento: 4, fullbleed: 3, poster: 3 }[layout];
  const mobileWidth = layout === 'bento' ? 270 : layout === 'fullbleed' ? 320 : 330;
  const h1 = sizeCss(c.headline, style, { width: heroWidth, maxPx: heroMax, maxLines: heroLines, mobileWidth });
  const brandSize = sizeCss(c.brand, style, { width: 1340, maxPx: 320, maxLines: 1, mobileWidth: 340 });

  const btns = `<div class="ctas"><a class="btn primary" href="#">${esc(c.cta)}<span aria-hidden="true">→</span></a>${c.secondaryCta ? `<a class="btn ghost" href="#">${esc(c.secondaryCta)}</a>` : ''}</div>`;
  const H1 = `<h1 class="h1">${headlineHtml(c.headline)}</h1>`;
  const sub = `<p class="lede">${esc(c.subheadline)}</p>`;
  const mark = `<span class="mark" aria-hidden="true"></span>`;
  const navHtml = `<header class="nav"><a class="brand" href="#">${mark}${esc(c.brand)}</a><nav>${nav.map((n) => `<a href="#">${esc(n)}</a>`).join('')}</nav><a class="btn small" href="#">${esc(c.cta)}</a></header>`;
  const today = new Date();
  const metaRow = `<div class="meta-row"><span>${esc(c.brand)}</span><span>Nº ${String((today.getMonth() + 1) * 7).padStart(3, '0')}</span><span>${today.getFullYear()}</span><span>${esc(nav[0] || '')}</span></div>`;

  let hero;
  switch (layout) {
    case 'centered':
      hero = `<section class="hero hero-centered"><div class="glow">${style.art === 'beam' || style.art === 'aurora' ? art(style, d, 'bg') : ''}</div>
        <div class="wrap center rise">${c.eyebrow ? `<span class="pill">${esc(c.eyebrow)}</span>` : `<span class="pill"><b></b>${esc(features[0]?.title || c.brand)}</span>`}${H1}${sub}${btns}</div>
        <div class="wrap"><div class="frame rise d3">${media(style, d, imgs[0], 'hero', 'wide')}</div></div></section>`;
      break;
    case 'editorial':
      hero = `<section class="hero hero-editorial"><div class="wrap">${metaRow}${H1}<div class="ed-grid"><div class="ed-col rise d2">${sub}${btns}</div>${media(style, d, imgs[0], 'hero', 'ed-img rise d3')}</div></div></section>`;
      break;
    case 'bento':
      hero = `<section class="hero hero-bento"><div class="wrap bento">
        <div class="tile t-main rise">${H1}${sub}${btns}</div>
        <div class="tile t-img rise d1">${media(style, d, imgs[0], 'hero', 'fill')}</div>
        <div class="tile t-stat rise d2"><b>${esc(stats[0]?.value || '')}</b><span>${esc(stats[0]?.label || '')}</span></div>
        <div class="tile t-art rise d3">${media(style, d, imgs[1], 'bento', 'fill')}</div>
        <div class="tile t-feat rise d4"><span class="num">01</span><b>${esc(features[0]?.title || '')}</b><p>${esc(features[0]?.body || '')}</p></div>
      </div></section>`;
      break;
    case 'fullbleed':
      hero = `<section class="hero hero-full">${media(style, d, imgs[0], 'hero', 'bleed')}<div class="scrim"></div><div class="wrap full-inner"><div class="rise">${H1}</div><div class="full-foot rise d2">${sub}${btns}</div></div></section>`;
      break;
    case 'poster':
      hero = `<section class="hero hero-poster"><div class="wrap">${metaRow}${H1}<div class="poster-grid"><div class="rise d2">${sub}</div><div class="rise d3">${btns}</div>${media(style, d, imgs[0], 'hero', 'poster-img rise d4')}</div></div></section>`;
      break;
    default:
      hero = `<section class="hero hero-split"><div class="wrap split"><div class="split-copy rise">${c.eyebrow ? `<span class="pill">${esc(c.eyebrow)}</span>` : ''}${H1}${sub}${btns}${stats.length ? `<div class="mini-stats">${stats.slice(0, 3).map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>` : ''}</div>${media(style, d, imgs[0], 'hero', 'split-img rise d2')}</div></section>`;
  }

  const statsHtml = stats.length && layout !== 'split'
    ? `<section class="stats"><div class="wrap stats-row">${stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div></section>`
    : `<section class="marquee" aria-hidden="true"><div class="track">${Array(4).fill([c.brand, ...features.map((f) => f.title)].map((x) => `<span>${esc(x)}</span><i>✦</i>`).join('')).join('')}</div></section>`;

  const featHtml = `<section class="features"><div class="wrap"><div class="feat-head"><span class="eyebrow">(01)</span><h2 class="h2">${esc(c.featuresTitle || c.subheadline.split(/[.,;:]/)[0])}</h2></div>
    <div class="feat-grid n${features.length}">${features.map((f, i) => `<article class="feat">${media(style, d, imgs[i + 1] || imgs[(i + 1) % Math.max(imgs.length, 1)], 'feat' + i, 'feat-img')}<span class="num">0${i + 1}</span><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></article>`).join('')}</div></div></section>`;

  const quoteImg = imgs[4] || imgs[2];
  const quoteHtml = c.quote?.text
    ? `<section class="statement"><div class="wrap st-grid">${quoteImg ? media(style, d, quoteImg, 'quote', 'st-img') : `<figure class="media art st-img">${art(style, d, 'quote')}</figure>`}<blockquote><p>“${esc(c.quote.text)}”</p>${c.quote.author ? `<cite>— ${esc(c.quote.author)}</cite>` : ''}</blockquote></div></section>`
    : '';

  const ctaHtml = `<section class="cta-band"><div class="wrap"><p class="big-brand">${esc(c.brand)}</p><div class="cta-row"><p>${esc(c.subheadline)}</p>${btns}</div></div></section>`;

  const sw = [['bg', d.bg], ['surface', d.surface], ['fg', d.fg], ['muted', d.muted], ['accent', d.accent], ['accent2', d.accent2], ...(style.palette.accent3 ? [['accent3', d.accent3]] : [])];
  const specHtml = `<footer class="spec"><div class="wrap">
    <div class="spec-top"><span class="brand">${mark}${esc(c.brand)}</span><nav>${nav.map((n) => `<a href="#">${esc(n)}</a>`).join('')}</nav></div>
    <div class="spec-grid">
      <div><h4>Palette</h4><div class="swatches">${sw.map(([k, v]) => `<div class="sw"><i style="background:${attr(v)}"></i><b>${k}</b><span>${attr(toHex6(v) || v)}</span></div>`).join('')}</div></div>
      <div><h4>Type</h4><div class="type-spec"><div class="aa">Aa</div><div><b>${esc(style.fonts.display)}</b><span>Display · ${style.displayWeight} · ${esc(style.displayTracking)}</span><b style="font-family:var(--font-body);font-weight:500">${esc(style.fonts.body)}</b><span>Body</span>${style.fonts.mono ? `<b style="font-family:var(--font-mono);font-weight:500">${esc(style.fonts.mono)}</b><span>Mono</span>` : ''}</div></div></div>
      <div><h4>Shape</h4><div class="shape-spec"><div class="shape-box"></div><div><span>radius ${esc(style.radius)}</span><span>border ${esc(style.borderWidth)}</span><span>${esc(style.layout)} · ${esc(style.art)} · ${esc(style.texture)}</span></div></div></div>
    </div>
    <p class="spec-foot">${esc(style.name)} — ${esc(style.vibe || '')}${imgs.length ? ` · Photos: ${imgs.map((i) => esc(i.credit || '')).filter(Boolean).join(' · ')}` : ''}</p>
  </div></footer>`;

  const lang = /[áéíóúñ¿¡]/i.test(JSON.stringify(c)) ? 'es' : 'en';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.brand)} — ${esc(style.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${attr(googleFontsHref(style))}">
<style>
${styleTokensCSS(style)}
${baseCss(style, d, h1, brandSize)}
</style>
</head>
<body class="L-${layout} A-${style.accentText} E-${style.entrance} X-${style.texture} R-${style.art}${d.dark ? ' dark' : ''}">
${navHtml}
<main>
${hero}
${statsHtml}
${featHtml}
${quoteHtml}
${ctaHtml}
</main>
${specHtml}
</body>
</html>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────

function grainUrl(opacity = 0.5) {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${opacity} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml,${s.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

function baseCss(style, d, h1, brandSize) {
  const tilt = Number(style.tilt) || 0;
  const hard = /\d+px \d+px 0/.test(style.shadow || '');
  const textures = {
    none: '',
    grain: `body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:100;background-image:${grainUrl(0.55)};opacity:${d.dark ? 0.16 : 0.22};mix-blend-mode:${d.dark ? 'screen' : 'multiply'}}`,
    grid: `body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(${d.border} 1px,transparent 1px),linear-gradient(90deg,${d.border} 1px,transparent 1px);background-size:calc(100vw/12) calc(100vw/12);opacity:.6}`,
    dots: `body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(${d.fg}33 1.2px,transparent 1.3px);background-size:22px 22px}`,
    'noise-gradient': `body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(50% 40% at 85% 5%,${d.accent}${d.dark ? '33' : '22'},transparent 70%),radial-gradient(40% 35% at 5% 60%,${d.accent3}${d.dark ? '26' : '1c'},transparent 70%)}body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:100;background-image:${grainUrl(0.5)};opacity:.12;mix-blend-mode:overlay}`,
    scanlines: `body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:100;background:repeating-linear-gradient(0deg,${d.dark ? '#00000055' : '#00000010'} 0 1px,transparent 1px 3px)}`,
  };
  const accentText = {
    none: '.h1 em{font-style:normal}',
    color: '.h1 em{font-style:normal;color:var(--accent)}',
    italic: '.h1 em{font-style:italic;font-family:var(--font-accent);font-weight:inherit;letter-spacing:-.01em}',
    gradient: `.h1 em{font-style:normal;background:linear-gradient(95deg,var(--accent),var(--accent3) 60%,var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em}`,
    fade: `.h1{background:linear-gradient(180deg,var(--fg) 30%,${mixHex(d.fg, d.bg, 0.45)});-webkit-background-clip:text;background-clip:text;color:transparent}.h1 em{font-style:normal;color:inherit}`,
    chrome: `.h1 em{font-style:normal;background:linear-gradient(180deg,#fff 0%,#aeb6c6 42%,#3b4150 50%,#dfe5f0 68%,#8e97aa 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 .03em 0 var(--fg)) drop-shadow(0 .06em .08em #0003)}`,
    highlight: '.h1 em{font-style:normal;background:var(--accent);color:var(--on-accent);padding:0 .12em;-webkit-box-decoration-break:clone;box-decoration-break:clone;margin:0 -.04em}',
    underline: '.h1 em{font-style:normal;background:linear-gradient(var(--accent),var(--accent)) 0 88%/100% .14em no-repeat;padding-bottom:.02em}',
    outline: '.h1 em{font-style:normal;color:transparent;-webkit-text-stroke:.022em var(--fg)}',
    cursor: '.h1 em{font-style:normal;color:var(--accent)}.h1 em:after{content:"_";animation:blink 1s steps(1) infinite}',
  };
  const entrances = {
    rise: 'from{opacity:0;transform:translateY(24px)}',
    fade: 'from{opacity:0}',
    blur: 'from{opacity:0;filter:blur(14px);transform:scale(.98)}',
    snap: 'from{opacity:0;transform:translateY(40px) rotate(-1.5deg)}',
    slide: 'from{opacity:0;transform:translateX(-40px)}',
  };
  const treatments = `
.media.t-grayscale img{filter:grayscale(1) contrast(1.08)}
.media.t-high-contrast img{filter:contrast(1.28) saturate(1.2)}
.media.t-grain img{filter:saturate(.85) contrast(1.04) sepia(.08)}
.media.t-grain:after{content:"";position:absolute;inset:0;background-image:${grainUrl(0.6)};opacity:.35;mix-blend-mode:overlay;pointer-events:none}
.media.t-duotone{background:var(--accent)}
.media.t-duotone img{filter:grayscale(1) contrast(1.2);mix-blend-mode:multiply;opacity:.95}
.media.t-duotone:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--accent3),transparent 70%);mix-blend-mode:screen;opacity:.55;pointer-events:none}
.media.t-blur-glow{box-shadow:0 0 0 1px ${d.border},0 30px 120px -20px ${d.accent}99}
.media.t-blur-glow img{filter:saturate(1.25)}`;

  return `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:400 17px/1.55 var(--font-body);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
main,header,footer{position:relative;z-index:1}
.wrap{width:min(100% - 64px,1360px);margin:0 auto}
.h1{font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);text-transform:var(--display-case);font-size:${h1.desk};line-height:${style.displayCase === 'uppercase' ? '.92' : '.98'};margin:0;text-wrap:balance;overflow-wrap:normal;hyphens:manual}
.h2{font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);text-transform:var(--display-case);font-size:clamp(28px,3.4vw,54px);line-height:1.02;margin:0;text-wrap:balance;max-width:18ch}
.lede{font-size:clamp(17px,1.35vw,21px);color:var(--muted);max-width:44ch;margin:22px 0 0;text-wrap:pretty}
.eyebrow,.num{font:500 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.pill{display:inline-flex;align-items:center;gap:8px;font:500 13px/1 var(--font-body);padding:8px 14px;border:var(--bw) solid var(--border);border-radius:999px;margin-bottom:26px;background:color-mix(in srgb,var(--surface) 70%,transparent);backdrop-filter:blur(10px)}
.pill b{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}
.btn{display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 24px;border-radius:${parseFloat(style.radius) >= 20 ? '999px' : 'var(--radius)'};font:600 16px/1 var(--font-body);border:var(--bw) solid ${hard ? 'var(--fg)' : 'transparent'};transition:transform .2s,box-shadow .2s;white-space:nowrap}
.btn.primary{background:var(--accent);color:var(--on-accent);box-shadow:${hard ? 'var(--shadow)' : style.shadow !== 'none' ? `0 12px 30px -10px ${d.accent}88` : 'none'}}
.btn.primary:hover{transform:translate(${hard ? '-2px,-2px' : '0,-2px'})}
.btn.ghost{border-color:${hard ? 'var(--fg)' : 'var(--border)'};background:${hard ? 'var(--surface)' : 'transparent'}}
.btn.small{height:40px;padding:0 16px;font-size:14px;background:var(--fg);color:var(--bg);border-color:var(--fg)}
.btn span{transition:transform .2s}.btn:hover span{transform:translateX(3px)}
.mark{width:22px;height:22px;display:inline-block;background:var(--accent);border-radius:${parseFloat(style.radius) > 0 ? '50%' : '0'};${hard ? 'border:2px solid var(--fg);' : ''}}

/* nav */
.nav{display:flex;align-items:center;gap:28px;width:min(100% - 64px,1360px);margin:0 auto;height:84px}
.brand{display:inline-flex;align-items:center;gap:10px;font:700 19px/1 var(--font-display);letter-spacing:-.02em;text-transform:var(--display-case)}
.nav nav{display:flex;gap:28px;margin-left:auto;font-size:15px;color:var(--muted)}
.nav nav a:hover{color:var(--fg)}
body.L-fullbleed .nav{position:absolute;left:0;right:0;z-index:5;color:#fff}
body.L-fullbleed .nav nav{color:#ffffffcc}
body.L-fullbleed .nav .btn.small{background:#fff;color:#111;border-color:#fff}

/* media */
.media{position:relative;margin:0;overflow:hidden;border-radius:var(--radius);background:var(--surface);isolation:isolate}
.media img{display:block;width:100%;height:100%;object-fit:cover}
.media.art{background:var(--surface)}
.art-svg{display:block;width:100%;height:100%}
.art-css{position:absolute;inset:0}
.aurora{background:var(--bg);overflow:hidden}
.aurora i{position:absolute;width:60%;height:70%;border-radius:50%;filter:blur(70px);opacity:.75;animation:drift 14s ease-in-out infinite alternate}
.aurora i:nth-child(1){left:-5%;top:10%}.aurora i:nth-child(2){right:-5%;top:-10%;animation-delay:-5s}.aurora i:nth-child(3){left:25%;bottom:-25%;opacity:.45;animation-delay:-9s}
.mesh{filter:saturate(1.2);transform:skewY(-8deg) scale(1.2)}
.beam-grid{position:absolute;inset:40% -20% -10%;background-image:linear-gradient(${d.fg}14 1px,transparent 1px),linear-gradient(90deg,${d.fg}14 1px,transparent 1px);background-size:60px 60px;transform:perspective(500px) rotateX(60deg);mask-image:linear-gradient(transparent,#000 40%,transparent)}
.blob{transform-origin:50% 50%;animation:wobble 12s ease-in-out infinite alternate}.b2{animation-delay:-4s}.b3{animation-delay:-8s}
.art-term{position:absolute;inset:0;background:${mixHex(d.bg, '#000000', 0.3)};border:1px solid var(--border);font:500 clamp(12px,1.1vw,16px)/1.8 var(--font-mono);color:var(--fg);padding:0}
.term-bar{display:flex;gap:6px;padding:12px 14px;border-bottom:1px solid var(--border)}.term-bar i{width:10px;height:10px;border-radius:50%;background:var(--border)}
.art-term pre{margin:0;padding:20px 22px;white-space:pre-wrap;font:inherit}.art-term pre span{color:var(--accent)}.art-term b{color:var(--accent)}.cur{font-style:normal;color:var(--accent);animation:blink 1s steps(1) infinite}
${treatments}

/* hero: split */
.hero-split{padding:40px 0 90px}
.split{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
.split-img{aspect-ratio:4/5;min-height:420px;box-shadow:var(--shadow);${hard ? 'border:var(--bw) solid var(--fg);' : ''}}
.mini-stats{display:flex;gap:36px;margin-top:48px;padding-top:24px;border-top:var(--bw) solid var(--border)}
.mini-stats b,.stats-row b{display:block;font:var(--display-weight) clamp(26px,2.4vw,38px)/1 var(--font-display);letter-spacing:var(--display-tracking)}
.mini-stats span,.stats-row span{font-size:14px;color:var(--muted)}

/* hero: centered */
.hero-centered{position:relative;padding:70px 0 90px;overflow:hidden}
.hero-centered .glow{position:absolute;inset:0 0 30%;pointer-events:none;opacity:.95}
.hero-centered .glow .art-css{mask-image:linear-gradient(#000 40%,transparent)}
.center{position:relative;text-align:center;display:flex;flex-direction:column;align-items:center}
.center .lede{margin-left:auto;margin-right:auto}
.center .ctas{justify-content:center}
.frame{margin-top:72px;border-radius:calc(var(--radius) + 8px);padding:${parseFloat(style.radius) > 0 ? '8px' : '0'};border:var(--bw) solid var(--border);background:color-mix(in srgb,var(--surface) 60%,transparent);box-shadow:var(--shadow);position:relative}
.frame .media.wide{aspect-ratio:16/8}

/* hero: editorial */
.hero-editorial{padding:24px 0 90px}
.meta-row{display:grid;grid-template-columns:repeat(4,1fr);border-top:var(--bw) solid var(--fg);border-bottom:var(--bw) solid var(--border);padding:12px 0;margin-bottom:40px;font:500 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.meta-row span:nth-child(n+2){text-align:center}.meta-row span:last-child{text-align:right}
.ed-grid{display:grid;grid-template-columns:1fr 2fr;gap:40px;margin-top:48px;align-items:end;border-top:var(--bw) solid var(--border);padding-top:32px}
.ed-img{aspect-ratio:16/9}
.ed-col .lede{margin-top:0}

/* hero: bento */
.hero-bento{padding:16px 0 60px}
.bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:minmax(170px,auto);gap:16px}
.tile{position:relative;border-radius:var(--radius);background:var(--surface);border:var(--bw) solid ${hard ? 'var(--fg)' : 'var(--border)'};box-shadow:${hard ? 'var(--shadow)' : 'none'};overflow:hidden;${tilt ? '' : ''}}
.t-main{grid-column:span 2;grid-row:span 2;padding:44px;display:flex;flex-direction:column;justify-content:flex-end}
.t-img{grid-column:span 2;grid-row:span 2}
.t-stat{background:var(--accent);color:var(--on-accent);padding:26px;display:flex;flex-direction:column;justify-content:space-between;${tilt ? `transform:rotate(${tilt}deg);` : ''}}
.t-stat b{font:var(--display-weight) clamp(40px,4.6vw,76px)/1 var(--font-display);letter-spacing:var(--display-tracking)}
.t-art{grid-column:span 1}
.t-feat{grid-column:span 2;padding:26px;display:grid;grid-template-columns:auto 1fr;gap:6px 18px;align-content:center;${tilt ? `transform:rotate(${-tilt / 2}deg);` : ''}}
.t-feat b{font:600 22px/1.2 var(--font-display);text-transform:var(--display-case)}.t-feat p{grid-column:2;margin:0;color:var(--muted);font-size:15px}
.media.fill{position:absolute;inset:0;border-radius:0}

/* hero: fullbleed */
.hero-full{position:relative;min-height:100vh;display:flex;align-items:flex-end;color:#fff;overflow:hidden}
.media.bleed{position:absolute;inset:0;border-radius:0}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,#00000080,#0000 22%,#0000 38%,#000000bf),linear-gradient(90deg,#00000059,#0000 60%)}
.full-inner{position:relative;padding:140px 0 56px}
.hero-full .lede{color:#ffffffcc}
.full-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-top:28px;flex-wrap:wrap}
.hero-full .btn.ghost{color:#fff;border-color:#ffffff66}
body.A-fade .hero-full .h1{background:linear-gradient(180deg,#fff 30%,#ffffffaa);-webkit-background-clip:text;background-clip:text}

/* hero: poster */
.hero-poster{padding:20px 0 90px}
.hero-poster .h1{margin-top:8px}
.poster-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:24px;margin-top:44px;align-items:start;border-top:var(--bw) solid var(--fg);padding-top:24px}
.poster-grid>div:nth-child(1){grid-column:1/5}.poster-grid>div:nth-child(1) .lede{margin:0}
.poster-grid>div:nth-child(2){grid-column:5/8}.poster-grid>div:nth-child(2) .ctas{margin:0;flex-direction:column;align-items:flex-start}
.poster-img{grid-column:8/13;aspect-ratio:4/3}

/* strips */
.stats{border-top:var(--bw) solid var(--border);border-bottom:var(--bw) solid var(--border)}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;padding:40px 0}
.marquee{overflow:hidden;border-top:var(--bw) solid var(--border);border-bottom:var(--bw) solid var(--border);padding:22px 0;background:${hard ? 'var(--accent)' : 'transparent'};color:${hard ? 'var(--on-accent)' : 'inherit'}}
.track{display:flex;gap:36px;width:max-content;animation:marquee 40s linear infinite;font:var(--display-weight) clamp(22px,2.2vw,34px)/1 var(--font-display);letter-spacing:var(--display-tracking);text-transform:var(--display-case)}
.track span{white-space:nowrap}.track i{font-style:normal;color:var(--accent)}
${hard ? '.marquee .track i{color:inherit}' : ''}

/* features */
.features{padding:120px 0}
.feat-head{display:grid;grid-template-columns:1fr 3fr;gap:24px;align-items:baseline;margin-bottom:56px}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.feat-grid.n2{grid-template-columns:repeat(2,1fr)}.feat-grid.n4{grid-template-columns:repeat(4,1fr)}
.feat{display:flex;flex-direction:column;gap:12px;${hard ? 'background:var(--surface);border:var(--bw) solid var(--fg);box-shadow:var(--shadow);padding:14px 14px 22px;border-radius:var(--radius);' : ''}}
.feat:nth-child(2){${tilt ? `transform:rotate(${-tilt}deg)` : ''}}
.feat-img{aspect-ratio:4/3;margin-bottom:10px}
.feat h3{margin:0;font:600 clamp(20px,1.6vw,24px)/1.2 var(--font-display);letter-spacing:calc(var(--display-tracking) / 2);text-transform:var(--display-case)}
.feat p{margin:0;color:var(--muted);font-size:16px;max-width:36ch}

/* statement */
.statement{padding:40px 0 120px}
.st-grid{display:grid;grid-template-columns:5fr 7fr;gap:64px;align-items:center}
.st-img{aspect-ratio:4/5}
blockquote{margin:0}
blockquote p{font:${style.accentText === 'italic' ? 'italic ' : ''}var(--display-weight) clamp(28px,3.3vw,52px)/1.1 var(--font-accent);letter-spacing:var(--display-tracking);margin:0;text-wrap:balance;text-transform:var(--display-case)}
blockquote cite{display:block;margin-top:28px;font:500 14px/1 var(--font-mono);font-style:normal;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}

/* cta band */
.cta-band{padding:80px 0 60px;border-top:var(--bw) solid var(--border);overflow:hidden}
.big-brand{font:var(--display-weight) ${brandSize.desk}/.85 var(--font-display);letter-spacing:var(--display-tracking);text-transform:var(--display-case);margin:0;white-space:nowrap}
.cta-row{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:36px;flex-wrap:wrap}
.cta-row p{margin:0;max-width:44ch;color:var(--muted)}
.cta-row .ctas{margin:0}

/* spec footer */
.spec{background:${d.dark ? mixHex(d.bg, '#ffffff', 0.04) : mixHex(d.bg, d.fg, 0.04)};border-top:var(--bw) solid var(--border);padding:44px 0 36px;font-size:14px}
.spec-top{display:flex;align-items:center;gap:24px;padding-bottom:28px;border-bottom:1px solid var(--border)}
.spec-top nav{display:flex;gap:22px;margin-left:auto;color:var(--muted)}
.spec-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:40px;padding:32px 0}
.spec h4{margin:0 0 16px;font:500 11px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:10px}
.sw i{display:block;height:54px;border-radius:min(var(--radius),10px);border:1px solid var(--border);margin-bottom:8px}
.sw b{display:block;font:600 12px/1.3 var(--font-body)}.sw span{font:12px/1.3 var(--font-mono);color:var(--muted)}
.type-spec{display:flex;gap:20px;align-items:center}
.aa{font:var(--display-weight) 88px/1 var(--font-display);letter-spacing:var(--display-tracking)}
.type-spec b{display:block;font:600 15px/1.3 var(--font-display)}.type-spec span{display:block;font:12px/1.4 var(--font-mono);color:var(--muted);margin-bottom:8px}
.shape-spec{display:flex;gap:18px;align-items:center}
.shape-box{width:84px;height:84px;background:var(--accent);border-radius:var(--radius);border:var(--bw) solid ${hard ? 'var(--fg)' : 'transparent'};box-shadow:var(--shadow);flex:none}
.shape-spec span{display:block;font:12px/1.7 var(--font-mono);color:var(--muted)}
.spec-foot{margin:0;padding-top:20px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}

${textures[style.texture] || ''}
${accentText[style.accentText] || accentText.color}

/* motion */
@keyframes enter{${entrances[style.entrance] || entrances.rise}}
.rise,.h1{animation:enter .9s cubic-bezier(.2,.7,.2,1) both}
.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.26s}.d4{animation-delay:.36s}
@keyframes marquee{to{transform:translateX(-50%)}}
@keyframes blink{50%{opacity:0}}
@keyframes drift{to{transform:translate(8%,6%) scale(1.1)}}
@keyframes wobble{to{transform:rotate(8deg) scale(1.04)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* responsive */
@media (max-width:900px){
  .wrap,.nav{width:calc(100% - 36px)}
  .nav{height:68px;gap:14px}.nav nav{display:none}.nav .btn.small{margin-left:auto}
  .h1{font-size:${h1.mob}}
  .split,.ed-grid,.st-grid,.feat-head{grid-template-columns:1fr;gap:28px}
  .split-img{min-height:0;aspect-ratio:4/3}
  .bento{grid-template-columns:1fr 1fr}.t-main,.t-img,.t-feat{grid-column:span 2}.t-main{padding:26px}.t-img{min-height:260px}
  .poster-grid{grid-template-columns:1fr}.poster-grid>*{grid-column:1/-1!important}
  .meta-row{grid-template-columns:1fr 1fr;row-gap:8px}.meta-row span{text-align:left!important}
  .feat-grid,.feat-grid.n2,.feat-grid.n4{grid-template-columns:1fr}
  .features{padding:72px 0}.statement{padding:20px 0 72px}
  .frame{margin-top:44px}.frame .media.wide{aspect-ratio:4/3}
  .hero-full{min-height:88vh}
  .spec-grid{grid-template-columns:1fr}.spec-top nav{display:none}
  .mini-stats{gap:22px;flex-wrap:wrap}
  .big-brand{font-size:${brandSize.mob}}
  .hero-centered .h1,.center{text-align:center}
}`;
}
