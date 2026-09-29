# Research playbook

## Which source for what

| Source | Best for | Notes |
|---|---|---|
| `awwwards` | Crafted, award-level marketing sites, motion, WebGL | Results link to the live site → use `captureLive` |
| `dribbble` | Visual styles, UI concepts, illustration, 3D renders | Concepts, not shipped sites. Great for vibe, weak for structure |
| `landbook` | Full-page landing structure, section rhythm | Tall screenshots: open in the lightbox to see the whole page |
| `siteinspire` | Restraint, typography, studios, portfolios, editorial | Links to live site |
| `onepagelove` | Simple one-pagers, launches, personal sites | |
| `lapa` | SaaS / startup landing pages | |
| `mobbin` | Real app screens and flows (iOS, Android, web) | Needs `inspo_login` once |
| `inspo_capture` | Specific sites you know | Screenshots + fonts/colors/tech analysis |
| `inspo_add_images` | Photography / texture / art direction | Openverse, CC-licensed |

## Query recipes

Galleries match short title/tag text. Prefer several short queries over one long one.

- **Industry**: `fintech`, `bank`, `coffee`, `restaurant`, `real estate`, `architecture`, `fashion`, `skincare`, `ai`, `saas`, `crypto`, `health`, `fitness`, `travel`, `hotel`, `education`, `law firm`, `agency`, `portfolio`, `music`, `festival`, `nonprofit`, `automotive`, `furniture`, `wine`, `beer`.
- **Vibe**: `minimal`, `editorial`, `brutalist`, `dark`, `3d`, `webgl`, `gradient`, `retro`, `y2k`, `luxury`, `playful`, `swiss`, `monochrome`, `colorful`, `typography`, `illustration`.
- **Page / section**: `landing page`, `pricing`, `dashboard`, `onboarding`, `checkout`, `product page`, `about`, `case study`, `404`, `footer`, `hero`.
- **Combine** industry + vibe on Dribbble (`fintech 3d`, `coffee branding`); keep Awwwards/Siteinspire to one or two words (`coffee`, `bank`).

## Best-in-class starting points (verify they still fit before capturing)

Pick the ones relevant to the idea, and add competitors you know in the user's market.

- **SaaS / dev tools**: linear.app, vercel.com, stripe.com, raycast.com, resend.com, clerk.com, supabase.com, framer.com, arc.net, cursor.com
- **Fintech**: mercury.com, ramp.com, stripe.com, revolut.com, wise.com, monzo.com, brex.com
- **AI products**: anthropic.com, openai.com, perplexity.ai, runwayml.com, elevenlabs.io
- **Consumer hardware / product**: apple.com, nothing.tech, teenage.engineering, rivian.com
- **Food & drink / DTC**: bluebottlecoffee.com, oatly.com, graza.co, omsom.com, olipop.com
- **Fashion / beauty**: aesop.com, glossier.com, byredo.com, ssense.com
- **Studios / agencies / portfolios**: locomotive.ca, activetheory.net, resn.co.nz, pentagram.com, basicagency.com, obys.agency
- **Editorial / media**: itsnicethat.com, theverge.com, pitch.com
- **Real estate / architecture / hospitality**: bjarkeingels.com (BIG), aman.com, sonder.com
- **Mexico / LatAm (when relevant)**: kueski.com, clip.mx, fondeadora.com, konfio.mx, nu.com.mx

## Style direction recipes

A good round 1 spans the space. Pick one from at least four of these families, then tune palette/fonts to the brand:

1. **Quiet & editorial** — serif display, generous whitespace, photography-led (Editorial Serif, Wabi-Sabi Zen, Architectural Monochrome)
2. **Precise & systematic** — grotesk, grids, restraint (Swiss Minimal, Bauhaus Geometric, Terminal Mono)
3. **Dark & technical** — glows, subtle grids, 3D (Tech Noir, Aurora Glass, Synthwave)
4. **Warm & human** — soft shapes, earthy colors, rounded type (Organic Soft, Playful Pop)
5. **Loud & bold** — huge type, hard edges, clashing color (Neo-Brutalist, Magazine Maximalist, Y2K Chrome)
6. **Premium** — dark luxury, gold/cream, high contrast serif (Dark Luxury, Gradient SaaS for tech-premium)

In round 2, cross-breed the winners: "palette of A, type of B, layout of C".

## Reading the votes

- `patterns.likedReasons` tells you *what dimension* they care about. If "type" dominates, spend round 2 on typography variations.
- `patterns.likedFonts` / `likedTech` come from live-site analysis — concrete material for the brief.
- A like with a note beats three likes without one. Quote their notes back to them.
- Dislikes with reasons are gold: they are the don'ts in the brief.
- If they liked almost everything, the board was too safe or too similar. Push more contrast next round.
