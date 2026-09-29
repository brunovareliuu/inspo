import path from 'node:path';
import fs from 'node:fs/promises';
import { getContext, dismissOverlays, autoScroll, killPopups } from './browser.js';
import { analyzeInPage } from './capture.js';
import { assetsDir, shortId } from './session.js';
import { SECTION_TYPES, findSectionsInPage, findSectionLinksInPage, sectionName } from './sections.js';

const WIDTH = 1440;

const specFor = (ids) =>
  ids.filter((id) => SECTION_TYPES[id]).map((id) => ({ id, rx: SECTION_TYPES[id].rx, link: SECTION_TYPES[id].link, priceGrid: !!SECTION_TYPES[id].priceGrid }));

/** Brand name, not the SEO title: og:site_name, else the shortest title segment, else the domain. */
async function siteName(page, url) {
  const { og, title } = await page
    .evaluate(() => ({ og: document.querySelector('meta[property="og:site_name"]')?.content || '', title: document.title || '' }))
    .catch(() => ({ og: '', title: '' }));
  if (og.trim() && og.length <= 40) return og.trim();
  const parts = title.split(/\s[|–—·:-]\s/).map((x) => x.trim()).filter(Boolean);
  const short = parts.sort((a, b) => a.length - b.length)[0];
  if (short && short.length <= 32) return short;
  const host = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  return host.charAt(0).toUpperCase() + host.slice(1);
}

async function open(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
  await page.waitForTimeout(1500); // preloaders and intro animations
  await dismissOverlays(page);
  await killPopups(page);
}

/** Screenshot a page region; drop near-empty crops (blank animated sections, loaders). */
async function shoot(page, sessionId, clip, name, minDensity = 0.016) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 74, fullPage: clip.y > 0 || clip.height > 900, clip }).catch(() => null);
  if (!buf || buf.length / (clip.width * clip.height) < minDensity) return null;
  const file = `${name}.jpg`;
  await fs.writeFile(path.join(assetsDir(sessionId), file), buf);
  return `assets/${file}`;
}

/**
 * Visit a live site and cut it into section references (navbar, hero, footer, about…).
 * Sections that usually live on their own page (about, shop, pricing…) are followed from the nav.
 * Returns reference items tagged with `section`.
 */
export async function crawlSite(sessionId, url, { sections, subpages = true, maxSubpages = 2, lang = 'en', why } = {}) {
  const context = await getContext();
  const page = await context.newPage();
  const items = [];
  const base = shortId();
  try {
    await open(page, url);
    const home = page.url();
    const title = await siteName(page, home);
    const specs = specFor(sections);
    const docH = () => page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);

    // Hero first, exactly as a visitor lands on it (minus the discount popup).
    await page.waitForTimeout(600);
    await killPopups(page);
    if (sections.includes('hero')) {
      const img = await shoot(page, sessionId, { x: 0, y: 0, width: WIDTH, height: 900 }, `${base}-hero`);
      if (img) items.push({ section: 'hero', image: img });
    }

    // Scroll through once so lazy images and reveal-on-scroll content are rendered, then locate sections.
    await autoScroll(page, { maxPx: 12000, step: 800, delay: 110 });
    await killPopups(page); // many popups show up after a delay or on scroll
    const found = await page.evaluate(findSectionsInPage, specs).catch(() => ({}));
    const H = await docH();
    for (const [id, r] of Object.entries(found)) {
      if (id === 'hero') continue;
      const y = Math.max(0, Math.min(r.y, H - 60));
      const h = Math.max(60, Math.min(r.h, H - y));
      // Navbars are thin, mostly-empty strips by nature: only reject them when truly blank.
      const img = await shoot(page, sessionId, { x: 0, y, width: WIDTH, height: h }, `${base}-${id}`, id === 'navbar' ? 0.004 : 0.016);
      if (img) items.push({ section: id, image: img, label: r.label });
    }
    const analysis = await page.evaluate(analyzeInPage).catch(() => null);

    // Sections that weren't on the homepage but have their own page.
    if (subpages) {
      const missing = specs.filter((s) => s.link && !found[s.id]);
      const links = missing.length ? await page.evaluate(findSectionLinksInPage, missing).catch(() => ({})) : {};
      for (const [id, link] of Object.entries(links).slice(0, maxSubpages)) {
        try {
          await open(page, link);
          await autoScroll(page, { maxPx: 2400, step: 800, delay: 110 });
          const h = Math.min(1500, await docH());
          const img = await shoot(page, sessionId, { x: 0, y: 0, width: WIDTH, height: Math.max(700, h) }, `${base}-${id}-page`);
          if (img) items.push({ section: id, image: img, subpage: link });
        } catch {
          /* dead link or slow page: skip */
        }
      }
    }

    return items.map((it) => ({
      id: `r-${shortId()}`,
      kind: 'reference',
      source: 'live',
      section: it.section,
      title: `${title} — ${sectionName(it.section, lang)}${it.subpage ? ' (page)' : ''}`,
      site: title,
      url: it.subpage || home,
      liveUrl: home,
      image: it.image,
      crop: true,
      note: why,
      analysis: it.section === 'hero' || items.length === 1 ? analysis : undefined,
    }));
  } finally {
    await page.close().catch(() => {});
  }
}
