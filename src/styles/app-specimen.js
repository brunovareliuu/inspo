// Renders a style direction as PRODUCT UI ("app specimen"): a SaaS dashboard
// (platform 'web') or three phone screens (platform 'mobile'). Companion to
// specimen.js, which renders the same style as a landing page. Pure string
// templating: no deps, no JS in the output, one standalone HTML document.
//
//   renderAppSpecimen({ style, copy, images, platform }) -> html
//
// `style` is the output of resolveStyle(). The personality of each direction
// (chart type, sidebar, nav highlight, status pills, featured card...) is
// derived from style.art plus measurable traits (hard shadows, glass surface,
// dark canvas, radius), so custom styles get a coherent app too.

import { FONT_META, mixHex, toHex6, isDark, contrastRatio, flatten, parseColor } from './presets.js';
import { googleFontsHref, styleTokensCSS } from './specimen.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeSrc = (s) => (/^(https?:\/\/|\/)/.test(String(s || '')) ? String(s).replace(/["'<>\s]/g, encodeURIComponent) : '');
const cssColor = (c, fb) => (parseColor(c) ? String(c).trim() : fb);

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
const hashStr = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ─── Color helpers ────────────────────────────────────────────────────────

const alpha = (c, a) => (toHex6(c) || '#000000') + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

function hsl(c) {
  const p = parseColor(c);
  if (!p) return [0, 0, 0];
  const [r, g, b] = p.slice(0, 3).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const dd = mx - mn, s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
  const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h * 60, s, l];
}

/** Best text color over a background: the style's own fg/bg first, then black/white. */
function onColor(bgc, d) {
  const pair = [d.fg, d.bg].sort((a, b) => contrastRatio(bgc, b) - contrastRatio(bgc, a));
  if (contrastRatio(bgc, pair[0]) >= 4.2) return pair[0];
  return contrastRatio(bgc, '#ffffff') >= contrastRatio(bgc, '#0b0b0b') ? '#ffffff' : '#0b0b0b';
}

/** Push a color toward readable (against `over`) until it reaches `min` contrast. */
function ink(color, over, min = 4.5) {
  const target = isDark(over) ? '#ffffff' : '#000000';
  let c = toHex6(color) || target;
  for (let t = 0; t <= 1.001 && contrastRatio(c, over) < min; t += 0.08) c = mixHex(color, target, t);
  return c;
}

// ─── Tokens & persona ────────────────────────────────────────────────────

function derive(style) {
  const p = style.palette || {};
  const bg = toHex6(p.bg) || '#ffffff';
  const fg = toHex6(p.fg) || '#111111';
  const accent = toHex6(p.accent) || fg;
  const surfaceRaw = cssColor(p.surface, mixHex(bg, fg, 0.04));
  const surfaceAlpha = parseColor(surfaceRaw)?.[3] ?? 1;
  const d = {
    bg, fg, accent,
    accent2: toHex6(p.accent2) || fg,
    accent3: toHex6(p.accent3) || toHex6(p.accent2) || accent,
    hasAccent3: !!p.accent3,
    muted: toHex6(p.muted) || mixHex(fg, bg, 0.45),
    border: cssColor(p.border, alpha(fg, 0.13)),
    surfaceRaw,
    surface: flatten(surfaceRaw, bg) || bg,
    glass: surfaceAlpha < 0.9,
    dark: isDark(bg),
  };
  d.borderSolid = flatten(d.border, d.surface);
  d.borderOpaque = (parseColor(d.border)?.[3] ?? 1) > 0.9;
  d.onAccent = onColor(accent, d);
  return d;
}

function hardShadow(style) {
  const m = String(style.shadow || '').match(/^\s*(-?\d+)(?:px)?\s+(-?\d+)(?:px)?\s+0(?:px)?(?:\s+-?\d+(?:px)?)?\s+(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s*$/i);
  if (!m || (+m[1] === 0 && +m[2] === 0)) return null;
  return { x: +m[1], y: +m[2], color: m[3] };
}

// Per-art personality. Every custom style has an art (resolveStyle validates it).
const ART_PERSONA = {
  grid: { chart: 'bars', nav: 'fill-fg', pill: 'square', feature: 'fg' },
  lines: { chart: 'line', nav: 'bar', pill: 'dot', feature: 'calm' },
  shapes: { chart: 'bars', nav: 'fill-accent', pill: 'solid', feature: 'shapes' },
  aurora: { chart: 'area-glow', nav: 'soft', pill: 'soft', feature: 'aurora', sidebar: 'glass' },
  beam: { chart: 'area', nav: 'soft', pill: 'soft', feature: 'calm' },
  chrome: { chart: 'bars-pill', nav: 'fill-accent', pill: 'soft', feature: 'chrome' },
  blobs: { chart: 'area-smooth', nav: 'soft', pill: 'soft', feature: 'blob' },
  'sun-grid': { chart: 'line-glow', nav: 'neon', pill: 'outline', feature: 'neon' },
  terminal: { chart: 'blocks', nav: 'prompt', pill: 'bracket', feature: 'term' },
  enso: { chart: 'line-smooth', nav: 'text', pill: 'dot', feature: 'calm' },
  mesh: { chart: 'area', nav: 'soft', pill: 'soft', feature: 'mesh' },
  bauhaus: { chart: 'bars-multi', nav: 'fill-accent3', pill: 'square', feature: 'bauhaus', sidebar: 'accent2', kpiColor: true },
  halftone: { chart: 'bars-multi', nav: 'fill-accent', pill: 'solid', feature: 'halftone', sidebar: 'inverse', kpiColor: true },
};

const SERIF_RE = /Serif|Garamond|Mincho|Bodoni|Playfair|Fraunces|Newsreader|Lora|Cormorant|Instrument/;

function persona(style, d) {
  const base = { ...(ART_PERSONA[style.art] || ART_PERSONA.grid) };
  const r = parseFloat(style.radius) || 0;
  const bw = Math.max(1, Math.min(4, parseFloat(style.borderWidth) || 1));
  const hard = hardShadow(style);
  const mono = !!FONT_META[style.fonts?.body]?.mono;
  const serif = SERIF_RE.test(style.fonts?.display || '');
  const caps = style.displayCase === 'uppercase';
  const cardR = r >= 100 ? 26 : Math.min(r, 24);
  const ctlR = r >= 20 ? 999 : Math.min(r, 10);
  if (hard && bw >= 3) base.kpiColor = true;
  if (d.glass) { base.sidebar = 'glass'; base.feature = base.feature === 'calm' ? 'aurora' : base.feature; }
  if (!base.sidebar) base.sidebar = cardR >= 20 ? 'floating' : 'plain';
  const accentSat = hsl(d.accent)[1], accent2Sat = hsl(d.accent2)[1];
  return {
    ...base, r, bw, hard, mono, serif, caps, cardR, ctlR,
    monochrome: accentSat < 0.15 && accent2Sat < 0.15,
    titleMode: mono ? 'term' : serif ? 'serif' : caps ? 'caps' : 'plain',
    thinCaps: caps && (Number(style.displayWeight) || 600) <= 400 && !/Anton|Bebas|Archivo Black/.test(style.fonts?.display || ''),
  };
}

/** Status tones harmonised with the palette (reuse palette hues when they fit). */
function tones(d, P) {
  const cands = [d.accent, d.accent2, d.accent3].filter((c, i, a) => a.indexOf(c) === i && hsl(c)[1] > 0.35 && hsl(c)[2] > 0.15 && hsl(c)[2] < 0.9);
  const inRange = (c, lo, hi) => { const h = hsl(c)[0]; return lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi; };
  const pick = (lo, hi) => cands.find((c) => inRange(c, lo, hi));
  let neg = pick(345, 16), warn = pick(32, 62), pos = pick(70, 170);
  const used = [neg, warn, pos].filter(Boolean);
  if (!pos && cands.length >= 3) pos = cands.find((c) => !used.includes(c));
  let info = [d.accent, d.accent2, d.accent3].find((c) => ![neg, warn, pos].includes(c) && hsl(c)[1] > 0.25) || d.muted;
  pos = pos || '#1f9d55'; neg = neg || '#e5484d'; warn = warn || '#e0a21a';
  const cardBg = d.surface;
  const t = { pos, neg, warn, info, neutral: d.muted };
  if (P.monochrome) for (const k of ['pos', 'neg', 'warn', 'info']) t[k] = mixHex(t[k], d.fg, 0.55);
  const out = {};
  for (const [k, c] of Object.entries(t)) out[k] = { raw: toHex6(c), text: ink(c, cardBg, 4.2) };
  return out;
}

function toneOf(text) {
  const s = String(text || '').toLowerCase();
  if (/entregad|complet|pagad|activ|aprobad|listo|hecho|deliver|paid|done|success|approved|active|ok\b|live|publicad|resuelt|resolved|cerrad|closed/.test(s)) return 'pos';
  if (/cancel|fall|retras|error|fail|late|overdue|vencid|rechaz|reject|bloque|block|urgent|perdid|lost/.test(s)) return 'neg';
  if (/pend|espera|revisi|review|borrador|draft|wait|hold|pausa|paus/.test(s)) return 'warn';
  if (/tr[aá]nsito|transit|proceso|progress|ruta|camino|process|enviad|sent|shipped|abiert|open|nuevo|new/.test(s)) return 'info';
  return 'neutral';
}

// ─── Copy ─────────────────────────────────────────────────────────────────

const STR = {
  es: {
    brand: 'Northwind', nav: ['Inicio', 'Pedidos', 'Clientes', 'Reportes', 'Ajustes'], pageTitle: 'Resumen *semanal*',
    kpis: [{ label: 'Ingresos', value: '$482.1k', delta: '+12.4%' }, { label: 'Pedidos', value: '1,284', delta: '+8.1%' }, { label: 'Clientes activos', value: '3,912', delta: '+3.2%' }, { label: 'Devoluciones', value: '0.8%', delta: '-0.3%' }],
    tableTitle: 'Pedidos recientes', columns: ['Pedido', 'Cliente', 'Estado', 'Fecha', 'Total'], userName: 'Ana López', cta: 'Nuevo pedido', emptyState: 'Aún no hay nada por aquí',
    menu: 'Menú', teams: 'Equipos', teamNames: ['Operaciones', 'Ventas', 'Soporte'], search: 'Buscar o saltar a…', range: 'Últimos 30 días', thisP: 'Este periodo', prevP: 'Periodo anterior',
    seg: ['7d', '30d', '12m'], viewAll: 'Ver todo', filter: 'Filtrar', activity: 'Actividad', live: 'En vivo', greet: (n) => `Buenos días, ${n}`, hello: (n) => `Hola, ${n}`,
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], plan: 'Plan Pro', usage: '72% del límite mensual', vsPrev: 'vs. mes anterior',
    promoTag: 'Nuevo', promoTitle: 'Reportes automáticos', promoBody: 'Recibe un resumen cada lunes en tu correo.', promoCta: 'Activar',
    ago: ['hace 4 min', 'hace 18 min', 'hace 1 h', 'hace 3 h', 'Ayer'], feedNew: (n, id) => `Nuevo ${n} ${id}`, feedMark: (who, id, st) => `${who} marcó ${id} como ${st}`,
    feedComment: (who, id) => `${who} comentó en ${id}`, feedReport: 'Reporte semanal listo para descargar', feedJoin: (who) => `${who} se unió a Operaciones`,
    quick: ['Nuevo', 'Escanear', 'Compartir', 'Más'], details: 'Detalles', timeline: 'Seguimiento', steps: ['Creado', 'Confirmado', 'En proceso', 'Completado'],
    settings: 'Ajustes', notif: 'Notificaciones', notifRows: ['Alertas en tiempo real', 'Resumen diario', 'Correo semanal'], account: 'Cuenta', accountRows: ['Equipo', 'Facturación', 'Idioma'],
    lang: 'Español', signOut: 'Cerrar sesión', members: '8 miembros', billing: 'Visa ···· 4821', dateOf: (i) => ['Hoy', 'Hoy', 'Ayer', '27 sep', '26 sep', '25 sep', '24 sep'][i % 7],
    step_t: ['28 sep, 09:12', '28 sep, 09:40', 'Hoy, 08:05', 'Estimado 14:30'], app: 'App', web: 'Web', showing: (a, b) => `${a} de ${b}`,
  },
  en: {
    brand: 'Northwind', nav: ['Home', 'Orders', 'Customers', 'Reports', 'Settings'], pageTitle: 'Weekly *overview*',
    kpis: [{ label: 'Revenue', value: '$48.2k', delta: '+12.4%' }, { label: 'Orders', value: '1,284', delta: '+8.1%' }, { label: 'Active customers', value: '3,912', delta: '+3.2%' }, { label: 'Refund rate', value: '0.8%', delta: '-0.3%' }],
    tableTitle: 'Recent orders', columns: ['Order', 'Customer', 'Status', 'Date', 'Total'], userName: 'Ana López', cta: 'New order', emptyState: 'Nothing here yet',
    menu: 'Menu', teams: 'Teams', teamNames: ['Operations', 'Sales', 'Support'], search: 'Search or jump to…', range: 'Last 30 days', thisP: 'This period', prevP: 'Previous period',
    seg: ['7d', '30d', '12m'], viewAll: 'View all', filter: 'Filter', activity: 'Activity', live: 'Live', greet: (n) => `Good morning, ${n}`, hello: (n) => `Hi, ${n}`,
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], plan: 'Pro plan', usage: '72% of monthly limit', vsPrev: 'vs. last month',
    promoTag: 'New', promoTitle: 'Automatic reports', promoBody: 'Get a summary in your inbox every Monday.', promoCta: 'Turn on',
    ago: ['4 min ago', '18 min ago', '1 h ago', '3 h ago', 'Yesterday'], feedNew: (n, id) => `New ${n} ${id}`, feedMark: (who, id, st) => `${who} marked ${id} as ${st}`,
    feedComment: (who, id) => `${who} commented on ${id}`, feedReport: 'Weekly report ready to download', feedJoin: (who) => `${who} joined Operations`,
    quick: ['New', 'Scan', 'Share', 'More'], details: 'Details', timeline: 'Tracking', steps: ['Created', 'Confirmed', 'In progress', 'Completed'],
    settings: 'Settings', notif: 'Notifications', notifRows: ['Real-time alerts', 'Daily digest', 'Weekly email'], account: 'Account', accountRows: ['Team', 'Billing', 'Language'],
    lang: 'English', signOut: 'Sign out', members: '8 members', billing: 'Visa ···· 4821', dateOf: (i) => ['Today', 'Today', 'Yesterday', 'Sep 27', 'Sep 26', 'Sep 25', 'Sep 24'][i % 7],
    step_t: ['Sep 28, 9:12', 'Sep 28, 9:40', 'Today, 8:05', 'Est. 2:30 pm'], app: 'App', web: 'Web', showing: (a, b) => `${a} of ${b}`,
  },
};

const PEOPLE = {
  es: ['Lucía Herrera', 'Carlos Méndez', 'Sofía Treviño', 'Jorge Ramírez', 'Valeria Garza', 'Diego Castillo', 'Regina Salinas', 'Mateo Ortiz', 'Ximena Navarro', 'Emilio Rangel'],
  en: ['Maya Chen', 'Jordan Blake', 'Priya Nair', 'Lucas Moreau', 'Hannah Cole', 'Omar Haddad', 'Grace Kim', 'Leo Novak', 'Ruby Okafor', 'Sam Ortega'],
};
const PLACES = {
  es: ['Monterrey, NL', 'Guadalajara, Jal', 'CDMX', 'Querétaro, Qro', 'Puebla, Pue', 'Mérida, Yuc', 'Saltillo, Coah', 'León, Gto'],
  en: ['Austin, TX', 'Denver, CO', 'Portland, OR', 'Chicago, IL', 'Boston, MA', 'Atlanta, GA', 'Seattle, WA', 'Miami, FL'],
};
const STATUSES = { es: ['Pagado', 'En proceso', 'Pendiente', 'Pagado', 'Cancelado', 'Pagado', 'En proceso'], en: ['Paid', 'In progress', 'Pending', 'Paid', 'Cancelled', 'Paid', 'In progress'] };

function isSpanish(copy) {
  if (copy?.lang) return /^es/i.test(copy.lang);
  const s = JSON.stringify(copy || {});
  return /[áéíóúñ¿¡]/i.test(s) || /\b(de|los|las|para|con|del|pedidos|clientes|inicio|ajustes|resumen|envíos|envios)\b/i.test(s);
}

function colKind(name) {
  const s = String(name || '').toLowerCase();
  if (/estado|status|estatus|situaci/.test(s)) return 'status';
  if (/cliente|customer|nombre|name|usuario|user|contact|conductor|driver|chofer|owner|responsable|asignad|assignee|repartidor|miembro|member|empresa|company|cuenta|account/.test(s)) return 'person';
  if (/total|monto|importe|amount|precio|price|revenue|ingreso|valor|value|costo|cost|mrr|saldo|balance/.test(s)) return 'money';
  if (/destino|origen|ciudad|city|ubicaci|location|direcci|address|zona|region|regi[oó]n|route|sucursal|branch/.test(s)) return 'place';
  if (/^eta$|entrega|llegada|arrival|due|vence|fecha|date|d[ií]a|creado|created|updated|actualizad|hora|time/.test(s)) return 'date';
  if (/cantidad|qty|items|piezas|unidades|units|paquetes|peso|weight|kg|stock/.test(s)) return 'qty';
  if (/^(id|#)|pedido|orden|order|folio|n[uú]m|ref|gu[ií]a|env[ií]o|shipment|ticket|factura|invoice|sku|c[oó]digo|code/.test(s)) return 'id';
  return 'text';
}

function genCell(kind, i, r, lang, colName) {
  const L = STR[lang];
  switch (kind) {
    case 'id': return `#${4821 - i * 7 - Math.floor(r() * 5)}`;
    case 'person': return PEOPLE[lang][(i * 3 + Math.floor(r() * 3)) % PEOPLE[lang].length];
    case 'status': return STATUSES[lang][i % STATUSES[lang].length];
    case 'money': { const v = 800 + Math.floor(r() * 24000); return '$' + v.toLocaleString('en-US') + (lang === 'es' ? '' : '.00'); }
    case 'place': return PLACES[lang][(i * 5 + 1) % PLACES[lang].length];
    case 'date': return /eta|entrega|llegada|arrival|due/i.test(colName) ? `${9 + (i * 2) % 9}:${String((i * 17) % 60).padStart(2, '0')}` : L.dateOf(i);
    case 'qty': return String(2 + Math.floor(r() * 40));
    default: return (lang === 'es' ? ['Estándar', 'Express', 'Mismo día', 'Programado'] : ['Standard', 'Express', 'Same day', 'Scheduled'])[i % 4];
  }
}

function normalize(copy, style) {
  const lang = isSpanish(copy) ? 'es' : 'en';
  const L = STR[lang];
  const a = (copy && typeof copy.app === 'object' && copy.app) || {};
  const arr = (v) => (Array.isArray(v) && v.length ? v : null);
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const brand = str(copy?.brand) || str(a.name) || L.brand;
  const columns = (arr(a.columns) || L.columns).slice(0, 6).map(String);
  const kinds = columns.map(colKind);
  if (!kinds.includes('id') && kinds[0] === 'text') kinds[0] = 'id';
  const r = rng(style.id + ':rows');
  const rowsGiven = Array.isArray(a.rows);
  const rows = rowsGiven
    ? a.rows.slice(0, 8).map((row) => columns.map((_, j) => String((Array.isArray(row) ? row[j] : '') ?? '')))
    : Array.from({ length: 6 }, (_, i) => columns.map((cn, j) => genCell(kinds[j], i, r, lang, cn)));
  const kpis = (arr(a.kpis) || L.kpis).slice(0, 4).map((k, i) => ({
    label: String(k?.label ?? L.kpis[i % 4].label), value: String(k?.value ?? L.kpis[i % 4].value), delta: k?.delta == null ? '' : String(k.delta),
  }));
  return {
    lang, L, brand, name: str(a.name) || brand,
    nav: (arr(a.nav) || L.nav).slice(0, 7).map(String),
    pageTitle: str(a.pageTitle) || L.pageTitle,
    kpis, columns, kinds, rows, rowsEmpty: rowsGiven && !a.rows.length,
    tableTitle: str(a.tableTitle) || L.tableTitle,
    userName: str(a.userName) || L.userName,
    cta: str(a.cta) || L.cta,
    emptyState: str(a.emptyState) || L.emptyState,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  box: 'M21 7.5 12 3 3 7.5v9L12 21l9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 20v-1.5a4 4 0 0 0-3-3.8M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  chart: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bell: 'M18 9a6 6 0 1 0-12 0c0 6-2.5 8-2.5 8h17S18 15 18 9M10 20.5a2.2 2.2 0 0 0 4 0',
  plus: 'M12 5v14M5 12h14',
  truck: 'M2 5h13v11H2zM15 9h4l3 3.5V16h-7zM6 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  pin: 'M12 21s7-6 7-11.5a7 7 0 1 0-14 0C5 15 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  calendar: 'M3.5 5.5h17v15h-17zM16 3v5M8 3v5M3.5 10.5h17',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6',
  up: 'M7 17 17 7M9 7h8v8', down: 'M7 7l10 10M17 9v8H9',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  heart: 'M20.4 5.1a5 5 0 0 0-7.1 0L12 6.4l-1.3-1.3a5 5 0 1 0-7.1 7.1L12 20.6l8.4-8.4a5 5 0 0 0 0-7.1z',
  share: 'M4 12v8h16v-8M16 6l-4-4-4 4M12 2v13',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v7H2v-7z',
  scan: 'M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M7 12h10',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  card: 'M2.5 5.5h19v13h-19zM2.5 10h19',
  logout: 'M9 21H4V3h5M16 17l5-5-5-5M21 12H9',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  message: 'M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  apps: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM13.5 13.5h7v7h-7zM3.5 13.5h7v7h-7z',
  folder: 'M3 6.5a1.5 1.5 0 0 1 1.5-1.5H10l2 2.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  menu: 'M3 6h18M3 12h18M3 18h18',
};
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.apps}"/></svg>`;

function navIcon(label, i) {
  const s = String(label).toLowerCase();
  const map = [
    [/inicio|home|dashboard|tablero|resumen|overview|panel/, 'home'],
    [/pedido|orden|order|venta|sale|compra|purchase/, 'box'],
    [/env[ií]o|ship|entrega|deliver|flota|fleet|log[ií]stic|ruta|route|transport/, 'truck'],
    [/client|customer|contact|usuario|user|equipo|team|miembro|member|gente|people|crm/, 'users'],
    [/report|anal[ií]t|m[eé]tric|stat|insight|dato|data/, 'chart'],
    [/ajuste|config|setting|preferen/, 'settings'],
    [/producto|product|cat[aá]logo|catalog|inventari|inventory|stock|almac[eé]n|warehouse/, 'tag'],
    [/factura|invoice|billing|pago|payment|cobro|finanz|finance/, 'receipt'],
    [/mensaje|message|chat|inbox|bandeja|soporte|support|ticket/, 'message'],
    [/calend|agenda|event|cita|schedule/, 'calendar'],
    [/mapa|map|ubicaci|location|zona/, 'map'],
    [/archivo|file|document|doc/, 'folder'],
    [/buscar|search|explor/, 'search'],
    [/perfil|profile|cuenta|account/, 'user'],
    [/ayuda|help/, 'help'],
  ];
  for (const [re, n] of map) if (re.test(s)) return n;
  return ['home', 'box', 'users', 'chart', 'settings', 'apps', 'folder'][i % 7];
}

// ─── Generated artwork (compact port of the landing-page art) ────────────

function coverArt(style, d, key) {
  const r = rng(style.id + ':art:' + key);
  const A = d.accent, B = d.accent2, C = d.accent3, F = d.fg, BG = d.bg;
  const uid = key.replace(/[^a-z0-9]/gi, '');
  const svg = (inner) => `<svg class="art-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
  switch (style.art) {
    case 'grid': {
      let s = `<rect width="800" height="600" fill="${d.surface}"/>`;
      for (let x = 0; x <= 800; x += 50) s += `<line x1="${x}" y1="0" x2="${x}" y2="600" stroke="${F}" stroke-opacity=".12"/>`;
      for (let y = 0; y <= 600; y += 50) s += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${F}" stroke-opacity=".12"/>`;
      return svg(s + `<circle cx="520" cy="300" r="210" fill="none" stroke="${F}" stroke-width="2"/><circle cx="520" cy="300" r="120" fill="${A}"/><rect x="100" y="100" width="150" height="150" fill="${F}"/><line x1="0" y1="300" x2="800" y2="300" stroke="${A}" stroke-width="3"/>`);
    }
    case 'beam':
      return `<div class="art-css" style="background:radial-gradient(60% 70% at 50% 0%, ${A}88, transparent 70%),radial-gradient(28% 50% at 50% 0%, ${F}44, transparent 70%),${BG}"><div class="beam-grid"></div></div>`;
    case 'aurora':
      return `<div class="art-css aurora"><i style="background:${A}"></i><i style="background:${C}"></i><i style="background:${B}"></i></div>`;
    case 'mesh':
      return `<div class="art-css" style="background:radial-gradient(40% 60% at 20% 30%, ${A}, transparent 70%),radial-gradient(45% 55% at 80% 20%, ${C}, transparent 70%),radial-gradient(50% 60% at 60% 90%, #ffb86b, transparent 70%),radial-gradient(40% 50% at 10% 90%, ${B}, transparent 70%),${mixHex(A, '#ffffff', 0.5)}"></div>`;
    case 'shapes': {
      const cols = [A, C, B, d.surface];
      let s = `<rect width="800" height="600" fill="${mixHex(BG, B, 0.35)}"/>`;
      for (let i = 0; i < 6; i++) {
        const x = 80 + r() * 600, y = 80 + r() * 420, sz = 90 + r() * 130, c = cols[i % cols.length], shape = i % 3;
        if (shape === 0) s += `<circle cx="${x + 8}" cy="${y + 8}" r="${sz / 2}" fill="${F}"/><circle cx="${x}" cy="${y}" r="${sz / 2}" fill="${c}" stroke="${F}" stroke-width="5"/>`;
        else if (shape === 1) s += `<rect x="${x + 8}" y="${y + 8}" width="${sz}" height="${sz * 0.7}" rx="18" fill="${F}"/><rect x="${x}" y="${y}" width="${sz}" height="${sz * 0.7}" rx="18" fill="${c}" stroke="${F}" stroke-width="5"/>`;
        else {
          const pts = Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? sz / 4 : sz / 2; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
          s += `<polygon points="${pts}" fill="${c}" stroke="${F}" stroke-width="5" stroke-linejoin="round"/>`;
        }
      }
      return svg(s);
    }
    case 'bauhaus':
      return svg(`<rect width="800" height="600" fill="${BG}"/><circle cx="260" cy="260" r="190" fill="${A}"/><path d="M430 60 h320 v320 z" fill="${F}"/><rect x="430" y="400" width="320" height="60" fill="${C}"/><path d="M60 560 a200 200 0 0 1 400 0z" fill="${B}"/><rect x="600" y="480" width="150" height="80" fill="${A}"/><circle cx="600" cy="220" r="60" fill="${BG}"/>`);
    case 'blobs': {
      const blob = (cx, cy, rad, fill) => {
        const n = 7, pts = [];
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = rad * (0.75 + r() * 0.45); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        let p = `M${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`;
        for (let i = 0; i < n; i++) { const p0 = pts[i], p1 = pts[(i + 1) % n]; p += ` Q${p0[0].toFixed(1)},${p0[1].toFixed(1)} ${((p0[0] + p1[0]) / 2).toFixed(1)},${((p0[1] + p1[1]) / 2).toFixed(1)}`; }
        return `<path d="${p}Z" fill="${fill}"/>`;
      };
      return svg(`<rect width="800" height="600" fill="${mixHex(BG, C, 0.35)}"/>${blob(300, 300, 240, C)}${blob(540, 330, 200, A)}${blob(430, 170, 95, mixHex(BG, '#ffffff', 0.5))}${blob(640, 120, 60, B)}`);
    }
    case 'sun-grid': {
      let s = `<defs><linearGradient id="sun${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}"/><stop offset="1" stop-color="${A}"/></linearGradient></defs><rect width="800" height="600" fill="${BG}"/><circle cx="400" cy="300" r="170" fill="url(#sun${uid})"/>`;
      for (let i = 0; i < 6; i++) s += `<rect x="200" y="${318 + i * 26}" width="400" height="${4 + i * 2.2}" fill="${BG}"/>`;
      s += `<rect x="0" y="360" width="800" height="240" fill="${BG}"/>`;
      for (let i = 0; i <= 16; i++) s += `<line x1="${400 + (i - 8) * 18}" y1="360" x2="${400 + (i - 8) * 140}" y2="600" stroke="${A}" stroke-width="2"/>`;
      for (let i = 0; i < 9; i++) { const y = 360 + Math.pow(i / 8, 2) * 240; s += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${A}" stroke-width="2"/>`; }
      return svg(s);
    }
    case 'chrome':
      return svg(`<defs><radialGradient id="ch${uid}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c9cfdc"/><stop offset=".5" stop-color="#4b5263"/><stop offset=".62" stop-color="#e9edf5"/><stop offset=".85" stop-color="#8d95a8"/><stop offset="1" stop-color="#2a2f3a"/></radialGradient><linearGradient id="cb${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${B}"/></linearGradient></defs>
        <rect width="800" height="600" fill="url(#cb${uid})" opacity=".35"/><circle cx="400" cy="300" r="170" fill="url(#ch${uid})"/><ellipse cx="400" cy="300" rx="320" ry="68" fill="none" stroke="url(#ch${uid})" stroke-width="16" transform="rotate(-18 400 300)"/>
        ${[[130, 120], [660, 150], [620, 480], [170, 470]].map(([x, y]) => `<path d="M${x} ${y - 30} C${x + 3} ${y - 3} ${x + 3} ${y - 3} ${x + 30} ${y} C${x + 3} ${y + 3} ${x + 3} ${y + 3} ${x} ${y + 30} C${x - 3} ${y + 3} ${x - 3} ${y + 3} ${x - 30} ${y} C${x - 3} ${y - 3} ${x - 3} ${y - 3} ${x} ${y - 30}Z" fill="${F}"/>`).join('')}`);
    case 'terminal':
      return `<div class="art-term"><pre>$ ruta sync --all
<b>✓</b> 128 records ....... ok
<b>✓</b> webhooks .......... ok
<b>→</b> [${'█'.repeat(12)}${'░'.repeat(5)}] 71%
$ <i class="cur">█</i></pre></div>`;
    case 'lines': {
      let s = `<rect width="800" height="600" fill="${d.surface}"/>`;
      for (let i = 0; i < 26; i++) {
        let p = `M-20 ${40 + i * 22}`;
        for (let x = 0; x <= 840; x += 40) p += ` L${x} ${(40 + i * 22 + Math.sin(x / 90 + i * 0.35) * 26 + Math.cos(x / 37 + i) * 6).toFixed(1)}`;
        s += `<path d="${p}" fill="none" stroke="${i % 7 === 3 ? A : F}" stroke-opacity="${i % 7 === 3 ? 0.9 : 0.3}" stroke-width="${i % 7 === 3 ? 2.2 : 1.2}"/>`;
      }
      return svg(s);
    }
    case 'enso':
      return `<div class="art-css" style="background:${mixHex(BG, F, 0.05)}"></div>` + svg(`<rect width="800" height="600" fill="${mixHex(BG, F, 0.05)}"/><path d="M520 150 C 640 220 650 420 500 480 C 360 540 230 450 240 320 C 250 200 360 140 470 150" fill="none" stroke="${F}" stroke-width="34" stroke-linecap="round" opacity=".85"/><path d="M515 150 C 600 190 640 300 610 380" fill="none" stroke="${F}" stroke-width="12" stroke-linecap="round" opacity=".45"/><rect x="600" y="470" width="44" height="44" fill="${A}"/>`).replace('xMidYMid slice', 'xMidYMid meet').replace('class="art-svg"', 'class="art-svg" style="position:relative"');
    case 'halftone': {
      let s = `<rect width="800" height="600" fill="${BG}"/>`;
      for (let y = 10; y < 600; y += 18) for (let x = 10; x < 800; x += 18) {
        const rr = Math.max(0, 8 * (1 - Math.hypot(x - 470, y - 280) / 300));
        if (rr > 0.5) s += `<circle cx="${x}" cy="${y}" r="${rr.toFixed(1)}" fill="${A}"/>`;
      }
      return svg(s + `<rect x="70" y="330" width="300" height="200" fill="${C}" transform="rotate(-6 220 430)"/><circle cx="220" cy="190" r="110" fill="${B}"/>`);
    }
    default:
      return `<div class="art-css" style="background:linear-gradient(135deg, ${A}, ${C})"></div>`;
  }
}

function media(style, d, img, key, cls = '') {
  if (img && safeSrc(img.src)) return `<figure class="media t-${esc(style.imageTreatment || 'none')} ${cls}"><img src="${esc(safeSrc(img.src))}" alt="${esc(img.alt || '')}"></figure>`;
  return `<figure class="media art ${cls}">${coverArt(style, d, key)}</figure>`;
}

// ─── Data & charts ──────────────────────────────────────────────────────

function series(r, n, { start = 40, trend = 2, vol = 10, min = 6 } = {}) {
  const out = [];
  let v = start;
  for (let i = 0; i < n; i++) { v = Math.max(min, v + trend + (r() - 0.5) * vol); out.push(v); }
  return out;
}

function smoothPath(pts) {
  let p = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    p += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return p;
}

/**
 * Chart body (no axes). Lines/areas are SVG stretched to the box with
 * non-scaling strokes; bars are HTML so borders, radii and shadows stay crisp.
 */
function plot(kind, data, prev, max, { hi = -1, mini = false, uid = 'c' } = {}) {
  const n = data.length;
  const y = (v) => 100 - (v / max) * 100;
  if (/^bars|blocks/.test(kind)) {
    return `<div class="bars k-${kind}${mini ? ' mini' : ''}">${data.map((v, i) => `<i class="${i === hi ? 'hi ' : ''}b${i % 3}" style="height:${Math.max(4, (v / max) * 100).toFixed(1)}%"></i>`).join('')}</div>`;
  }
  const smooth = /smooth|glow/.test(kind);
  const pts = data.map((v, i) => [(i / (n - 1)) * 100, y(v)]);
  const line = smooth ? smoothPath(pts) : 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L');
  const fill = /^area/.test(kind) || kind === 'line-glow';
  const prevLine = prev && !mini ? (() => { const pp = prev.map((v, i) => [(i / (n - 1)) * 100, y(v)]); return smooth ? smoothPath(pp) : 'M' + pp.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L'); })() : '';
  return `<svg class="lines k-${kind}${mini ? ' mini' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="g${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"/><stop offset="1" class="s1"/></linearGradient></defs>
    ${fill ? `<path class="fill" d="${line} L100,100 L0,100 Z" fill="url(#g${uid})"/>` : ''}
    ${prevLine ? `<path class="prev" d="${prevLine}" vector-effect="non-scaling-stroke"/>` : ''}
    <path class="main" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
}

function parseNum(v) {
  const m = String(v || '').match(/^([^\d\-−+]*)([\d.,]+)\s*([a-zA-Z%]*)/);
  return m ? { pre: m[1].trim(), num: parseFloat(m[2].replace(/,/g, '')) || 0, suf: m[3] } : { pre: '', num: 0, suf: '' };
}

// ─── Shared UI bits ──────────────────────────────────────────────────────

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

function avatar(name, d, size = 28, cls = '') {
  const cols = [d.accent, d.accent2, d.accent3, mixHex(d.accent, d.bg, 0.45), mixHex(d.accent2, d.bg, 0.4)];
  const c = cols[hashStr(name) % cols.length];
  return `<span class="av ${cls}" style="--s:${size}px;background:${c};color:${onColor(c, d)}">${esc(initials(name))}</span>`;
}

function pill(text, tone, P) {
  const t = esc(text);
  if (P.pill === 'bracket') return `<span class="pill p-${tone}">[${t}]</span>`;
  return `<span class="pill p-${tone}"><i></i>${t}</span>`;
}

function delta(v, P) {
  if (!v) return '';
  const down = /^\s*[-−]/.test(v);
  return `<span class="delta ${down ? 'neg' : 'pos'}">${P.mono ? (down ? '▼' : '▲') : ic(down ? 'down' : 'up')}${esc(String(v).replace(/^\s*[+]/, down ? '' : '+'))}</span>`;
}

function titleHtml(text) {
  const t = String(text || '');
  return t.includes('*') ? esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>') : esc(t);
}
const plainTitle = (t) => String(t || '').replace(/\*/g, '');

function logo(c, P) {
  if (P.mono) return `<span class="logo">&gt;_</span>`;
  return `<span class="logo">${esc(initials(c.name).slice(0, 1))}</span>`;
}

// Featured-card background per persona (first KPI on web, summary card on mobile).
function featured(P, d, style) {
  const A = d.accent, B = d.accent2, C = d.accent3;
  switch (P.feature) {
    case 'fg': if (d.dark) return { bg: A, fg: d.onAccent, deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><circle cx="86" cy="18" r="30" fill="none" stroke="${d.onAccent}" stroke-width="2"/></svg>` };
      return { bg: d.fg, fg: d.bg, deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><circle cx="86" cy="18" r="30" fill="${A}"/></svg>` };
    case 'shapes': return { bg: A, fg: onColor(A, d), deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? 12 : 26; return `${(86 + Math.cos(a) * rr).toFixed(1)},${(16 + Math.sin(a) * rr).toFixed(1)}`; }).join(' ')}" fill="${C}" stroke="${d.fg}" stroke-width="2.5" stroke-linejoin="round"/></svg>` };
    case 'aurora': return { bg: `radial-gradient(80% 90% at 0% 0%, ${alpha(A, 0.55)}, transparent 70%),radial-gradient(70% 80% at 100% 100%, ${alpha(B, 0.4)}, transparent 70%),radial-gradient(50% 60% at 90% 10%, ${alpha(C, 0.45)}, transparent 70%),${alpha('#ffffff', 0.06)}`, fg: d.fg, deco: '' };
    case 'chrome': return { bg: `linear-gradient(160deg,#ffffff 0%,#d9dde8 30%,#9aa3b5 48%,#eef1f7 62%,#b9c0cf 100%)`, fg: '#0b0b17', deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><path d="M86 2 C87 14 88 15 100 16 C88 17 87 18 86 30 C85 18 84 17 72 16 C84 15 85 14 86 2Z" fill="${A}"/></svg>` };
    case 'blob': return { bg: A, fg: onColor(A, d), deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><path d="M80 -6 C100 -8 112 14 104 32 C98 46 80 44 70 34 C60 24 62 -4 80 -6Z" fill="${C}" opacity=".9"/></svg>` };
    case 'neon': return { bg: `linear-gradient(165deg, ${mixHex(A, d.bg, 0.35)} 0%, ${mixHex(A, d.bg, 0.75)} 60%, ${d.bg} 100%)`, fg: '#ffffff', deco: `<div class="deco neon-grid"></div>` };
    case 'term': return { bg: d.surface, fg: d.fg, deco: '' };
    case 'mesh': return { bg: `radial-gradient(60% 90% at 100% 0%, ${C}, transparent 70%),radial-gradient(60% 80% at 80% 100%, ${B}, transparent 70%),linear-gradient(135deg, ${mixHex(A, d.fg, 0.35)}, ${A})`, fg: '#ffffff', deco: '' };
    case 'bauhaus': return { bg: B, fg: onColor(B, d), deco: `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><circle cx="92" cy="10" r="26" fill="${C}"/><path d="M60 100 a28 28 0 0 1 56 0z" fill="${A}"/></svg>` };
    case 'halftone': return { bg: A, fg: onColor(A, d), deco: `<div class="deco dots"></div>` };
    default: return { bg: d.surface, fg: d.fg, deco: '' };
  }
}

// ─── Web dashboard ───────────────────────────────────────────────────────

function renderWeb(style, d, P, c, imgs, T) {
  const L = c.L;
  const r = rng(style.id + ':web');
  const kpis = c.kpis;
  const first = c.userName.split(/\s+/)[0];
  const idCol = c.kinds.indexOf('id'), personCol = c.kinds.indexOf('person'), statusCol = c.kinds.indexOf('status');
  const noun = (c.columns[Math.max(0, idCol)] || '').toLowerCase();
  const ids = Array.from({ length: 5 }, (_, i) => (idCol >= 0 && c.rows[i]?.[idCol]) || `#${4821 - i * 7}`);
  const people = Array.from({ length: 5 }, (_, i) => (personCol >= 0 && c.rows[i]?.[personCol]) || PEOPLE[c.lang][i]);

  // Sidebar
  const navHtml = c.nav.map((n, i) => `<a class="nav-item${i === 0 ? ' on' : ''}" href="#">${P.nav === 'prompt' ? `<span class="caret">${i === 0 ? '&gt;' : '&nbsp;'}</span>` : ic(navIcon(n, i))}<span class="nav-t">${esc(n)}</span>${i === 1 ? `<b class="count">12</b>` : ''}</a>`).join('');
  const teamCols = [d.accent, d.accent2, d.accent3];
  const side = `<aside class="side">
    <div class="side-brand">${logo(c, P)}<b class="brand-name">${esc(c.name)}</b><span class="mob-actions">${ic('search')}${ic('bell')}${avatar(c.userName, d, 30)}</span></div>
    <nav class="side-nav" aria-label="${esc(L.menu)}"><span class="side-label">${esc(L.menu)}</span>${navHtml}</nav>
    <div class="side-group"><span class="side-label">${esc(L.teams)}</span>${L.teamNames.map((t, i) => `<a class="team" href="#"><i style="background:${teamCols[i]}"></i>${esc(t)}</a>`).join('')}</div>
    <div class="side-foot">
      <div class="usage"><div class="usage-top"><b>${esc(L.plan)}</b><span>72%</span></div><div class="meter"><i style="width:72%"></i></div><span class="usage-t">${esc(L.usage)}</span></div>
      <div class="me">${avatar(c.userName, d, 32)}<div><b>${esc(c.userName)}</b><span>${esc(first.toLowerCase().normalize('NFKD').replace(/[^\w]/g, ''))}@${esc(c.name.toLowerCase().normalize('NFKD').replace(/[^\w]/g, '') || 'app')}.com</span></div>${ic('more')}</div>
    </div>
  </aside>`;

  const top = `<header class="top">
    <div class="crumbs"><span>${esc(c.name)}</span>${ic('chevR')}<b>${esc(c.nav[0] || '')}</b></div>
    <label class="search">${ic('search')}<span>${esc(L.search)}</span><kbd>⌘K</kbd></label>
    <button class="icon-btn" aria-label="help">${ic('help')}</button>
    <button class="icon-btn" aria-label="notifications">${ic('bell')}<i class="ping"></i></button>
    ${avatar(c.userName, d, 32, 'top-av')}
  </header>`;

  const head = `<div class="page-head rise">
    <div><p class="eyebrow">${esc(L.greet(first))}</p><h1 class="title">${titleHtml(c.pageTitle)}</h1></div>
    <div class="actions"><button class="btn ghost">${ic('calendar')}<span>${esc(L.range)}</span>${ic('chevD', 'sm')}</button><button class="btn primary">${ic('plus')}<span>${esc(c.cta)}</span></button></div>
  </div>`;

  // KPI cards
  const F = featured(P, d, style);
  const kpiColors = P.kpiColor ? [null, d.accent2 === d.fg ? d.surface : d.accent2, d.accent3, d.surface] : null;
  const kpiHtml = kpis.map((k, i) => {
    const down = /^\s*[-−]/.test(k.delta);
    const sp = series(r, 12, { start: 30, trend: down ? -1.6 : 2, vol: 12 });
    const spMax = Math.max(...sp) * 1.1;
    let style_ = '', cls = '';
    if (i === 0 && P.feature !== 'calm' && P.feature !== 'term') { style_ = `background:${F.bg};color:${F.fg};--kfg:${F.fg}`; cls = ' feat'; }
    else if (kpiColors && kpiColors[i]) { const bgc = kpiColors[i]; style_ = `background:${bgc};color:${onColor(bgc, d)};--kfg:${onColor(bgc, d)}`; cls = ' colored'; }
    const sparkKind = /bars|blocks/.test(P.chart) ? (P.chart === 'blocks' ? 'blocks' : 'bars') : P.chart;
    return `<section class="card kpi${cls} rise d${i + 1}" style="${style_}">${cls === ' feat' ? F.deco : ''}
      <div class="kpi-top"><span class="kpi-l">${esc(k.label)}</span>${P.hard || P.kpiColor ? '' : ic('more', 'faint')}</div>
      <div class="kpi-v">${esc(k.value)}</div>
      <div class="kpi-b">${delta(k.delta, P)}<span class="kpi-s">${esc(L.vsPrev)}</span></div>
      <div class="spark">${plot(sparkKind, sp.slice(-10), null, spMax, { mini: true, uid: 'k' + i, hi: 9 })}</div>
    </section>`;
  }).join('');

  // Main chart
  const data = series(r, 12, { start: 26, trend: 2.6, vol: 11 });
  const prev = data.map((v) => Math.max(4, v * (0.7 + r() * 0.18)));
  const nice = Math.ceil((Math.max(...data, ...prev) * 1.12) / 10) * 10;
  const hi = 8;
  const k0 = parseNum(kpis[0]?.value);
  const scale = k0.num ? k0.num / data[data.length - 1] : 1;
  const fmt = (v) => { const x = v * scale; return `${k0.pre}${x >= 100 ? Math.round(x) : x.toFixed(1).replace(/\.0$/, '')}${k0.suf}`; };
  const yLabels = [1, 0.75, 0.5, 0.25, 0].map((f) => `<span>${esc(fmt(nice * f))}</span>`).join('');
  const isBars = /bars|blocks/.test(P.chart);
  const tipLeft = isBars ? ((hi + 0.5) / 12) * 100 : (hi / 11) * 100;
  const tipTop = 100 - (data[hi] / nice) * 100;
  const chart = `<section class="card chart-card rise d5">
    <div class="card-head"><div><h2 class="card-t">${esc(kpis[0]?.label || '')}</h2><div class="chart-v"><b>${esc(kpis[0]?.value || '')}</b>${delta(kpis[0]?.delta, P)}</div></div>
      <div class="chart-tools"><span class="legend"><i class="lg-main"></i>${esc(L.thisP)}</span>${isBars ? '' : `<span class="legend"><i class="lg-prev"></i>${esc(L.prevP)}</span>`}<div class="seg">${L.seg.map((s, i) => `<span${i === 2 ? ' class="on"' : ''}>${s}</span>`).join('')}</div></div></div>
    <div class="chart-body"><div class="y-ax">${yLabels}</div><div class="plot-wrap"><div class="plot">${plot(P.chart, data, prev, nice, { hi, uid: 'main' })}
      <span class="tip-line" style="left:${tipLeft.toFixed(2)}%"></span><span class="tip-dot" style="left:${tipLeft.toFixed(2)}%;top:${tipTop.toFixed(2)}%"></span>
      <span class="tip${tipTop < 30 ? ' below' : ''}" style="left:${tipLeft.toFixed(2)}%;top:${tipTop.toFixed(2)}%"><small>${esc(L.months[hi])}</small><b>${esc(fmt(data[hi]))}</b></span></div>
      <div class="x-ax${isBars ? ' bars-ax' : ''}">${L.months.map((m) => `<span>${esc(m)}</span>`).join('')}</div></div></div>
  </section>`;

  // Table
  const numeric = (k) => k === 'money' || k === 'qty';
  const optional = (j) => j !== 0 && j !== personCol && j !== statusCol && j !== c.columns.length - 1;
  const cell = (v, j) => {
    const k = c.kinds[j];
    if (k === 'status') return `<td class="c-status">${pill(v, toneOf(v), P)}</td>`;
    if (k === 'person') return `<td class="c-person"><span class="who">${avatar(v, d, 26)}<span>${esc(v)}</span></span></td>`;
    if (k === 'id') return `<td class="c-id${optional(j) ? ' opt' : ''}">${esc(v)}</td>`;
    return `<td class="${numeric(k) ? 'num ' : ''}${k === 'date' || k === 'place' ? 'soft ' : ''}${optional(j) ? 'opt' : ''}">${esc(v)}</td>`;
  };
  const tableBody = c.rowsEmpty
    ? `<div class="empty">${ic('inbox')}<p>${esc(c.emptyState)}</p><button class="btn primary sm">${ic('plus')}<span>${esc(c.cta)}</span></button></div>`
    : `<div class="table-scroll"><table><thead><tr>${c.columns.map((h, j) => `<th class="${numeric(c.kinds[j]) ? 'num ' : ''}${optional(j) ? 'opt' : ''}">${esc(h)}</th>`).join('')}<th class="act" aria-label="actions"></th></tr></thead>
      <tbody>${c.rows.slice(0, 5).map((row) => `<tr>${row.map(cell).join('')}<td class="act">${ic('more', 'faint')}</td></tr>`).join('')}</tbody></table></div>`;
  const table = `<section class="card table-card rise d6">
    <div class="card-head"><div class="th-l"><h2 class="card-t">${esc(c.tableTitle)}</h2>${c.rowsEmpty ? '' : `<span class="count-chip">${esc(L.showing(Math.min(5, c.rows.length), 128))}</span>`}</div>
      <div class="chart-tools"><button class="btn ghost sm">${ic('filter')}<span>${esc(L.filter)}</span></button><a class="link" href="#">${esc(L.viewAll)}${ic('chevR', 'sm')}</a></div></div>
    ${tableBody}
  </section>`;

  // Activity feed + promo
  const st = (i) => (statusCol >= 0 && c.rows[i]?.[statusCol]) || STATUSES[c.lang][i];
  const feedItems = [
    { who: people[0], text: L.feedMark(people[0], ids[0], st(0).toLowerCase()), tone: toneOf(st(0)), icon: 'check' },
    { who: null, text: L.feedNew(noun || 'item', ids[1] || '#4814'), tone: 'info', icon: 'plus' },
    { who: people[2] || people[0], text: L.feedComment(people[2] || people[0], ids[2] || ids[0]), tone: 'neutral', icon: 'message' },
    { who: null, text: L.feedReport, tone: 'neutral', icon: 'download' },
  ];
  const feed = `<section class="card feed rise d7">
    <div class="card-head"><h2 class="card-t">${esc(L.activity)}</h2><span class="live"><i></i>${esc(L.live)}</span></div>
    <ol class="feed-list">${feedItems.map((f, i) => `<li>${f.who ? avatar(f.who, d, 30) : `<span class="f-ic t-${f.tone}">${ic(f.icon)}</span>`}<div><p>${esc(f.text)}</p><time>${esc(L.ago[i])}</time></div></li>`).join('')}</ol>
  </section>`;
  const promo = `<section class="card promo rise d8">${media(style, d, imgs[0], 'promo', 'promo-img')}
    <div class="promo-body"><span class="tag">${ic('sparkle', 'sm')}${esc(L.promoTag)}</span><h3>${esc(L.promoTitle)}</h3><p>${esc(L.promoBody)}</p><button class="btn ghost sm">${esc(L.promoCta)}${ic('chevR', 'sm')}</button></div>
  </section>`;

  return `<div class="shell">${side}<div class="main">${top}<div class="page">${head}
    <div class="kpis" style="--nk:${kpis.length}">${kpiHtml}</div>
    <div class="grid"><div class="col-main">${chart}${table}</div><div class="col-side">${feed}${promo}</div></div>
  </div></div></div>`;
}

// ─── Mobile screens ──────────────────────────────────────────────────────

function statusBar() {
  return `<div class="sb"><b>9:41</b><span class="island"></span><span class="sb-r">
    <svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5C5.1.5 2.5 1.6.6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2zm0 3.4c1.5 0 2.8.6 3.8 1.5L13 5.9A7.1 7.1 0 0 0 8 3.9c-2 0-3.7.8-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5zM8 9l2-2a3 3 0 0 0-4 0z"/></svg>
    <svg viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="18" height="9" rx="2"/><path d="M25 4.5v4c.8-.3 1.5-1 1.5-2s-.7-1.7-1.5-2z" opacity=".45"/></svg>
  </span></div>`;
}

function tabBar(c, active) {
  const items = c.nav.slice(0, 4);
  const settingsIdx = c.nav.findIndex((n) => navIcon(n, 0) === 'settings');
  if (settingsIdx > 3) items[3] = c.nav[settingsIdx];
  const act = active === 'last' ? items.length - 1 : active;
  return `<nav class="tabbar">${items.map((n, i) => `<a class="tab${i === act ? ' on' : ''}" href="#">${ic(navIcon(n, i))}<span>${esc(n)}</span></a>`).join('')}<span class="home-ind"></span></nav>`;
}

function statSize(text, n, style, P) {
  const base = P.titleMode === 'serif' ? 19 : 15;
  const meta = FONT_META[style.fonts?.display] || { width: 0.55 };
  const cw = meta.width * (P.caps ? 1.2 : 1) * ((Number(style.displayWeight) || 600) >= 700 ? 1.08 : 1) + (parseFloat(style.displayTracking) || 0);
  const w = (334 - (n - 1)) / n - 26;
  const s = String(text);
  const longest = Math.max(...s.split(/\s+/).map((x) => x.length), 1);
  return Math.max(10, Math.min(base, w / (longest * cw), (2 * w * 0.92) / (s.length * cw))).toFixed(1);
}

function renderMobile(style, d, P, c, imgs, T) {
  const L = c.L;
  const r = rng(style.id + ':mob');
  const first = c.userName.split(/\s+/)[0];
  const k0 = c.kpis[0] || { label: '', value: '', delta: '' };
  const F = featured(P, d, style);
  const idCol = c.kinds.indexOf('id'), personCol = c.kinds.indexOf('person'), statusCol = c.kinds.indexOf('status');
  const moneyCol = c.kinds.indexOf('money');
  const placeCol = c.kinds.indexOf('place');
  const rows = c.rows.length ? c.rows : Array.from({ length: 4 }, (_, i) => c.columns.map((cn, j) => genCell(c.kinds[j], i, r, c.lang, cn)));
  const get = (row, j, fb = '') => (j >= 0 ? row[j] || fb : fb);
  const isBars = /bars|blocks/.test(P.chart);
  const sp = series(r, isBars ? 9 : 12, { start: 26, trend: 2.4, vol: 10 });

  // Screen 1 — home
  const listIcons = ['box', 'truck', 'receipt', 'tag'];
  const list = rows.slice(0, 3).map((row, i) => {
    const title = get(row, personCol, get(row, 0));
    const sub = [get(row, idCol), get(row, placeCol)].filter(Boolean).join(' · ') || get(row, 1);
    const status = get(row, statusCol);
    const tone = toneOf(status);
    return `<li><span class="li-ic t-${tone}">${ic(listIcons[i % 4])}</span><div class="li-m"><b>${esc(title)}</b><span>${esc(sub)}</span></div><div class="li-r"><b>${esc(get(row, moneyCol, get(row, c.columns.length - 1)))}</b>${status ? pill(status, tone, P) : ''}</div></li>`;
  }).join('');
  const s1 = `<div class="scr-body">
    <div class="m-head"><div><p class="eyebrow">${esc(L.hello(first))}</p><h1 class="m-title">${titleHtml(c.pageTitle)}</h1></div><div class="m-head-r"><span class="icon-btn">${ic('bell')}<i class="ping"></i></span>${avatar(c.userName, d, 40)}</div></div>
    <section class="summary${P.feature === 'calm' || P.feature === 'term' ? ' calm' : ''}" style="background:${F.bg};color:${F.fg};--kfg:${F.fg}">${F.deco}
      <div class="sum-top"><span class="kpi-l">${esc(k0.label)}</span></div>
      <div class="sum-row"><span class="sum-v">${esc(k0.value)}</span>${delta(k0.delta, P)}</div>
      <div class="sum-chart">${plot(isBars ? (P.chart === 'blocks' ? 'blocks' : 'bars') : P.chart, sp, null, Math.max(...sp) * 1.1, { mini: true, uid: 'sum', hi: sp.length - 1 })}</div>
      <div class="sum-foot">${c.kpis.slice(1, 3).map((k) => `<div><span>${esc(k.label)}</span><b>${esc(k.value)}</b></div>`).join('')}</div>
    </section>
    <div class="quick">${L.quick.map((q, i) => `<a href="#"><span class="q-ic${i === 0 ? ' on' : ''}">${ic(['plus', 'scan', 'share', 'apps'][i])}</span><span>${esc(q)}</span></a>`).join('')}</div>
    <div class="sec-h"><h2 class="card-t">${esc(c.tableTitle)}</h2><a class="link" href="#">${esc(L.viewAll)}</a></div>
    <ul class="m-list">${list}</ul>
  </div>${tabBar(c, 0)}`;

  // Screen 2 — detail
  const row0 = rows[0] || [];
  const status0 = get(row0, statusCol);
  const statCols = c.columns.map((_, j) => j).filter((j) => j !== idCol && j !== personCol && j !== statusCol).slice(0, 3);
  const stepsDone = toneOf(status0) === 'pos' ? 4 : toneOf(status0) === 'warn' ? 1 : 3;
  const s2 = `<div class="scr-body detail">
    <div class="hero">${media(style, d, imgs[0], 'mhero', 'hero-img')}<div class="hero-bar"><span class="round">${ic('chevL')}</span><span class="round">${ic('share')}</span></div></div>
    <div class="d-meta">${status0 ? pill(status0, toneOf(status0), P) : ''}<span class="d-id">${esc(get(row0, idCol, ''))}</span></div>
    <h1 class="m-title d-title">${esc(get(row0, personCol, get(row0, 0)))}</h1>
    <p class="d-sub">${ic('pin', 'sm')}${esc(get(row0, placeCol, c.name))}</p>
    <div class="stats">${statCols.map((j) => `<div><span>${esc(c.columns[j])}</span><b style="font-size:${statSize(row0[j] || '—', statCols.length, style, P)}px">${esc(row0[j] || '—')}</b></div>`).join('')}</div>
    <h2 class="card-t sec-t">${esc(L.timeline)}</h2>
    <ol class="steps">${L.steps.map((s, i) => `<li class="${i < stepsDone ? 'done' : ''}${i === stepsDone - 1 ? ' now' : ''}"><i>${i < stepsDone ? ic('check') : ''}</i><div><b>${esc(s)}</b><span>${esc(L.step_t[i])}</span></div></li>`).join('')}</ol>
    <div class="cta-dock"><button class="btn primary block">${esc(c.cta)}${ic('chevR')}</button></div>
  </div>${tabBar(c, 1)}`;

  // Screen 3 — settings
  const toggle = (on) => `<span class="tgl${on ? ' on' : ''}"><i></i></span>`;
  const s3 = `<div class="scr-body">
    <div class="m-head"><h1 class="m-title">${esc(L.settings)}</h1><span class="icon-btn">${ic('search')}</span></div>
    <section class="profile">${avatar(c.userName, d, 52)}<div><b>${esc(c.userName)}</b><span>${esc(c.name)} · ${esc(L.plan)}</span></div>${ic('chevR', 'faint')}</section>
    <h2 class="grp-h">${esc(L.notif)}</h2>
    <ul class="grp">${L.notifRows.map((t, i) => `<li><span class="g-ic">${ic(['bell', 'inbox', 'message'][i])}</span><span class="g-t">${esc(t)}</span>${toggle(i < 2)}</li>`).join('')}</ul>
    <h2 class="grp-h">${esc(L.account)}</h2>
    <ul class="grp">${L.accountRows.map((t, i) => `<li><span class="g-ic">${ic(['users', 'card', 'globe'][i])}</span><span class="g-t">${esc(t)}</span><span class="g-v">${esc([L.members, L.billing, L.lang][i])}</span>${ic('chevR', 'faint')}</li>`).join('')}</ul>
    <a class="signout" href="#">${ic('logout', 'sm')}${esc(L.signOut)}</a>
  </div>${tabBar(c, 'last')}`;

  const phone = (inner, i, label) => `<figure class="phone-wrap w${i}"><div class="phone"><div class="screen">${statusBar()}${inner}</div></div><figcaption>${esc(label)}</figcaption></figure>`;
  return `<main class="canvas"><div class="stage" aria-hidden="true"></div>
    <header class="canvas-head"><span class="ch-brand">${logo(c, P)}${esc(c.name)}</span><span class="ch-meta">${esc(style.name || '')} · iOS</span></header>
    <div class="phones">${phone(s1, 1, c.nav[0] || '')}${phone(s2, 2, L.details)}${phone(s3, 3, L.settings)}</div>
  </main>`;
}

// ─── Main renderer ──────────────────────────────────────────────────────

export function renderAppSpecimen({ style, copy = {}, images = [], platform = 'web' } = {}) {
  if (!style || typeof style !== 'object') throw new Error('renderAppSpecimen: style (from resolveStyle) is required');
  style = { ...style, palette: style.palette || {}, fonts: style.fonts || {} };
  const d = derive(style);
  const P = persona(style, d);
  const T = tones(d, P);
  const c = normalize(copy || {}, style);
  const imgs = (images || []).filter((i) => i && safeSrc(i.src)).slice(0, 4);
  const mobile = platform === 'mobile';
  const body = mobile ? renderMobile(style, d, P, c, imgs, T) : renderWeb(style, d, P, c, imgs, T);
  const credits = imgs.map((i) => i.credit).filter(Boolean);
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} — ${esc(style.name || 'Style')} (${mobile ? 'mobile' : 'web'} app)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(googleFontsHref(style))}">
<style>
${styleTokensCSS(style)}
${appCss(style, d, P, T, mobile)}
</style>
</head>
<body class="${mobile ? 'mobile' : 'web'} R-${esc(style.art)} X-${esc(style.texture)} N-${P.nav} S-${P.sidebar} C-${P.chart} TM-${P.titleMode}${P.hard ? ' hard' : ''}${d.glass ? ' glass' : ''}${d.dark ? ' dark' : ''}">
${body}
${credits.length ? `<!-- Photos: ${esc(credits.join(' · '))} -->` : ''}
</body>
</html>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────

function grainUrl(opacity = 0.5) {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${opacity} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml,${s.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

function appCss(style, d, P, T, mobile) {
  const { hard, cardR, ctlR, bw } = P;
  const hs = hard ? `${hard.x}px ${hard.y}px 0 0 ${d.fg}` : '';
  const hsSm = hard ? `${Math.round(hard.x / 2)}px ${Math.round(hard.y / 2)}px 0 0 ${d.fg}` : '';
  const cardBorderW = hard ? Math.max(2, bw) : Math.min(bw, 2);
  const cardBorderC = hard || (bw >= 2 && d.borderOpaque) ? d.fg : d.border;
  const cardBg = d.glass ? d.surfaceRaw : d.surface;
  const cardShadow = hard ? hs
    : d.glass ? `0 24px 60px -30px ${alpha(d.accent, 0.45)}, inset 0 1px 0 ${alpha('#ffffff', 0.08)}`
    : style.art === 'sun-grid' ? `0 0 0 1px ${alpha(d.accent, 0.18)}, 0 0 40px -18px ${alpha(d.accent, 0.7)}`
    : style.shadow && style.shadow !== 'none' && !d.dark ? `0 1px 2px ${alpha(d.fg, 0.05)}, 0 10px 30px -14px ${alpha(d.fg, 0.2)}`
    : 'none';
  const mutedInk = ink(d.muted, d.surface, 4.2);
  const faint = alpha(d.fg, d.dark ? 0.08 : 0.06);
  const gridLine = alpha(d.fg, d.dark ? 0.08 : 0.08);
  const sidebar = P.sidebar;
  const sideBg = sidebar === 'inverse' ? d.fg : sidebar === 'accent2' ? d.accent2 : sidebar === 'glass' ? alpha('#ffffff', 0.04) : sidebar === 'floating' ? d.surface : d.dark ? mixHex(d.bg, d.fg, 0.025) : mixHex(d.bg, d.surface, 0.35);
  const sideSolid = sidebar === 'glass' ? mixHex(d.bg, '#ffffff', 0.04) : sideBg;
  const sideFg = sidebar === 'inverse' ? d.bg : sidebar === 'accent2' ? onColor(d.accent2, d) : d.fg;
  const sideMuted = ink(mixHex(sideFg, sideSolid, 0.38), sideSolid, 3.6);
  // Active nav item colors
  let navOnBg = alpha(d.accent, d.dark ? 0.16 : 0.1), navOnFg = sideFg, navOnIc = ink(d.accent, sideSolid, 3), navExtra = '';
  switch (P.nav) {
    case 'fill-fg': navOnBg = sideFg; navOnFg = sideSolid; navOnIc = sideSolid; break;
    case 'fill-accent': navOnBg = d.accent; navOnFg = d.onAccent; navOnIc = d.onAccent; navExtra = hard ? `border-color:${sidebar === 'inverse' ? d.bg : d.fg};box-shadow:${hsSm}` : ''; break;
    case 'fill-accent3': navOnBg = d.accent3; navOnFg = onColor(d.accent3, d); navOnIc = navOnFg; break;
    case 'bar': navOnBg = 'transparent'; navOnIc = d.accent; break;
    case 'text': navOnBg = alpha(d.fg, 0.05); navOnFg = ink(d.accent, sideSolid, 4.5); navOnIc = navOnFg; break;
    case 'neon': navOnBg = alpha(d.accent, 0.14); navOnFg = '#ffffff'; navOnIc = d.accent; navExtra = `box-shadow:inset 2px 0 0 ${d.accent}, 0 0 24px -8px ${alpha(d.accent, 0.8)};text-shadow:0 0 12px ${alpha(d.accent, 0.8)}`; break;
    case 'prompt': navOnBg = alpha(d.accent, 0.1); navOnFg = d.accent; navOnIc = d.accent; break;
    default: break;
  }
  if (sidebar === 'inverse' || sidebar === 'accent2') { navOnIc = navOnIc === d.accent && sidebar === 'inverse' ? d.accent : navOnIc; }
  const primaryBg = d.accent;
  const primaryFg = d.onAccent;
  const primaryShadow = hard ? hsSm : d.glass || style.art === 'sun-grid' ? `0 8px 26px -8px ${alpha(d.accent, 0.8)}` : style.shadow !== 'none' && !d.dark ? `0 6px 16px -8px ${alpha(d.accent, 0.7)}` : 'none';
  const btnBorder = hard ? `${Math.max(2, Math.min(bw, 3))}px solid ${d.fg}` : `1px solid transparent`;
  const tone = (k) => T[k] || T.neutral;
  const pillCss = (() => {
    const base = Object.keys(T).map((k) => {
      const t = tone(k);
      switch (P.pill) {
        case 'solid': return `.p-${k}{background:${k === 'neutral' ? d.surface : t.raw};color:${k === 'neutral' ? d.fg : onColor(t.raw, d)}}`;
        case 'outline': return `.p-${k}{color:${t.text};border-color:${alpha(t.raw, 0.6)};box-shadow:0 0 12px -4px ${alpha(t.raw, 0.7)}}.p-${k} i{background:${t.raw};box-shadow:0 0 6px ${t.raw}}`;
        case 'bracket': return `.p-${k}{color:${k === 'neutral' ? d.muted : t.raw}}`;
        case 'dot': case 'square': return `.p-${k}{color:${d.fg}}.p-${k} i{background:${t.raw}}`;
        default: return `.p-${k}{background:${alpha(t.raw, d.dark ? 0.18 : 0.12)};color:${t.text}}.p-${k} i{background:${t.raw}}`;
      }
    }).join('');
    const shape = {
      soft: `.pill{padding:3px 9px 3px 8px;border-radius:999px}`,
      solid: `.pill{padding:3px 9px;border-radius:${Math.min(ctlR, 999)}px;border:2px solid ${d.fg};font-weight:700}.pill i{display:none}`,
      outline: `.pill{padding:2px 9px;border:1px solid;border-radius:${ctlR}px;text-transform:uppercase;letter-spacing:.06em;font-size:11px}`,
      bracket: `.pill{padding:0;font-family:var(--font-mono);text-transform:uppercase;font-size:12px;letter-spacing:.02em}.pill i{display:none}`,
      dot: `.pill{padding:0;gap:7px}.pill i{width:7px;height:7px}`,
      square: `.pill{padding:0;gap:7px}.pill i{width:8px;height:8px;border-radius:0}`,
    }[P.pill] || '';
    return shape + base;
  })();

  // Chart colors
  const barBase = P.chart === 'bars' ? (hard ? d.accent2 : d.dark ? mixHex(d.accent, d.bg, 0.55) : d.fg) : mixHex(d.accent, d.surface, 0.55);
  const barBorder = hard || (bw >= 2 && d.borderOpaque) ? `${Math.min(bw, 2.5)}px solid ${d.fg}` : 'none';
  const chartCss = `
.bars{position:absolute;inset:0;display:flex;align-items:flex-end;gap:${P.chart === 'bars-pill' ? '10px' : '12px'};padding:0 6px}
.bars i{flex:1;min-width:0;background:${barBase};border:${barBorder};transform-origin:bottom;animation:grow .9s cubic-bezier(.2,.7,.2,1) both}
.bars i:nth-child(2n){animation-delay:.05s}.bars i:nth-child(3n){animation-delay:.1s}
.bars i.hi{background:${d.accent}}
.k-bars i{border-radius:${Math.min(cardR, 8)}px ${Math.min(cardR, 8)}px ${hard ? Math.min(cardR, 8) : 0}px ${hard ? Math.min(cardR, 8) : 0}px;${hard ? `box-shadow:${Math.min(3, hard.x)}px ${Math.min(3, hard.y)}px 0 0 ${d.fg}` : ''}}
.k-bars-pill i{border-radius:999px;background:linear-gradient(180deg, ${alpha(d.accent2, 0.35)}, ${alpha(d.accent, 0.35)})}
.k-bars-pill i.hi{background:linear-gradient(180deg, ${d.accent2}, ${d.accent});box-shadow:0 10px 24px -8px ${alpha(d.accent, 0.7)}}
.k-bars-multi i.b0{background:${d.accent}}.k-bars-multi i.b1{background:${d.accent2}}.k-bars-multi i.b2{background:${d.accent3}}
.k-bars-multi i{opacity:.92}.k-bars-multi i.hi{opacity:1}
.k-blocks{gap:8px}.k-blocks i{background:repeating-linear-gradient(0deg, ${alpha(d.accent, 0.45)} 0 7px, transparent 7px 10px);border:0}
.k-blocks i.hi{background:repeating-linear-gradient(0deg, ${d.accent} 0 7px, transparent 7px 10px)}
.bars.mini{gap:3px;padding:0}.bars.mini i{border-width:${hard ? '1.5px' : '0'};box-shadow:none;border-radius:${P.chart === 'bars-pill' ? '999px' : `${Math.min(cardR, 3)}px`}}
.k-blocks.mini i{background:repeating-linear-gradient(0deg, ${alpha(d.accent, 0.5)} 0 3px, transparent 3px 5px)}
.k-blocks.mini i.hi{background:repeating-linear-gradient(0deg, ${d.accent} 0 3px, transparent 3px 5px)}
.lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;animation:reveal 1.1s cubic-bezier(.3,.7,.2,1) both}
.lines .main{fill:none;stroke:${d.accent};stroke-width:${P.chart === 'line' ? (P.thinCaps || style.art === 'lines' ? 1.5 : 2) : 2.25};stroke-linejoin:round;stroke-linecap:round}
.lines .prev{fill:none;stroke:${alpha(d.fg, 0.3)};stroke-width:1.25;stroke-dasharray:4 4}
.lines .s0{stop-color:${d.accent};stop-opacity:${/glow/.test(P.chart) ? 0.45 : P.chart === 'line-glow' ? 0.3 : P.chart === 'area-smooth' ? 0.5 : 0.28}}
.lines .s1{stop-color:${d.accent};stop-opacity:0}
.k-area-glow .main,.k-line-glow .main{filter:drop-shadow(0 0 6px ${d.accent})}
.k-area-glow .s0{stop-color:${d.accent3}}
.k-area .s0{stop-color:${mixHex(d.accent, d.accent2, 0.3)}}
.lines.mini .main{stroke-width:1.75}
.lines.mini .s0{stop-opacity:.25}
.feat .lines .main,.colored .lines .main,.summary:not(.calm) .lines .main{stroke:var(--kfg)}
.feat .lines .s0,.colored .lines .s0,.summary:not(.calm) .lines .s0{stop-color:var(--kfg)}
.feat .bars i,.colored .bars i,.summary:not(.calm) .bars i{background:${alpha('#000000', 0)};background:color-mix(in srgb, var(--kfg) 35%, transparent);border-color:var(--kfg)}
.feat .bars i.hi,.colored .bars i.hi,.summary:not(.calm) .bars i.hi{background:var(--kfg)}
.feat .k-blocks i,.summary:not(.calm) .k-blocks i{background:repeating-linear-gradient(0deg, color-mix(in srgb, var(--kfg) 40%, transparent) 0 3px, transparent 3px 5px)}`;

  const textures = {
    none: '',
    grain: `body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;background-image:${grainUrl(0.55)};opacity:${d.dark ? 0.12 : 0.16};mix-blend-mode:${d.dark ? 'screen' : 'multiply'}}`,
    grid: `.page,.canvas{background-image:linear-gradient(${alpha(d.fg, d.dark ? 0.04 : 0.05)} 1px,transparent 1px),linear-gradient(90deg,${alpha(d.fg, d.dark ? 0.04 : 0.05)} 1px,transparent 1px);background-size:48px 48px}`,
    dots: `.page,.canvas{background-image:radial-gradient(${alpha(d.fg, 0.16)} 1.1px,transparent 1.3px);background-size:20px 20px}`,
    'noise-gradient': `body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(45% 40% at 90% 0%,${alpha(d.accent, d.dark ? 0.22 : 0.12)},transparent 70%),radial-gradient(40% 40% at 10% 100%,${alpha(d.accent3, d.dark ? 0.18 : 0.1)},transparent 70%)}`,
    scanlines: `body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;background:repeating-linear-gradient(0deg,${d.dark ? '#00000038' : '#0000000a'} 0 1px,transparent 1px 3px)}`,
  };
  const chromeGrad = d.dark
    ? 'linear-gradient(180deg,#fff 0%,#aeb6c6 42%,#3b4150 50%,#dfe5f0 68%,#8e97aa 100%)'
    : 'linear-gradient(180deg,#9aa2b4 0%,#3b4150 44%,#0e1017 52%,#5d6578 74%,#1c2029 100%)';
  const accentText = {
    none: 'EM{font-style:normal}',
    color: 'EM{font-style:normal;color:var(--accent)}',
    italic: 'EM{font-style:italic;font-family:var(--font-accent);font-weight:inherit;letter-spacing:-.01em}',
    gradient: 'EM{font-style:normal;background:linear-gradient(95deg,var(--accent),var(--accent3) 60%,var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em}',
    fade: `EM{font-style:normal;color:${mixHex(d.fg, d.bg, 0.45)}}`,
    chrome: `EM{font-style:normal;background:${chromeGrad};-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.03em}`,
    highlight: 'EM{font-style:normal;background:var(--accent);color:var(--on-accent);padding:0 .14em;margin:0 .02em;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
    underline: 'EM{font-style:normal;background:linear-gradient(var(--accent),var(--accent)) 0 90%/100% .16em no-repeat}',
    outline: 'EM{font-style:normal;color:transparent;-webkit-text-stroke:.03em var(--fg)}',
    cursor: 'EM{font-style:normal;color:var(--accent)}EM:after{content:"_";animation:blink 1s steps(1) infinite}',
  };
  const at = (accentText[style.accentText] || accentText.color).replace(/EM(:after)?/g, (_, a = '') => `.title em${a},.m-title em${a}`);
  const entrances = {
    rise: 'from{opacity:0;transform:translateY(14px)}',
    fade: 'from{opacity:0}',
    blur: 'from{opacity:0;filter:blur(10px);transform:scale(.985)}',
    snap: 'from{opacity:0;transform:translateY(22px) rotate(-.6deg)}',
    slide: 'from{opacity:0;transform:translateX(-20px)}',
  };
  const titleFont = {
    serif: `font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking)`,
    caps: `font-family:var(--font-display);font-weight:var(--display-weight);text-transform:uppercase;letter-spacing:${P.thinCaps ? '.04em' : 'var(--display-tracking)'}`,
    plain: `font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking)`,
    term: `font-family:var(--font-display);font-weight:700;letter-spacing:-.02em`,
  }[P.titleMode];
  const cardT = {
    serif: `font:var(--display-weight) 21px/1.1 var(--font-display);letter-spacing:-.01em`,
    caps: `font:${P.thinCaps ? 500 : 'var(--display-weight)'} ${P.thinCaps ? '13px' : '16px'}/1.1 var(--font-display);text-transform:uppercase;letter-spacing:${P.thinCaps ? '.14em' : '.01em'}`,
    plain: `font:600 15px/1.2 var(--font-body);letter-spacing:-.005em`,
    term: `font:600 13px/1.2 var(--font-mono);text-transform:uppercase;letter-spacing:.04em`,
  }[P.titleMode];
  const numFont = `font-family:var(--font-display);font-weight:${P.titleMode === 'serif' || P.thinCaps ? 'var(--display-weight)' : Math.max(500, Math.min(Number(style.displayWeight) || 600, 800))};letter-spacing:${P.thinCaps ? '-.01em' : 'var(--display-tracking)'};font-variant-numeric:tabular-nums`;
  const labelCss = P.titleMode === 'term' || P.titleMode === 'caps' || style.art === 'lines'
    ? `font:500 11px/1.2 var(--font-mono);text-transform:uppercase;letter-spacing:.08em`
    : `font:500 13px/1.2 var(--font-body)`;
  const bodySize = P.mono ? 13 : 14;

  const common = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:400 ${bodySize}px/1.45 var(--font-body);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
h1,h2,h3,p,ol,ul{margin:0;padding:0}ol,ul{list-style:none}
.ic{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:${P.hard ? 2.3 : P.thinCaps || style.art === 'lines' || style.art === 'enso' ? 1.4 : 1.8};stroke-linecap:${P.mono || P.r === 0 ? 'square' : 'round'};stroke-linejoin:${P.mono || P.r === 0 ? 'miter' : 'round'}}
.ic.sm{width:15px;height:15px}.ic.faint{color:${mutedInk};opacity:.8}
.av{--s:28px;width:var(--s);height:var(--s);flex:none;display:inline-grid;place-items:center;border-radius:${P.r === 0 ? '0' : '50%'};font:700 calc(var(--s) * .38)/1 var(--font-body);letter-spacing:0;${hard ? `border:2px solid ${d.fg};` : ''}}
.eyebrow{${labelCss};color:${mutedInk}}
.title{${titleFont};font-size:${P.titleMode === 'serif' ? 37 : P.thinCaps ? 30 : P.titleMode === 'caps' ? 32 : 30}px;line-height:1.05;margin-top:6px;text-wrap:balance}
.card-t{${cardT};margin:0}
.kpi-l{${labelCss}}
.pill{display:inline-flex;align-items:center;gap:6px;font:600 12px/1.5 var(--font-body);white-space:nowrap;border:1px solid transparent}
.pill i{width:6px;height:6px;border-radius:50%;flex:none}
${pillCss}
.delta{display:inline-flex;align-items:center;gap:2px;font:600 12px/1 var(--font-body);padding:4px 7px 4px 5px;border-radius:${Math.min(ctlR, 999)}px;white-space:nowrap}
.delta .ic{width:13px;height:13px;stroke-width:2.2}
.delta.pos{color:${T.pos.text};background:${alpha(T.pos.raw, d.dark ? 0.16 : 0.12)}}
.delta.neg{color:${T.neg.text};background:${alpha(T.neg.raw, d.dark ? 0.16 : 0.12)}}
.feat .delta,.colored .delta,.summary:not(.calm) .delta{color:inherit;background:color-mix(in srgb, currentColor 14%, transparent)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 15px;border-radius:${ctlR}px;font:600 13.5px/1 var(--font-body);white-space:nowrap;border:${btnBorder};transition:transform .15s}
.btn.primary{background:${primaryBg};color:${primaryFg};box-shadow:${primaryShadow}}
.btn.primary:hover{transform:translateY(-1px)}
.btn.ghost{background:${d.glass ? alpha('#ffffff', 0.06) : d.surface};border:${hard ? btnBorder : `1px solid ${d.border}`};color:var(--fg);${hard ? `box-shadow:${hsSm}` : ''}}
.btn.sm{height:32px;padding:0 11px;font-size:12.5px}
.btn .ic{width:16px;height:16px}
.link{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;flex:none;font:600 13px/1 var(--font-body);color:${ink(d.accent, d.surface, 4.5)}}
.icon-btn{position:relative;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:${ctlR}px;color:var(--fg);border:1px solid ${d.border};background:${d.glass ? alpha('#ffffff', 0.05) : d.surface}}
.ping{position:absolute;top:7px;right:8px;width:7px;height:7px;border-radius:50%;background:${d.accent};box-shadow:0 0 0 2px ${d.surface}}
.logo{display:inline-grid;place-items:center;width:30px;height:30px;flex:none;border-radius:${P.r === 0 ? 0 : P.r >= 20 ? '50%' : Math.min(P.r, 8) + 'px'};background:${style.art === 'chrome' ? 'linear-gradient(160deg,#fff,#aeb6c6 45%,#3b4150 52%,#e9edf5 70%,#8e97aa)' : d.accent};color:${style.art === 'chrome' ? '#0b0b17' : d.onAccent};font:var(--display-weight) 16px/1 var(--font-display);text-transform:uppercase;${hard ? `border:2px solid ${d.fg};box-shadow:2px 2px 0 ${d.fg};` : ''}${d.glass || style.art === 'sun-grid' ? `box-shadow:0 0 22px -2px ${alpha(d.accent, 0.8)};` : ''}}
body.TM-term .logo{background:none;color:${d.accent};width:auto;font:700 16px/1 var(--font-mono)}
.media{position:relative;margin:0;overflow:hidden;background:${d.surface};isolation:isolate}
.media img{display:block;width:100%;height:100%;object-fit:cover}
.art-svg{display:block;width:100%;height:100%}
.art-css{position:absolute;inset:0}
.aurora{background:${d.bg};overflow:hidden}
.aurora i{position:absolute;width:65%;height:80%;border-radius:50%;filter:blur(40px);opacity:.8}
.aurora i:nth-child(1){left:-10%;top:10%}.aurora i:nth-child(2){right:-10%;top:-15%}.aurora i:nth-child(3){left:25%;bottom:-35%;opacity:.55}
.beam-grid{position:absolute;inset:45% -20% -10%;background-image:linear-gradient(${alpha(d.fg, 0.1)} 1px,transparent 1px),linear-gradient(90deg,${alpha(d.fg, 0.1)} 1px,transparent 1px);background-size:34px 34px;transform:perspective(300px) rotateX(55deg);mask-image:linear-gradient(transparent,#000 40%,transparent)}
.art-term{position:absolute;inset:0;background:${mixHex(d.bg, '#000000', 0.25)};font:500 11px/1.5 var(--font-mono);color:var(--fg);display:flex;align-items:center}
.art-term pre{margin:0;padding:8px 16px;font:inherit;white-space:pre}.art-term b{color:var(--accent);font-weight:500}.cur{font-style:normal;color:var(--accent);animation:blink 1s steps(1) infinite}
.media.t-grayscale img{filter:grayscale(1) contrast(1.08)}
.media.t-high-contrast img{filter:contrast(1.2) saturate(1.15)}
.media.t-grain img{filter:saturate(.85) contrast(1.04) sepia(.08)}
.media.t-grain:after{content:"";position:absolute;inset:0;background-image:${grainUrl(0.6)};opacity:.35;mix-blend-mode:overlay;pointer-events:none}
.media.t-duotone{background:var(--accent)}
.media.t-duotone img{filter:grayscale(1) contrast(1.2);mix-blend-mode:multiply;opacity:.95}
.media.t-duotone:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--accent3),transparent 70%);mix-blend-mode:screen;opacity:.5;pointer-events:none}
.media.t-blur-glow img{filter:saturate(1.25)}
.deco{position:absolute;top:0;right:0;width:120px;height:120px;pointer-events:none;overflow:visible}
.deco.neon-grid{width:100%;height:34%;top:auto;bottom:0;opacity:.5;background-image:linear-gradient(${alpha(d.accent2, 0.5)} 1px,transparent 1px),linear-gradient(90deg,${alpha(d.accent2, 0.5)} 1px,transparent 1px);background-size:26px 18px;transform:perspective(160px) rotateX(50deg);transform-origin:bottom;mask-image:linear-gradient(transparent,#000 70%)}
.deco.dots{width:60%;height:100%;background-image:radial-gradient(${alpha(d.accent3, 0.95)} 2.4px,transparent 2.6px);background-size:11px 11px;mask-image:radial-gradient(70% 70% at 100% 0%,#000,transparent)}
${chartCss}
${at}
${textures[style.texture] || ''}
@keyframes enter{${entrances[style.entrance] || entrances.rise}}
@keyframes grow{from{transform:scaleY(0)}}
@keyframes reveal{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes blink{50%{opacity:0}}
.rise{animation:enter .7s cubic-bezier(.2,.7,.2,1) both}
.d1{animation-delay:.04s}.d2{animation-delay:.08s}.d3{animation-delay:.12s}.d4{animation-delay:.16s}.d5{animation-delay:.2s}.d6{animation-delay:.26s}.d7{animation-delay:.22s}.d8{animation-delay:.3s}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}`;

  const card = `background:${cardBg};border:${cardBorderW}px solid ${cardBorderC};border-radius:${cardR}px;box-shadow:${cardShadow};${d.glass ? 'backdrop-filter:blur(22px) saturate(1.3);-webkit-backdrop-filter:blur(22px) saturate(1.3);' : ''}`;

  const monoMeta = FONT_META[style.fonts?.mono] || { width: 0.6 };
  const mScale = monoMeta.width < 0.5 ? 1.3 : monoMeta.width > 0.7 ? 0.9 : 1;
  const css = common + (mobile ? mobileCss() : webCss());
  return mScale === 1 ? css : css.replace(/(\d+(?:\.\d+)?)px(\/[\d.]+)? var\(--font-mono\)/g, (_, n, lh = '') => `${Math.round(n * mScale * 2) / 2}px${lh} var(--font-mono)`);

  function webCss() {
    const floating = sidebar === 'floating' || sidebar === 'glass';
    return `
.shell{position:relative;z-index:1;display:grid;grid-template-columns:${floating ? 252 : 240}px minmax(0,1fr);min-height:100vh}
${d.glass ? `body{background:radial-gradient(40% 50% at 12% 8%,${alpha(d.accent, 0.35)},transparent 70%),radial-gradient(35% 45% at 88% 18%,${alpha(d.accent3, 0.22)},transparent 70%),radial-gradient(45% 50% at 60% 100%,${alpha(d.accent2, 0.2)},transparent 70%),var(--bg);background-attachment:fixed}` : ''}
${style.art === 'beam' ? `.main{background:radial-gradient(50% 320px at 55% 0%,${alpha(d.accent, 0.16)},transparent 80%)}` : ''}
${style.art === 'sun-grid' ? `.main{background:radial-gradient(60% 300px at 60% 0%,${alpha(d.accent, 0.18)},transparent 80%)}` : ''}
.side{position:sticky;top:${floating ? '12px' : '0'};height:${floating ? 'calc(100vh - 24px)' : '100vh'};${floating ? 'margin:12px 0 12px 12px;' : ''}display:flex;flex-direction:column;gap:18px;padding:18px 12px 14px;background:${sideBg};color:${sideFg};${floating ? card.replace(/background:[^;]+;/, `background:${sideBg};`) : sidebar === 'plain' ? `border-right:${Math.min(cardBorderW, 2)}px solid ${sidebar === 'plain' && (hard || (bw >= 2 && d.borderOpaque)) ? d.fg : d.border};` : ''}overflow:hidden}
.side-brand{display:flex;align-items:center;gap:10px;padding:2px 8px 4px}
.brand-name{font:${P.titleMode === 'serif' ? 'var(--display-weight) 22px' : P.titleMode === 'caps' ? 'var(--display-weight) 17px' : '700 17px'}/1 var(--font-display);letter-spacing:${P.thinCaps ? '.1em' : P.titleMode === 'caps' ? '0' : '-.02em'};text-transform:${P.caps ? 'uppercase' : 'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${sidebar === 'inverse' ? `.brand-name{font-size:24px}` : ''}
.mob-actions{display:none}
.side-label{display:block;padding:0 10px 6px;font:500 10.5px/1 ${P.mono || style.art === 'lines' ? 'var(--font-mono)' : 'var(--font-body)'};text-transform:uppercase;letter-spacing:.1em;color:${sideMuted}}
.side-nav{display:flex;flex-direction:column;gap:2px}
.nav-item{position:relative;display:flex;align-items:center;gap:11px;height:38px;padding:0 10px;border-radius:${ctlR >= 999 ? 999 : ctlR}px;color:${sideMuted};font:500 ${P.nav === 'bar' ? '12px' : '14px'}/1 var(--font-body);${P.nav === 'bar' ? 'text-transform:uppercase;letter-spacing:.1em;' : ''}border:${hard ? '2px solid transparent' : '0'};white-space:nowrap}
.nav-item .ic{color:${sideMuted}}
.nav-item.on{background:${navOnBg};color:${navOnFg};font-weight:600;${navExtra}}
.nav-item.on .ic{color:${navOnIc}}
${P.nav === 'bar' ? `.nav-item.on:before{content:"";position:absolute;left:-12px;top:9px;bottom:9px;width:2px;background:${d.accent}}` : ''}
${P.nav === 'text' ? `.nav-item.on:after{content:"";position:absolute;right:12px;width:5px;height:5px;border-radius:50%;background:${d.accent}}` : ''}
.caret{width:12px;font:700 14px/1 var(--font-mono);color:${d.accent}}
.count{margin-left:auto;font:600 11px/1 var(--font-body);padding:4px 7px;border-radius:999px;background:${alpha(sideFg, 0.1)};color:${sideFg}}
.nav-item.on .count{background:${alpha(navOnFg, 0.18)};color:${navOnFg}}
.side-group{display:flex;flex-direction:column;gap:2px}
.team{display:flex;align-items:center;gap:11px;height:32px;padding:0 10px;color:${sideMuted};font-size:13.5px}
.team i{width:9px;height:9px;border-radius:${P.r === 0 ? 0 : '3px'};margin:0 4px;${sidebar === 'accent2' || sidebar === 'inverse' ? `outline:1.5px solid ${alpha(sideFg, 0.5)};` : ''}}
.side-foot{margin-top:auto;display:flex;flex-direction:column;gap:12px}
.usage{padding:12px;border-radius:${Math.min(cardR, 14)}px;background:${alpha(sideFg, 0.05)};border:1px solid ${alpha(sideFg, 0.1)};font-size:12px}
.usage-top{display:flex;justify-content:space-between;margin-bottom:8px}.usage-top b{font-weight:600}.usage-top span{color:${sideMuted}}
.meter{height:6px;border-radius:${P.r === 0 ? 0 : 99}px;background:${alpha(sideFg, 0.12)};overflow:hidden}.meter i{display:block;height:100%;background:${sidebar === 'accent2' ? d.accent3 : sidebar === 'inverse' ? d.accent : d.accent};border-radius:inherit}
.usage-t{display:block;margin-top:7px;color:${sideMuted}}
.me{display:flex;align-items:center;gap:10px;padding:10px 6px 0;border-top:1px solid ${alpha(sideFg, 0.1)}}
.me>div{min-width:0;flex:1}.me b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.me>div span{display:block;font-size:11.5px;color:${sideMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.me .ic{color:${sideMuted}}
.main{min-width:0;display:flex;flex-direction:column}
.top{height:60px;flex:none;display:flex;align-items:center;gap:10px;padding:0 28px;border-bottom:1px solid ${d.border};${d.glass ? '' : `background:${alpha(d.bg, 0.6)};`}}
.crumbs{display:flex;align-items:center;gap:6px;color:${mutedInk};font-size:13px;white-space:nowrap}.crumbs b{color:var(--fg);font-weight:600}.crumbs .ic{width:14px;height:14px}
.search{margin-left:auto;display:flex;align-items:center;gap:9px;width:340px;height:36px;padding:0 8px 0 11px;border-radius:${ctlR}px;border:1px solid ${hard ? d.fg : d.border};${hard ? `border-width:2px;` : ''}background:${d.glass ? alpha('#ffffff', 0.05) : d.surface};color:${mutedInk};font-size:13px}
.search span{flex:1;white-space:nowrap;overflow:hidden}
.search kbd{font:500 11px/1 var(--font-mono);padding:4px 6px;border-radius:${Math.min(ctlR, 6)}px;border:1px solid ${d.border};color:${mutedInk}}
.top .av{margin-left:4px}
.page{flex:1;padding:20px 28px 22px;display:flex;flex-direction:column;gap:16px}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
.actions{display:flex;gap:10px;flex:none}
.card{position:relative;${card}}
.kpis{display:grid;grid-template-columns:repeat(var(--nk),minmax(0,1fr));gap:16px}
.kpi{padding:14px 16px 13px;overflow:hidden;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto auto;column-gap:10px}
.kpi-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;color:${mutedInk}}
.feat .kpi-top,.colored .kpi-top{color:inherit;opacity:.85}.feat .kpi-top .ic{display:none}
.kpi-v{grid-column:1;${numFont};font-size:${P.titleMode === 'serif' ? 34 : P.thinCaps ? 30 : 28}px;line-height:1.05;margin-top:9px;white-space:nowrap;position:relative}
.kpi-b{grid-column:1;display:flex;align-items:center;gap:7px;margin-top:8px;min-width:0}
.kpi-s{font-size:11.5px;color:${mutedInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.feat .kpi-s,.colored .kpi-s{color:inherit;opacity:.7}
.spark{grid-column:2;grid-row:2/4;align-self:end;position:relative;width:84px;height:40px}
.feat .deco{opacity:.95}
.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 0}
.chart-card{display:flex;flex-direction:column;min-height:250px;flex:1}
.chart-v{display:flex;align-items:center;gap:10px;margin-top:6px}.chart-v b{${numFont};font-size:${P.titleMode === 'serif' ? 30 : 24}px;line-height:1}
.chart-tools{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:flex-end}
.legend{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:${mutedInk};white-space:nowrap}
.legend i{width:14px;height:3px;border-radius:2px;background:${d.accent}}.legend .lg-prev{background:repeating-linear-gradient(90deg,${alpha(d.fg, 0.4)} 0 4px,transparent 4px 7px)}
${P.chart === 'bars-multi' ? `.legend .lg-main{background:linear-gradient(90deg,${d.accent} 33%,${d.accent2} 33% 66%,${d.accent3} 66%);height:6px}` : ''}
.seg{display:inline-flex;padding:3px;border-radius:${ctlR >= 999 ? 999 : Math.min(ctlR + 2, 12)}px;background:${alpha(d.fg, 0.06)};${hard ? `border:2px solid ${d.fg};` : ''}}
.seg span{padding:5px 10px;border-radius:${ctlR >= 999 ? 999 : Math.max(0, ctlR - 2)}px;font:600 12px/1 var(--font-body);color:${mutedInk}}
.seg .on{background:${hard ? d.accent : d.glass ? alpha('#ffffff', 0.12) : d.dark ? alpha(d.fg, 0.12) : d.surface};color:${hard ? d.onAccent : d.fg};box-shadow:${hard || d.dark ? 'none' : `0 1px 3px ${alpha(d.fg, 0.14)}`}}
.chart-body{flex:1;display:grid;grid-template-columns:auto 1fr;gap:10px;padding:14px 18px 14px}
.y-ax{display:flex;flex-direction:column;justify-content:space-between;padding-bottom:24px;font:500 11px/1 var(--font-mono);color:${mutedInk};text-align:right;margin-top:-5px}
.plot-wrap{display:flex;flex-direction:column;min-width:0}
.plot{position:relative;flex:1;min-height:120px;background:linear-gradient(${gridLine} 1px,transparent 1px) 0 0/100% 25%;border-bottom:1px solid ${alpha(d.fg, 0.16)}}
.x-ax{display:flex;justify-content:space-between;height:24px;align-items:flex-end;font:500 11px/1 var(--font-mono);color:${mutedInk}}
.x-ax.bars-ax{justify-content:space-around;padding:0 6px}.x-ax.bars-ax span{flex:1;text-align:center}
.tip-line{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed ${alpha(d.fg, 0.28)};pointer-events:none}
.tip-dot{position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:${d.surface};border:2.5px solid ${d.accent};${/glow/.test(P.chart) ? `box-shadow:0 0 12px ${d.accent};` : ''}}
${/bars|blocks/.test(P.chart) ? '.tip-dot,.tip-line{display:none}' : ''}
.tip{position:absolute;transform:translate(-50%,calc(-100% - 14px));display:flex;flex-direction:column;gap:3px;padding:7px 10px;border-radius:${Math.min(cardR, 10)}px;background:${d.dark ? mixHex(d.surface, d.fg, 0.1) : d.fg};color:${d.dark ? d.fg : d.bg};white-space:nowrap;${hard ? `border:2px solid ${d.fg};background:${d.surface};color:${d.fg};box-shadow:${hsSm};` : ''}${d.glass ? `background:${alpha('#ffffff', 0.12)};backdrop-filter:blur(12px);border:1px solid ${d.border};` : ''}z-index:2}
.tip.below{transform:translate(-50%,14px)}
.tip small{font:500 10.5px/1 var(--font-mono);opacity:.7;text-transform:uppercase;letter-spacing:.06em}.tip b{${numFont};font-size:15px;line-height:1}
.table-card{overflow:hidden;flex:none}
.th-l{display:flex;align-items:center;gap:10px}
.count-chip{font:500 11.5px/1 var(--font-body);color:${mutedInk};padding:4px 8px;border-radius:999px;background:${alpha(d.fg, 0.06)}}
.table-scroll{overflow-x:auto;margin-top:10px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 12px;font:${P.mono || style.art === 'lines' ? '500 10.5px/1 var(--font-mono)' : '600 11.5px/1 var(--font-body)'};text-transform:uppercase;letter-spacing:.07em;color:${mutedInk};border-top:1px solid ${d.border};border-bottom:1px solid ${d.border};background:${alpha(d.fg, d.dark ? 0.02 : 0.02)};white-space:nowrap}
td{padding:0 12px;height:45px;border-bottom:1px solid ${alpha(d.fg, d.dark ? 0.07 : 0.07)};white-space:nowrap}
tr:last-child td{border-bottom:0}
th:first-child,td:first-child{padding-left:18px}th:last-child,td:last-child{padding-right:14px}
.num{text-align:right;font-variant-numeric:tabular-nums}td.num{font-weight:600}
.soft{color:${mutedInk}}
.c-id{font:500 12.5px/1 var(--font-mono);color:${mutedInk}}
.who{display:inline-flex;align-items:center;gap:9px;font-weight:500;max-width:190px}.who>span:last-child{overflow:hidden;text-overflow:ellipsis}
.act{width:36px;text-align:right}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:42px 20px;color:${mutedInk}}.empty .ic{width:30px;height:30px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:16px}
.col-main,.col-side{display:flex;flex-direction:column;gap:16px;min-width:0}
.feed{flex:1}
.live{display:inline-flex;align-items:center;gap:6px;font:600 11.5px/1 var(--font-body);color:${T.pos.text}}.live i{width:7px;height:7px;border-radius:50%;background:${T.pos.raw};box-shadow:0 0 0 3px ${alpha(T.pos.raw, 0.2)}}
.feed-list{padding:6px 18px 12px}
.feed-list li{position:relative;display:flex;gap:11px;padding:10px 0}
.feed-list li+li{border-top:1px solid ${alpha(d.fg, 0.06)}}
.feed-list p{font-size:13px;line-height:1.35;color:var(--fg);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.feed-list time{display:block;margin-top:3px;font-size:11.5px;color:${mutedInk}}
.f-ic{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : '50%'};background:${alpha(d.fg, 0.06)};color:${mutedInk}}.f-ic .ic{width:15px;height:15px}
.f-ic.t-info{background:${alpha(T.info.raw, 0.14)};color:${T.info.text}}.f-ic.t-pos{background:${alpha(T.pos.raw, 0.14)};color:${T.pos.text}}
.promo{overflow:hidden;display:flex;flex-direction:column;${style.tilt ? `transform:rotate(${Math.min(style.tilt, 3) * 0.5}deg);` : ''}}
.promo-img{height:92px;flex:none;border-bottom:${cardBorderW}px solid ${cardBorderC}}
.promo-body{padding:12px 18px 14px;display:flex;flex-direction:column;align-items:flex-start;gap:5px}
.promo h3{${cardT};${P.titleMode === 'plain' ? 'font-size:16px' : ''}}
.promo p{font-size:13px;line-height:1.35;color:${mutedInk};margin-bottom:4px}
.tag{display:inline-flex;align-items:center;gap:5px;font:600 11px/1 var(--font-body);text-transform:uppercase;letter-spacing:.08em;color:${ink(d.accent, d.surface, 4.2)}}
@media (max-width:1180px){.grid{grid-template-columns:1fr}.col-side{display:grid;grid-template-columns:1fr 1fr}.search{width:240px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:820px){
  .shell{display:block}
  .side{position:sticky;top:0;z-index:20;height:auto;margin:0;border-radius:0;flex-direction:column;gap:10px;padding:12px 16px 0;border:0;border-bottom:${Math.min(cardBorderW, 2)}px solid ${hard ? d.fg : d.border};box-shadow:none;${d.glass ? `background:${alpha(d.bg, 0.8)};backdrop-filter:blur(20px);` : ''}}
  .side-brand{padding:0}
  .mob-actions{display:flex;align-items:center;gap:14px;margin-left:auto}
  .side-nav{flex-direction:row;overflow-x:auto;gap:4px;margin:0 -16px;padding:0 16px 10px;scrollbar-width:none}
  .side-nav::-webkit-scrollbar{display:none}
  .side-label,.side-group,.side-foot{display:none}
  .nav-item{height:34px;flex:none;padding:0 12px}
  .nav-item.on:before{display:none}
  .top{display:none}
  .page{padding:18px 16px 28px}
  .page-head{flex-direction:column;align-items:stretch;gap:14px}
  .title{font-size:${P.titleMode === 'serif' ? 34 : 26}px}
  .actions .btn{flex:1}
  .actions .btn.ghost span{overflow:hidden;text-overflow:ellipsis}
  .kpis{grid-template-columns:1fr 1fr;gap:12px}
  .kpi{padding:13px;display:flex;flex-direction:column;min-height:0}
  .kpi-v{font-size:${P.titleMode === 'serif' ? 28 : 21}px;margin-top:8px}
  .kpi-s,.spark,.kpi .ic.faint{display:none}
  .card-head{flex-direction:column;padding:14px 14px 0}
  .chart-tools{justify-content:flex-start}
  .legend{display:none}
  .chart-body{padding:12px 14px}
  .plot{min-height:150px}
  .x-ax span:nth-child(2n){visibility:hidden}
  .opt,.count-chip{display:none}
  .th-l{width:100%}
  .table-card .card-head{flex-direction:row;align-items:center}
  .table-card .btn{display:none}
  th:first-child,td:first-child{padding-left:14px}
  .who{max-width:120px}
  .col-side{display:flex}
  .promo{transform:none}
}`;
  }

  function mobileCss() {
    const scr = d.glass ? d.bg : d.bg;
    const phoneShadow = hard ? `${hard.x * 1.6}px ${hard.y * 1.6}px 0 0 ${d.fg}` : d.dark ? `0 0 0 1px ${alpha('#ffffff', 0.08)}, 0 50px 90px -30px #000000, 0 0 80px -40px ${alpha(d.accent, 0.6)}` : `0 50px 90px -40px ${alpha(d.fg, 0.45)}, 0 20px 40px -30px ${alpha(d.fg, 0.35)}`;
    const bezel = hard ? d.fg : d.dark ? '#1b1b1f' : '#111114';
    const tabBg = d.glass ? alpha(d.bg, 0.6) : alpha(d.surface, 0.94);
    const listCard = `background:${cardBg};border:${cardBorderW}px solid ${cardBorderC};border-radius:${Math.min(cardR, 22)}px;${hard ? `box-shadow:${hsSm};` : d.glass ? 'backdrop-filter:blur(20px);' : ''}`;
    const stage = {
      aurora: `radial-gradient(35% 55% at 18% 30%,${alpha(d.accent, 0.45)},transparent 70%),radial-gradient(30% 45% at 85% 20%,${alpha(d.accent3, 0.3)},transparent 70%),radial-gradient(40% 50% at 60% 100%,${alpha(d.accent2, 0.28)},transparent 70%)`,
      beam: `radial-gradient(40% 70% at 50% 0%,${alpha(d.accent, 0.3)},transparent 70%)`,
      mesh: `radial-gradient(40% 50% at 10% 10%,${alpha(d.accent, 0.22)},transparent 70%),radial-gradient(40% 50% at 95% 95%,${alpha(d.accent2, 0.2)},transparent 70%),radial-gradient(30% 40% at 90% 5%,${alpha(d.accent3, 0.16)},transparent 70%)`,
      'sun-grid': `radial-gradient(45% 50% at 50% 100%,${alpha(d.accent, 0.35)},transparent 70%)`,
      blobs: `radial-gradient(30% 45% at 8% 90%,${alpha(d.accent3, 0.5)},transparent 70%),radial-gradient(25% 40% at 95% 10%,${alpha(d.accent2, 0.25)},transparent 70%)`,
      bauhaus: `radial-gradient(circle at 6% 92%,${d.accent} 0 150px,transparent 151px),linear-gradient(${d.accent3},${d.accent3}) 97% 94%/180px 26px no-repeat`,
      halftone: `radial-gradient(${alpha(d.accent, 0.5)} 2px,transparent 2.4px) 0 0/14px 14px`,
      chrome: `radial-gradient(40% 60% at 15% 20%,${alpha(d.accent, 0.18)},transparent 70%),radial-gradient(40% 60% at 85% 80%,${alpha(d.accent2, 0.18)},transparent 70%)`,
      shapes: '', grid: '', lines: '', enso: '', terminal: '',
    }[style.art] || '';
    return `
body{min-height:100vh}
.canvas{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px 40px 30px;overflow:hidden}
.stage{position:absolute;inset:0;pointer-events:none;background:${stage || 'none'};${style.art === 'halftone' ? 'mask-image:radial-gradient(40% 60% at 100% 100%,#000,transparent);' : ''}}
${style.art === 'sun-grid' ? `.stage:after{content:"";position:absolute;left:-20%;right:-20%;bottom:0;height:42%;background-image:linear-gradient(${alpha(d.accent, 0.55)} 1.5px,transparent 1.5px),linear-gradient(90deg,${alpha(d.accent, 0.55)} 1.5px,transparent 1.5px);background-size:60px 40px;transform:perspective(400px) rotateX(60deg);transform-origin:bottom;mask-image:linear-gradient(transparent,#000 60%)}` : ''}
.canvas-head{position:relative;width:min(100%,1180px);display:flex;justify-content:space-between;align-items:center;font:500 12px/1 var(--font-mono);text-transform:uppercase;letter-spacing:.1em;color:${mutedInk}}
.ch-brand{display:inline-flex;align-items:center;gap:10px;color:var(--fg);font:${P.titleMode === 'serif' ? 'var(--display-weight) 22px' : 'var(--display-weight) 17px'}/1 var(--font-display);letter-spacing:${P.thinCaps ? '.1em' : P.caps ? '0' : '-.02em'};text-transform:${P.caps ? 'uppercase' : 'none'}}
.ch-brand .logo{width:26px;height:26px;font-size:13px}
.phones{position:relative;display:flex;gap:52px;align-items:flex-start;justify-content:center}
.phone-wrap{--k:.9;margin:0;width:calc(390px * var(--k));display:flex;flex-direction:column;align-items:center;gap:12px}
.phone-wrap figcaption{font:500 11px/1 var(--font-mono);text-transform:uppercase;letter-spacing:.12em;color:${mutedInk}}
${style.tilt ? `.w1{transform:rotate(${-style.tilt * 0.5}deg)}.w3{transform:rotate(${style.tilt * 0.5}deg)}` : ''}
.w2{margin-top:${hard ? 0 : 0}px}
.phone{width:calc(390px * var(--k));height:calc(844px * var(--k));border-radius:calc(58px * var(--k));padding:calc(10px * var(--k));background:${bezel};box-shadow:${phoneShadow};${hard ? `border:0;` : ''}}
.screen{position:relative;width:370px;height:824px;transform:scale(var(--k));transform-origin:0 0;border-radius:48px;overflow:hidden;background:${scr};isolation:isolate}
${d.glass ? `.screen{background:radial-gradient(70% 40% at 10% 0%,${alpha(d.accent, 0.4)},transparent 70%),radial-gradient(60% 40% at 100% 30%,${alpha(d.accent3, 0.22)},transparent 70%),radial-gradient(70% 40% at 50% 100%,${alpha(d.accent2, 0.2)},transparent 70%),${d.bg}}` : ''}
${style.texture === 'grain' ? `.screen:after{content:"";position:absolute;inset:0;pointer-events:none;z-index:40;background-image:${grainUrl(0.55)};opacity:${d.dark ? 0.1 : 0.14};mix-blend-mode:${d.dark ? 'screen' : 'multiply'}}` : ''}
${style.texture === 'dots' ? `.screen{background-image:radial-gradient(${alpha(d.fg, 0.13)} 1px,transparent 1.2px);background-size:18px 18px}` : ''}
${style.texture === 'grid' ? `.screen{background-image:linear-gradient(${alpha(d.fg, 0.045)} 1px,transparent 1px),linear-gradient(90deg,${alpha(d.fg, 0.045)} 1px,transparent 1px);background-size:37px 37px}` : ''}
.sb{position:absolute;top:0;left:0;right:0;height:50px;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:4px 30px 0 34px;color:var(--fg)}
.sb b{font:600 15px/1 system-ui,-apple-system,sans-serif;letter-spacing:-.01em}
.island{position:absolute;left:50%;top:11px;width:118px;height:34px;margin-left:-59px;border-radius:20px;background:#000}
.sb-r{display:flex;align-items:center;gap:5px}.sb-r svg{height:11px;width:auto;fill:currentColor}.sb-r svg:last-child{height:12px}
.scr-body{position:absolute;top:50px;left:0;right:0;bottom:84px;padding:10px 18px 0;overflow:hidden;display:flex;flex-direction:column;gap:14px}
.scr-body>*{flex:none}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:84px;z-index:20;display:flex;justify-content:space-around;padding:9px 10px 0;background:${tabBg};border-top:${hard ? `${cardBorderW}px solid ${d.fg}` : `1px solid ${d.border}`};${d.glass || !hard ? 'backdrop-filter:blur(20px);' : ''}}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;width:74px;font:500 10.5px/1 var(--font-body);color:${mutedInk};${P.mono ? 'text-transform:uppercase;letter-spacing:.04em;' : ''}}
.tab .ic{width:23px;height:23px}
.tab.on{color:${ink(d.accent, d.surface, 3.2)}}
${P.nav === 'fill-fg' ? `.tab.on{color:${d.fg}}.tab.on .ic{color:${d.accent}}` : ''}
${P.nav === 'neon' ? `.tab.on{text-shadow:0 0 10px ${d.accent}}.tab.on .ic{filter:drop-shadow(0 0 6px ${d.accent})}` : ''}
${hard ? `.tab.on .ic{background:${d.accent};color:${d.onAccent};border:2px solid ${d.fg};border-radius:${Math.min(ctlR, 10)}px;width:44px;height:28px;padding:2px 10px;box-shadow:2px 2px 0 ${d.fg}}.tab.on{color:${d.fg};font-weight:700}` : ''}
${P.nav === 'fill-accent3' ? `.tab.on .ic{background:${d.accent3};color:${onColor(d.accent3, d)};width:44px;height:28px;padding:2px 10px}.tab.on{color:${d.fg};font-weight:600}` : ''}
.home-ind{position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:var(--fg);opacity:.9}
.m-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px}
.m-head-r{display:flex;align-items:center;gap:10px}
.m-title{${titleFont};font-size:${P.titleMode === 'serif' ? 31 : P.titleMode === 'caps' ? (P.thinCaps ? 24 : 26) : 27}px;line-height:1.02;margin-top:5px}
.summary{position:relative;overflow:hidden;flex:none;padding:16px 18px 14px;border-radius:${Math.min(cardR, 26)}px;${hard ? `border:${cardBorderW}px solid ${d.fg};box-shadow:${hs};` : cardBorderW >= 2 && d.borderOpaque ? `border:${cardBorderW}px solid ${d.fg};` : ''}${d.glass ? `border:1px solid ${d.border};backdrop-filter:blur(20px);` : ''}${P.feature === 'neon' ? `box-shadow:0 0 0 1px ${alpha(d.accent, 0.5)}, 0 0 34px -10px ${d.accent};` : ''}${P.feature === 'mesh' ? `box-shadow:0 20px 40px -20px ${alpha(d.accent, 0.8)};` : ''}}
.summary.calm{border:${cardBorderW}px solid ${d.border}}
.summary .deco{width:110px;height:110px}
.sum-top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;opacity:.92}
.sum-row{position:relative;display:flex;align-items:center;gap:10px;margin-top:10px}.sum-v{${numFont};font-size:${P.titleMode === 'serif' ? 48 : 40}px;line-height:1;white-space:nowrap}
.sum-chart{position:relative;height:48px;margin-top:12px}
.sum-foot{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;padding-top:11px;border-top:1px solid color-mix(in srgb, currentColor 18%, transparent)}
.sum-foot span{display:block;font-size:11.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sum-foot b{${numFont};font-size:17px}
.summary .kpi-l{opacity:.9}
.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:none}
.quick a{display:flex;flex-direction:column;align-items:center;gap:7px;font-size:11.5px;color:${mutedInk}}
.q-ic{width:50px;height:50px;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : P.r >= 12 ? '50%' : Math.min(P.r + 6, 16) + 'px'};${listCard.replace(/border-radius:[^;]+;/, '')}color:var(--fg)}
.q-ic.on{background:${d.accent};color:${d.onAccent};${hard ? '' : 'border-color:transparent;'}}
.q-ic .ic{width:22px;height:22px}
.sec-h{display:flex;align-items:baseline;justify-content:space-between;margin-top:2px}
.m-list{${listCard}overflow:hidden;flex:none}
.m-list li{display:flex;align-items:center;gap:12px;padding:11px 14px}
.m-list li+li{border-top:1px solid ${alpha(d.fg, 0.08)}}
.li-ic{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : Math.min(P.r, 12) + 'px'};background:${alpha(d.fg, 0.06)};color:${mutedInk}}
.li-ic .ic{width:18px;height:18px}
.li-ic.t-pos{background:${alpha(T.pos.raw, 0.15)};color:${T.pos.text}}.li-ic.t-info{background:${alpha(T.info.raw, 0.15)};color:${T.info.text}}.li-ic.t-warn{background:${alpha(T.warn.raw, 0.18)};color:${T.warn.text}}.li-ic.t-neg{background:${alpha(T.neg.raw, 0.14)};color:${T.neg.text}}
.li-m{flex:1;min-width:0}.li-m b{display:block;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.li-m span{display:block;font-size:12px;color:${mutedInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.li-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}.li-r b{font-weight:700;font-size:13.5px;font-variant-numeric:tabular-nums}
.li-r .pill{font-size:10.5px}
.detail{gap:0}
.hero{position:relative;height:208px;flex:none;border-radius:${Math.min(cardR, 26)}px;overflow:hidden;${hard ? `border:${cardBorderW}px solid ${d.fg};box-shadow:${hsSm};` : cardBorderW >= 2 && d.borderOpaque ? `border:${cardBorderW}px solid ${d.fg};` : ''}}
.hero-img{position:absolute;inset:0}
.hero-bar{position:absolute;left:12px;right:12px;top:12px;display:flex;justify-content:space-between}
.round{width:38px;height:38px;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : '50%'};background:${alpha(d.surface, 0.88)};color:${d.fg};backdrop-filter:blur(10px);${hard ? `border:2px solid ${d.fg};` : ''}}
.d-meta{display:flex;align-items:center;gap:10px;margin-top:16px}
.d-id{font:500 12.5px/1 var(--font-mono);color:${mutedInk}}
.d-title{margin-top:8px;font-size:${P.titleMode === 'serif' ? 32 : P.titleMode === 'caps' ? 24 : 26}px}
.d-sub{display:flex;align-items:center;gap:5px;margin-top:6px;color:${mutedInk};font-size:13px}
.stats{display:grid;grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;margin-top:16px;${listCard}}
.stats div{padding:11px 12px;min-width:0}.stats div+div{border-left:1px solid ${alpha(d.fg, 0.1)}}
.stats span{display:block;font:500 10.5px/1.2 var(--font-mono);text-transform:uppercase;letter-spacing:.06em;color:${mutedInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stats b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;margin-top:6px;${numFont};font-size:${P.titleMode === 'serif' ? 19 : 15}px;line-height:1.15;overflow:hidden}
.sec-t{margin:18px 0 10px}
.steps{display:flex;flex-direction:column}
.steps li{position:relative;display:flex;gap:12px;padding-bottom:12px}
.steps li:not(:last-child):before{content:"";position:absolute;left:10px;top:24px;bottom:2px;width:2px;background:${alpha(d.fg, 0.12)}}
.steps li.done:not(:last-child):before{background:${d.accent}}
.steps i{width:22px;height:22px;flex:none;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : '50%'};border:2px solid ${alpha(d.fg, 0.2)};background:${d.dark ? d.bg : d.surface}}
.steps .done i{background:${d.accent};border-color:${hard ? d.fg : d.accent};color:${d.onAccent}}
.steps .now i{box-shadow:0 0 0 4px ${alpha(d.accent, 0.22)}}
.steps i .ic{width:12px;height:12px;stroke-width:3}
.steps b{display:block;font-size:13.5px;font-weight:600;line-height:1.2}.steps span{display:block;font-size:11.5px;color:${mutedInk};margin-top:2px}
.steps li:not(.done) b{color:${mutedInk};font-weight:500}
.cta-dock{position:absolute;left:0;right:0;bottom:0;padding:24px 18px 14px;background:linear-gradient(transparent,${d.glass ? alpha(d.bg, 0.9) : d.bg} 40%)}
.btn.block{width:100%;height:52px;font-size:15px;border-radius:${ctlR >= 999 ? 999 : Math.min(ctlR + 4, 16)}px}
.profile{display:flex;align-items:center;gap:13px;padding:14px;${listCard}}
.profile>div{flex:1;min-width:0}.profile b{display:block;font-size:16px;font-weight:600}.profile>div span{display:block;font-size:12.5px;color:${mutedInk};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grp-h{${labelCss};color:${mutedInk};margin:4px 0 -8px 4px}
.grp{${listCard}overflow:hidden}
.grp li{display:flex;align-items:center;gap:12px;height:52px;padding:0 14px}
.grp li+li{border-top:1px solid ${alpha(d.fg, 0.08)}}
.g-ic{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:${P.r === 0 ? 0 : Math.min(P.r, 9) + 'px'};background:${alpha(d.accent, 0.13)};color:${ink(d.accent, d.surface, 3)}}
.g-ic .ic{width:16px;height:16px}
.g-t{flex:1;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-v{font-size:12.5px;color:${mutedInk};white-space:nowrap}
.tgl{width:46px;height:28px;flex:none;border-radius:${P.r === 0 ? 0 : 99}px;background:${alpha(d.fg, 0.15)};padding:3px;${hard ? `border:2px solid ${d.fg};height:28px;padding:2px;` : ''}}
.tgl i{display:block;width:22px;height:22px;border-radius:${P.r === 0 ? 0 : '50%'};background:#fff;box-shadow:0 1px 3px #0003;${hard ? `border:2px solid ${d.fg};width:20px;height:20px;box-shadow:none;` : ''}}
.tgl.on{background:${d.accent}}.tgl.on i{margin-left:auto;${hard ? '' : ''}}
${P.nav === 'neon' ? `.tgl.on{box-shadow:0 0 14px -2px ${d.accent}}` : ''}
.signout{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:2px;font-weight:600;font-size:14px;color:${T.neg.text}}
.phone-wrap .rise,.phone{animation:enter .8s cubic-bezier(.2,.7,.2,1) both}.w2 .phone{animation-delay:.1s}.w3 .phone{animation-delay:.2s}
@media (max-width:1320px){.phone-wrap{--k:.78}.phones{gap:36px}}
@media (max-width:1100px){.phone-wrap{--k:.66}.phones{gap:24px}}
@media (max-width:900px){.w3{display:none}}
@media (max-width:600px){
  .canvas{padding:0;display:block;min-height:0}
  .canvas-head,.stage,.phone-wrap figcaption,.w2,.w3{display:none}
  .phones{display:block}
  .phone-wrap{--k:1;width:100%;transform:none}
  .phone{width:100%;height:auto;min-height:100vh;padding:0;border-radius:0;box-shadow:none;background:none;animation:none}
  .screen{width:100%;height:max(100vh,760px);transform:none;border-radius:0}
  .island{display:none}
}`;
  }
}
