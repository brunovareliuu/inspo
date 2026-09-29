// Page sections inspo knows how to research: what they're called, how to spot them
// on a live site, which page to visit when they usually live on their own URL,
// and what to search for in galleries.

export const SECTION_TYPES = {
  navbar: {
    name: { en: 'Navbar', es: 'Navbar' },
    dribbble: ['website header navigation', 'website navbar', 'website menu navigation'],
    galleries: ['navbargallery'],
    generic: true, // industry words pull in app tab bars; keep these queries web-specific
  },
  hero: {
    name: { en: 'Hero', es: 'Hero' },
    dribbble: ['hero section', 'website hero', 'landing page hero'],
  },
  logos: {
    name: { en: 'Logos / social proof', es: 'Logos / prueba social' },
    rx: 'trusted by|used by|loved by|our clients|clients|partners|backed by|as seen|featured in|confían|clientes|aliados|marcas',
    dribbble: ['logo cloud section', 'trusted by section'],
  },
  features: {
    name: { en: 'Features', es: 'Features / beneficios' },
    rx: 'feature|benefit|why (us|choose)|what you get|capabilities|beneficios|características|por qué',
    dribbble: ['features section', 'feature section website'],
  },
  services: {
    name: { en: 'Services', es: 'Servicios' },
    rx: 'services|what we do|capabilities|expertise|servicios|qué hacemos',
    link: 'services|servicios|what-we-do',
    dribbble: ['services section website', 'agency services'],
  },
  catalog: {
    name: { en: 'Catalog / products', es: 'Catálogo / productos' },
    rx: 'shop|products?|collection|catalog|catalogue|store|menu|our (coffees|wines|beers)|tienda|productos|colecci|catálogo|menú|bestsellers?|new arrivals',
    link: 'shop|store|products|collections?|catalog|menu|tienda|productos|catalogo|coleccion',
    dribbble: ['product catalog website', 'ecommerce product grid', 'shop page design'],
    priceGrid: true,
  },
  work: {
    name: { en: 'Work / portfolio', es: 'Proyectos / portafolio' },
    rx: 'work|projects|portfolio|case stud|selected|proyectos|portafolio|trabajos',
    link: 'work|projects|portfolio|case-studies|proyectos|trabajo',
    dribbble: ['portfolio website projects', 'case study grid'],
  },
  about: {
    name: { en: 'About us', es: 'Nosotros' },
    rx: 'about|our story|who we are|mission|manifesto|our values|nosotros|quiénes somos|quienes somos|historia|misión|filosof',
    link: 'about|our-story|story|who-we-are|nosotros|quienes-somos|historia|acerca',
    dribbble: ['about us page', 'about us section', 'our story page'],
  },
  process: {
    name: { en: 'How it works', es: 'Cómo funciona' },
    rx: 'how it works|process|steps|how we work|cómo funciona|proceso|pasos',
    dribbble: ['how it works section', 'process steps website'],
  },
  stats: {
    name: { en: 'Stats', es: 'Números' },
    rx: 'in numbers|by the numbers|impact|results|números|cifras|impacto',
    dribbble: ['stats section website', 'numbers section'],
  },
  team: {
    name: { en: 'Team', es: 'Equipo' },
    rx: 'team|people|founders|meet the|equipo|fundadores|conoce a',
    link: 'team|people|equipo',
    dribbble: ['team section website', 'meet the team page'],
  },
  testimonials: {
    name: { en: 'Testimonials', es: 'Testimonios' },
    rx: 'testimonial|reviews?|what (people|our clients|customers) say|loved by|wall of love|opiniones|testimonios|reseñas|lo que dicen',
    dribbble: ['testimonials section', 'customer reviews section'],
  },
  pricing: {
    name: { en: 'Pricing', es: 'Precios' },
    rx: 'pricing|plans|price|subscribe|membership|precios|planes|suscripci',
    link: 'pricing|plans|precios|planes|subscribe|suscripcion',
    dribbble: ['pricing page', 'pricing section', 'subscription plans'],
  },
  faq: {
    name: { en: 'FAQ', es: 'Preguntas frecuentes' },
    rx: 'faq|frequently asked|questions|preguntas',
    link: 'faq|preguntas',
    dribbble: ['faq section', 'faq accordion website'],
  },
  blog: {
    name: { en: 'Blog / journal', es: 'Blog' },
    rx: 'blog|journal|news|stories|articles|insights|noticias|artículos',
    link: 'blog|journal|news|stories|noticias',
    dribbble: ['blog page design', 'journal website'],
  },
  cta: {
    name: { en: 'Call to action', es: 'Llamado a la acción' },
    rx: 'get started|start (your|now|today)|ready to|join|sign up|book a|empieza|únete|comienza|agenda',
    dribbble: ['cta section website', 'call to action section'],
  },
  newsletter: {
    name: { en: 'Newsletter', es: 'Newsletter' },
    rx: 'newsletter|subscribe to|stay in the loop|sign up for|suscríbete|boletín',
    dribbble: ['newsletter section website'],
  },
  contact: {
    name: { en: 'Contact', es: 'Contacto' },
    rx: 'contact|get in touch|say hello|let.?s talk|write to us|contacto|contáctanos|escríbenos|hablemos',
    link: 'contact|contacto|get-in-touch',
    dribbble: ['contact page design', 'contact form website'],
  },
  footer: {
    name: { en: 'Footer', es: 'Footer' },
    dribbble: ['website footer', 'footer design website', 'footer section'],
    galleries: ['footerdesign'],
    generic: true,
  },
};

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
};

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
      .filter(({ b }) => b.h > 80 && b.w > vw * 0.6 && b.top > window.innerHeight * 0.5)
      .sort((a, b) => b.b.bottom - a.b.bottom || b.b.h - a.b.h)[0];
    if (f) out.footer = { y: Math.max(0, f.b.top), h: Math.min(f.b.h, 1300), label: 'footer' };
    else if (docH > 1400) out.footer = { y: docH - 560, h: 560, label: 'page bottom' };
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
    (sp, x) => sp.re.test(x.text.slice(0, 120)),
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
