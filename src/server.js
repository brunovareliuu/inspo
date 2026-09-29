#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  SESSIONS_DIR, createSession, loadSession, updateSession, addItems, loadFeedback, listSessions,
  sessionDir, assetsDir, slugify, shortId, removeItems,
} from './session.js';
import { SOURCES, SOURCE_IDS, searchSources, loginFlow } from './sources/index.js';
import { captureSite, analyzeUrl, downloadAsset, fetchImages, searchImages, downloadImages, jpegCopy } from './capture.js';
import { listLibrary } from './components.js';
import { summarizeFeedback, effectivePlan } from './feedback.js';
import { startBoard, boardUrl, openInBrowser } from './board/server.js';
import { closeBrowser } from './browser.js';
import { STYLE_PRESETS, resolveStyle } from './styles/presets.js';
import { renderSpecimen } from './styles/specimen.js';
import { SECTION_TYPES, SECTION_IDS, RECOMMENDED, sectionName, cardMatchesSection } from './sections.js';
import { startHarvest, cancelJob, getJob } from './harvest.js';
import { contactSheets } from './review.js';

const VERSION = '0.4.0';
const server = new McpServer({ name: 'inspo', version: VERSION });

const text = (t) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: 'text', text: `Error: ${err?.message || err}` }] });
const sessionArg = z.string().optional().describe('Session id. Defaults to the most recent session in this project.');
const sectionEnum = z.enum(SECTION_IDS);
const sectionsInput = z
  .array(z.object({ id: sectionEnum, why: z.string().optional().describe('Why this page needs it (user\'s language).'), notes: z.string().optional() }))
  .describe('Page sections to research, in page order. Agree on them with the user first (see inspo_sections).');
const sectionMeta = (list, lang) => list.map((x) => ({ ...x, name: sectionName(x.id, lang) }));

async function withSession(id) {
  return loadSession(id);
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (i < list.length) {
        const idx = i++;
        out[idx] = await fn(list[idx], idx).catch((err) => ({ error: err.message }));
      }
    }),
  );
  return out;
}

// ─── Session ────────────────────────────────────────────────────────────────

server.registerTool(
  'inspo_start',
  {
    title: 'Start a design research session',
    description:
      'Start a new design-research session for a website/app idea. Creates <project>/.inspo/<id>/ where screenshots and votes live, and starts the local voting board. Call this first, after you have analyzed the idea and (if any) the existing app.',
    inputSchema: {
      idea: z.string().describe('The idea in the user\'s words, plus your one-paragraph read of it (product, audience, tone).'),
      title: z.string().optional().describe('Short project name, e.g. "Tueste coffee club".'),
      context: z
        .object({
          audience: z.string().optional(),
          goals: z.array(z.string()).optional(),
          constraints: z.array(z.string()).optional().describe('Brand colors to keep, stack, accessibility, etc.'),
          existingApp: z.string().optional().describe('Summary of the current app/codebase design if there is one.'),
          keywords: z.array(z.string()).optional().describe('Search keywords you plan to use.'),
          language: z.string().optional().describe('Language for copy, e.g. "es-MX".'),
          projectType: z.enum(['website', 'webapp', 'mobile']).optional().describe('website = marketing site/landing; webapp = web system, SaaS, dashboard, admin panel; mobile = iOS/Android app. Decides page sections vs app screens, gallery platform, and how styles are rendered.'),
        })
        .optional(),
      copy: z
        .object({
          brand: z.string().optional(),
          headline: z.string().optional(),
          subheadline: z.string().optional(),
          cta: z.string().optional(),
          secondaryCta: z.string().optional(),
          nav: z.array(z.string()).optional(),
          features: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
          stats: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
          quote: z.object({ text: z.string(), author: z.string().optional() }).optional(),
          app: z
            .object({
              name: z.string().optional(),
              nav: z.array(z.string()).optional(),
              pageTitle: z.string().optional(),
              kpis: z.array(z.object({ label: z.string(), value: z.string(), delta: z.string().optional() })).optional(),
              tableTitle: z.string().optional(),
              columns: z.array(z.string()).optional(),
              rows: z.array(z.array(z.string())).optional(),
              userName: z.string().optional(),
              cta: z.string().optional(),
              emptyState: z.string().optional(),
            })
            .optional()
            .describe('For web systems and apps: realistic product data used to render app style specimens (dashboard / phone screens).'),
        })
        .optional()
        .describe('Real draft copy for the product (in the user\'s language). Used to render every style specimen.'),
      sections: sectionsInput.optional(),
    },
  },
  async ({ idea, title, context, copy, sections }) => {
    try {
      const s = await createSession({ idea, title, context: context || {}, copy: copy || null, sections: sectionMeta(sections || [], context?.language) });
      const board = await startBoard();
      return text({
        session: s.id,
        folder: sessionDir(s.id),
        board: boardUrl(board.url, s.id),
        sources: Object.fromEntries(SOURCE_IDS.map((k) => [k, SOURCES[k].about])),
        stylePresets: STYLE_PRESETS.map((p) => `${p.id} — ${p.name}: ${p.vibe}`),
        sections: s.sections,
        next: s.sections.length
          ? 'inspo_harvest (≈50 refs per section, runs in background) → inspo_open right away so the user watches it fill → inspo_add_styles + components meanwhile.'
          : 'Agree on sections first (inspo_sections), then inspo_harvest.',
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_catalog',
  {
    title: 'List sessions, sources, style presets and 3D/motion components',
    description: 'Everything inspo can offer: past sessions in this project, scrape sources, style presets (with palettes/fonts), and the built-in live component library (3D/WebGL, motion, text, cursor, layout).',
    inputSchema: {},
  },
  async () => {
    try {
      const lib = await listLibrary();
      return text({
        sessionsDir: SESSIONS_DIR,
        sessions: await listSessions(),
        sources: Object.fromEntries(SOURCE_IDS.map((k) => [k, { name: SOURCES[k].name, about: SOURCES[k].about, needsLogin: !!SOURCES[k].needsLogin }])),
        stylePresets: STYLE_PRESETS.map(({ id, name, vibe, description, palette, fonts, layout, goodFor }) => ({ id, name, vibe, description, palette, fonts, layout, goodFor })),
        components: lib.map(({ id, name, category, tags, description }) => ({ id, name, category, tags, description })),
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_sections',
  {
    title: 'Page sections: recommend or set',
    description:
      'Without `sections`: returns every website section and app screen inspo can research, plus recommended sets per project type (websites: landing, ecommerce, restaurant, studio, saas, portfolio, services; web systems: webapp, admin; apps: mobile, mobile-commerce, booking), to help you recommend them to the user. Mix freely (e.g. a SaaS marketing site + its dashboard). With `sections`: sets the session\'s section plan (page order), replacing the previous one.',
    inputSchema: { session: sessionArg, sections: sectionsInput.optional() },
  },
  async ({ session, sections }) => {
    try {
      if (!sections) {
        return text({
          sections: Object.fromEntries(SECTION_IDS.filter((id) => !SECTION_TYPES[id].screen).map((id) => [id, { en: SECTION_TYPES[id].name.en, es: SECTION_TYPES[id].name.es, ownPage: !!SECTION_TYPES[id].link }])),
          screens: Object.fromEntries(SECTION_IDS.filter((id) => SECTION_TYPES[id].screen).map((id) => [id, { en: SECTION_TYPES[id].name.en, es: SECTION_TYPES[id].name.es }])),
          recommended: RECOMMENDED,
          tip: 'Recommend a set for this idea with a one-line why each, mark optional ones, and let the user add/remove before setting them.',
        });
      }
      const s = await withSession(session);
      const out = await updateSession(s.id, (ss) => {
        ss.sections = sectionMeta(sections, ss.context?.language);
        return ss.sections;
      });
      return text({ sections: out });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_harvest',
  {
    title: 'Harvest ~50 references per section (background)',
    description:
      'Fill every section or app screen with N references (default 50). App screens (dashboard, tables, settings, login, onboarding, tab bar…) come from SaaS Interface, Mobbin (if logged in) and Dribbble filtered by platform. Website sections come from dedicated galleries (footer.design, navbar.gallery), Dribbble, and — the richest source — real award-winning sites (Awwwards, Siteinspire, plus `sites` you pick) automatically cut into sections: navbar, hero, about, catalog, footer… following links to /about, /shop, /pricing when a section lives on its own page. Runs in the background (several minutes) and streams into the board; returns immediately. Check with inspo_status.',
    inputSchema: {
      session: sessionArg,
      query: z.string().optional().describe('Industry keywords in English, 1-2 words (e.g. "coffee", "fintech", "architecture"). Used on Awwwards, Siteinspire and Dribbble.'),
      target: z.number().int().min(5).max(150).optional().describe('References per section. Default 50.'),
      sections: z.array(sectionEnum).optional().describe('Subset of the session sections. Default: all.'),
      sites: z.array(z.string().url()).optional().describe('Live sites you know are excellent for this niche/vibe. Crawled first.'),
      awwwardsCategory: z.string().optional().describe('Awwwards category slug, e.g. "food-drink", "fashion", "architecture", "e-commerce", "technology", "real-estate".'),
      maxSites: z.number().int().min(2).max(200).optional().describe('Cap on live sites crawled. Default max(40, 1.5 × target).'),
      platform: z.enum(['web', 'mobile']).optional().describe('Platform for app screens. Default: mobile when the project type is mobile, else web.'),
    },
  },
  async ({ session, query, target = 50, sections, sites, awwwardsCategory, maxSites, platform }) => {
    try {
      const s = await withSession(session);
      const pf = platform || (s.context?.projectType === 'mobile' ? 'mobile' : 'web');
      const job = await startHarvest(s.id, { query, target, sections, sites, awwwardsCategory, maxSites, platform: pf, language: s.context?.language });
      const b = await startBoard();
      return text({
        job: job.id,
        sections: job.sections,
        target,
        board: boardUrl(b.url, s.id, 'references'),
        note: 'Running in the background. Open the board now so the user watches it fill; call inspo_status for progress. Meanwhile, add styles and components.',
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_status',
  {
    title: 'Harvest progress',
    description: 'Progress of harvest jobs: references per section vs target, sites crawled, phase, recent log. Pass cancel:true to stop the running job.',
    inputSchema: { session: sessionArg, cancel: z.boolean().optional() },
  },
  async ({ session, cancel }) => {
    try {
      const s = await withSession(session);
      const jobs = Object.values(s.jobs || {}).sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
      const live = jobs[0] && getJob(jobs[0].id);
      if (cancel && live) cancelJob(live.id);
      const counts = Object.fromEntries((s.sections || []).map((x) => [x.id, s.items.filter((i) => i.section === x.id).length]));
      return text({ job: live ? { ...live, cancelled: undefined, log: live.log.slice(-8) } : jobs[0] || null, countsBySection: counts, totalItems: s.items.length });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_review',
  {
    title: 'Check a section visually (contact sheets)',
    description:
      'Returns numbered contact sheets of a section\'s references so you can SEE them and verify each one really is that section (a footer is a footer, testimonials are testimonials — not a whole landing page, an app screen or an ad). Then inspo_remove the wrong ids (they are blocked for good) and run inspo_harvest again to refill. By default returns references not reviewed yet, 24 per call (2 sheets); call again for the next batch.',
    inputSchema: {
      session: sessionArg,
      section: sectionEnum,
      limit: z.number().int().min(4).max(48).optional().describe('Default 24.'),
      all: z.boolean().optional().describe('Include already-reviewed items.'),
    },
  },
  async ({ session, section, limit = 24, all }) => {
    try {
      const s = await withSession(session);
      const pool = s.items.filter((i) => i.kind === 'reference' && i.section === section && (all || !i.reviewed));
      const batch = pool.slice(0, limit);
      if (!batch.length) return text({ section, remaining: 0, note: 'Everything in this section has been reviewed.' });
      const b = await startBoard();
      const sheets = await contactSheets({ boardUrl: b.url, sessionId: s.id, items: batch, title: `${sectionName(section, s.context?.language)} — ${s.title}` });
      const ids = new Set(batch.map((i) => i.id));
      await updateSession(s.id, (ss) => ss.items.forEach((i) => ids.has(i.id) && (i.reviewed = true)));
      const content = [{
        type: 'text',
        text: JSON.stringify({
          section,
          question: `Which of these are NOT a ${section} section? Remove them with inspo_remove.`,
          labels: batch.map((it, i) => `#${i + 1} ${it.id} · ${it.source} · ${it.title}`),
          remainingAfterThis: pool.length - batch.length,
        }, null, 1),
      }];
      for (const sh of sheets) content.push({ type: 'image', data: sh.buffer.toString('base64'), mimeType: 'image/jpeg' });
      return { content };
    } catch (err) {
      return fail(err);
    }
  },
);

// ─── Research ───────────────────────────────────────────────────────────────

server.registerTool(
  'inspo_search',
  {
    title: 'Search inspiration galleries',
    description:
      'Search Awwwards, Dribbble, Land-book, One Page Love, Siteinspire, Lapa Ninja and Mobbin for a query, download the thumbnails and add them to the board. Run it several times with different, specific queries (industry, vibe, section type: "fintech dark 3d", "coffee editorial", "pricing page"). Optionally screenshot the live sites of the top results.',
    inputSchema: {
      session: sessionArg,
      query: z.string().describe('Short search query in English. Galleries match on titles/tags, so 1-3 words work best.'),
      sources: z.array(z.enum(SOURCE_IDS)).optional().describe('Default: awwwards, dribbble, landbook, siteinspire, onepagelove.'),
      limit: z.number().int().min(1).max(80).optional().describe('Max results per source (default 8).'),
      platform: z.enum(['web', 'ios', 'android']).optional().describe('Mobbin only. Default web.'),
      captureLive: z.number().int().min(0).max(10).optional().describe('Also screenshot + analyze the live site of the first N results that link to one (default 0; each takes ~10s).'),
      section: sectionEnum.optional().describe('Tag results as references for this page section.'),
    },
  },
  async ({ session, query, sources, limit = 8, platform, captureLive = 0, section }) => {
    try {
      const s = await withSession(session);
      const results = await searchSources({ query, sources: sources || ['awwwards', 'dribbble', 'landbook', 'siteinspire', 'onepagelove'], limit, platform });
      const report = {};
      const toAdd = [];
      for (const r of results) {
        if (r.error) {
          report[r.source] = { error: r.error };
          continue;
        }
        if (section && r.source === 'dribbble') r.cards = r.cards.filter((c) => cardMatchesSection(section, c, s.context?.projectType === 'mobile' ? 'mobile' : 'web'));
        const saved = await mapLimit(r.cards, 6, async (c) => {
          const file = (await downloadAsset(s.id, c.image, { referer: SOURCES[r.source].home + '/' })) || (c.fallbackImage && (await downloadAsset(s.id, c.fallbackImage, { referer: SOURCES[r.source].home + '/' })));
          if (!file) return null;
          return {
            kind: 'reference', source: r.source, title: c.title?.trim() || SOURCES[r.source].name, url: c.url, liveUrl: c.liveUrl,
            image: file, video: c.video, author: c.author, tall: !!c.tall, query, section,
          };
        });
        const ok = saved.filter((x) => x && !x.error);
        toAdd.push(...ok);
        report[r.source] = { found: r.cards.length, saved: ok.length };
      }
      const added = await addItems(s.id, toAdd);

      let live = [];
      if (captureLive > 0) {
        const targets = added.filter((i) => i.liveUrl).slice(0, captureLive);
        live = await mapLimit(targets, 3, async (item) => {
          const cap = await captureSite(s.id, item.liveUrl);
          await updateSession(s.id, (ss) => {
            const it = ss.items.find((x) => x.id === item.id);
            if (it) Object.assign(it, { liveImage: cap.image, fullImage: cap.fullImage, analysis: cap.analysis });
          });
          return { title: item.title, url: item.liveUrl, fonts: cap.analysis?.fonts?.map((f) => f.family), tech: cap.analysis?.tech };
        });
      }
      return text({
        query,
        added: added.length,
        bySource: report,
        items: added.map((i) => `${i.id} · ${i.source} · ${i.title}${i.liveUrl ? ` → ${i.liveUrl}` : ''}`),
        liveCaptures: live,
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_capture',
  {
    title: 'Screenshot and analyze live websites',
    description:
      'Screenshot specific live websites (hero + full page) and extract their design DNA: fonts, color palette, radii, type scale and tech (three.js, GSAP, Lenis, Webflow, Framer, Spline...). Use it for great references you already know for this niche (e.g. stripe.com, linear.app, a competitor) and for Awwwards winners found by inspo_search.',
    inputSchema: {
      session: sessionArg,
      urls: z.array(z.string().url()).min(1).max(12),
      why: z.string().optional().describe('Why these were picked; shown on the cards.'),
      mobile: z.boolean().optional().describe('Capture at iPhone size instead of desktop.'),
      section: sectionEnum.optional().describe('Tag the captures as references for this section.'),
    },
  },
  async ({ session, urls, why, mobile, section }) => {
    try {
      const s = await withSession(session);
      const caps = await mapLimit(urls, 3, (u) => captureSite(s.id, u, { mobile }));
      const ok = caps.filter((c) => c && !c.error).map((c) => ({ ...c, note: why, section }));
      await addItems(s.id, ok);
      return text({
        captured: ok.length,
        failed: urls.filter((_, i) => caps[i]?.error).map((u, i) => ({ url: u, error: caps[i]?.error })),
        sites: ok.map((c) => ({
          id: c.id, title: c.title, url: c.url,
          fonts: c.analysis?.fonts?.map((f) => `${f.family} (${f.role})`),
          colors: c.analysis?.colors, radii: c.analysis?.radii, tech: c.analysis?.tech,
        })),
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_analyze',
  {
    title: 'Look at a website or running app',
    description:
      'Open a URL (including http://localhost for the user\'s running app), return a screenshot you can see plus its fonts, colors, radii, type scale and tech. Use it to understand the current app before proposing directions. Does not add anything to the board.',
    inputSchema: { url: z.string().url() },
  },
  async ({ url }) => {
    try {
      const r = await analyzeUrl(url);
      return {
        content: [
          { type: 'image', data: Buffer.from(r.screenshot).toString('base64'), mimeType: 'image/jpeg' },
          { type: 'text', text: JSON.stringify({ url: r.url, ...r.analysis }, null, 2) },
        ],
      };
    } catch (err) {
      return fail(err);
    }
  },
);

// ─── Styles & components ────────────────────────────────────────────────────

const styleInput = z.object({
  preset: z.string().optional().describe('A preset id from inspo_catalog to start from.'),
  name: z.string().optional(),
  description: z.string().optional().describe('Why this direction fits the idea (1-2 sentences, user\'s language).'),
  vibe: z.string().optional(),
  palette: z.record(z.string(), z.string()).optional().describe('Overrides: bg, surface, fg, muted, accent, accent2, border.'),
  fonts: z.record(z.string(), z.string()).optional().describe('Google Fonts families: display, body, mono.'),
  layout: z.enum(['split', 'centered', 'editorial', 'bento', 'fullbleed', 'poster']).optional(),
  radius: z.string().optional(),
  imageQuery: z.string().optional().describe('Openverse image search for this direction\'s moodboard/specimen images (English, 2-4 words).'),
  imageTreatment: z.enum(['none', 'grayscale', 'duotone', 'grain', 'blur-glow', 'high-contrast']).optional(),
  texture: z.enum(['none', 'grain', 'grid', 'dots', 'noise-gradient', 'scanlines']).optional(),
  html: z.string().optional().describe('Optional fully custom specimen HTML (standalone document). Use for a direction the presets cannot express.'),
  surface: z.enum(['landing', 'web-app', 'mobile-app']).optional().describe('What to render the style on. Default follows the project type: website → landing, webapp → web-app (dashboard), mobile → mobile-app (phone screens).'),
});

server.registerTool(
  'inspo_add_styles',
  {
    title: 'Propose visual style directions',
    description:
      'Add 3-6 visual STYLE directions to the board. For each one inspo fetches real CC-licensed photos (Openverse), and renders the user\'s own product in that style — a landing page for websites, a dashboard for web systems, three phone screens for mobile apps — (palette, fonts, layout, image treatment, texture) as a live specimen they can vote on. Start from presets and override palette/fonts to fit the brand, or pass custom html.',
    inputSchema: {
      session: sessionArg,
      styles: z.array(styleInput).min(1).max(16),
      imageSubject: z.string().optional().describe('What the photos should show, in English, e.g. "coffee beans roastery". Combined with each style\'s imageQuery.'),
      imagesPerStyle: z.number().int().min(0).max(8).optional().describe('Default 5.'),
      copy: z.record(z.string(), z.any()).optional().describe('Override the session copy for these specimens.'),
    },
  },
  async ({ session, styles, imageSubject, imagesPerStyle = 5, copy }) => {
    try {
      const s = await withSession(session);
      const baseCopy = { brand: s.title, headline: s.idea.split(/[.!?\n]/)[0].slice(0, 90), ...(s.copy || {}), ...(copy || {}) };
      await fs.mkdir(path.join(sessionDir(s.id), 'styles'), { recursive: true });

      // One shared pool of on-subject photos, dealt out so styles don't all show the same shot.
      let pool = [];
      if (imageSubject && imagesPerStyle > 0) {
        const pages = await Promise.all([1, 2, 3].map((page) => searchImages(imageSubject, { count: 20, page, mustMatch: imageSubject }).catch(() => [])));
        pool = pages.flat().filter((im, i, a) => a.findIndex((x) => x.src === im.src) === i);
      }
      const used = new Set();

      const built = await mapLimit(styles, 3, async (input, idx) => {
        const style = resolveStyle(input);
        style.id = `${slugify(style.name || style.id, 30)}-${shortId(4)}`;
        let images = [];
        if (imagesPerStyle > 0 && !input.html) {
          // 1-2 photos with this style's mood (still on-subject), then fill from the shared pool.
          const moodQuery = input.imageQuery || style.imageQuery;
          if (moodQuery) {
            const q = imageSubject ? `${imageSubject} ${moodQuery.split(/\s+/)[0]}` : moodQuery;
            const mood = (await searchImages(q, { count: 6, mustMatch: imageSubject }).catch(() => [])).filter((im) => !used.has(im.src));
            mood.slice(0, 4).forEach((im) => used.add(im.src));
            images.push(...(await downloadImages(s.id, mood.slice(0, 4), Math.min(2, imagesPerStyle))));
          }
          const start = (idx * imagesPerStyle) % Math.max(pool.length, 1);
          const rotated = [...pool.slice(start), ...pool.slice(0, start)];
          const fresh = rotated.filter((im) => !used.has(im.src));
          const candidates = [...fresh, ...rotated.filter((im) => used.has(im.src))];
          const need = imagesPerStyle - images.length;
          candidates.slice(0, need + 3).forEach((im) => used.add(im.src));
          images.push(...(await downloadImages(s.id, candidates.slice(0, need + 3), need)));
          if (!images.length && moodQuery) images.push(...(await fetchImages(s.id, moodQuery, { count: imagesPerStyle })));
        }
        const served = images.map((im) => ({ ...im, src: `/s/${s.id}/${im.src}` }));
        const surface = input.surface || { webapp: 'web-app', mobile: 'mobile-app' }[s.context?.projectType] || 'landing';
        const html =
          input.html ||
          (surface === 'landing'
            ? renderSpecimen({ style, copy: baseCopy, images: served })
            : (await import('./styles/app-specimen.js')).renderAppSpecimen({ style, copy: baseCopy, images: served, platform: surface === 'mobile-app' ? 'mobile' : 'web' }));
        const file = `styles/${style.id}.html`;
        await fs.writeFile(path.join(sessionDir(s.id), file), html);
        return {
          id: `s-${style.id}`,
          kind: 'style',
          source: input.preset ? `preset:${input.preset}` : 'custom',
          title: style.name,
          description: input.description || style.description,
          style,
          images: images.map((im) => ({ src: im.src, credit: im.credit, link: im.link })),
          surface,
          file,
        };
      });
      const ok = built.filter((b) => b && !b.error);
      await addItems(s.id, ok);
      return text({
        added: ok.map((b) => `${b.id} · ${b.title} · ${b.images.length} images`),
        failed: built.filter((b) => b?.error).map((b) => b.error),
      });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_add_component',
  {
    title: 'Add a custom live component to the Lab',
    description:
      'Add your own live component demo (3D hero, shader, scroll effect, micro-interaction...) to the board\'s Lab so the user can vote on it next to the built-in library. Must be one standalone HTML document. Use CSS vars --bg --fg --muted --accent --accent2 so the board can re-tint it with a liked style; libraries only from CDN (three via importmap from cdn.jsdelivr.net).',
    inputSchema: {
      session: sessionArg,
      name: z.string(),
      category: z.enum(['3d', 'motion', 'layout', 'text', 'cursor']),
      description: z.string(),
      tags: z.array(z.string()).optional(),
      html: z.string().min(50),
    },
  },
  async ({ session, name, category, description, tags = [], html }) => {
    try {
      const s = await withSession(session);
      await fs.mkdir(path.join(sessionDir(s.id), 'components'), { recursive: true });
      const id = `c-${slugify(name, 30)}-${shortId(4)}`;
      const file = `components/${id}.html`;
      await fs.writeFile(path.join(sessionDir(s.id), file), html);
      await addItems(s.id, [{ id, kind: 'component', source: 'custom', title: name, name, category, description, tags, file }]);
      return text({ added: id, preview: `${(await startBoard()).url}/s/${s.id}/${file}` });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_add_images',
  {
    title: 'Add a moodboard image set',
    description: 'Search CC-licensed photography/illustration on Openverse and add it to the board as moodboard references (art direction, photography style, textures).',
    inputSchema: {
      session: sessionArg,
      query: z.string(),
      count: z.number().int().min(1).max(16).optional(),
    },
  },
  async ({ session, query, count = 6 }) => {
    try {
      const s = await withSession(session);
      const imgs = await fetchImages(s.id, query, { count, mustMatch: query });
      const added = await addItems(
        s.id,
        imgs.map((im) => ({ kind: 'reference', source: 'openverse', title: im.alt, url: im.link, image: im.src, credit: im.credit, query })),
      );
      return text({ added: added.length });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_remove',
  {
    title: 'Remove items from the board',
    description: 'Remove references/styles/components that are off-brief, broken, or in the wrong section (e.g. a landing page filed under footer). Removed references are blocked so a later harvest never re-adds them; run inspo_harvest again to refill the section.',
    inputSchema: { session: sessionArg, ids: z.array(z.string()).min(1) },
  },
  async ({ session, ids }) => {
    try {
      const s = await withSession(session);
      const removed = await removeItems(s.id, ids);
      return text({ removed });
    } catch (err) {
      return fail(err);
    }
  },
);

// ─── Board & feedback ───────────────────────────────────────────────────────

server.registerTool(
  'inspo_open',
  {
    title: 'Open the voting board',
    description:
      'Start (if needed) and open the local board in the user\'s browser. Tabs: References (by section), Styles, Lab (live 3D/motion components), Page (the built page, with per-section feedback), Brief. The user likes/dislikes, stars, tags reasons and writes notes; everything autosaves, and "Send" marks the round as submitted.',
    inputSchema: {
      session: sessionArg,
      tab: z.enum(['references', 'styles', 'lab', 'plan', 'page', 'brief']).optional(),
      open: z.boolean().optional().describe('Open the browser (default true).'),
    },
  },
  async ({ session, tab, open = true }) => {
    try {
      const s = await withSession(session);
      const b = await startBoard();
      const url = boardUrl(b.url, s.id, tab);
      const opened = open ? openInBrowser(url) : false;
      const counts = s.items.reduce((m, i) => ((m[i.kind] = (m[i.kind] || 0) + 1), m), {});
      return text({ url, opened, counts, tip: 'Tell the user to vote and hit "Send", then call inspo_feedback with wait:true.' });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_feedback',
  {
    title: 'Read the user\'s votes',
    description:
      'Read likes, dislikes, stars, reason tags and notes from the board: per section (bySection), styles, components, patterns (fonts, colors, tech, layouts shared by the likes) and feedback on the built page (build: per-section votes + click-comments). With wait:true, blocks until the user presses "Send" (or timeout). Attaches thumbnails of favorites (spread across sections) so you can see them; pass `section` to focus on one.',
    inputSchema: {
      session: sessionArg,
      wait: z.boolean().optional(),
      timeoutSec: z.number().int().min(5).max(900).optional().describe('Default 240.'),
      images: z.number().int().min(0).max(12).optional().describe('How many liked thumbnails to attach (default 6).'),
      section: sectionEnum.optional().describe('Only this section\'s references (and its thumbnails).'),
    },
  },
  async ({ session, wait, timeoutSec = 240, images = 6, section }) => {
    try {
      let s = await withSession(session);
      let fb = await loadFeedback(s.id);
      if (wait) {
        const since = fb.submittedAt;
        const until = Date.now() + timeoutSec * 1000;
        while (Date.now() < until) {
          await new Promise((r) => setTimeout(r, 1500));
          fb = await loadFeedback(s.id);
          if (fb.submittedAt && fb.submittedAt !== since) break;
        }
        s = await withSession(s.id);
      }
      const library = await listLibrary();
      const summary = summarizeFeedback(s, fb, library);
      if (s.plan || fb.plan) summary.plan = effectivePlan(s, fb, library);
      if (wait && !summary.submittedAt) summary.note = 'Timed out waiting for "Send"; returning votes so far.';
      // Section references are reported under bySection; keep the flat lists for everything else.
      summary.liked = summary.liked.filter((l) => !s.items.find((i) => i.id === l.id)?.section);
      summary.disliked = summary.disliked.filter((l) => !s.items.find((i) => i.id === l.id)?.section);
      if (section) summary.bySection = { [section]: summary.bySection[section] };
      const content = [{ type: 'text', text: JSON.stringify(summary, null, 2) }];

      // Images attached to page comments come first: they are instructions ("replace with this", "add this above").
      const attached = [...(summary.build?.sections || []), ...(summary.build?.comments || [])].flatMap((c) => [
        ...(c.refs || []).map((r) => ({ rel: r.image, label: `attached to ${c.section || 'page'} comment (${c.action}): ${r.title}` })),
        ...(c.uploads || []).map((u) => ({ rel: u, label: `uploaded for ${c.section || 'page'} comment (${c.action})` })),
      ]);
      for (const a of attached.slice(0, 8)) {
        let abs = path.join(sessionDir(s.id), a.rel || '');
        let ext = path.extname(abs).slice(1).toLowerCase();
        if (ext === 'avif') {
          abs = await jpegCopy(abs).catch(() => null);
          ext = 'jpg';
        }
        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
        const buf = abs && mime ? await fs.readFile(abs).catch(() => null) : null;
        if (!buf || buf.length > 3_000_000) continue;
        content.push({ type: 'text', text: `↓ ${a.label}` });
        content.push({ type: 'image', data: buf.toString('base64'), mimeType: mime });
      }

      // Favorites to look at: round-robin across sections (starred first), then styles/components.
      const lists = Object.values(summary.bySection).map((b) => (b?.liked || []).map((l) => l.id));
      if (!section) lists.push(summary.liked.map((l) => l.id));
      const picks = [];
      for (let i = 0; picks.length < images && lists.some((l) => l.length > i); i++) for (const l of lists) if (l[i] && picks.length < images) picks.push(l[i]);
      for (const id of picks) {
        const it = s.items.find((i) => i.id === id);
        const rel = it?.image || it?.images?.[0]?.src;
        if (!rel) continue;
        let abs = path.join(sessionDir(s.id), rel);
        let ext = path.extname(rel).slice(1).toLowerCase();
        if (ext === 'avif') {
          abs = await jpegCopy(abs).catch(() => null);
          ext = 'jpg';
          if (!abs) continue;
        }
        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
        if (!mime) continue;
        try {
          const buf = await fs.readFile(abs);
          if (buf.length > 1_500_000) continue;
          content.push({ type: 'text', text: `↓ liked${it.section ? ` [${it.section}]` : ''}: ${it.title} (${it.id})` });
          content.push({ type: 'image', data: buf.toString('base64'), mimeType: mime });
        } catch {
          /* missing file */
        }
      }
      return { content };
    } catch (err) {
      return fail(err);
    }
  },
);

const analysisInput = z
  .object({
    summary: z.string().describe('1-2 sentences: what this section will be and why (user\'s language).'),
    layout: z.string().optional(),
    typography: z.string().optional(),
    color: z.string().optional(),
    imagery: z.string().optional(),
    motion: z.string().optional(),
    copy: z.string().optional(),
  })
  .describe('What you take from the references for this section, concretely.');

server.registerTool(
  'inspo_plan',
  {
    title: 'Publish the per-section plan',
    description:
      'After analyzing the liked references (look at them with inspo_feedback, section by section), publish the plan of what goes in each section: the primary reference, alternates, components, and your analysis (layout, typography, color, imagery, motion, copy). It shows in the board\'s Plan tab, where the user can swap the primary for another like or any reference of that section, change the style or components, leave notes and approve. inspo_feedback returns the resulting plan (user edits win). Build from that plan.',
    inputSchema: {
      session: sessionArg,
      summary: z.string().describe('The overall direction in 2-3 sentences.'),
      style: z.string().optional().describe('Style item id (s-…) the page will use.'),
      sections: z.array(z.object({
        id: sectionEnum,
        primary: z.string().describe('Reference item id that leads this section.'),
        alternates: z.array(z.string()).optional().describe('Other liked reference ids worth considering (up to 4).'),
        components: z.array(z.string()).optional().describe('Component ids (lib-… or c-…) used in this section.'),
        analysis: analysisInput,
      })).min(1),
    },
  },
  async ({ session, summary, style, sections }) => {
    try {
      const s = await withSession(session);
      const lib = await listLibrary();
      const known = new Set([...s.items.map((i) => i.id), ...lib.map((c) => c.id)]);
      const unknown = sections.flatMap((x) => [x.primary, ...(x.alternates || []), ...(x.components || [])]).filter((id) => !known.has(id));
      if (style && !known.has(style)) unknown.push(style);
      await updateSession(s.id, (ss) => {
        ss.plan = { summary, style: style || null, sections, at: new Date().toISOString() };
      });
      const b = await startBoard();
      return text({ board: boardUrl(b.url, s.id, 'plan'), unknownIds: unknown, tip: 'Open the Plan tab (inspo_open tab:"plan"), ask the user to review/swap/approve and press Send, then read inspo_feedback → plan.' });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_add_build',
  {
    title: 'Show a built page on the board',
    description:
      'Publish a version of the page you built (v1, v2…) to the board\'s Page tab, where the user votes and comments section by section and can click anywhere to leave a note. Pass `html` (a standalone document) or `file` (absolute path to an .html file; its folder is served so relative assets work) or `url` (e.g. a running dev server; no click-comments then). Mark every section root with data-inspo="<section id>" (e.g. <header data-inspo="navbar">) so feedback maps to sections.',
    inputSchema: {
      session: sessionArg,
      html: z.string().optional(),
      file: z.string().optional(),
      url: z.string().url().optional(),
      label: z.string().optional().describe('What changed in this version, one line.'),
      notes: z.string().optional(),
    },
  },
  async ({ session, html, file, url, label, notes }) => {
    try {
      if ([html, file, url].filter(Boolean).length !== 1) throw new Error('Pass exactly one of html, file or url.');
      const s = await withSession(session);
      const v = (s.builds?.at(-1)?.v || 0) + 1;
      const build = { v, label: label || `v${v}`, notes, at: new Date().toISOString() };
      if (html) {
        await fs.mkdir(path.join(sessionDir(s.id), 'builds'), { recursive: true });
        await fs.writeFile(path.join(sessionDir(s.id), 'builds', `v${v}.html`), html);
        Object.assign(build, { kind: 'html', src: `builds/v${v}.html` });
      } else if (file) {
        const abs = path.resolve(file);
        await fs.access(abs);
        Object.assign(build, { kind: 'file', path: abs });
      } else Object.assign(build, { kind: 'url', url });
      await updateSession(s.id, (ss) => {
        ss.builds = [...(ss.builds || []), build];
      });
      const b = await startBoard();
      return text({ version: v, board: boardUrl(b.url, s.id, 'page'), tip: 'Open the Page tab (inspo_open tab:"page") and ask the user for feedback, then inspo_feedback → build.' });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_export_pdf',
  {
    title: 'Export the research report (PDF)',
    description:
      'Render a studio-style PDF report of the research: cover, direction/brief (or taste profile), the winning references of every section with the user\'s notes, liked styles and components, and the current page version. Saved to .inspo/<session>/inspo-report.pdf and opened.',
    inputSchema: { session: sessionArg, open: z.boolean().optional().describe('Open the PDF (default true).') },
  },
  async ({ session, open = true }) => {
    try {
      const s = await withSession(session);
      const { exportReport } = await import('./report.js');
      const b = await startBoard();
      const outFile = path.join(sessionDir(s.id), 'inspo-report.pdf');
      const res = await exportReport({ session: s, feedback: await loadFeedback(s.id), library: await listLibrary(), boardUrl: b.url, outFile });
      if (open) openInBrowser(outFile);
      return text({ pdf: outFile, pages: res.pages });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_next_round',
  {
    title: 'Start the next research round',
    description: 'Bump the round number so new items are grouped as "Round N" on the board (older rounds stay browsable). Call before searching again based on feedback.',
    inputSchema: { session: sessionArg, focus: z.string().optional().describe('What this round explores, shown on the board.') },
  },
  async ({ session, focus }) => {
    try {
      const s = await withSession(session);
      const round = await updateSession(s.id, (ss) => {
        ss.round += 1;
        ss.rounds = { ...(ss.rounds || {}), [ss.round]: focus || '' };
        return ss.round;
      });
      return text({ round });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_brief',
  {
    title: 'Publish the design direction',
    description:
      'Save the final design direction to the board\'s Brief tab and to .inspo/<id>/DESIGN.md: concept, principles, palette, type, components picked, references, do/don\'t, and tokens. Call once the user has converged.',
    inputSchema: {
      session: sessionArg,
      name: z.string().describe('Name of the direction.'),
      summary: z.string(),
      principles: z.array(z.string()).optional(),
      palette: z.record(z.string(), z.string()).optional(),
      fonts: z.record(z.string(), z.string()).optional(),
      components: z.array(z.string()).optional().describe('Component ids (lib-* or c-*) to build.'),
      references: z.array(z.string()).optional().describe('Item ids that define the direction.'),
      do: z.array(z.string()).optional(),
      dont: z.array(z.string()).optional(),
      tokensCss: z.string().optional().describe(':root { ... } CSS custom properties.'),
      sections: z.array(z.string()).optional().describe('Page outline, top to bottom.'),
    },
  },
  async ({ session, ...brief }) => {
    try {
      const s = await withSession(session);
      await updateSession(s.id, (ss) => {
        ss.brief = { ...brief, at: new Date().toISOString() };
      });
      const md = [
        `# ${brief.name}`,
        '',
        brief.summary,
        brief.principles?.length ? `\n## Principles\n${brief.principles.map((p) => `- ${p}`).join('\n')}` : '',
        brief.palette ? `\n## Palette\n${Object.entries(brief.palette).map(([k, v]) => `- **${k}** \`${v}\``).join('\n')}` : '',
        brief.fonts ? `\n## Type\n${Object.entries(brief.fonts).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}` : '',
        brief.sections?.length ? `\n## Page outline\n${brief.sections.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '',
        brief.components?.length ? `\n## Components\n${brief.components.map((c) => `- ${c}`).join('\n')}` : '',
        brief.references?.length
          ? `\n## References\n${brief.references.map((id) => { const it = s.items.find((i) => i.id === id); return it ? `- ${it.title} — ${it.liveUrl || it.url || it.id}` : `- ${id}`; }).join('\n')}`
          : '',
        brief.do?.length ? `\n## Do\n${brief.do.map((x) => `- ${x}`).join('\n')}` : '',
        brief.dont?.length ? `\n## Don't\n${brief.dont.map((x) => `- ${x}`).join('\n')}` : '',
        brief.tokensCss ? `\n## Tokens\n\n\`\`\`css\n${brief.tokensCss}\n\`\`\`` : '',
      ].join('\n');
      const file = path.join(sessionDir(s.id), 'DESIGN.md');
      await fs.writeFile(file, md + '\n');
      const b = await startBoard();
      return text({ saved: file, board: boardUrl(b.url, s.id, 'brief') });
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'inspo_login',
  {
    title: 'Log in to a walled source (Mobbin)',
    description: 'Opens a visible browser window with inspo\'s own persistent profile (~/.inspo/profile) so the user can log in to Mobbin (or another site) once. Returns when the user closes the window (max 5 min).',
    inputSchema: { source: z.string().describe('"mobbin" or any URL.') },
  },
  async ({ source }) => {
    try {
      await loginFlow(source);
      return text({ ok: true, note: 'Session saved in ~/.inspo/profile. Mobbin searches will use it.' });
    } catch (err) {
      return fail(err);
    }
  },
);

// ─── Boot ───────────────────────────────────────────────────────────────────

const shutdown = async () => {
  await closeBrowser();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('close', shutdown);

await server.connect(new StdioServerTransport());
console.error(`inspo MCP v${VERSION} ready · sessions in ${SESSIONS_DIR}`);
