// Page sections inspo knows how to research: what they're called, how to spot them
// on a live site, which page to visit when they usually live on their own URL,
// and what to search for in galleries.

export const SECTION_TYPES = {
  navbar: {
    name: { en: 'Navbar', es: 'Navbar' },
    kw: 'nav|navbar|navigation|header|menu|mega ?menu',
    dribbble: ['website header navigation', 'website navbar', 'website menu navigation'],
    galleries: ['navbargallery'],
    generic: true, // industry words pull in app tab bars; keep these queries web-specific
  },
  hero: {
    name: { en: 'Hero', es: 'Hero' },
    kw: 'hero|header|landing|homepage|home page|above the fold|first screen',
    dribbble: ['hero section', 'website hero', 'landing page hero'],
  },
  logos: {
    name: { en: 'Logos / social proof', es: 'Logos / prueba social' },
    kw: 'logo(s| cloud| wall)?|clients|trusted|partners|brands',
    rx: 'trusted by|used by|loved by|our clients|clients|partners|backed by|as seen|featured in|confían|clientes|aliados|marcas',
    dribbble: ['logo cloud section', 'trusted by section'],
  },
  features: {
    name: { en: 'Features', es: 'Features / beneficios' },
    kw: 'features?|benefits?',
    rx: 'feature|benefit|why (us|choose)|what you get|capabilities|beneficios|características|por qué',
    dribbble: ['features section', 'feature section website'],
  },
  services: {
    name: { en: 'Services', es: 'Servicios' },
    kw: 'services?',
    rx: 'services|what we do|capabilities|expertise|servicios|qué hacemos',
    link: 'services|servicios|what-we-do',
    dribbble: ['services section website', 'agency services'],
  },
  catalog: {
    name: { en: 'Catalog / products', es: 'Catálogo / productos' },
    kw: 'products?|shop|catalog(ue)?|store|e-?commerce|collection|listing|menu|pdp|plp',
    rx: 'shop|products?|collection|catalog|catalogue|store|menu|our (coffees|wines|beers)|tienda|productos|colecci|catálogo|menú|bestsellers?|new arrivals',
    link: 'shop|store|products|collections?|catalog|menu|tienda|productos|catalogo|coleccion',
    dribbble: ['product catalog website', 'ecommerce product grid', 'shop page design'],
    priceGrid: true,
  },
  work: {
    name: { en: 'Work / portfolio', es: 'Proyectos / portafolio' },
    kw: 'portfolio|case stud(y|ies)|projects?|work|showcase',
    rx: 'work|projects|portfolio|case stud|selected|proyectos|portafolio|trabajos',
    link: 'work|projects|portfolio|case-studies|proyectos|trabajo',
    dribbble: ['portfolio website projects', 'case study grid'],
  },
  about: {
    name: { en: 'About us', es: 'Nosotros' },
    kw: 'about|story|mission|who we are|company page|team',
    rx: 'about|our story|who we are|mission|manifesto|our values|nosotros|quiénes somos|quienes somos|historia|misión|filosof',
    link: 'about|our-story|story|who-we-are|nosotros|quienes-somos|historia|acerca',
    dribbble: ['about us page', 'about us section', 'our story page'],
  },
  process: {
    name: { en: 'How it works', es: 'Cómo funciona' },
    kw: 'how it works|process|steps|timeline|workflow',
    rx: 'how it works|process|steps|how we work|cómo funciona|proceso|pasos',
    dribbble: ['how it works section', 'process steps website'],
  },
  stats: {
    name: { en: 'Stats', es: 'Números' },
    kw: 'stats?|statistics|numbers|metrics|counters?|impact',
    rx: 'in numbers|by the numbers|impact|results|números|cifras|impacto',
    dribbble: ['stats section website', 'numbers section'],
  },
  team: {
    name: { en: 'Team', es: 'Equipo' },
    kw: 'team|people|members|founders|staff',
    rx: 'team|people|founders|meet the|equipo|fundadores|conoce a',
    link: 'team|people|equipo',
    dribbble: ['team section website', 'meet the team page'],
  },
  testimonials: {
    name: { en: 'Testimonials', es: 'Testimonios' },
    kw: 'testimonials?|reviews?|feedback|quotes?|social proof',
    rx: 'testimonial|reviews?|what (people|our clients|customers) say|loved by|wall of love|opiniones|testimonios|reseñas|lo que dicen',
    dribbble: ['testimonials section', 'customer reviews section'],
  },
  pricing: {
    name: { en: 'Pricing', es: 'Precios' },
    kw: 'pricing|price|plans?|subscription|tiers?',
    rx: 'pricing|plans|price|subscribe|membership|precios|planes|suscripci',
    link: 'pricing|plans|precios|planes|subscribe|suscripcion',
    dribbble: ['pricing page', 'pricing section', 'subscription plans'],
  },
  faq: {
    name: { en: 'FAQ', es: 'Preguntas frecuentes' },
    kw: 'faq|questions|accordion|help center',
    rx: 'faq|frequently asked|questions|preguntas',
    link: 'faq|preguntas',
    dribbble: ['faq section', 'faq accordion website'],
  },
  blog: {
    name: { en: 'Blog / journal', es: 'Blog' },
    kw: 'blog|articles?|news|journal|posts?|magazine',
    rx: 'blog|journal|news|stories|articles|insights|noticias|artículos',
    link: 'blog|journal|news|stories|noticias',
    dribbble: ['blog page design', 'journal website'],
  },
  cta: {
    name: { en: 'Call to action', es: 'Llamado a la acción' },
    kw: 'cta|call to action|sign ?up|get started|banner',
    rx: 'get started|start (your|now|today)|ready to|join|sign up|book a|empieza|únete|comienza|agenda',
    dribbble: ['cta section website', 'call to action section'],
  },
  newsletter: {
    name: { en: 'Newsletter', es: 'Newsletter' },
    kw: 'newsletter|subscribe|email (capture|signup)',
    rx: 'newsletter|subscribe to|stay in the loop|sign up for|suscríbete|boletín',
    dribbble: ['newsletter section website'],
  },
  contact: {
    name: { en: 'Contact', es: 'Contacto' },
    kw: 'contact|form|get in touch|inquir',
    rx: 'contact|get in touch|say hello|let.?s talk|write to us|contacto|contáctanos|escríbenos|hablemos',
    link: 'contact|contacto|get-in-touch',
    dribbble: ['contact page design', 'contact form website'],
  },
  footer: {
    name: { en: 'Footer', es: 'Footer' },
    kw: 'footer',
    dribbble: ['website footer', 'footer design website', 'footer section'],
    galleries: ['footerdesign'],
    generic: true,
  },
};


// ── App screens (web systems and mobile apps) ─────────────────────────────
// `terms` are platform-neutral; the harvest prefixes them ("saas …", "mobile app …").
// `si` is the saasinterface.com category (web only). No live crawl: app UIs sit behind logins.
const SCREEN_TYPES = {
  auth: { name: { en: 'Login / sign up', es: 'Login / registro' }, kw: 'login|log in|sign ?in|sign ?up|register|registration|auth|password|otp', terms: ['login screen', 'sign up screen'], si: ['sign-in', 'sign-up'] },
  onboarding: { name: { en: 'Onboarding', es: 'Onboarding' }, kw: 'onboarding|welcome|walkthrough|get started|setup|intro', terms: ['onboarding', 'welcome screen'], si: ['onboarding'] },
  dashboard: { name: { en: 'Dashboard', es: 'Dashboard' }, kw: 'dashboard|overview|analytics|admin|home', terms: ['dashboard', 'dashboard overview'], si: ['dashboard'] },
  appnav: { name: { en: 'App navigation', es: 'Navegación de la app' }, kw: 'sidebar|side ?bar|navigation|nav|menu|tab ?bar|bottom nav', terms: ['sidebar navigation', 'navigation menu'], mobileTerms: ['tab bar', 'bottom navigation'] },
  apphome: { name: { en: 'App home', es: 'Inicio de la app' }, kw: 'home|dashboard|main screen|feed|overview|app ui|app design|mobile app|ios app', terms: ['home screen', 'app home'] },
  table: { name: { en: 'Tables & lists', es: 'Tablas y listas' }, kw: 'table|list|data ?grid|crm|records|orders|inventory|directory', terms: ['data table', 'list view'], si: ['lists-tables', 'directory'] },
  detail: { name: { en: 'Detail view', es: 'Vista de detalle' }, kw: 'detail|details|product page|record|item|order', terms: ['detail page', 'details screen'], si: ['item-details'] },
  forms: { name: { en: 'Forms', es: 'Formularios' }, kw: 'form|input|create|edit|wizard|stepper|new', terms: ['form design', 'create form'], si: ['forms'] },
  settings: { name: { en: 'Settings', es: 'Configuración' }, kw: 'settings|preferences|account|configuration', terms: ['settings page', 'account settings'], si: ['settings'] },
  charts: { name: { en: 'Charts & reports', es: 'Gráficas y reportes' }, kw: 'chart|graph|analytics|report|statistics|stats|metrics', terms: ['analytics charts', 'report page'] },
  emptystate: { name: { en: 'Empty states', es: 'Estados vacíos' }, kw: 'empty ?state|no data|nothing here|empty', terms: ['empty state'], si: ['empty-state'] },
  notifications: { name: { en: 'Notifications & activity', es: 'Notificaciones y actividad' }, kw: 'notification|inbox|alerts?|activity|updates', terms: ['notifications', 'activity feed'], si: ['activity-feed'] },
  search: { name: { en: 'Search & filters', es: 'Búsqueda y filtros' }, kw: 'search|command|filters?|spotlight', terms: ['search screen', 'filters'] },
  profile: { name: { en: 'Profile', es: 'Perfil' }, kw: 'profile|account|user|me', terms: ['user profile', 'profile screen'], si: ['profile-user'] },
  billing: { name: { en: 'Billing & plans', es: 'Pagos y planes' }, kw: 'billing|plans?|subscription|invoice|payment|pricing', terms: ['billing page', 'subscription plans'], si: ['billing-plan'] },
  checkout: { name: { en: 'Cart & checkout', es: 'Carrito y checkout' }, kw: 'checkout|cart|payment|order summary', terms: ['checkout', 'shopping cart'], si: ['checkout'] },
  calendar: { name: { en: 'Calendar & booking', es: 'Calendario y reservas' }, kw: 'calendar|schedule|booking|appointment|agenda', terms: ['calendar', 'booking'], si: ['calendar'] },
  kanban: { name: { en: 'Boards & tasks', es: 'Tableros y tareas' }, kw: 'kanban|board|tasks?|project management|to-?do', terms: ['kanban board', 'task management'], si: ['boards'] },
  chat: { name: { en: 'Chat & messages', es: 'Chat y mensajes' }, kw: 'chat|messag|inbox|conversation|dm', terms: ['chat', 'messaging'], si: ['messaging-chat'] },
  feed: { name: { en: 'Feed', es: 'Feed' }, kw: 'feed|timeline|posts|social|stories', terms: ['feed', 'social feed'] },
  map: { name: { en: 'Map & tracking', es: 'Mapa y rastreo' }, kw: 'map|location|tracking|delivery|route|gps', terms: ['map screen', 'delivery tracking'], si: ['maps'] },
  modal: { name: { en: 'Modals & dialogs', es: 'Modales y diálogos' }, kw: 'modal|dialog|pop-?up|drawer|sheet', terms: ['modal dialog', 'bottom sheet'] },
};
for (const [id, t] of Object.entries(SCREEN_TYPES)) SECTION_TYPES[id] = { ...t, screen: true, dribbble: t.terms, gal: { saasinterface: t.si || [] } };

// Category pages on section/screen galleries: { gallery: [category slugs] }.
const CATEGORY_GALLERIES = {
 'navbar': {
  'maxibestof': [
   'header'
  ],
  'collectui': [
   'navigation',
   'header-navigation'
  ]
 },
 'hero': {
  'maxibestof': [
   'hero'
  ],
  'collectui': [
   'hero-section',
   'landing-section'
  ]
 },
 'logos': {
  'maxibestof': [
   'brand'
  ]
 },
 'features': {
  'maxibestof': [
   'feature',
   'value-proposition'
  ],
  'collectui': [
   'features',
   'bento'
  ]
 },
 'catalog': {
  'collectui': [
   'e-commerce',
   'filter-products',
   'single-product'
  ]
 },
 'work': {
  'maxibestof': [
   'gallery'
  ],
  'collectui': [
   'portfolio',
   'gallery'
  ]
 },
 'about': {
  'maxibestof': [
   'about-us'
  ],
  'collectui': [
   'about-us'
  ]
 },
 'stats': {
  'collectui': [
   'statistics'
  ]
 },
 'testimonials': {
  'maxibestof': [
   'testimonial'
  ],
  'collectui': [
   'testimonials'
  ]
 },
 'pricing': {
  'collectui': [
   'pricing'
  ],
  'nicelydone': [
   'pricing'
  ]
 },
 'faq': {
  'maxibestof': [
   'faq'
  ],
  'collectui': [
   'faq',
   'accordion'
  ]
 },
 'blog': {
  'collectui': [
   'blog'
  ]
 },
 'cta': {
  'maxibestof': [
   'call-to-action'
  ],
  'collectui': [
   'cta'
  ]
 },
 'newsletter': {
  'maxibestof': [
   'newsletter'
  ],
  'collectui': [
   'subscribe'
  ]
 },
 'footer': {
  'maxibestof': [
   'footer'
  ],
  'collectui': [
   'footer'
  ]
 },
 'auth': {
  'collectui': [
   'sign-up',
   'otp-code'
  ],
  'nicelydone': [
   'sign-up'
  ]
 },
 'onboarding': {
  'collectui': [
   'onboarding',
   'product-tour',
   'splash-screen'
  ],
  'nicelydone': [
   'onboarding-checklist',
   'account-setup',
   'invite-teammates'
  ]
 },
 'dashboard': {
  'collectui': [
   'dashboard',
   'admin-panel'
  ],
  'nicelydone': [
   'dashboard'
  ]
 },
 'appnav': {
  'collectui': [
   'sidebar',
   'navigation',
   'tabs',
   'mobile-menu'
  ]
 },
 'apphome': {
  'collectui': [
   'app-screens',
   'mobile-app'
  ]
 },
 'table': {
  'collectui': [
   'table',
   'list-items'
  ],
  'nicelydone': [
   'table',
   'filter-and-sort'
  ]
 },
 'detail': {
  'collectui': [
   'single-product',
   'info-card'
  ]
 },
 'forms': {
  'collectui': [
   'form',
   'date-picker',
   'file-upload'
  ],
  'nicelydone': [
   'add-and-create'
  ]
 },
 'settings': {
  'collectui': [
   'settings-page'
  ],
  'nicelydone': [
   'account-settings',
   'notification-settings',
   'security-settings'
  ]
 },
 'charts': {
  'collectui': [
   'analytics-chart',
   'statistics'
  ],
  'nicelydone': [
   'stats'
  ]
 },
 'emptystate': {
  'collectui': [
   'empty-states',
   'error-state',
   '404-page'
  ],
  'nicelydone': [
   'empty-state'
  ]
 },
 'notifications': {
  'collectui': [
   'notification',
   'activity-feed'
  ]
 },
 'search': {
  'collectui': [
   'search',
   'command-bar'
  ],
  'nicelydone': [
   'search-results'
  ]
 },
 'profile': {
  'collectui': [
   'user-profile'
  ]
 },
 'billing': {
  'collectui': [
   'invoice',
   'pricing'
  ],
  'nicelydone': [
   'billing-settings',
   'payment-method'
  ]
 },
 'checkout': {
  'collectui': [
   'checkout'
  ],
  'nicelydone': [
   'checkout'
  ]
 },
 'calendar': {
  'collectui': [
   'calendar',
   'schedule'
  ]
 },
 'kanban': {
  'collectui': [
   'project-management',
   'todo-list'
  ]
 },
 'chat': {
  'collectui': [
   'chat-layout',
   'direct-messaging',
   'inbox'
  ]
 },
 'feed': {
  'collectui': [
   'newsfeed',
   'social-media'
  ]
 },
 'map': {
  'collectui': [
   'map'
  ]
 },
 'modal': {
  'collectui': [
   'modal',
   'pop-up'
  ]
 }
};
for (const [id, g] of Object.entries(CATEGORY_GALLERIES)) SECTION_TYPES[id].gal = { ...(SECTION_TYPES[id].gal || {}), ...g };

/** Which platforms each category gallery covers. */
export const GALLERY_PLATFORMS = { maxibestof: ['web'], collectui: ['web', 'mobile'], nicelydone: ['web'], saasinterface: ['web'] };

export const SECTION_IDS = Object.keys(SECTION_TYPES);

export function sectionName(id, lang = 'en') {
  const t = SECTION_TYPES[id];
  if (!t) return id;
  return t.name[String(lang).startsWith('es') ? 'es' : 'en'];
}

/** Recommended section sets per page type, used by the skill as a starting point. */
export const RECOMMENDED = {
  landing: ['navbar', 'hero', 'logos', 'features', 'process', 'testimonials', 'pricing', 'faq', 'cta', 'footer'],
  ecommerce: ['navbar', 'hero', 'catalog', 'features', 'about', 'testimonials', 'newsletter', 'footer'],
  restaurant: ['navbar', 'hero', 'catalog', 'about', 'testimonials', 'contact', 'footer'],
  studio: ['navbar', 'hero', 'work', 'services', 'about', 'team', 'contact', 'footer'],
  saas: ['navbar', 'hero', 'logos', 'features', 'stats', 'testimonials', 'pricing', 'faq', 'cta', 'footer'],
  portfolio: ['navbar', 'hero', 'work', 'about', 'contact', 'footer'],
  services: ['navbar', 'hero', 'services', 'process', 'about', 'testimonials', 'faq', 'contact', 'footer'],
  // Web systems and apps: screens instead of page sections.
  webapp: ['auth', 'onboarding', 'dashboard', 'appnav', 'table', 'detail', 'forms', 'settings', 'emptystate'],
  admin: ['auth', 'dashboard', 'appnav', 'table', 'detail', 'forms', 'charts', 'settings', 'notifications'],
  mobile: ['onboarding', 'auth', 'apphome', 'appnav', 'feed', 'detail', 'search', 'profile', 'notifications', 'settings'],
  'mobile-commerce': ['onboarding', 'auth', 'apphome', 'appnav', 'search', 'detail', 'checkout', 'profile'],
  booking: ['auth', 'apphome', 'search', 'detail', 'calendar', 'checkout', 'notifications', 'profile'],
};

/** Words that make a gallery query target the right platform. */
export const PLATFORM_PREFIX = { web: ['saas', 'web app', 'dashboard'], mobile: ['mobile app', 'ios app', 'app'] };

/**
 * Runs inside the page. Finds the region of each wanted section on the current page.
 * `specs` is [{id, rx, priceGrid}] (regex sources as strings). Returns {id: {y, h, label}}.
 */
export function findSectionsInPage(specs) {
  const vw = window.innerWidth;
  const sy = window.scrollY;
  const docH = document.documentElement.scrollHeight;
  const out = {};
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + sy, bottom: r.bottom + sy, h: r.height, w: r.width };
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  const wants = new Set(specs.map((s) => s.id));

  if (wants.has('navbar')) {
    // The top bar: whatever sits in the first ~200px across most of the width. Falls back to a fixed strip.
    const cands = [...document.querySelectorAll('header, nav, [role="banner"], [class*="header" i], [class*="navbar" i], [class*="nav-bar" i], [class*="menu" i], [id*="header" i]')]
      .filter(visible)
      .map((el) => ({ el, b: box(el) }))
      .filter(({ b }) => b.top < 200 && b.w > vw * 0.5 && b.h >= 28 && b.bottom < 340);
    const bottom = cands.length ? Math.max(...cands.map((c) => c.b.bottom)) : 96;
    out.navbar = { y: 0, h: Math.max(72, Math.min(bottom + 24, 340)), label: 'nav' };
  }

  if (wants.has('hero')) out.hero = { y: 0, h: Math.min(window.innerHeight, docH), label: 'viewport' };

  if (wants.has('footer')) {
    const f = [...document.querySelectorAll('footer, [role="contentinfo"], [class*="footer" i], [id*="footer" i]')]
      .filter(visible)
      .map((el) => ({ el, b: box(el) }))
      .filter(({ b }) => b.h > 80 && b.w > vw * 0.6 && b.top > window.innerHeight * 0.5 && b.bottom > docH - 400)
      .sort((a, b) => b.b.bottom - a.b.bottom || b.b.h - a.b.h)[0];
    if (f) out.footer = { y: Math.max(0, f.b.top), h: Math.min(f.b.h, 1300), label: 'footer' };
  }

  // Content blocks: full-width sections between the hero and the footer.
  const blockSel = 'main > *, section, article, [class*="section" i], [data-section], body > div > *, body > div > div > *, main > div > *';
  const blocks = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(blockSel)) {
    if (seen.has(el) || !visible(el)) continue;
    seen.add(el);
    const b = box(el);
    if (b.w < vw * 0.7 || b.h < 180 || b.h > 2600 || b.top < 120) continue;
    if (out.footer && b.top >= out.footer.y - 10) continue;
    const heading = el.querySelector('h1, h2, h3, [class*="title" i], [class*="heading" i]');
    const ht = (heading?.textContent || '').trim().slice(0, 140);
    const attrs = `${el.id} ${typeof el.className === 'string' ? el.className : ''} ${el.getAttribute('aria-label') || ''} ${el.dataset.section || ''}`;
    blocks.push({ el, b, ht, attrs: attrs.replace(/[-_]/g, ' '), text: (el.innerText || '').slice(0, 400) });
  }
  blocks.sort((a, b) => a.b.top - b.b.top);

  // Assign blocks in passes from strongest to weakest signal, across all sections at once,
  // so a "Reviews" heading goes to testimonials before a loose text match claims it for the catalog.
  const used = [];
  const overlaps = (b) => used.some((u) => !(b.bottom <= u.top + 40 || b.top >= u.bottom - 40));
  const pending = specs.filter((sp) => sp.rx && !out[sp.id]).map((sp) => ({ ...sp, re: new RegExp(`\\b(${sp.rx})`, 'i') }));
  const passes = [
    (sp, x) => sp.re.test(x.ht),
    (sp, x) => sp.re.test(x.attrs),
    (sp, x) => sp.priceGrid && (x.text.match(/[$€£]\s?\d|\d+[.,]\d{2}\s?(mxn|usd|eur)?/gi) || []).length >= 3,
  ];
  for (const test of passes) {
    for (const sp of pending) {
      if (out[sp.id]) continue;
      const hit = blocks.find((x) => !overlaps(x.b) && test(sp, x));
      if (hit) {
        used.push(hit.b);
        out[sp.id] = { y: Math.max(0, hit.b.top - 24), h: Math.min(hit.b.h + 48, 1500), label: hit.ht || hit.attrs.trim().slice(0, 60) };
      }
    }
  }
  return out;
}

/** Runs inside the page. Same-origin links whose text/href suggest a section page (about, shop…). */
export function findSectionLinksInPage(specs) {
  const out = {};
  const links = [...document.querySelectorAll('header a[href], nav a[href], footer a[href], a[href]')];
  for (const spec of specs) {
    if (!spec.link) continue;
    const rx = new RegExp(`(^|[/\\s-])(${spec.link})([/\\s-]|$)`, 'i');
    const a = links.find((l) => {
      try {
        const u = new URL(l.href, location.href);
        if (u.origin !== location.origin || u.pathname === location.pathname) return false;
        return rx.test(u.pathname.toLowerCase()) || rx.test(` ${(l.textContent || '').trim().toLowerCase()} `);
      } catch {
        return false;
      }
    });
    if (a) out[spec.id] = new URL(a.href, location.href).href.split('#')[0];
  }
  return out;
}

/**
 * Does a gallery card (title + tags) actually show this section, on the right platform?
 * Filters out whole landing pages under "footer", app screens under website sections,
 * and web dashboards when the project is a mobile app.
 */
export function cardMatchesSection(sectionId, card, platform = 'web') {
  const t = SECTION_TYPES[sectionId];
  const text = `${card.title || ''} ${card.tags || ''}`.toLowerCase();
  if (t?.kw && !new RegExp(`\\b(${t.kw})`, 'i').test(text)) return false;
  const mobile = /\b(mobile|ios|android|iphone|app design|app ui|tab ?bar|bottom nav|mobile app)\b/.test(text);
  const web = /\b(web|website|landing|saas|dashboard|desktop|web app|admin)\b/.test(text);
  const strongWeb = /\b(web|website|landing|saas|desktop|web app|admin panel|crm)\b/.test(text);
  if (platform === 'mobile') return !(web && !mobile) || /\bapp\b/.test(text);
  return !mobile || strongWeb;
}

/** Platform check only (for category galleries, where the category already guarantees the section). */
export function platformOk(card, platform = 'web') {
  const text = `${card.title || ''} ${card.tags || ''}`.toLowerCase();
  const mobile = /\b(mobile|ios|android|iphone|app design|app ui|tab ?bar|bottom nav|mobile app)\b/.test(text);
  const strongWeb = /\b(web|website|landing|saas|desktop|web app|dashboard|admin)\b/.test(text);
  return platform === 'mobile' ? !strongWeb || mobile : !mobile || strongWeb;
}

/** Dribbble queries that keep the industry in every search: the on-topic share of a harvest. */
export function industryQueries(sectionId, { platform = 'web', industry = '' } = {}) {
  const t = SECTION_TYPES[sectionId];
  if (!t || !industry) return [];
  if (!t.screen) return t.dribbble.map((x) => `${industry} ${x}`);
  const terms = platform === 'mobile' && t.mobileTerms ? t.mobileTerms : t.terms;
  const [p1] = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.web;
  return terms.map((x) => `${industry} ${p1} ${x}`);
}

/** Gallery queries for a section/screen on a platform, most specific first. */
export function sectionQueries(sectionId, { platform = 'web', industry = '' } = {}) {
  const t = SECTION_TYPES[sectionId];
  if (!t) return [];
  if (!t.screen) return [...(t.generic ? [] : [industry && `${industry} ${t.dribbble[0]}`]), ...t.dribbble].filter(Boolean);
  const terms = platform === 'mobile' && t.mobileTerms ? t.mobileTerms : t.terms;
  const [p1, p2] = PLATFORM_PREFIX[platform] || PLATFORM_PREFIX.web;
  return [industry && `${industry} ${p1} ${terms[0]}`, `${p1} ${terms[0]}`, `${p2} ${terms[0]}`, ...terms.slice(1).map((x) => `${p1} ${x}`), `${terms[0]} ui`].filter(Boolean);
}
