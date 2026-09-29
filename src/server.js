#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  SESSIONS_DIR, createSession, loadSession, updateSession, addItems, loadFeedback, listSessions,
  sessionDir, assetsDir, slugify, shortId,
} from './session.js';
import { SOURCES, SOURCE_IDS, searchSources, loginFlow } from './sources/index.js';
import { captureSite, analyzeUrl, downloadAsset, fetchImages } from './capture.js';
import { listLibrary } from './components.js';
import { summarizeFeedback } from './feedback.js';
import { startBoard, boardUrl, openInBrowser } from './board/server.js';
import { closeBrowser } from './browser.js';
import { STYLE_PRESETS, resolveStyle } from './styles/presets.js';
import { renderSpecimen } from './styles/specimen.js';

const VERSION = '0.1.0';
const server = new McpServer({ name: 'inspo', version: VERSION });

const text = (t) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: 'text', text: `Error: ${err?.message || err}` }] });
const sessionArg = z.string().optional().describe('Session id. Defaults to the most recent session in this project.');

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
        })
        .optional()
        .describe('Real draft copy for the product (in the user\'s language). Used to render every style specimen.'),
    },
  },
  async ({ idea, title, context, copy }) => {
    try {
      const s = await createSession({ idea, title, context: context || {}, copy: copy || null });
      const board = await startBoard();
      return text({
        session: s.id,
        folder: sessionDir(s.id),
        board: boardUrl(board.url, s.id),
        sources: Object.fromEntries(SOURCE_IDS.map((k) => [k, SOURCES[k].about])),
        stylePresets: STYLE_PRESETS.map((p) => `${p.id} — ${p.name}: ${p.vibe}`),
        next: 'Research: inspo_search (galleries) + inspo_capture (specific live sites you know are great). Then inspo_add_styles (4-6 directions) and pick components. Then inspo_open.',
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
      limit: z.number().int().min(1).max(30).optional().describe('Max results per source (default 8).'),
      platform: z.enum(['web', 'ios', 'android']).optional().describe('Mobbin only. Default web.'),
      captureLive: z.number().int().min(0).max(10).optional().describe('Also screenshot + analyze the live site of the first N results that link to one (default 0; each takes ~10s).'),
    },
  },
  async ({ session, query, sources, limit = 8, platform, captureLive = 0 }) => {
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
        const saved = await mapLimit(r.cards, 6, async (c) => {
          const file = (await downloadAsset(s.id, c.image, { referer: SOURCES[r.source].home + '/' })) || (c.fallbackImage && (await downloadAsset(s.id, c.fallbackImage, { referer: SOURCES[r.source].home + '/' })));
          if (!file) return null;
          return {
            kind: 'reference', source: r.source, title: c.title?.trim() || SOURCES[r.source].name, url: c.url, liveUrl: c.liveUrl,
            image: file, video: c.video, author: c.author, tall: !!c.tall, query,
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
    },
  },
  async ({ session, urls, why, mobile }) => {
    try {
      const s = await withSession(session);
      const caps = await mapLimit(urls, 3, (u) => captureSite(s.id, u, { mobile }));
      const ok = caps.filter((c) => c && !c.error).map((c) => ({ ...c, note: why }));
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
});

server.registerTool(
  'inspo_add_styles',
  {
    title: 'Propose visual style directions',
    description:
      'Add 3-6 visual STYLE directions to the board. For each one inspo fetches real CC-licensed photos (Openverse), and renders the user\'s own landing page in that style (palette, fonts, layout, image treatment, texture) as a live specimen they can vote on. Start from presets and override palette/fonts to fit the brand, or pass custom html.',
    inputSchema: {
      session: sessionArg,
      styles: z.array(styleInput).min(1).max(10),
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

      const built = await mapLimit(styles, 3, async (input) => {
        const style = resolveStyle(input);
        style.id = `${slugify(style.name || style.id, 30)}-${shortId(4)}`;
        let images = [];
        if (imagesPerStyle > 0) {
          const queries = [
            [imageSubject, style.imageQuery].filter(Boolean).join(' '),
            imageSubject,
            style.imageQuery,
          ].filter((q, i, a) => q && a.indexOf(q) === i);
          for (const q of queries) {
            if (images.length >= imagesPerStyle) break;
            const got = await fetchImages(s.id, q, { count: imagesPerStyle - images.length });
            images.push(...got);
          }
        }
        const served = images.map((im) => ({ ...im, src: `/s/${s.id}/${im.src}` }));
        const html = input.html || renderSpecimen({ style, copy: baseCopy, images: served });
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
      const imgs = await fetchImages(s.id, query, { count });
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
    description: 'Remove references/styles/components that are off-brief or broken (e.g. empty screenshots, cookie walls, ads).',
    inputSchema: { session: sessionArg, ids: z.array(z.string()).min(1) },
  },
  async ({ session, ids }) => {
    try {
      const s = await withSession(session);
      const removed = await updateSession(s.id, (ss) => {
        const before = ss.items.length;
        ss.items = ss.items.filter((i) => !ids.includes(i.id));
        return before - ss.items.length;
      });
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
      'Start (if needed) and open the local board in the user\'s browser. Tabs: Styles, References, Lab (live 3D/motion components), Brief. The user likes/dislikes, stars, tags reasons and writes notes; everything autosaves, and "Send to Claude" marks the round as submitted.',
    inputSchema: {
      session: sessionArg,
      tab: z.enum(['styles', 'references', 'lab', 'brief']).optional(),
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
      return text({ url, opened, counts, tip: 'Tell the user to vote and hit "Send to Claude", then call inspo_feedback with wait:true.' });
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
      'Read likes, dislikes, stars, reason tags and notes from the board, plus patterns (fonts, colors, tech, layouts shared by what they liked). With wait:true, blocks until the user presses "Send to Claude" (or timeout). Returns thumbnails of the favorites so you can see them.',
    inputSchema: {
      session: sessionArg,
      wait: z.boolean().optional(),
      timeoutSec: z.number().int().min(5).max(900).optional().describe('Default 240.'),
      images: z.number().int().min(0).max(8).optional().describe('How many liked thumbnails to attach (default 4).'),
    },
  },
  async ({ session, wait, timeoutSec = 240, images = 4 }) => {
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
      const summary = summarizeFeedback(s, fb, await listLibrary());
      if (wait && !summary.submittedAt) summary.note = 'Timed out waiting for "Send to Claude"; returning votes so far.';
      const content = [{ type: 'text', text: JSON.stringify(summary, null, 2) }];
      const favs = summary.liked
        .map((l) => s.items.find((i) => i.id === l.id))
        .filter((i) => i && (i.image || i.images?.[0]))
        .sort((a, b) => (fb.items[b.id]?.star ? 1 : 0) - (fb.items[a.id]?.star ? 1 : 0))
        .slice(0, images);
      for (const it of favs) {
        const rel = it.image || it.images[0].src;
        const ext = path.extname(rel).slice(1).toLowerCase();
        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
        if (!mime) continue;
        try {
          const buf = await fs.readFile(path.join(sessionDir(s.id), rel));
          if (buf.length > 1_500_000) continue;
          content.push({ type: 'text', text: `↓ liked: ${it.title} (${it.id})` });
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
