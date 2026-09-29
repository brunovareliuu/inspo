import { getContext, withProfile, dismissOverlays } from '../browser.js';

/**
 * Each source knows how to build a search URL and pull cards out of the results page.
 * `extract` runs inside the page and must be self-contained (no closures).
 * Cards: { title, url, liveUrl?, image, video? }
 */
export const SOURCES = {
  awwwards: {
    name: 'Awwwards',
    home: 'https://www.awwwards.com',
    about: 'Award-winning websites. Best for bold, crafted, motion-heavy marketing sites.',
    url: (q, { page = 1, category } = {}) => {
      const pg = page > 1 ? `page=${page}` : '';
      if (category) return `https://www.awwwards.com/websites/${encodeURIComponent(category)}/${pg ? `?${pg}` : ''}`;
      if (q) return `https://www.awwwards.com/websites/?text=${encodeURIComponent(q)}${pg ? `&${pg}` : ''}`;
      return `https://www.awwwards.com/websites/sites_of_the_day/${pg ? `?${pg}` : ''}`;
    },
    extract: () =>
      [...document.querySelectorAll('.figure-rollover, figure')]
        .map((card) => {
          const img = card.querySelector('img');
          const a = card.querySelector('a[href*="/sites/"]');
          if (!img || !a) return null;
          const live = [...card.querySelectorAll('a[href^="http"]')].map((x) => x.href).find((h) => !h.includes('awwwards.com'));
          const src = img.currentSrc || img.src || img.dataset.src || '';
          return { title: img.alt, url: a.href, liveUrl: live, image: src.replace('/thumb_440_330/', '/thumb_880_660/'), fallbackImage: src };
        })
        .filter(Boolean),
  },
  dribbble: {
    name: 'Dribbble',
    home: 'https://dribbble.com',
    about: 'Design shots. Best for UI concepts, visual styles, illustration, motion teasers (not real sites).',
    url: (q) => (q ? `https://dribbble.com/search/${encodeURIComponent(q.trim().replace(/\s+/g, '-'))}` : 'https://dribbble.com/shots/popular/web-design'),
    extract: () =>
      [...document.querySelectorAll('li.shot-thumbnail, li[data-thumbnail-id]')]
        .map((li) => {
          const img = li.querySelector('img:not(noscript img)');
          if (!img) return null;
          const id = li.dataset.thumbnailId || li.id.replace(/\D/g, '');
          const set = (img.getAttribute('srcset') || img.dataset.srcset || '').split(',').map((s) => s.trim().split(' ')[0]).filter(Boolean);
          // Lazy shots only carry their real URL inside <noscript>.
          const ns = li.querySelector('noscript')?.textContent.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
          const src = img.currentSrc || img.getAttribute('src') || '';
          const best = set.find((s) => s.includes('800x600')) || set.at(-1) || (src && !src.startsWith('data:') ? src : null) || (ns && ns.replace(/resize=\d+x\d+/, 'resize=800x600'));
          const base = li.querySelector('[data-video-teaser-small]');
          const author = li.querySelector('.user-information .display-name, .display-name')?.textContent?.trim();
          const title = li.querySelector('.shot-title, [class*="shot-title"]')?.textContent?.trim() || (img.alt || '').split(/\s+/).slice(0, 9).join(' ');
          return { title, author, url: `https://dribbble.com/shots/${id}`, image: best, video: base?.dataset.videoTeaserSmall || undefined };
        })
        .filter((c) => c && c.image),
  },
  landbook: {
    name: 'Land-book',
    home: 'https://land-book.com',
    about: 'Curated full-page landing page screenshots. Best for full-page structure and section rhythm.',
    url: (q) => (q ? `https://land-book.com/?search=${encodeURIComponent(q)}` : 'https://land-book.com/'),
    extract: () =>
      [...document.querySelectorAll('a[href*="/websites/"]')]
        .map((a) => {
          const img = a.querySelector('img');
          if (!img) return null;
          return { title: (img.alt || '').split(' - ')[0].split(' | ')[0], url: a.href, image: img.currentSrc || img.src, tall: true };
        })
        .filter(Boolean),
  },
  onepagelove: {
    name: 'One Page Love',
    home: 'https://onepagelove.com',
    about: 'One-page sites and templates. Best for simple landing pages, portfolios, launches.',
    url: (q) => (q ? `https://onepagelove.com/?s=${encodeURIComponent(q)}` : 'https://onepagelove.com/'),
    extract: () =>
      [...document.querySelectorAll('a > img[alt*="Thumbnail"], a img[src*="onepagelove"]')]
        .map((img) => {
          const a = img.closest('a');
          if (!a || !a.href.includes('onepagelove.com/')) return null;
          const src = img.currentSrc || img.src;
          const title = img.alt.replace(/\s*Thumbnail Preview\s*/i, '');
          if (/no thumbnail/i.test(title)) return null;
          return { title, url: a.href, image: src.replace('width=420,height=560', 'width=840,height=1120') };
        })
        .filter(Boolean),
  },
  siteinspire: {
    name: 'Siteinspire',
    home: 'https://www.siteinspire.com',
    about: 'Refined, typographic, studio and portfolio sites. Best for restraint and editorial taste.',
    url: (q, { page = 1 } = {}) =>
      q ? `https://www.siteinspire.com/search?query=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}` : `https://www.siteinspire.com/websites${page > 1 ? `?page=${page}` : ''}`,
    extract: () =>
      [...document.querySelectorAll('.WebsiteCard, [class*="WebsiteCard"]')]
        .map((card) => {
          const img = card.querySelector('img');
          const a = card.querySelector('a[href*="/website/"]');
          if (!img || !a) return null;
          const live = [...card.querySelectorAll('a[href*="ref=siteinspire"]')][0]?.href?.replace(/[?&]ref=siteinspire/, '');
          return { title: img.alt, url: a.href, liveUrl: live, image: img.currentSrc || img.src };
        })
        .filter(Boolean),
  },
  lapa: {
    name: 'Lapa Ninja',
    home: 'https://www.lapa.ninja',
    about: 'Landing page gallery, strong on SaaS and startups.',
    url: (q) => (q ? `https://www.lapa.ninja/search/?q=${encodeURIComponent(q)}` : 'https://www.lapa.ninja/'),
    extract: () =>
      [...document.querySelectorAll('a[href*="/post/"]')]
        .map((a) => {
          const img = a.querySelector('img');
          if (!img) return null;
          return { title: img.alt, url: a.href, image: img.currentSrc || img.src || img.dataset.src };
        })
        .filter((c) => c && c.image),
  },
  footerdesign: {
    name: 'footer.design',
    home: 'https://www.footer.design',
    about: 'A gallery of nothing but website footers. Section: footer.',
    section: 'footer',
    url: () => 'https://www.footer.design/',
    extract: () =>
      [...document.querySelectorAll('a[href*="/sites/"] img, img[alt]')]
        .map((img) => {
          const a = img.closest('a[href*="/sites/"]');
          if (!a || img.getBoundingClientRect().width < 150) return null;
          const scope = a.parentElement?.parentElement || a.parentElement;
          const live = [...(scope?.querySelectorAll('a[href^="http"]') || [])].map((x) => x.href).find((h) => !/(^|\.)footer\.design$/.test(new URL(h).hostname));
          return { title: img.alt, url: a.href, liveUrl: live, image: img.currentSrc || img.src };
        })
        .filter(Boolean),
  },
  navbargallery: {
    name: 'Navbar Gallery',
    home: 'https://www.navbar.gallery',
    about: 'A gallery of website navigation bars. Section: navbar.',
    section: 'navbar',
    url: () => 'https://www.navbar.gallery/',
    extract: () =>
      [...document.querySelectorAll('img[alt]')]
        .map((img) => {
          if (img.getBoundingClientRect().width < 150 || /sponsor|mobbin/i.test(img.alt)) return null;
          const scope = img.closest('a, li, article, div')?.parentElement;
          const live = [...(scope?.querySelectorAll('a[href^="http"]') || [])].map((x) => x.href).find((h) => !/(^|\.)(navbar\.gallery|dub\.sh)$/.test(new URL(h).hostname));
          return { title: img.alt, url: live || location.href, liveUrl: live?.replace(/[?&]ref=navbar\.gallery/, ''), image: img.currentSrc || img.src };
        })
        .filter((c) => c && c.liveUrl),
  },
  mobbin: {
    name: 'Mobbin',
    home: 'https://mobbin.com',
    about: 'Real app screens and flows (iOS, Android, web). Requires a free/paid Mobbin login: run inspo_login first.',
    needsLogin: true,
    url: (q, { platform = 'web' } = {}) =>
      `https://mobbin.com/search/apps/${platform}?content_type=screens&sort=trending&q=${encodeURIComponent(q || '')}`,
    extract: () => {
      const out = [];
      for (const img of document.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        if (r.width < 140 || r.height < 140) continue;
        const a = img.closest('a');
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith('data:') || /avatar|logo|icon/i.test(src)) continue;
        out.push({ title: img.alt || a?.textContent?.trim()?.slice(0, 60) || 'Mobbin screen', url: a?.href || location.href, image: src });
      }
      return out;
    },
  },
};

export const SOURCE_IDS = Object.keys(SOURCES);

export async function scrapeWith(context, sourceId, query, { limit = 12, platform, page: pageNo = 1, category } = {}) {
  const src = SOURCES[sourceId];
  const page = await context.newPage();
  const url = src.url(query, { platform, page: pageNo, category });
  try {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      // Slow or flaky gallery: one more try, accepting whatever has rendered.
      await page.goto(url, { waitUntil: 'commit', timeout: 30000 });
      await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(2500);
    await dismissOverlays(page);
    if (src.needsLogin && /\/login|\/signup|sign in/i.test(page.url() + (await page.title()))) {
      throw new Error(`${src.name} needs a login. Run the inspo_login tool with source "${sourceId}" once.`);
    }
    // Scroll to trigger lazy loading / infinite scroll; deeper when more results are wanted.
    const scrolls = Math.min(16, Math.max(3, Math.ceil(limit / 8)));
    for (let i = 0; i < scrolls; i++) {
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(i < 3 ? 500 : 800);
    }
    let cards = await page.evaluate(src.extract);
    if (!cards.length) {
      // Background tabs may not render lazy grids: bring it forward and try again.
      await page.bringToFront().catch(() => {});
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(2500);
      cards = await page.evaluate(src.extract);
    }
    const seen = new Set();
    cards = cards.filter((c) => c.image && !c.image.startsWith('data:') && !seen.has(c.url) && seen.add(c.url));
    if (!cards.length && sourceId === 'mobbin') {
      throw new Error('Mobbin returned no screens (probably not logged in). Run inspo_login with source "mobbin".');
    }
    return { source: sourceId, url, cards: cards.slice(0, limit) };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Search several sources in parallel. Never throws; per-source errors are returned. */
export async function searchSources({ query, sources = ['awwwards', 'dribbble', 'landbook', 'siteinspire'], limit = 12, platform, page, category }) {
  const results = [];
  const walled = sources.filter((s) => SOURCES[s]?.needsLogin);
  const open = sources.filter((s) => SOURCES[s] && !SOURCES[s].needsLogin);
  const unknown = sources.filter((s) => !SOURCES[s]);
  unknown.forEach((s) => results.push({ source: s, error: `Unknown source. Known: ${SOURCE_IDS.join(', ')}`, cards: [] }));

  if (open.length) {
    const context = await getContext();
    const settled = await Promise.allSettled(open.map((s) => scrapeWith(context, s, query, { limit, platform, page, category })));
    settled.forEach((r, i) => results.push(r.status === 'fulfilled' ? r.value : { source: open[i], error: r.reason?.message, cards: [] }));
  }
  for (const s of walled) {
    try {
      results.push(await withProfile((ctx) => scrapeWith(ctx, s, query, { limit, platform })));
    } catch (err) {
      results.push({ source: s, error: err.message, cards: [] });
    }
  }
  return results;
}

/** Open a visible browser with the persistent profile so the user can log in once. */
export async function loginFlow(sourceId, { timeoutMs = 5 * 60_000 } = {}) {
  const src = SOURCES[sourceId];
  const start = src?.home || sourceId;
  return withProfile(
    async (context) => {
      const page = context.pages()[0] || (await context.newPage());
      await page.goto(start.startsWith('http') ? start : `https://${start}`).catch(() => {});
      await Promise.race([
        new Promise((r) => context.on('close', r)),
        new Promise((r) => page.on('close', r)),
        new Promise((r) => setTimeout(r, timeoutMs)),
      ]);
      return { ok: true };
    },
    { headless: false },
  );
}
