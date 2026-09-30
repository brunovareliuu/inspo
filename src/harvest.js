// Background "harvest": fill every requested section with N references from
// dedicated galleries, Dribbble and section crops of real, award-winning sites.
import { SOURCES, searchSources, scrapeWith } from './sources/index.js';
import { getContext, withProfile } from './browser.js';
import { downloadAsset } from './capture.js';
import { crawlSite } from './crawl.js';
import { SECTION_TYPES, GALLERY_PLATFORMS, cardMatchesSection, platformOk, sectionQueries, industryQueries } from './sections.js';
import { addItems, loadSession, updateSession, shortId } from './session.js';

const jobs = new Map();

async function mapLimit(list, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (i < list.length) {
        const idx = i++;
        await fn(list[idx], idx).catch(() => {});
      }
    }),
  );
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Download gallery cards and turn them into board items. */
export async function saveCards(sessionId, sourceId, cards, extra = {}) {
  const referer = (SOURCES[sourceId]?.home || '') + '/';
  const out = [];
  await mapLimit(cards, 6, async (c) => {
    const file = (await downloadAsset(sessionId, c.image, { referer })) || (c.fallbackImage && (await downloadAsset(sessionId, c.fallbackImage, { referer })));
    if (!file) return;
    out.push({
      kind: 'reference', source: sourceId, title: c.title?.trim() || SOURCES[sourceId]?.name || sourceId, url: c.url, liveUrl: c.liveUrl,
      image: file, video: c.video, author: c.author, tall: !!c.tall, ...extra,
    });
  });
  return out;
}

export function getJob(id) {
  return jobs.get(id);
}

/**
 * Start a harvest in the background. Returns immediately with the job; progress is written to
 * session.jobs[jobId] so the board can show it, and items stream into the board as they land.
 */
export async function startHarvest(sessionId, opts) {
  const s = await loadSession(sessionId);
  const sections = (opts.sections?.length ? opts.sections : (s.sections || []).map((x) => x.id)).filter((id) => SECTION_TYPES[id]);
  if (!sections.length) throw new Error('No sections to harvest. Set them with inspo_sections (or pass sections).');
  const job = {
    id: `h-${shortId()}`,
    status: 'running',
    startedAt: new Date().toISOString(),
    target: opts.target || 50,
    // With an industry query, at most this many per section come from outside it (generic galleries, Sites of the Day).
    offBudget: opts.query?.trim() ? Math.round((opts.target || 50) * OFF_TOPIC_SHARE) : opts.target || 50,
    sections,
    phase: 'galleries',
    sites: { done: 0, total: 0 },
    counts: {},
    topic: {},
    log: [],
    cancelled: false,
  };
  jobs.set(job.id, job);
  run(sessionId, job, opts).catch((err) => {
    job.status = 'error';
    job.error = err.message;
    persist(sessionId, job);
  });
  return job;
}

export function cancelJob(id) {
  const job = jobs.get(id);
  if (job && job.status === 'running') job.cancelled = true;
  return job;
}

let persistTimer = new Map();
function persist(sessionId, job, now = false) {
  const write = () =>
    updateSession(sessionId, (ss) => {
      ss.jobs = { ...(ss.jobs || {}), [job.id]: { ...job, cancelled: undefined, log: job.log.slice(-8) } };
    }).catch(() => {});
  clearTimeout(persistTimer.get(job.id));
  if (now) return write();
  persistTimer.set(job.id, setTimeout(write, 700));
}

async function recount(sessionId, job) {
  const s = await loadSession(sessionId);
  job.topic = {};
  for (const id of job.sections) {
    job.counts[id] = s.items.filter((i) => i.section === id).length;
    job.topic[id] = s.items.filter((i) => i.section === id && i.topic).length;
  }
  return s;
}

// Share of each section that may come from outside the project's industry: 10 of 50.
export const OFF_TOPIC_SHARE = 0.2;

const need = (job, id) => Math.max(0, job.target - (job.counts[id] || 0));
const hungry = (job) => job.sections.filter((id) => need(job, id) > 0);
const offTopic = (job, id) => (job.counts[id] || 0) - (job.topic[id] || 0);
/** How many generic (not industry-specific) references a section still takes. */
const roomOff = (job, id) => Math.min(need(job, id), Math.max(0, job.offBudget - offTopic(job, id)));

async function add(sessionId, job, items) {
  if (!items.length) return;
  const added = await addItems(sessionId, items);
  for (const it of added) {
    if (!it.section) continue;
    job.counts[it.section] = (job.counts[it.section] || 0) + 1;
    if (it.topic) job.topic[it.section] = (job.topic[it.section] || 0) + 1;
  }
  persist(sessionId, job);
}

async function run(sessionId, job, opts) {
  const query = (opts.query || '').trim();
  const lang = opts.language || 'en';
  const log = (m) => {
    job.log.push(`${new Date().toISOString().slice(11, 19)} ${m}`);
    persist(sessionId, job);
  };
  await recount(sessionId, job);
  persist(sessionId, job, true);
  const context = await getContext();

  const platform = opts.platform || 'web';
  // 1) Dedicated galleries (footer.design, navbar.gallery, saasinterface for app screens): exactly-right material, fast.
  job.phase = 'galleries';
  // Every category page that matches the section (maxibestof, Collect UI, Nicelydone, SaaS Interface), paginated.
  // `cap` limits what one gallery contributes, so a section isn't all from a single source.
  // Galleries aren't industry-specific, so they only fill the off-topic share unless `overflow`.
  const fromGalleries = async (id, cap, overflow = false) => {
    for (const [gallery, categories] of Object.entries(SECTION_TYPES[id].gal || {})) {
      if (!GALLERY_PLATFORMS[gallery]?.includes(platform)) continue;
      const start = job.counts[id] || 0;
      const room = () => Math.min(overflow ? need(job, id) : roomOff(job, id), cap - ((job.counts[id] || 0) - start));
      for (const category of categories) {
        let before = -1;
        for (let pageNo = 1; pageNo <= 6 && room() > 0 && !job.cancelled; pageNo++) {
          const r = await scrapeWith(context, gallery, '', { category, page: pageNo, limit: 60 }).catch(() => null);
          const cards = (r?.cards || []).filter((c) => platformOk(c, platform));
          if (!cards.length) break;
          await add(sessionId, job, await saveCards(sessionId, gallery, cards.slice(0, room()), { section: id, query: `${gallery}/${category}` }));
          if (job.counts[id] === before) break; // pagination not supported or nothing new: stop paging
          before = job.counts[id];
        }
      }
      if ((job.counts[id] || 0) > start) log(`${SOURCES[gallery].name}: ${job.counts[id]} ${id}`);
    }
  };
  await mapLimit(hungry(job), 2, (id) => fromGalleries(id, Math.ceil(job.target * 0.4)));

  // Dribbble searches, tagged on-topic when the query carries the industry.
  const dribbble = async (id, q, room) => {
    const want = room();
    if (!want || job.cancelled) return;
    const topic = !!query && q.startsWith(`${query} `);
    const r = await scrapeWith(context, 'dribbble', q, { limit: Math.min(90, want * 3 + 12) }).catch(() => null);
    const cards = (r?.cards || []).filter((c) => cardMatchesSection(id, c, platform));
    if (cards.length) await add(sessionId, job, await saveCards(sessionId, 'dribbble', cards.slice(0, room()), { section: id, query: q, ...(topic && { topic: true }) }));
  };

  // Off by default; enable with mobbin:true after inspo_login.
  if (opts.mobbin === true && job.sections.some((id) => SECTION_TYPES[id].screen)) {
    try {
      await withProfile(async (ctx) => {
        for (const id of hungry(job).filter((x) => SECTION_TYPES[x].screen)) {
          if (job.cancelled) break;
          const term = (platform === 'mobile' && SECTION_TYPES[id].mobileTerms?.[0]) || SECTION_TYPES[id].terms[0];
          if (!roomOff(job, id)) continue;
          const r = await scrapeWith(ctx, 'mobbin', term, { limit: Math.min(roomOff(job, id), 30), platform: platform === 'mobile' ? 'ios' : 'web' });
          await add(sessionId, job, await saveCards(sessionId, 'mobbin', r.cards, { section: id, query: `mobbin ${term}` }));
          log(`Mobbin “${term}”: ${job.counts[id]} ${id}`);
        }
      });
    } catch (err) {
      log(`Mobbin skipped (${String(err.message).split('\n')[0].slice(0, 70)})`);
    }
  }
  for (const id of hungry(job)) {
    for (const g of SECTION_TYPES[id].galleries || []) {
      if (job.cancelled || !roomOff(job, id)) break;
      try {
        const r = await scrapeWith(context, g, '', { limit: roomOff(job, id) + 10 });
        await add(sessionId, job, await saveCards(sessionId, g, r.cards.slice(0, roomOff(job, id)), { section: id, query: g }));
        log(`${SOURCES[g].name}: ${job.counts[id]} ${id}`);
      } catch (err) {
        log(`${g} failed: ${err.message}`);
      }
    }
  }

  // 2) One industry-flavoured Dribbble pass per section so the board has something everywhere early.
  job.phase = 'dribbble';
  await mapLimit(hungry(job), 3, async (id) => {
    if (job.cancelled) return;
    const q = industryQueries(id, { platform, industry: query })[0] || sectionQueries(id, { platform })[0];
    const early = Math.ceil(job.target * 0.4) + (job.counts[id] || 0);
    const room = () => Math.min(q.startsWith(`${query} `) ? need(job, id) : roomOff(job, id), Math.max(0, early - (job.counts[id] || 0)));
    await dribbble(id, q, room);
    log(`Dribbble “${q}”: ${job.counts[id]} ${id}`);
  });

  // 3) Real sites, cut into sections. The richest source: every site yields several sections.
  // (Page sections only: app screens live behind logins.)
  job.phase = 'sites';
  if (job.sections.some((id) => !SECTION_TYPES[id].screen)) {
    const pool = [];
    // Sites already crawled in earlier harvests only give back duplicates: skip them.
    const seenHosts = new Set((await loadSession(sessionId)).crawled || []);
    // `topic`: 'picked' (Claude chose it for this industry), 'search' (an industry search found it; the
    // crawl confirms it from the site's own title and headings) or false (Sites of the Day).
    const push = (u, why, topic) => {
      const h = host(u);
      if (!h || seenHosts.has(h) || /awwwards|siteinspire|dribbble|footer\.design|navbar\.gallery|webflow\.io$|framer\.(website|app)$/.test(h)) return;
      seenHosts.add(h);
      pool.push({ url: u, why, topic: topic || false });
    };
    (opts.sites || []).forEach((u) => push(u, 'picked by Claude', 'picked'));
    // Most precise first: the curated Awwwards category, then keyword searches (Awwwards' is loose).
    const poolQueries = [];
    if (opts.awwwardsCategory) poolQueries.push(['awwwards', '', { category: opts.awwwardsCategory }, 'search'], ['awwwards', '', { category: opts.awwwardsCategory, page: 2 }, 'search']);
    if (query) {
      poolQueries.push(['siteinspire', query, {}, 'search'], ['awwwards', query, { page: 1 }, 'search'], ['awwwards', query, { page: 2 }, 'search'], ['cssda', query, { page: 1 }, 'search']);
    }
    poolQueries.push(
      ['awwwards', '', { page: 1 }], ['awwwards', '', { page: 2 }], // Sites of the Day: generic but excellent
      ['cssda', '', { page: 1 }], ['cssda', '', { page: 2 }],
      ['wdi', '', { page: 1 }], ['darkmode', '', {}],
    );
    // Gather in parallel, then add in priority order (niche first, generic Sites of the Day last).
    const found = new Array(poolQueries.length);
    await mapLimit(poolQueries, 4, async ([src, q, o], idx) => {
      if (job.cancelled) return;
      found[idx] = (await scrapeWith(context, src, q, { limit: 70, ...o }).catch(() => null))?.cards || [];
    });
    poolQueries.forEach(([src, q, , topic], idx) => (found[idx] || []).forEach((c) => c.liveUrl && push(c.liveUrl, `${SOURCES[src].name}${q ? ` “${q}”` : ''}`, topic)));
    const s = await loadSession(sessionId);
    s.items.filter((i) => i.liveUrl && i.source !== 'live').forEach((i) => push(i.liveUrl, i.source, i.topic && 'search'));

    const maxSites = opts.maxSites || Math.max(40, Math.round(job.target * 1.5));
    const queue = pool.slice(0, maxSites);
    job.sites.total = queue.length;
    log(`${pool.length} live sites found, crawling up to ${queue.length}`);
    const pageHungry = () => hungry(job).filter((id) => !SECTION_TYPES[id].screen);
    // Words that show a site is in the industry, in any language (prefix match: restaurant → restaurants, restaurante).
    const words = (opts.topicWords?.length ? opts.topicWords : query.split(/\s+/)).map((w) => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
    const topicRx = words.length ? `\\b(${words.join('|')})` : undefined;
    // Sites outside the industry only fill sections that still have off-topic room.
    const room = (site, id) => (site.topic || !query ? need(job, id) : roomOff(job, id));
    await mapLimit(pageHungry().length ? queue : [], opts.concurrency || 4, async (site) => {
      if (job.cancelled || !pageHungry().length) return;
      const wanted = pageHungry().filter((id) => room(site, id) > 0);
      if (!wanted.length) return;
      try {
        const crawled = await withTimeout(crawlSite(sessionId, site.url, { sections: wanted, lang, why: site.why, topic: site.topic === 'search' ? topicRx : undefined }), 90_000);
        // A picked site is on-topic; a searched one only if the crawl confirmed it.
        const items = crawled.map((it) => ({ ...it, topic: !!query && (site.topic === 'picked' || !!it.topic) }));
        if (site.topic === 'search' && crawled.length && !crawled[0].topic) log(`${host(site.url)}: not “${query}”, counted as general`);
        // Never overshoot a section by much: keep what's still needed.
        const keep = items.filter((it) => (it.topic || !query ? need(job, it.section) : roomOff(job, it.section)) > 0).map(({ topic, ...it }) => (topic ? { ...it, topic } : it));
        await add(sessionId, job, keep);
      } catch (err) {
        log(`${host(site.url)} skipped (${err.message.split('\n')[0].slice(0, 60)})`);
      }
      job.sites.done++;
      await updateSession(sessionId, (ss) => {
        ss.crawled = [...new Set([...(ss.crawled || []), host(site.url)])];
      }).catch(() => {});
      persist(sessionId, job);
    });

  }

  // 4) Top up anything still short: the rest of the industry searches, then the generic share
  // (galleries without the cap, generic Dribbble queries).
  job.phase = 'top-up';
  for (const id of hungry(job)) for (const q of industryQueries(id, { platform, industry: query }).slice(1)) await dribbble(id, q, () => need(job, id));
  for (const id of hungry(job)) await fromGalleries(id, Infinity);
  for (const id of hungry(job)) for (const q of sectionQueries(id, { platform }).slice(1)) await dribbble(id, q, () => roomOff(job, id));
  // The industry ran dry: fill the rest with general references rather than leave the section short.
  if (query) {
    for (const id of hungry(job)) {
      log(`only ${job.topic[id] || 0} “${query}” references for ${id}; filling with general ones`);
      await fromGalleries(id, Infinity, true);
      for (const q of sectionQueries(id, { platform })) await dribbble(id, q, () => need(job, id));
    }
  }
  for (const id of job.sections) log(`top-up ${id}: ${job.counts[id]}${query ? ` (${job.topic[id] || 0} “${query}”)` : ''}`);

  job.phase = 'done';
  job.status = job.cancelled ? 'cancelled' : 'done';
  job.finishedAt = new Date().toISOString();
  await recount(sessionId, job);
  log(`done: ${job.sections.map((id) => `${id} ${job.counts[id]}`).join(' · ')}`);
  await persist(sessionId, job, true);
}

export { searchSources };
