/**
 * The research report ("el PDF"): a landscape A4 deliverable with the design direction
 * and the winners of every page section. Built from session.json + feedback.json:
 *   1. screenshot what can't be embedded as-is (style specimens, live components, latest build)
 *   2. write <sessionDir>/report.html (file:// images, Google Fonts)
 *   3. print it to PDF with Chrome.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { sessionDir } from './session.js';
import { listLibrary } from './components.js';

const LAUNCH_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const FALLBACK_REFS_PER_SECTION = 4;
const FALLBACK_STYLES = 4;

// ─── Labels ────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    research: 'Design research',
    report: 'Research report',
    preparedFor: 'Prepared with inspo',
    round: 'Round',
    stats: { refs: 'References reviewed', liked: 'Selected', styles: 'Styles explored', sections: 'Sections', components: 'Components tried' },
    contents: 'Contents',
    direction: 'Direction',
    concept: 'The concept',
    principles: 'Principles',
    outline: 'Page outline',
    system: 'System',
    palette: 'Palette',
    type: 'Typography',
    display: 'Display',
    body: 'Text',
    mono: 'Mono',
    doL: 'Do',
    dontL: 'Don’t',
    taste: 'Taste profile',
    tasteLede: 'No brief has been published yet. This is what the votes say so far.',
    topReasons: 'Why things were liked',
    likedPalettes: 'Palettes that won',
    likedFonts: 'Type that won',
    likedSources: 'Where the winners came from',
    generalNote: 'General note',
    nothingYet: 'Not enough votes yet.',
    sections: 'Sections',
    section: 'Section',
    general: 'General',
    references: 'References',
    generalWhy: 'References that apply to the whole page rather than a single section.',
    selected: (n) => `${n} selected`,
    starred: (n) => `${n} ${n === 1 ? 'favorite' : 'favorites'}`,
    discarded: (n) => `${n} discarded`,
    unrated: (n) => `${n} not reviewed`,
    cont: 'continued',
    pending: 'Still open',
    pendingLede: 'Sections with nothing picked yet. They need a vote, or new references.',
    emptySectionHint: (n) => (n ? `${n} ${n === 1 ? 'reference is' : 'references are'} waiting for a vote on the board.` : 'Ask Claude to research references for it.'),
    favorite: 'Favorite',
    styles: 'Styles',
    stylesLede: 'The visual directions that won, rendered with the project’s own copy.',
    components: 'Components',
    componentsLede: 'Live pieces chosen for the page. Claude ports them to your stack.',
    inBrief: 'In the brief',
    builds: 'The page',
    buildsLede: 'Versions of the page built from this research.',
    current: 'Current version',
    version: 'Version',
    next: 'Next steps',
    credits: 'Photo credits',
    creditsNote: 'Openverse photos used in this report (style specimens and references). Keep the credits, and license proper photography for production.',
    colophon: 'Generated with inspo, a design research tool for Claude Code.',
    fallback: 'No votes yet: team selection',
    steps: {
      brief: 'Close the direction: publish the brief with the winners of each section.',
      vote: (list) => `Vote the sections that still have no pick: ${list}.`,
      build: 'Build the first version of the page in your stack, using the brief’s tokens and these winners section by section.',
      iterate: (v) => `Review v${v} against these references section by section and note what is still missing.`,
      components: 'Port the chosen components to the stack (React/Next, GSAP, R3F) keeping the brief’s palette.',
      photos: 'Commission or license real photography before launch; the specimens use CC placeholders.',
      share: 'Share this PDF with whoever decides, and collect their notes on the board.',
    },
  },
  es: {
    research: 'Investigación de diseño',
    report: 'Reporte de investigación',
    preparedFor: 'Preparado con inspo',
    round: 'Ronda',
    stats: { refs: 'Referencias revisadas', liked: 'Seleccionadas', styles: 'Estilos explorados', sections: 'Secciones', components: 'Componentes probados' },
    contents: 'Contenido',
    direction: 'Dirección',
    concept: 'El concepto',
    principles: 'Principios',
    outline: 'Estructura de la página',
    system: 'Sistema',
    palette: 'Paleta',
    type: 'Tipografía',
    display: 'Display',
    body: 'Texto',
    mono: 'Mono',
    doL: 'Sí',
    dontL: 'No',
    taste: 'Perfil de gusto',
    tasteLede: 'Todavía no hay brief. Esto es lo que dicen los votos hasta ahora.',
    topReasons: 'Por qué gustaron',
    likedPalettes: 'Paletas que ganaron',
    likedFonts: 'Tipografías que ganaron',
    likedSources: 'De dónde salieron las ganadoras',
    generalNote: 'Nota general',
    nothingYet: 'Todavía no hay suficientes votos.',
    sections: 'Secciones',
    section: 'Sección',
    general: 'General',
    references: 'Referencias',
    generalWhy: 'Referencias que aplican a toda la página y no a una sola sección.',
    selected: (n) => `${n} ${n === 1 ? 'elegida' : 'elegidas'}`,
    starred: (n) => `${n} ${n === 1 ? 'favorita' : 'favoritas'}`,
    discarded: (n) => `${n} ${n === 1 ? 'descartada' : 'descartadas'}`,
    unrated: (n) => `${n} sin votar`,
    cont: 'continuación',
    pending: 'Por resolver',
    pendingLede: 'Secciones sin nada elegido todavía. Necesitan votos o nuevas referencias.',
    emptySectionHint: (n) => (n ? `${n} ${n === 1 ? 'referencia espera' : 'referencias esperan'} voto en el tablero.` : 'Pídele a Claude que busque referencias para ella.'),
    favorite: 'Favorita',
    styles: 'Estilos',
    stylesLede: 'Las direcciones visuales que ganaron, con el copy real del proyecto.',
    components: 'Componentes',
    componentsLede: 'Piezas vivas elegidas para la página. Claude las lleva a tu stack.',
    inBrief: 'En el brief',
    builds: 'La página',
    buildsLede: 'Versiones de la página construidas a partir de esta investigación.',
    current: 'Versión actual',
    version: 'Versión',
    next: 'Siguientes pasos',
    credits: 'Créditos de fotos',
    creditsNote: 'Fotos de Openverse usadas en este reporte (mockups de estilo y referencias). Conserva los créditos y licencia fotografía propia para producción.',
    colophon: 'Generado con inspo, una herramienta de investigación de diseño para Claude Code.',
    fallback: 'Sin votos todavía: selección del equipo',
    steps: {
      brief: 'Cerrar la dirección: publicar el brief con las ganadoras de cada sección.',
      vote: (list) => `Votar las secciones que siguen sin elección: ${list}.`,
      build: 'Construir la primera versión de la página en tu stack, con los tokens del brief y estas ganadoras sección por sección.',
      iterate: (v) => `Revisar la v${v} contra estas referencias, sección por sección, y anotar lo que falta.`,
      components: 'Llevar los componentes elegidos al stack (React/Next, GSAP, R3F) con la paleta del brief.',
      photos: 'Encargar o licenciar fotografía real antes de lanzar; los mockups usan fotos CC de relleno.',
      share: 'Compartir este PDF con quien decide y juntar sus notas en el tablero.',
    },
  },
};

const REASONS = {
  en: { layout: 'Layout', type: 'Typography', color: 'Color', imagery: 'Imagery', motion: 'Motion', '3d': '3D', vibe: 'Vibe', copy: 'Copy', detail: 'Details' },
  es: { layout: 'Layout', type: 'Tipografía', color: 'Color', imagery: 'Imágenes', motion: 'Animación', '3d': '3D', vibe: 'Vibe', copy: 'Copy', detail: 'Detalles' },
};

const SOURCE_NAMES = {
  awwwards: 'Awwwards', dribbble: 'Dribbble', landbook: 'Land-book', siteinspire: 'Siteinspire', onepagelove: 'One Page Love',
  lapa: 'Lapa Ninja', mobbin: 'Mobbin', openverse: 'Openverse', live: 'Live', library: 'inspo',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Only let plain color values through (hex, rgb/hsl/oklch functions, named colors). */
function safeColor(c) {
  const v = String(c || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([0-9a-z.,%/\s-]+\)$/i.test(v)) return v;
  if (/^[a-z]{3,20}$/i.test(v)) return v;
  return null;
}

/** Relative luminance of a hex color, or null when it isn't hex. */
function luminance(c) {
  let h = String(c || '').replace('#', '');
  if (!/^[0-9a-f]{3,8}$/i.test(h)) return null;
  if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const inkOn = (c) => ((luminance(c) ?? 1) > 0.36 ? '#111110' : '#f4f2ec');

const safeFont = (f) => String(f || '').replace(/["'<>;{}\\]/g, '').trim().slice(0, 60);
const cssFont = (f, fallback = 'serif') => (safeFont(f) ? `'${safeFont(f)}', ${fallback}` : fallback);

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const sourceName = (s) => {
  const k = String(s || '').replace(/^preset:.*/, 'preset');
  return SOURCE_NAMES[k] || (k === 'preset' ? 'inspo' : k ? k.charAt(0).toUpperCase() + k.slice(1) : '');
};

/** `*word*` in copy means emphasis. */
const emph = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const pad = (n) => String(n).padStart(2, '0');

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (i < list.length) {
        const idx = i++;
        out[idx] = await fn(list[idx], idx).catch(() => null);
      }
    }),
  );
  return out;
}

function googleFontLinks(families) {
  const out = [];
  for (const f of families) {
    const fam = safeFont(f);
    if (!fam) continue;
    const q = encodeURIComponent(fam).replace(/%20/g, '+');
    // Separate links per family and weight: one unknown family/weight must not break the others.
    out.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${q}&display=block">`);
    out.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${q}:wght@600&display=block">`);
  }
  return out.join('\n');
}

// ─── Browser ───────────────────────────────────────────────────────────────

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true, args: LAUNCH_ARGS });
  } catch {
    try {
      return await chromium.launch({ headless: true, args: LAUNCH_ARGS });
    } catch (err) {
      throw new Error(`Could not launch a browser for the report. Install Chrome, or run \`npx playwright install chromium\`.\n${err.message}`);
    }
  }
}

/** Screenshot a URL into a JPEG. Returns the file path, or null if it failed. */
async function shoot(browser, { url, file, width, height, wait }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'light' });
  try {
    const page = await context.newPage();
    const res = await page.goto(url, { waitUntil: 'load', timeout: 25000 });
    if (res && !res.ok()) return null;
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(wait);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
    return file;
  } catch {
    return null;
  } finally {
    await context.close().catch(() => {});
  }
}

const IMG_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };

/**
 * Re-encode reference images as top-cropped JPEGs (max 1000px wide, 1.2:1 tall). Gallery
 * screenshots can be 10,000px-tall WebP/AVIF, which Chrome would embed losslessly and bloat the PDF.
 * Returns Map(itemId → file:// URL). Anything that fails keeps its original image.
 */
async function makeThumbs(browser, jobs) {
  const out = new Map();
  if (!jobs.length) return out;
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.setContent('<!doctype html><body style="margin:0;background:#e4e1d8"><img id="i" style="display:block;width:100%;height:auto">');
    for (const { id, src, file } of jobs) {
      try {
        const [a, b] = await Promise.all([fs.stat(src), fs.stat(file).catch(() => null)]);
        if (b && b.mtimeMs >= a.mtimeMs && b.size > 0) {
          out.set(id, pathToFileURL(file).href);
          continue;
        }
        const type = IMG_TYPES[path.extname(src).toLowerCase()];
        if (!type) continue;
        const data = `data:${type};base64,${(await fs.readFile(src)).toString('base64')}`;
        const dim = await page.evaluate(async (url) => {
          const i = document.getElementById('i');
          i.src = url;
          await i.decode();
          return { w: i.naturalWidth, h: i.naturalHeight };
        }, data);
        if (!dim.w || !dim.h) continue;
        const width = Math.min(1000, dim.w);
        const height = Math.max(1, Math.min(Math.round((width * dim.h) / dim.w), Math.round(width * 1.2)));
        await page.setViewportSize({ width, height });
        await fs.mkdir(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height } });
        out.set(id, pathToFileURL(file).href);
      } catch {
        /* keep the original */
      }
    }
  } finally {
    await context.close().catch(() => {});
  }
  return out;
}

// ─── Model ─────────────────────────────────────────────────────────────────

function buildModel({ session, feedback, library, dir }) {
  const lang = String(session.context?.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
  const fbItems = feedback?.items || {};
  const fbOf = (id) => fbItems[id] || { vote: 0, star: false, note: '', reasons: [] };
  const isLiked = (id) => fbOf(id).vote === 1 || Boolean(fbOf(id).star);
  const byStar = (a, b) => Number(Boolean(fbOf(b.id).star)) - Number(Boolean(fbOf(a.id).star));

  const items = Array.isArray(session.items) ? session.items : [];
  const refs = items.filter((i) => i.kind === 'reference');
  const styles = items.filter((i) => i.kind === 'style');
  const libItems = (library || []).map((c) => ({ ...c, kind: 'component', title: c.name, source: 'library' }));
  const components = [...libItems, ...items.filter((i) => i.kind === 'component')];
  const everything = [...items, ...libItems];
  const likedAny = everything.filter((i) => isLiked(i.id));
  const fallback = likedAny.length === 0;

  const fileUrl = (rel) => {
    if (!rel || /^https?:/i.test(rel)) return null; // never embed remote images
    const full = path.resolve(dir, rel);
    if (!full.startsWith(path.resolve(dir) + path.sep) || !existsSync(full)) return null;
    return pathToFileURL(full).href;
  };

  // Sections: explicit list first, then any section ids found on items, then "general".
  const declared = (Array.isArray(session.sections) ? session.sections : [])
    .map((s) => (typeof s === 'string' ? { id: s, name: s } : s))
    .filter((s) => s && s.id);
  const known = new Set(declared.map((s) => s.id));
  for (const r of refs) {
    if (r.section && !known.has(r.section)) {
      known.add(r.section);
      declared.push({ id: r.section, name: r.section.charAt(0).toUpperCase() + r.section.slice(1).replace(/[-_]/g, ' ') });
    }
  }
  const hasSections = declared.length > 0;
  const sectionOf = (r) => (r.section && known.has(r.section) ? r.section : '__general');
  const secList = [...declared];
  if (refs.some((r) => sectionOf(r) === '__general')) secList.push({ id: '__general', general: true });

  const sections = secList.map((sec) => {
    const all = refs.filter((r) => sectionOf(r) === sec.id);
    let picked = all.filter((r) => isLiked(r.id)).sort(byStar);
    if (fallback) picked = all.slice(0, FALLBACK_REFS_PER_SECTION);
    return {
      ...sec,
      all,
      picked,
      starred: all.filter((r) => fbOf(r.id).star).length,
      discarded: all.filter((r) => fbOf(r.id).vote === -1).length,
      unrated: all.filter((r) => !fbOf(r.id).vote && !fbOf(r.id).star).length,
    };
  });

  let likedStyles = styles.filter((s) => isLiked(s.id)).sort(byStar);
  if (fallback) likedStyles = styles.slice(0, FALLBACK_STYLES);

  const briefComps = new Set((session.brief?.components || []).map((c) => (typeof c === 'string' ? c : c?.id)).filter(Boolean));
  let likedComps = components.filter((c) => isLiked(c.id) || briefComps.has(c.id));
  if (fallback && !likedComps.length) likedComps = items.filter((i) => i.kind === 'component').slice(0, 4);
  likedComps.sort((a, b) => byStar(a, b) || Number(briefComps.has(b.id)) - Number(briefComps.has(a.id)));

  return { lang, L: LABELS[lang], R: REASONS[lang], fbOf, isLiked, refs, styles, components, likedAny, fallback, fileUrl, sections, hasSections, likedStyles, likedComps, briefComps };
}

// ─── Page renderers ────────────────────────────────────────────────────────

function cover(ctx) {
  const { session, m } = ctx;
  const { L } = m;
  const title = session.title || session.id;
  const size = title.length <= 16 ? 136 : title.length <= 28 ? 108 : title.length <= 48 ? 82 : 62;
  const secCount = m.sections.filter((s) => !s.general).length;
  const stats = [
    [m.refs.length, L.stats.refs],
    [m.likedAny.length, L.stats.liked],
    [m.styles.length, L.stats.styles],
    m.hasSections ? [secCount, L.stats.sections] : [m.components.length, L.stats.components],
  ];
  // A quiet strip of the favorite references on the right.
  const pool = m.sections.flatMap((s) => s.picked).filter((r) => refImage(ctx, r));
  const strip = [...pool.filter((r) => m.fbOf(r.id).star), ...pool.filter((r) => !m.fbOf(r.id).star)].slice(0, 3);
  const aud = session.context?.audience;
  return {
    dark: true,
    cls: 'cover',
    html: `
    <div class="cv-top">
      <div class="mark"><i></i>inspo</div>
      <div>${esc(L.research)}${session.round > 1 ? ` · ${esc(L.round)} ${Number(session.round)}` : ''}</div>
      <div class="r">${esc(ctx.date)}</div>
    </div>
    <div class="cv-main ${strip.length === 3 ? 'with-strip' : ''}">
      <div class="cv-text">
        <div class="kicker">${esc(L.report)}${m.fallback ? `<span class="flag">${esc(L.fallback)}</span>` : ''}</div>
        <h1 style="font-size:${size}px">${esc(title)}</h1>
        <p class="idea">${esc(String(session.idea || '').slice(0, 320))}${String(session.idea || '').length > 320 ? '…' : ''}</p>
        ${aud ? `<p class="aud">${esc(aud)}</p>` : ''}
      </div>
      ${strip.length === 3 ? `<div class="cv-strip">${strip.map((r) => `<div><img src="${esc(refImage(ctx, r))}" alt=""></div>`).join('')}</div>` : ''}
    </div>
    <div class="cv-stats">${stats.map(([n, l]) => `<div><b>${pad(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
`,
  };
}

function swatchRow(palette, { big = false, compact = false } = {}) {
  const entries = Object.entries(palette || {})
    .map(([k, v]) => [k, safeColor(v)])
    .filter(([k, v]) => v && !/border|shadow|overlay/i.test(k))
    .slice(0, 8);
  if (!entries.length) return '';
  if (compact) return `<div class="sw compact">${entries.map(([k, v]) => `<div style="background:${v}" title="${esc(k)}"></div>`).join('')}</div>`;
  return `<div class="sw ${big ? 'big' : ''}">${entries
    .map(([k, v]) => `<div style="background:${v};color:${inkOn(v)}"><span>${esc(k)}</span><b>${esc(v.toUpperCase())}</b></div>`)
    .join('')}</div>`;
}

function briefPages(ctx) {
  const { session, m } = ctx;
  const { L } = m;
  const b = session.brief;
  const principles = (b.principles || []).slice(0, 6);
  const outline = (b.sections || []).map((s) => (typeof s === 'string' ? s : s?.name || s?.title || '')).filter(Boolean).slice(0, 10);
  const pages = [];
  pages.push({
    kicker: L.direction,
    html: `
    <div class="dir">
      <div class="dir-l">
        <div><div class="kicker">${esc(L.concept)}</div><h2 class="huge" style="font-size:${((n) => (n <= 14 ? 150 : n <= 22 ? 118 : n <= 40 ? 88 : 64))(String(b.name || session.title).length)}px">${esc(b.name || session.title)}</h2></div>
        <p class="lede">${esc(b.summary || '')}</p>
      </div>
      <div class="dir-r">
        ${principles.length ? `<div><div class="kicker">${esc(L.principles)}</div><ol class="princ">${principles.map((p, i) => `<li><span>${pad(i + 1)}</span>${esc(p)}</li>`).join('')}</ol></div>` : ''}
        ${outline.length ? `<div><div class="kicker">${esc(L.outline)}</div><ol class="outline">${outline.map((s, i) => `<li><span>${pad(i + 1)}</span>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      </div>
    </div>`,
  });

  const fonts = b.fonts || {};
  const headline = String(session.copy?.headline || b.name || session.title || '').slice(0, 90);
  const fontRows = [
    ['display', L.display, 'serif'],
    ['body', L.body, 'sans-serif'],
    ['mono', L.mono, 'monospace'],
  ].filter(([k]) => fonts[k]);
  const dos = (b.do || []).slice(0, 6);
  const donts = (b.dont || []).slice(0, 6);
  pages.push({
    kicker: L.system,
    html: `
    <div class="sys">
      <div class="kicker">${esc(L.palette)}</div>
      ${swatchRow(b.palette, { big: true })}
      <div class="sys-b">
        <div class="type">
          <div class="kicker">${esc(L.type)}</div>
          ${fonts.display ? `<div class="spec-d" style="font-family:${esc(cssFont(fonts.display))}">${emph(headline)}</div>` : ''}
          <div class="fam">${fontRows
            .map(([k, label, fb]) => `<div><span>${esc(label)}</span><b style="font-family:${esc(cssFont(fonts[k], fb))}">${esc(safeFont(fonts[k]))}</b><i style="font-family:${esc(cssFont(fonts[k], fb))}">Aa Bb 0123</i></div>`)
            .join('')}</div>
        </div>
        ${dos.length || donts.length ? `<div class="dodont">
          ${dos.length ? `<div><div class="kicker">${esc(L.doL)}</div><ul class="yes">${dos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          ${donts.length ? `<div><div class="kicker">${esc(L.dontL)}</div><ul class="no">${donts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        </div>` : ''}
      </div>
    </div>`,
  });
  return pages;
}

function tastePage(ctx) {
  const { m, feedback } = ctx;
  const { L, R } = m;
  const liked = m.likedAny;
  const count = (pick) => {
    const map = new Map();
    for (const i of liked) for (const k of pick(i) || []) if (k) map.set(k, (map.get(k) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const reasons = count((i) => m.fbOf(i.id).reasons).slice(0, 7);
  const maxR = reasons[0]?.[1] || 1;
  const fonts = count((i) => [...(i.analysis?.fonts || []).map((f) => f.family), i.style?.fonts?.display, i.style?.fonts?.body]).slice(0, 8);
  const colors = count((i) => [...(i.analysis?.colors?.background || []).slice(0, 3), ...(i.analysis?.colors?.text || []).slice(0, 2)].map(safeColor).filter((c) => c && c.startsWith('#')).map((c) => c.toLowerCase())).slice(0, 11);
  const sources = count((i) => (i.kind === 'reference' ? [sourceName(i.source)] : [])).slice(0, 5);
  const stylePals = liked.filter((i) => i.kind === 'style' && i.style?.palette).slice(0, 4);
  const googleable = new Set(liked.flatMap((i) => (i.style?.fonts ? [i.style.fonts.display, i.style.fonts.body] : [])));
  const general = String(feedback?.general || '').trim();

  const col = (title, body) => `<div class="tcol"><div class="kicker">${esc(title)}</div>${body}</div>`;
  const empty = `<p class="muted">${esc(L.nothingYet)}</p>`;
  return {
    kicker: L.taste,
    html: `
    <div class="taste">
      <div class="taste-h">
        <h2 class="big-t">${esc(L.taste)}</h2>
        <p class="lede">${general ? `<span class="q">“${esc(general.slice(0, 280))}”</span>` : esc(L.tasteLede)}</p>
      </div>
      <div class="tgrid">
        ${col(L.topReasons, reasons.length ? `<div class="bars">${reasons.map(([k, n]) => `<div><span>${esc(R[k] || k)}</span><i style="width:${Math.round((n / maxR) * 100)}%"></i><b>${n}</b></div>`).join('')}</div>` : empty)}
        ${col(L.likedPalettes, stylePals.length || colors.length ? `${stylePals.map((s) => `<div class="pal-row"><span>${esc(s.title)}</span>${swatchRow(s.style.palette, { compact: true })}</div>`).join('')}${colors.length ? `<div class="chips">${colors.map(([c]) => `<i style="background:${c}" title="${esc(c)}"></i>`).join('')}</div>` : ''}` : empty)}
        ${col(L.likedFonts, fonts.length ? `<ul class="fontlist">${fonts.map(([f, n]) => `<li><b style="${googleable.has(f) ? `font-family:${esc(cssFont(f, 'sans-serif'))}` : ''}">${esc(f)}</b><span>×${n}</span></li>`).join('')}</ul>` : empty)}
        ${col(L.likedSources, sources.length ? `<ul class="fontlist">${sources.map(([s, n]) => `<li><b>${esc(s)}</b><span>×${n}</span></li>`).join('')}</ul>` : empty)}
      </div>
    </div>`,
  };
}

function refImage(ctx, r) {
  return ctx.thumbs.get(r.id) || ctx.m.fileUrl(r.image) || ctx.m.fileUrl(r.liveImage);
}

function refCard(ctx, r, big) {
  const { m } = ctx;
  const f = m.fbOf(r.id);
  const img = refImage(ctx, r);
  const h = host(r.liveUrl || (r.source === 'live' ? r.url : ''));
  const meta = [r.source === 'live' ? '' : sourceName(r.source), h].filter(Boolean).join(' · ');
  return `<figure class="card ${big ? 'big' : ''}">
    <div class="shot">${img ? `<img src="${esc(img)}" alt="">` : `<div class="ph">${esc(sourceName(r.source))}</div>`}${f.star ? `<span class="fav">★ ${esc(m.L.favorite)}</span>` : ''}</div>
    <figcaption><b>${esc(r.title || h || host(r.url) || r.id)}</b><span class="meta">${esc(meta)}</span>${f.note ? `<q>${esc(f.note)}</q>` : ''}</figcaption>
  </figure>`;
}

/** Grid shape for k cards; `big` = the first favorite takes a 2×2 block. */
function gridFor(k, star, first) {
  if (k <= 1) return { cols: 1, rows: 1, big: false };
  if (k === 2) return { cols: 2, rows: 1, big: false };
  if (k === 3) return star ? { cols: 3, rows: 2, big: true } : { cols: 3, rows: 1, big: false };
  if (k === 4) return { cols: 2, rows: 2, big: false };
  if (k === 5) return star ? { cols: 4, rows: 2, big: true } : { cols: 3, rows: 2, big: false };
  if (k === 6) return { cols: 3, rows: 2, big: false };
  if (k <= 8 || first) return { cols: 4, rows: 2, big: false };
  if (k === 9) return { cols: 3, rows: 3, big: false };
  return { cols: 4, rows: 3, big: false };
}

/**
 * Pages for a section. The first page (under the section header) holds up to 8 cards, or one
 * 2×2 favorite + 4 when the section overflows; the rest are spread evenly over 12-card pages.
 */
function packSection(ctx, sec) {
  const { m } = ctx;
  const list = sec.picked;
  const starred = list.length > 0 && Boolean(m.fbOf(list[0].id).star);
  const firstCount = list.length <= 8 ? list.length : starred ? 5 : 8;
  const pages = [];
  const firstCards = list.slice(0, firstCount);
  const g = gridFor(firstCards.length, starred, true);
  const big = g.big || (list.length > 8 && starred);
  pages.push({ ...(big && list.length > 8 ? { cols: 4, rows: 2 } : g), cards: firstCards.map((r, i) => ({ r, big: big && i === 0 })) });
  const rest = list.slice(firstCount);
  if (rest.length) {
    const n = Math.ceil(rest.length / 12);
    const per = Math.ceil(rest.length / n);
    for (const group of chunk(rest, per)) pages.push({ ...gridFor(group.length, false, false), cards: group.map((r) => ({ r, big: false })) });
  }
  return pages;
}

function sectionName(m, sec) {
  return sec.general ? (m.hasSections ? m.L.general : m.L.references) : sec.name || sec.id;
}

function sectionPages(ctx, sec, idx) {
  const { m } = ctx;
  const { L } = m;
  const name = sectionName(m, sec);
  const why = sec.general ? (m.hasSections ? L.generalWhy : '') : sec.why || '';
  const stats = [
    sec.picked.length && !m.fallback ? L.selected(sec.picked.length) : '',
    sec.starred ? L.starred(sec.starred) : '',
    sec.discarded ? L.discarded(sec.discarded) : '',
    sec.unrated && !m.fallback ? L.unrated(sec.unrated) : '',
  ].filter(Boolean);
  const head = `
    <div class="sechead">
      <div class="secname"><span class="no">${pad(idx)}</span><h2>${esc(name)}</h2></div>
      <div class="secside">
        ${why ? `<p>${esc(why)}</p>` : ''}
        <div class="secstats">${stats.map((s) => `<span>${esc(s)}</span>`).join('')}${m.fallback ? `<span class="flag">${esc(L.fallback)}</span>` : ''}</div>
      </div>
    </div>`;
  const kicker = m.hasSections ? `${L.sections} — ${name}` : name;
  const packed = packSection(ctx, sec);
  return packed.map((pg, i) => {
    const notes = pg.cards.some((c) => m.fbOf(c.r.id).note);
    return {
      kicker: packed.length > 1 ? `${kicker} · ${i + 1}/${packed.length}` : kicker,
      html: `${i === 0 ? head : `<div class="conthead"><h3>${esc(name)}</h3><span>${esc(L.cont)} · ${i + 1}/${packed.length}</span></div>`}
      <div class="grid ${notes ? 'notes' : ''} r${pg.rows}" style="--cols:${pg.cols};--rows:${pg.rows}">${pg.cards.map((c) => refCard(ctx, c.r, c.big)).join('')}</div>`,
    };
  });
}

/** Sections with nothing picked share one quiet page instead of one empty page each. */
function pendingPage(ctx, pending) {
  const { m } = ctx;
  const { L } = m;
  if (!pending.length) return [];
  return [{
    kicker: `${L.sections} — ${L.pending}`,
    html: `
    <div class="pagehead"><h2 class="big-t">${esc(L.pending)}</h2><p>${esc(L.pendingLede)}</p></div>
    <ol class="pending">${pending
      .slice(0, 8)
      .map(({ sec, idx }) => `<li><span class="no">${pad(idx)}</span><h3>${esc(sectionName(m, sec))}</h3><p>${esc(sec.why || '')}</p><span class="hint">${esc(L.emptySectionHint(sec.unrated))}</span></li>`)
      .join('')}</ol>`,
  }];
}

function stylePages(ctx) {
  const { m, shots } = ctx;
  const { L } = m;
  if (!m.likedStyles.length) return [];
  return chunk(m.likedStyles, 2).map((group, gi, all) => ({
    kicker: all.length > 1 ? `${L.styles} · ${gi + 1}/${all.length}` : L.styles,
    html: `
    ${gi === 0 ? `<div class="pagehead"><h2 class="big-t">${esc(L.styles)}</h2><p>${esc(L.stylesLede)}</p></div>` : `<div class="conthead"><h3>${esc(L.styles)}</h3><span>${esc(L.cont)} · ${gi + 1}/${all.length}</span></div>`}
    <div class="styles n${group.length}">${group
      .map((s) => {
        const st = s.style || {};
        const f = m.fbOf(s.id);
        const img = shots.get(s.id) || m.fileUrl(s.images?.[0]?.src) || m.fileUrl(s.image);
        const fonts = [['display', L.display, 'serif'], ['body', L.body, 'sans-serif']].filter(([k]) => st.fonts?.[k]);
        return `<figure class="style">
          <div class="shot">${img ? `<img src="${esc(img)}" alt="">` : `<div class="ph">${esc(s.title)}</div>`}${f.star ? `<span class="fav">★ ${esc(L.favorite)}</span>` : ''}</div>
          <figcaption>
            <div class="st-h"><h3>${esc(s.title || st.name)}</h3><span class="meta">${esc(st.vibe || '')}</span></div>
            ${f.note ? `<q>${esc(f.note)}</q>` : `<p class="desc">${esc(st.description || s.description || '')}</p>`}
            <div class="st-spec">${swatchRow(st.palette)}<div class="st-fonts">${fonts.map(([k, label, fb]) => `<div><span>${esc(label)}</span><b style="font-family:${esc(cssFont(st.fonts[k], fb))}">${esc(safeFont(st.fonts[k]))}</b></div>`).join('')}</div></div>
          </figcaption>
        </figure>`;
      })
      .join('')}</div>`,
  }));
}

function componentPages(ctx) {
  const { m, shots } = ctx;
  const { L } = m;
  if (!m.likedComps.length) return [];
  return chunk(m.likedComps, 6).map((group, gi, all) => ({
    kicker: all.length > 1 ? `${L.components} · ${gi + 1}/${all.length}` : L.components,
    html: `
    ${gi === 0 ? `<div class="pagehead"><h2 class="big-t">${esc(L.components)}</h2><p>${esc(L.componentsLede)}</p></div>` : `<div class="conthead"><h3>${esc(L.components)}</h3><span>${esc(L.cont)} · ${gi + 1}/${all.length}</span></div>`}
    <div class="comps ${gi === 0 ? 'first' : ''}">${group
      .map((c) => {
        const f = m.fbOf(c.id);
        const img = shots.get(c.id);
        return `<figure class="card">
          <div class="shot dark">${img ? `<img src="${esc(img)}" alt="">` : `<div class="ph">${esc(c.name || c.title)}</div>`}${f.star ? `<span class="fav">★ ${esc(L.favorite)}</span>` : m.briefComps.has(c.id) ? `<span class="fav">${esc(L.inBrief)}</span>` : ''}</div>
          <figcaption><b>${esc(c.name || c.title)}</b><span class="meta">${esc([c.category, c.library ? 'library' : 'custom'].filter(Boolean).join(' · '))}</span>${f.note ? `<q>${esc(f.note)}</q>` : `<p class="desc">${esc(c.description || '')}</p>`}</figcaption>
        </figure>`;
      })
      .join('')}</div>`,
  }));
}

function buildsPage(ctx) {
  const { session, m, shots } = ctx;
  const { L } = m;
  const builds = (Array.isArray(session.builds) ? session.builds : []).filter((b) => b && b.v != null).sort((a, b) => Number(a.v) - Number(b.v));
  if (!builds.length) return [];
  const latest = builds[builds.length - 1];
  const img = shots.get('__build');
  const fmt = (at) => {
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(m.lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const list = `<ol class="b-list">${builds
    .slice()
    .reverse()
    .slice(0, 7)
    .map((b) => `<li class="${b === latest ? 'on' : ''}"><span>v${esc(b.v)}</span><div><b>${esc(b.label || `${L.version} ${b.v}`)}</b>${b.notes && b !== latest ? `<p>${esc(b.notes)}</p>` : ''}</div><time>${esc(fmt(b.at))}</time></li>`)
    .join('')}</ol>`;
  return [{
    kicker: L.builds,
    html: `
    <div class="builds ${img ? 'with-shot' : 'no-shot'}">
      <div class="b-l">
        <div class="pagehead tight"><h2 class="big-t">${esc(L.builds)}</h2><p>${esc(L.buildsLede)}</p></div>
        <div class="b-now"><span class="kicker">${esc(L.current)}</span><b>v${esc(latest.v)}</b><h3>${esc(latest.label || '')}</h3>${latest.notes ? `<p>${esc(latest.notes)}</p>` : ''}</div>
        ${img ? list : ''}
      </div>
      ${img ? `<div class="b-shot"><div class="shot"><img src="${esc(img)}" alt=""></div></div>` : `<div class="b-r">${list}</div>`}
    </div>`,
  }];
}

function closingPage(ctx) {
  const { session, m } = ctx;
  const { L } = m;
  const S = L.steps;
  const steps = [];
  const emptySecs = m.sections.filter((s) => !s.general && !s.picked.length).map((s) => s.name || s.id);
  const builds = Array.isArray(session.builds) ? session.builds : [];
  if (!session.brief) steps.push(S.brief);
  if (emptySecs.length && !m.fallback) steps.push(S.vote(emptySecs.join(', ')));
  if (builds.length) steps.push(S.iterate(builds[builds.length - 1].v));
  else steps.push(S.build);
  if (m.likedComps.length) steps.push(S.components);
  const credits = [
    ...new Set([
      ...m.likedStyles.flatMap((s) => (s.images || []).map((i) => i?.credit)),
      ...m.sections.flatMap((sec) => sec.picked).map((r) => r.credit),
    ].filter((c) => typeof c === 'string' && c.trim())),
  ];
  if (credits.length) steps.push(S.photos);
  if (steps.length < 4) steps.push(S.share);
  const shown = credits.slice(0, 24);
  return {
    dark: true,
    cls: 'closing',
    html: `
    <div class="cl-main">
      <h2 class="big-t">${esc(L.next)}</h2>
      <ol class="steps">${steps.slice(0, 5).map((s, i) => `<li><span>${pad(i + 1)}</span>${esc(s)}</li>`).join('')}</ol>
    </div>
    ${shown.length ? `<div class="credits"><div class="kicker">${esc(L.credits)}</div><p class="cr-note">${esc(L.creditsNote)}</p><ul>${shown.map((c) => `<li>${esc(c)}</li>`).join('')}${credits.length > shown.length ? `<li>+${credits.length - shown.length}</li>` : ''}</ul></div>` : ''}
    <div class="colophon"><div class="mark"><i></i>inspo</div><span>${esc(L.colophon)}</span><span>${esc(ctx.date)}</span></div>`,
  };
}

// ─── Document ──────────────────────────────────────────────────────────────

const CSS = `
@page{size:A4 landscape;margin:0}
:root{--paper:#f3f1eb;--ink:#121211;--dim:#56544e;--faint:#8f8c84;--rule:rgba(18,18,17,.13);--well:#e4e1d8;
  --night:#0e0e0f;--night-fg:#f2f1ec;--night-dim:#9f9d96;--acc:#d6ff3d;
  --serif:'Instrument Serif',Georgia,serif;--sans:'Geist',ui-sans-serif,system-ui,sans-serif;--mono:'Geist Mono',ui-monospace,monospace}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#cfccc4}
body{font:12px/1.45 var(--sans);color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased;font-feature-settings:"ss01"}
img{display:block}
ol,ul{list-style:none}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;background:var(--paper);padding:34px 46px 30px;display:flex;flex-direction:column;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
@media screen{body{padding:28px 0}.page{margin:0 auto 28px;box-shadow:0 20px 60px rgba(0,0,0,.18)}}
.page.dark{background:var(--night);color:var(--night-fg);--rule:rgba(242,241,236,.14);--dim:var(--night-dim);--faint:#6f6d68}

.run{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;font:500 8.5px/1 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--faint);flex:none}
.run>:nth-child(2){text-align:center}.run>:last-child{text-align:right}
.run .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ink);margin-right:7px;vertical-align:0}
.main{flex:1;min-height:0;display:flex;flex-direction:column;margin:26px 0 20px}
.kicker{font:500 8.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:14px}
.kicker.mt{margin-top:34px}
.muted{color:var(--faint)}
.meta{font:500 8px/1.3 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
q{quotes:"“" "”"}
.big-t{font:400 60px/.95 var(--serif);letter-spacing:-.02em}
.lede{font-size:16px;line-height:1.5;color:var(--dim);max-width:520px}
.mark{display:flex;align-items:center;gap:8px;font:600 14px/1 var(--sans);letter-spacing:-.02em;text-transform:none;color:var(--night-fg)}
.mark i{width:17px;height:17px;border-radius:5px;background:var(--acc);display:grid;place-items:center}
.mark i:after{content:"";width:6px;height:6px;border-radius:50%;background:var(--night)}

/* cover */
.cover{padding:40px 50px 40px}
.cv-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;font:500 9px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--night-dim)}
.cv-top .r{text-align:right}
.cv-main{flex:1;min-height:0;display:grid;grid-template-columns:1fr;gap:44px;align-items:end;padding:30px 0 34px}
.cv-main.with-strip{grid-template-columns:1fr 290px}
.cv-text .kicker{color:var(--acc);margin-bottom:22px}
.cover h1{font-family:var(--serif);font-weight:400;line-height:.9;letter-spacing:-.03em;max-width:760px;text-wrap:balance}
.cover .idea{margin-top:26px;font-size:14.5px;line-height:1.55;color:var(--night-dim);max-width:560px}
.cover .aud{margin-top:12px;font:500 9px/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.cv-strip{height:430px;display:grid;grid-template-rows:1.3fr 1fr 1fr;gap:8px;align-self:end}
.cv-strip div{position:relative;overflow:hidden;border-radius:3px;background:#1b1b1d}
.cv-strip img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
.cv-stats{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--rule);flex:none}
.cv-stats div{padding:16px 16px 0 0;display:flex;flex-direction:column;gap:8px}
.cv-stats div+div{padding-left:18px;border-left:1px solid var(--rule)}
.cv-stats b{font:400 50px/.9 var(--serif);letter-spacing:-.02em}
.cv-stats span{font:500 8.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--night-dim)}
.cv-text .kicker .flag{color:var(--night-dim);margin-left:14px;padding-left:14px;border-left:1px solid var(--rule)}

/* brief: direction */
.dir{flex:1;display:grid;grid-template-columns:1.05fr 1fr;gap:64px;min-height:0}
.dir-l{display:flex;flex-direction:column;justify-content:space-between;padding-bottom:6px}
.huge{font:400 96px/.9 var(--serif);letter-spacing:-.03em;text-wrap:balance}
.dir-r{border-left:1px solid var(--rule);padding-left:34px;display:flex;flex-direction:column;justify-content:space-between;gap:30px;padding-bottom:6px}
.dir-r>:only-child{margin-top:auto}
.princ li{display:grid;grid-template-columns:34px 1fr;font:400 26px/1.12 var(--serif);letter-spacing:-.01em;padding:13px 0;border-top:1px solid var(--rule)}
.princ li span,.outline li span,.steps li span{font:500 8.5px/2.2 var(--mono);color:var(--faint);letter-spacing:.06em}
.outline{display:grid;grid-template-columns:1fr 1fr;column-gap:22px}
.outline li{display:grid;grid-template-columns:26px 1fr;font-size:12px;padding:7px 0;border-top:1px solid var(--rule)}
.outline li span{line-height:1.6}

/* brief: system */
.sys{flex:1;display:flex;flex-direction:column;min-height:0}
.sw{display:flex;gap:0;border-radius:4px;overflow:hidden;outline:1px solid var(--rule)}
.sw div{flex:1;min-width:0;height:44px;display:flex;flex-direction:column;justify-content:flex-end;padding:5px 6px;gap:2px}
.sw span{font:500 7px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;opacity:.7;white-space:nowrap;overflow:hidden}
.sw b{font:500 7.5px/1 var(--mono);white-space:nowrap;overflow:hidden}
.sw.compact div{height:26px;padding:0}
.sw.big div{height:230px;padding:14px 16px;gap:6px}
.sw.big span{font-size:9px}.sw.big b{font-size:12px}
.sys-b{flex:1;min-height:0;display:grid;grid-template-columns:1.7fr 1fr;gap:56px;margin-top:34px;align-items:start}
.spec-d{font-size:50px;line-height:1.02;letter-spacing:-.025em;margin-bottom:24px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-wrap:balance;padding-bottom:.08em}
.spec-d em{font-style:italic}
.fam{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--rule)}
.fam div{padding-top:12px;display:flex;flex-direction:column;gap:6px}
.fam span{font:500 8px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.fam b{font-size:18px;font-weight:500}
.fam i{font-style:normal;font-size:13px;color:var(--dim)}
.dodont{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-content:start}
.dodont li{font-size:12.5px;line-height:1.35;padding:8px 0 8px 18px;border-top:1px solid var(--rule);position:relative}
.dodont .yes li:before,.dodont .no li:before{position:absolute;left:0;top:8px;font:500 11px/1.3 var(--mono)}
.dodont .yes li:before{content:"+"}
.dodont .no li:before{content:"–";color:#c2361f}

/* taste */
.taste{flex:1;display:flex;flex-direction:column;min-height:0}
.taste-h{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:end;padding-bottom:26px;border-bottom:1px solid var(--ink)}
.taste-h .q{font:italic 400 22px/1.3 var(--serif);color:var(--ink)}
.tgrid{flex:1;min-height:0;display:grid;grid-template-columns:1.1fr 1.2fr 1fr 1fr;gap:36px;padding-top:24px}
.tcol{min-width:0}
.bars div{display:grid;grid-template-columns:78px 1fr 18px;gap:10px;align-items:center;padding:6px 0;font-size:12px}
.bars i{height:5px;background:var(--ink);border-radius:5px}
.bars b{font:500 9px var(--mono);text-align:right;color:var(--faint)}
.pal-row{margin-bottom:14px}
.pal-row>span{display:block;font-size:11.5px;font-weight:500;margin-bottom:6px}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:18px}
.chips i{width:18px;height:18px;border-radius:50%;outline:1px solid var(--rule)}
.fontlist li{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:7px 0;border-top:1px solid var(--rule)}
.fontlist b{font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fontlist span{font:500 9px var(--mono);color:var(--faint)}

/* sections */
.sechead{display:grid;grid-template-columns:1fr 330px;gap:48px;align-items:end;padding-bottom:20px;border-bottom:1px solid var(--ink);margin-bottom:20px;flex:none}
.secname{display:flex;align-items:flex-start;gap:14px;min-width:0}
.secname .no{font:500 9px/1 var(--mono);letter-spacing:.08em;color:var(--faint);padding-top:10px}
.secname h2{font:400 72px/.88 var(--serif);letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.secside p{font-size:13px;line-height:1.45;color:var(--dim);margin-bottom:12px}
.secstats{display:flex;flex-wrap:wrap;gap:4px 14px;font:500 8.5px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.secstats span:first-child{color:var(--ink)}
.secstats .flag{color:var(--faint)}
.conthead{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--ink);margin-bottom:20px;flex:none}
.conthead h3{font:400 30px/1 var(--serif);letter-spacing:-.015em}
.conthead span{font:500 8.5px/1 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--faint)}
.grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));grid-template-rows:repeat(var(--rows),minmax(0,1fr));grid-auto-flow:row dense;gap:18px 18px}
.grid.r1{flex:none;height:440px}
.grid figcaption{height:34px}
.grid.notes figcaption{height:62px}
.grid .card.big figcaption{height:auto}
.card{display:flex;flex-direction:column;min-height:0;min-width:0}
.card.big{grid-column:span 2;grid-row:span 2}
.shot{flex:1;min-height:0;position:relative;background:var(--well);border-radius:3px;overflow:hidden;box-shadow:0 0 0 1px var(--rule)}
.shot.dark{background:#0d0d0e}
.shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center}
.shot .ph{position:absolute;inset:0;display:grid;place-items:center;font:500 9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.fav{position:absolute;left:8px;top:8px;font:500 7.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;background:var(--night);color:var(--acc);padding:5px 7px 4px;border-radius:99px}
figcaption{padding-top:8px;display:flex;flex-direction:column;gap:3px;flex:none;min-width:0}
figcaption b{font-size:11.5px;font-weight:500;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
figcaption .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
figcaption q{font:italic 400 13px/1.2 var(--serif);color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px}
.card.big figcaption b{font-size:13px}
.card.big figcaption q{font-size:16px}
.desc{font-size:11px;line-height:1.4;color:var(--dim);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pending{display:grid;grid-template-columns:1fr 1fr;column-gap:48px;align-content:start}
.pending li{display:grid;grid-template-columns:34px 1fr;column-gap:6px;row-gap:6px;padding:16px 0 18px;border-bottom:1px solid var(--rule)}
.pending .no{font:500 8.5px/2.6 var(--mono);color:var(--faint);grid-row:span 3}
.pending h3{font:400 34px/1 var(--serif);letter-spacing:-.015em}
.pending p{font-size:12px;line-height:1.45;color:var(--dim)}
.pending .hint{font:500 8px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}

/* page heads */
.pagehead{display:grid;grid-template-columns:1fr 330px;gap:48px;align-items:end;padding-bottom:20px;border-bottom:1px solid var(--ink);margin-bottom:22px;flex:none}
.pagehead p{font-size:13px;line-height:1.45;color:var(--dim)}
.pagehead.tight{grid-template-columns:1fr;gap:12px;border:0;padding:0;margin-bottom:28px}

/* styles */
.styles{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:30px}
.style{display:flex;flex-direction:column;min-height:0;min-width:0}
.style .shot{flex:none;aspect-ratio:16/10}
.style figcaption{padding-top:14px;gap:8px}
.st-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.st-h h3{font:400 30px/1 var(--serif);letter-spacing:-.015em;white-space:nowrap}
.st-h .meta{text-align:right}
.style q{font-size:15px}
.st-spec{display:grid;grid-template-columns:1fr;gap:12px;margin-top:4px}
.st-fonts{display:flex;gap:16px}
.st-fonts div{display:flex;flex-direction:column;gap:4px}
.st-fonts span{font:500 7.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.st-fonts b{font-size:14px;font-weight:500;white-space:nowrap}
.styles.n1{grid-template-columns:1.7fr 1fr}
.styles.n1 .style{display:contents}
.styles.n1 figcaption{padding-top:0;justify-content:flex-end}

/* components */
.comps{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:20px 20px}
.comps figcaption{height:68px}

/* builds */
.builds{flex:1;min-height:0;display:grid;grid-template-columns:1fr;gap:44px}
.builds.with-shot{grid-template-columns:360px 1fr}
.b-l{display:flex;flex-direction:column;min-height:0}
.builds.no-shot{grid-template-columns:1.1fr 1fr;gap:64px}
.no-shot .b-l{justify-content:space-between}
.no-shot .b-now{border-bottom:0;padding-bottom:0}
.no-shot .b-now b{font-size:170px;line-height:.8;margin:8px 0 16px}
.no-shot .b-now h3{font:400 30px/1.1 var(--serif);letter-spacing:-.01em}
.no-shot .b-now p{font-size:13px;max-width:420px}
.b-r{display:flex;flex-direction:column;justify-content:flex-end;border-left:1px solid var(--rule);padding-left:34px}
.b-r .b-list li:first-child{border-top:1px solid var(--ink)}
.b-now{padding:20px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule)}
.b-now .kicker{display:block;margin-bottom:10px}
.b-now b{display:block;font:400 64px/.9 var(--serif);letter-spacing:-.02em}
.b-now h3{font-size:15px;font-weight:500;margin-top:8px}
.b-now p{font-size:12px;color:var(--dim);margin-top:4px;line-height:1.45}
.b-list li{display:grid;grid-template-columns:34px 1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid var(--rule);align-items:baseline}
.b-list li>span,.b-list time{font:500 8.5px/1 var(--mono);letter-spacing:.06em;color:var(--faint);text-transform:uppercase}
.b-list b{font-size:12px;font-weight:500}
.b-list p{font-size:11px;color:var(--dim);margin-top:2px}
.b-list li.on>span{color:var(--ink)}
.b-shot{min-height:0;display:flex}
.b-shot .shot{flex:1}
.b-shot .shot img{object-position:top left}

/* closing */
.closing{padding:40px 50px}
.cl-main{flex:1;display:grid;grid-template-columns:300px 1fr;gap:56px;align-items:end;padding-bottom:30px}
.closing .big-t{font-size:72px}
.steps li{display:grid;grid-template-columns:40px 1fr;font:400 22px/1.2 var(--serif);padding:13px 0;border-top:1px solid var(--rule)}
.credits{border-top:1px solid var(--rule);padding-top:16px;margin-bottom:22px;flex:none}
.credits .kicker{margin-bottom:6px}
.cr-note{font-size:10px;color:var(--night-dim);margin-bottom:10px}
.credits ul{columns:3;column-gap:28px;font:400 8px/1.5 var(--mono);color:var(--faint)}
.credits li{break-inside:avoid}
.colophon{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--rule);padding-top:16px;font:500 8.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--night-dim);flex:none}
`;

function renderDocument(ctx, pages) {
  const { session, m, fonts } = ctx;
  const total = pages.length;
  const title = session.title || session.id;
  const body = pages
    .map((p, i) => {
      const n = `${pad(i + 1)} / ${pad(total)}`;
      if (p.dark) return `<section class="page dark ${p.cls || ''}">${p.html}</section>`;
      return `<section class="page ${p.cls || ''}">
        <header class="run"><span><i class="dot"></i>${esc(m.L.research)}</span><span>${esc(p.kicker || '')}</span><span>${esc(title)}</span></header>
        <div class="main">${p.html}</div>
        <footer class="run"><span>inspo</span><span></span><span>${n}</span></footer>
      </section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="${m.lang}">
<head>
<meta charset="utf-8">
<title>${esc(title)} — ${esc(m.L.research)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=block">
${googleFontLinks(fonts)}
<style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Export ────────────────────────────────────────────────────────────────

/**
 * Export the research report as a landscape A4 PDF (and the HTML it was printed from).
 * @param {object} o
 * @param {object} o.session   session.json contents
 * @param {object} o.feedback  feedback.json contents
 * @param {Array}  [o.library] listLibrary() output (loaded if omitted)
 * @param {string} [o.boardUrl] running board base URL, e.g. http://localhost:4777 (needed to screenshot styles/components)
 * @param {string} [o.outFile] PDF path (default <sessionDir>/report.pdf)
 * @returns {Promise<{pdf:string, html:string, pages:number}>}
 */
export async function exportReport({ session, feedback, library, boardUrl, outFile }) {
  if (!session?.id) throw new Error('exportReport needs a session');
  const dir = sessionDir(session.id);
  const pdf = path.resolve(outFile || path.join(dir, 'report.pdf'));
  const htmlFile = path.join(dir, 'report.html');
  const shotsDir = path.join(dir, 'assets', 'report');
  if (!library) library = await listLibrary().catch(() => []);
  const base = String(boardUrl || '').replace(/\/+$/, '');

  const m = buildModel({ session, feedback: feedback || {}, library, dir });
  const browser = await launch();
  try {
    // Step 1: screenshots of the things that only exist live.
    const shots = new Map();
    const jobs = [];
    const sid = encodeURIComponent(session.id);
    const safeName = (id) => String(id).replace(/[^a-z0-9-]/gi, '_');
    if (base) {
      for (const s of m.likedStyles) {
        if (s.file) jobs.push({ key: s.id, url: `${base}/s/${sid}/${s.file}`, file: path.join(shotsDir, `style-${safeName(s.id)}.jpg`), width: 1440, height: 900, wait: 1600 });
      }
      const pal = session.brief?.palette || {};
      const tint = new URLSearchParams();
      ['bg', 'fg', 'muted', 'accent', 'accent2'].forEach((k) => safeColor(pal[k]) && tint.set(k, pal[k]));
      if (session.brief?.fonts?.display) tint.set('fontDisplay', session.brief.fonts.display);
      if (session.brief?.fonts?.body) tint.set('fontBody', session.brief.fonts.body);
      const q = [...tint.keys()].length ? `?${tint}` : '';
      for (const c of m.likedComps) {
        const url = c.library ? `${base}/lib/${encodeURIComponent(c.file)}${q}` : c.file ? `${base}/s/${sid}/${c.file}` : null;
        if (url) jobs.push({ key: c.id, url, file: path.join(shotsDir, `comp-${safeName(c.id)}.jpg`), width: 1280, height: 800, wait: 2500 });
      }
      const builds = Array.isArray(session.builds) ? session.builds : [];
      const latest = builds.slice().sort((a, b) => Number(a.v) - Number(b.v)).pop();
      if (latest && Number.isFinite(Number(latest.v))) {
        const url =
          latest.kind === 'url' && /^https?:\/\//.test(latest.url || '')
            ? latest.url
            : latest.kind === 'file' && latest.path
              ? `${base}/b/${sid}/${Number(latest.v)}/${encodeURIComponent(path.basename(latest.path))}`
              : `${base}/s/${sid}/builds/v${Number(latest.v)}.html`;
        jobs.push({ key: '__build', url, file: path.join(shotsDir, `build-v${Number(latest.v)}.jpg`), width: 1280, height: 1360, wait: 1800 });
      }
    }
    const results = await mapLimit(jobs, 3, (job) => shoot(browser, job));
    jobs.forEach((job, i) => results[i] && shots.set(job.key, pathToFileURL(results[i]).href));
    const thumbJobs = m.sections
      .flatMap((sec) => sec.picked)
      .map((r) => {
        const rel = [r.image, r.liveImage].find((x) => x && m.fileUrl(x));
        return rel && { id: r.id, src: path.resolve(dir, rel), file: path.join(shotsDir, 'thumbs', `${path.basename(rel).replace(/\.[a-z0-9]+$/i, '')}.jpg`) };
      })
      .filter(Boolean);
    const thumbs = await makeThumbs(browser, thumbJobs);

    // Step 2: the document.
    const fonts = new Set();
    for (const k of ['display', 'body', 'mono']) if (session.brief?.fonts?.[k]) fonts.add(session.brief.fonts[k]);
    for (const s of m.likedStyles) for (const k of ['display', 'body']) if (s.style?.fonts?.[k]) fonts.add(s.style.fonts[k]);
    for (const f of ['Geist', 'Geist Mono', 'Instrument Serif']) fonts.delete(f);
    const date = new Date().toLocaleDateString(m.lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const ctx = { session, feedback: feedback || {}, m, shots, thumbs, fonts: [...fonts].slice(0, 16), date };

    const pages = [cover(ctx)];
    if (session.brief) pages.push(...briefPages(ctx));
    else if (!m.fallback) pages.push(tastePage(ctx));
    const pending = [];
    m.sections.forEach((sec, i) => (sec.picked.length ? pages.push(...sectionPages(ctx, sec, i + 1)) : pending.push({ sec, idx: i + 1 })));
    pages.push(...pendingPage(ctx, pending));
    pages.push(...stylePages(ctx));
    pages.push(...componentPages(ctx));
    pages.push(...buildsPage(ctx));
    pages.push(closingPage(ctx));

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(htmlFile, renderDocument(ctx, pages));

    // Step 3: print.
    const context = await browser.newContext({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))))).catch(() => {});
      await fs.mkdir(path.dirname(pdf), { recursive: true });
      await page.pdf({ path: pdf, format: 'A4', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
    } finally {
      await context.close().catch(() => {});
    }
    return { pdf, html: htmlFile, pages: pages.length };
  } finally {
    await browser.close().catch(() => {});
  }
}
