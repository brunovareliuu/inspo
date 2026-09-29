<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.png">
    <img src="docs/logo-light.png" alt="inspo" width="300">
  </picture>
</p>

<p align="center">
  <b>Design research → a built page, inside Claude Code.</b><br>
  References for every section, style directions with real photos, live 3D components,<br>a board to vote on, a PDF report, and the page itself — iterated section by section.
</p>

<p align="center">
  <a href="#install"><img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude_Code-plugin-d6ff3d?style=flat-square&labelColor=0b0b0c"></a>
  <a href="#tools"><img alt="MCP server" src="https://img.shields.io/badge/MCP-server-d6ff3d?style=flat-square&labelColor=0b0b0c"></a>
  <img alt="Node 20+" src="https://img.shields.io/badge/node-%E2%89%A520-f2f1ec?style=flat-square&labelColor=0b0b0c">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-f2f1ec?style=flat-square&labelColor=0b0b0c"></a>
  <a href="README.es.md"><img alt="Español" src="https://img.shields.io/badge/lee_en-español-f2f1ec?style=flat-square&labelColor=0b0b0c"></a>
</p>

<p align="center"><img src="docs/banner.png" alt="inspo: references per section, styles, and the built page with section feedback" width="100%"></p>

**Design research and page building for Claude Code.** Tell it your idea and agree on the page sections. It gathers about **50 references per section** (navbar, hero, about, catalog, footer…) from Awwwards, Dribbble, Siteinspire, footer.design, navbar.gallery, and real award-winning sites that it cuts into sections automatically. It renders your page in several visual styles with real photos, and opens a board where you vote on all of it, live 3D components included. Then it hands you a PDF report, builds the page from what you picked, and iterates on your feedback section by section.

![Your landing page rendered in six of the sixteen style directions](docs/styles-grid.jpg)

```
/inspo a subscription for Mexican specialty coffee, roasted weekly
```

## What you get

- **50+ references per section.** A background harvest fills every section you need (19 types: navbar, hero, logos, features, services, catalog, work, about, process, stats, team, testimonials, pricing, FAQ, blog, CTA, newsletter, contact, footer). Its sources:
  - **Dedicated galleries:** footer.design, navbar.gallery.
  - **Dribbble.**
  - **Real sites cut into sections.** It visits hundreds of Awwwards and Siteinspire winners, removes cookie banners and discount popups, finds each section, follows links to /about, /shop and /pricing when a section has its own page, and screenshots just that part.

  Around 250 references across 5 sections takes about 6 minutes, and the board fills live while it runs.
- **Galleries on demand.** Awwwards, Dribbble, Land-book, Siteinspire, One Page Love, Lapa Ninja and Mobbin. Live sites are analyzed for fonts, palette, radii, type scale and tech (three.js, GSAP, Lenis, Webflow, Framer, Spline…).
- **Styles.** Your own landing page, with your copy, rendered in 4–6 distinct directions. Each one gets its own palette, Google Fonts, layout, texture and image treatment, and real CC0 photos. 16 presets included, and Claude can tune them or invent new ones.
- **Lab.** 18 live, production-grade components (WebGL shaders, a dot globe, a glass knot, particle galaxies, sticky stacks, magnetic buttons…), plus custom ones Claude writes for your idea. You can re-tint all of them with a style you liked.
- **The board.** A local page where you 👍 / 👎 / ★ section by section, tag *why* (layout, type, color, motion, 3D…), write notes, and hit **Send to Claude**. **⚡ Quick vote** goes one by one with `1` / `2` / `S`. It autosaves and runs in English or Spanish.
- **Only the right thing in each section.** Gallery cards must be tagged with the section (no whole landing pages or app screens under "footer"), and crops only come from confident detections. Then Claude checks every section visually on numbered contact sheets, removes what doesn't belong (it never comes back), and refills. You also get a **✕ Not a footer** button (key `X`).
- **Plan.** After you vote, Claude analyzes your favorites and writes the plan for each section: the leading reference, alternates, and what to take for layout, type, color, imagery and motion, plus the components. In the **Plan** tab you swap the reference for any of your likes or any reference in that section, change the style or components, leave notes and approve. Claude builds from that plan.
- **PDF report.** A studio-style deliverable: cover, direction, the winners of every section with your notes, styles, components, and the current page.
- **The page.** Claude builds it from your votes. The **Page** tab shows every version in desktop, tablet and mobile. You vote and note each section, or switch on **Comment** and click anything to pin a note. Claude reads the comments, with the exact element, rebuilds, and publishes v2, v3…
- **Rounds.** Claude reads your votes, including the thumbnails you liked, and runs a sharper second round.
- **Brief.** The final direction: concept, principles, palette, type, page outline, components, do/don't, and CSS tokens. It shows on the board and is written to `DESIGN.md`.

| References by section | The page, with section feedback and pinned comments |
|---|---|
| ![](docs/board-references.jpg) | ![](docs/board-page.jpg) |
| **Styles** | **Lab** |
| ![](docs/board-styles.jpg) | ![](docs/board-lab.jpg) |

![The PDF report](docs/report.jpg)

## Install

In Claude Code:

```
/plugin marketplace add brunovareliuu/inspo
/plugin install inspo@inspo
```

That installs the `inspo` skill (the workflow) and the `inspo` MCP server (the tools). The server installs its own dependencies the first time it starts. It uses your installed Google Chrome; with no Chrome, run `npx playwright install chromium`.

Requires Node 20+.

<details>
<summary>Other MCP clients (Cursor, Claude Desktop, Windsurf…)</summary>

```bash
git clone https://github.com/brunovareliuu/inspo ~/inspo && cd ~/inspo && npm install
```

```json
{
  "mcpServers": {
    "inspo": { "command": "node", "args": ["/absolute/path/to/inspo/src/server.js"] }
  }
}
```

The tools work in any client. The workflow lives in [`skills/inspo/SKILL.md`](skills/inspo/SKILL.md); paste it into your client's rules or project instructions.
</details>

## Use it

Just describe what you're making. The skill triggers on its own, or you can call it with `/inspo`:

```
/inspo portfolio for an architecture studio in Monterrey, very minimal
/inspo redesign this app — it looks like a template
/inspo landing for my AI note-taking app, I love linear.app and stripe.com
```

The conversation:

1. **The idea.** Claude reflects back what it understood and asks only what's missing: audience, the feeling, sites you love, brand assets. If there's a repo or running app, it looks at it.
2. **Sections.** It asks which sections the page needs.
3. **Recommendation.** It proposes a section list for your kind of page, one line of *why* each, and you adjust it.
4. **Research and votes.** A harvest of about 50 references per section, 4–6 style directions and live components, all on the board. You vote and hit **Send to Claude**. Claude summarizes what you picked per section, publishes the brief, and exports the **PDF**.
5. **The page.** Claude builds it from your votes (style, per-section references, components, your copy) and publishes it to the **Page** tab.
6. **Feedback loop.** You vote and comment section by section, and Claude rebuilds. Repeat until it's right, then integrate it into your stack.

Everything for a project lives in `<project>/.inspo/<session>/`, which is git-ignored automatically.

## Tools

| Tool | What it does |
|---|---|
| `inspo_start` | New session: idea, context, real draft copy, and sections |
| `inspo_sections` | Section catalog and recommended sets per page type, or set the plan |
| `inspo_harvest` | Background harvest of N references per section (default 50) |
| `inspo_status` | Harvest progress per section (or cancel) |
| `inspo_review` | Numbered contact sheets of a section, so Claude can verify every item visually |
| `inspo_plan` | Publish the per-section plan (reference, alternates, analysis, components) to the Plan tab |
| `inspo_search` | Search galleries (optionally for one section), save thumbnails, optionally capture the live sites |
| `inspo_capture` | Screenshot and analyze specific URLs (fonts, colors, tech) |
| `inspo_analyze` | Look at any URL, including `localhost`, and return a screenshot plus its design DNA |
| `inspo_add_styles` | Render your page in style directions with real photos |
| `inspo_add_component` | Add a custom live component to the Lab |
| `inspo_add_images` | Add a moodboard image set (Openverse, CC-licensed) |
| `inspo_open` | Open the board |
| `inspo_feedback` | Votes per section, styles, components, and page feedback (section votes and pinned comments), with thumbnails; can wait for **Send to Claude** |
| `inspo_add_build` | Publish a page version (html, a file, or a URL) to the Page tab |
| `inspo_export_pdf` | Export the research report as a PDF |
| `inspo_next_round` | Start round N |
| `inspo_brief` | Publish the final direction, written to `DESIGN.md` |
| `inspo_remove` | Drop off-brief items |
| `inspo_catalog` | List sources, presets and components |
| `inspo_login` | Log in to Mobbin once, in a visible browser window |

## Sources

| Source | Good for | Notes |
|---|---|---|
| Awwwards | Crafted, motion-heavy sites | Links to live site |
| Dribbble | Visual styles, UI concepts, 3D renders | |
| Land-book | Full-page landing structure | Tall screenshots |
| Siteinspire | Typography, restraint, studios | Links to live site |
| One Page Love | One-pagers, launches | |
| Lapa Ninja | SaaS / startup landings | |
| Mobbin | Real app screens and flows | Needs a Mobbin account: `inspo_login` |
| footer.design | Footers only | Harvest source for `footer` |
| Navbar Gallery | Navigation bars only | Harvest source for `navbar` |
| Live sites | Every section, cut from real sites | Awwwards categories and search, Siteinspire, Sites of the Day, plus sites Claude picks |
| Openverse | Photos for styles and moodboards | CC-licensed, credited, no API key. Prefers StockSnap's CC0 stock |

Galleries change their markup. If one breaks, `node bin/inspo.js doctor` tells you which, and a PR to `src/sources/index.js` is usually a two-line fix.

## Style presets

| Style | Vibe | Type | Hero |
|---|---|---|---|
| Swiss Minimal | precise, rational, confident | Inter Tight / Inter | poster |
| Editorial Serif | literate, calm, authoritative | Instrument Serif / Newsreader | editorial |
| Neo-Brutalist | loud, honest, energetic | Archivo Black / Space Grotesk | bento |
| Dark Luxury | opulent, hushed, exclusive | Cormorant Garamond / Manrope | centered |
| Aurora Glass | dreamy, luminous, futuristic | Sora / Outfit | centered |
| Tech Noir | focused, precise, nocturnal | Geist | centered |
| Y2K Chrome | shiny, nostalgic, hyper | Unbounded / Hanken Grotesk | poster |
| Organic Soft | warm, gentle, grounded | Fraunces / DM Sans | split |
| Synthwave Retro-future | nostalgic, electric, cinematic | Orbitron / Exo 2 | full-bleed |
| Playful Pop | cheerful, bouncy, friendly | Bricolage Grotesque / Figtree | bento |
| Terminal Mono | raw, technical, hacker-honest | JetBrains Mono / IBM Plex Mono | split |
| Architectural Monochrome | austere, monumental, exacting | Archivo | full-bleed |
| Wabi-Sabi Zen | quiet, imperfect, meditative | Shippori Mincho / Zen Kaku Gothic New | editorial |
| Gradient SaaS | optimistic, polished, trustworthy | Plus Jakarta Sans | split |
| Bauhaus Geometric | constructive, bold, primary | Jost | poster |
| Magazine Maximalist | loud, eclectic, collage-rich | Anton / Libre Franklin / Bodoni Moda | bento |

Every preset can be overridden (palette, fonts, layout, texture, image treatment), and Claude can pass fully custom specimen HTML.

## Component library

| Component | Category | |
|---|---|---|
| Liquid Blob | 3D | Noise-displaced iridescent sphere that leans toward the cursor |
| Particle Galaxy | 3D | 40k additive particles in a slow spiral |
| Glass Knot | 3D | Dispersive glass torus knot refracting giant type |
| Wave Terrain | 3D | Retro-futurist wireframe valley under a striped sun |
| Dot Globe | 3D | Dotted Earth with arcs between cities |
| Gradient Mesh | 3D | Stripe-style flowing gradient with grain |
| Floating Shapes | 3D | Glossy primitives drifting around a headline |
| ASCII Shader | 3D | A lit torus through a glyph-atlas ASCII shader |
| Tilt Cards | cursor | Perspective tilt with glare |
| Spotlight Cards | cursor | Linear-style cursor spotlight and glowing borders |
| Magnetic Buttons | cursor | Magnetic pull and fill-from-entry hovers |
| Blend Cursor | cursor | Liquid blob cursor inverting giant type |
| Editorial Text Reveal | text | Masked, staggered line reveals |
| Scramble Text | text | Decoding glyph effect |
| Noise Editorial Hero | text | Magazine cover with grain and a parallax plate |
| Velocity Marquee | motion | Giant marquees that skew with scroll velocity |
| Bento Grid | layout | Living tiles: counters, chart, bars |
| Sticky Stack Scroll | layout | Cards that pin and stack like folder tabs |

Each one is a single self-contained HTML file in [`components/`](components). They read `--bg --fg --muted --accent --accent2` from the URL, so the board can re-tint them with any style. When you pick one, Claude ports it to your stack (React/Next with R3F, GSAP, Motion…). [`skills/inspo/references/components.md`](skills/inspo/references/components.md) has the conventions.

## CLI

```bash
node bin/inspo.js serve          # open the board for the latest session in ./.inspo
node bin/inspo.js sessions       # list sessions
node bin/inspo.js login mobbin   # log in to Mobbin once
node bin/inspo.js doctor         # check browser, network and every source
```

## Config

| Env var | Default | |
|---|---|---|
| `INSPO_DIR` | `<cwd>/.inspo` | Where sessions live |
| `INSPO_PORT` | `4777` | Board port (next free port if taken) |
| `INSPO_HOME` | `~/.inspo` | Persistent browser profile (Mobbin login) |

## Responsible use

inspo is for private design research, like a designer saving screenshots to a moodboard. It reads public gallery pages at human pace, stores screenshots locally, and links back to every source. Don't redistribute other people's work, and don't clone a site. Take the principles, not the pixels. Openverse photos keep their license credits; for production, commission or license proper photography. Respect each site's terms: Mobbin in particular requires your own account.

## Development

```bash
npm install
npm test          # offline unit tests
npm run e2e       # drives the real MCP server end to end (needs network + Chrome)
node bin/inspo.js doctor# checks every scraper
```

Layout:

```
src/server.js          MCP server (tools)
src/sources/           gallery scrapers
src/capture.js         live screenshots, design-DNA analysis, Openverse images
src/styles/            style presets + specimen renderer
src/board/             local board (server + single-file UI)
components/            live component library
skills/inspo/          the Claude Code skill (workflow + playbooks)
.claude-plugin/        plugin + marketplace manifests
```

PRs are welcome, especially new sources, style presets and Lab components.

## License

MIT © Bruno Varela
