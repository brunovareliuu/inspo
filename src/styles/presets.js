// Style directions for inspo's "Styles" engine.
//
// Each preset is a complete, opinionated visual direction. The agent proposes a
// handful of them (or custom ones built with resolveStyle) and specimen.js
// renders the user's landing page in each direction.
//
// Required-ish fields are documented on STYLE_PRESETS below. A few optional
// fields refine the rendering and are safe to omit on custom styles:
//   art         generated artwork used when there are no images
//               ('grid'|'beam'|'aurora'|'mesh'|'shapes'|'bauhaus'|'blobs'|
//                'sun-grid'|'chrome'|'terminal'|'lines'|'enso'|'halftone')
//   accentText  how the emphasized headline words are set
//               ('none'|'color'|'italic'|'gradient'|'fade'|'chrome'|
//                'highlight'|'underline'|'outline'|'cursor')
//   entrance    entrance motion flavour ('rise'|'fade'|'blur'|'snap'|'slide')
//   tilt        degrees of playful rotation for collage elements (0 = none)
//   palette.accent3  optional third accent
//   fonts.accent     optional font for emphasized words (e.g. a serif italic)

export const LAYOUTS = ['split', 'centered', 'editorial', 'bento', 'fullbleed', 'poster'];
export const IMAGE_TREATMENTS = ['none', 'grayscale', 'duotone', 'grain', 'blur-glow', 'high-contrast'];
export const TEXTURES = ['none', 'grain', 'grid', 'dots', 'noise-gradient', 'scanlines'];
export const ARTS = ['grid', 'beam', 'aurora', 'mesh', 'shapes', 'bauhaus', 'blobs', 'sun-grid', 'chrome', 'terminal', 'lines', 'enso', 'halftone'];
export const ACCENT_TEXTS = ['none', 'color', 'italic', 'gradient', 'fade', 'chrome', 'highlight', 'underline', 'outline', 'cursor'];
export const ENTRANCES = ['rise', 'fade', 'blur', 'snap', 'slide'];

export const STYLE_PRESETS = [
  {
    id: 'swiss-minimal',
    name: 'Swiss Minimal',
    vibe: 'precise, rational, confident',
    description: 'International Typographic Style: a strict grid, huge tight grotesk type, lots of air and a single signal red. Suits studios, architects, B2B tools and anyone who wants to look exact.',
    palette: { bg: '#f3f3ef', surface: '#ffffff', fg: '#0d0d0d', muted: '#595955', accent: '#e2231a', accent2: '#0d0d0d', border: '#0d0d0d24' },
    fonts: { display: 'Inter Tight', body: 'Inter', mono: 'JetBrains Mono' },
    displayWeight: 600, displayTracking: '-0.055em', displayCase: 'none',
    radius: '0px', borderWidth: '1px', shadow: 'none',
    layout: 'poster',
    imageQuery: 'minimal architecture concrete',
    imageTreatment: 'none',
    texture: 'grid',
    art: 'grid', accentText: 'color', entrance: 'slide',
    motion: 'Short, linear-ish slides on a 12-col grid; text reveals by line, no bounce, no blur.',
    references: ['experimentaljetset.nl', 'vitra.com', 'teenage.engineering'],
    goodFor: ['architecture', 'design studios', 'b2b saas', 'portfolios', 'museums'],
  },
  {
    id: 'editorial-serif',
    name: 'Editorial Serif',
    vibe: 'literate, calm, authoritative',
    description: 'A printed-magazine feel: a high-contrast display serif set large with italics, warm paper, hairline rules, captions and a drop cap. Suits media, food, craft brands and founders who sell with words.',
    palette: { bg: '#f5efe4', surface: '#fbf8f1', fg: '#1c1a16', muted: '#655d51', accent: '#9a2f1f', accent2: '#23392e', border: '#1c1a1624' },
    fonts: { display: 'Instrument Serif', body: 'Newsreader', mono: 'IBM Plex Mono' },
    displayWeight: 400, displayTracking: '-0.02em', displayCase: 'none',
    radius: '0px', borderWidth: '1px', shadow: 'none',
    layout: 'editorial',
    imageQuery: 'still life natural light film photography',
    imageTreatment: 'grain',
    texture: 'grain',
    art: 'lines', accentText: 'italic', entrance: 'fade',
    motion: 'Slow opacity fades (600-900ms), images settle with a slight scale-down; nothing flashy.',
    references: ['aeon.co', 'newyorker.com', 'kinfolk.com'],
    goodFor: ['media', 'food & drink', 'publishing', 'craft brands', 'newsletters'],
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    vibe: 'loud, honest, energetic',
    description: 'Thick black outlines, hard offset shadows, flat clashing colors and chunky type. Friendly-rebellious; suits creator tools, indie products, marketplaces and young consumer brands.',
    palette: { bg: '#f6f1e3', surface: '#ffffff', fg: '#0a0a0a', muted: '#3d3d3d', accent: '#ff5c39', accent2: '#c4f25b', accent3: '#8b7bff', border: '#0a0a0a' },
    fonts: { display: 'Archivo Black', body: 'Space Grotesk', mono: 'Space Mono' },
    displayWeight: 400, displayTracking: '-0.02em', displayCase: 'uppercase',
    radius: '10px', borderWidth: '3px', shadow: '6px 6px 0 0 #0a0a0a',
    layout: 'bento',
    imageQuery: 'colorful street portrait flash',
    imageTreatment: 'high-contrast',
    texture: 'dots',
    art: 'shapes', accentText: 'highlight', entrance: 'snap',
    motion: 'Snappy steps and hard offsets: buttons press into their shadow, cards pop in with a tiny overshoot.',
    references: ['gumroad.com', 'figma.com/community', 'brutalistwebsites.com'],
    goodFor: ['creator tools', 'marketplaces', 'indie saas', 'events', 'gen-z consumer'],
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    vibe: 'opulent, hushed, exclusive',
    description: 'Near-black warm canvas, a refined old-style serif, gold hairlines and slow, cinematic photography. Suits hospitality, fashion, jewelry, spirits and premium services.',
    palette: { bg: '#0e0d0b', surface: '#17150f', fg: '#efe7d6', muted: '#a69c89', accent: '#c9a55e', accent2: '#6f5530', border: '#efe7d624' },
    fonts: { display: 'Cormorant Garamond', body: 'Manrope', mono: 'DM Mono' },
    displayWeight: 500, displayTracking: '-0.01em', displayCase: 'none',
    radius: '0px', borderWidth: '1px', shadow: 'none',
    layout: 'centered',
    imageQuery: 'dark moody interior warm light',
    imageTreatment: 'grain',
    texture: 'grain',
    art: 'lines', accentText: 'italic', entrance: 'blur',
    motion: 'Very slow fades from soft blur, long easings (1.2s+), gentle parallax on photography.',
    references: ['aman.com', 'aesop.com', 'bottegaveneta.com'],
    goodFor: ['hospitality', 'fashion', 'jewelry', 'spirits', 'real estate'],
  },
  {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    vibe: 'dreamy, luminous, futuristic',
    description: 'Deep night background lit by blurred aurora gradients, frosted-glass panels and glowing edges. Suits AI products, consumer apps, crypto-adjacent and anything that wants to feel like the future.',
    palette: { bg: '#07071a', surface: '#ffffff0f', fg: '#f4f3ff', muted: '#a9a8c9', accent: '#8f7dff', accent2: '#3fe3d2', accent3: '#ff7ac8', border: '#ffffff1f' },
    fonts: { display: 'Sora', body: 'Outfit', mono: 'Geist Mono' },
    displayWeight: 600, displayTracking: '-0.045em', displayCase: 'none',
    radius: '22px', borderWidth: '1px', shadow: '0 30px 80px -30px #8f7dff80',
    layout: 'centered',
    imageQuery: 'abstract iridescent light gradient',
    imageTreatment: 'blur-glow',
    texture: 'noise-gradient',
    art: 'aurora', accentText: 'gradient', entrance: 'blur',
    motion: 'Drifting gradient blobs, glass cards fading up from blur, glow that follows the cursor.',
    references: ['raycast.com', 'arc.net', 'framer.com'],
    goodFor: ['ai products', 'consumer apps', 'web3', 'developer tools', 'music'],
  },
  {
    id: 'tech-noir',
    name: 'Tech Noir',
    vibe: 'focused, precise, nocturnal',
    description: 'Linear-style dark UI: near-black, crisp grotesk with tight tracking, hairline borders, a spotlight beam and product screenshots as heroes. Suits dev tools, SaaS and technical startups.',
    palette: { bg: '#08090a', surface: '#121315', fg: '#f7f8f8', muted: '#8a8f98', accent: '#7170ff', accent2: '#d0d6e0', border: '#ffffff17' },
    fonts: { display: 'Geist', body: 'Geist', mono: 'Geist Mono' },
    displayWeight: 600, displayTracking: '-0.045em', displayCase: 'none',
    radius: '10px', borderWidth: '1px', shadow: '0 0 0 1px #ffffff0a, 0 30px 60px -20px #000000e6',
    layout: 'centered',
    imageQuery: 'dark technology night city',
    imageTreatment: 'high-contrast',
    texture: 'grid',
    art: 'beam', accentText: 'fade', entrance: 'blur',
    motion: 'Crisp 200-400ms fades with slight blur, a light beam sweeping the hero, subtle border shimmer.',
    references: ['linear.app', 'vercel.com', 'resend.com'],
    goodFor: ['developer tools', 'b2b saas', 'infrastructure', 'ai platforms', 'productivity'],
  },
  {
    id: 'y2k-chrome',
    name: 'Y2K Chrome',
    vibe: 'shiny, nostalgic, hyper',
    description: 'Millennium-era optimism: liquid chrome type, iridescent silver, hot pink and electric blue, sparkles and pill buttons. Suits fashion drops, music, beauty and playful Gen-Z brands.',
    palette: { bg: '#e7e9f0', surface: '#f8f9fd', fg: '#0b0b17', muted: '#4b4d66', accent: '#ff3fb4', accent2: '#2f5bff', accent3: '#c6ff3d', border: '#0b0b1726' },
    fonts: { display: 'Unbounded', body: 'Hanken Grotesk', mono: 'Silkscreen' },
    displayWeight: 800, displayTracking: '-0.04em', displayCase: 'uppercase',
    radius: '999px', borderWidth: '1.5px', shadow: 'inset 0 1px 0 #ffffffcc, 0 14px 30px -12px #2f5bff66',
    layout: 'poster',
    imageQuery: 'fashion portrait neon chrome',
    imageTreatment: 'high-contrast',
    texture: 'noise-gradient',
    art: 'chrome', accentText: 'chrome', entrance: 'snap',
    motion: 'Bouncy scale-ins, spinning sparkles, chrome sheen sliding across type.',
    references: ['poolsuite.net', 'nothing.tech', 'skims.com'],
    goodFor: ['fashion', 'music', 'beauty', 'streetwear drops', 'nightlife'],
  },
  {
    id: 'organic-soft',
    name: 'Organic Soft',
    vibe: 'warm, gentle, grounded',
    description: 'Sun-warmed neutrals, terracotta and sage, a soft wonky serif, big rounded corners and natural photography. Suits wellness, food, skincare, D2C and slow-living brands.',
    palette: { bg: '#f4eee4', surface: '#fbf7f0', fg: '#2a2520', muted: '#6b6257', accent: '#b0532c', accent2: '#6f7f5c', accent3: '#e3b98f', border: '#2a25201f' },
    fonts: { display: 'Fraunces', body: 'DM Sans', mono: 'DM Mono' },
    displayWeight: 400, displayTracking: '-0.03em', displayCase: 'none',
    radius: '28px', borderWidth: '1px', shadow: '0 30px 60px -30px #5a3d2a4d',
    layout: 'split',
    imageQuery: 'natural light ceramics plants',
    imageTreatment: 'none',
    texture: 'grain',
    art: 'blobs', accentText: 'italic', entrance: 'rise',
    motion: 'Soft rises with long ease-out, images breathing slightly, blobs morphing slowly.',
    references: ['ritual.com', 'glossier.com', 'kinfolk.com'],
    goodFor: ['wellness', 'food & coffee', 'skincare', 'd2c', 'hospitality'],
  },
  {
    id: 'synthwave',
    name: 'Synthwave Retro-future',
    vibe: 'nostalgic, electric, cinematic',
    description: 'Eighties sci-fi: a striped sunset over a neon perspective grid, magenta and cyan glow, chrome-era display type and CRT scanlines. Suits games, music, events and nightlife.',
    palette: { bg: '#12072b', surface: '#1d0f3f', fg: '#fbeaff', muted: '#bba5d8', accent: '#ff2e88', accent2: '#22e4ff', accent3: '#ffb627', border: '#fbeaff26' },
    fonts: { display: 'Orbitron', body: 'Exo 2', mono: 'VT323' },
    displayWeight: 800, displayTracking: '0.01em', displayCase: 'uppercase',
    radius: '4px', borderWidth: '2px', shadow: '0 0 0 1px #ff2e8840, 0 0 30px -4px #ff2e8899',
    layout: 'fullbleed',
    imageQuery: 'neon city night',
    imageTreatment: 'duotone',
    texture: 'scanlines',
    art: 'sun-grid', accentText: 'gradient', entrance: 'blur',
    motion: 'Grid scrolling toward the horizon, neon flicker on load, glitchy slide-ins.',
    references: ['cyberpunk.net', 'kavinsky.com', 'newretrowave.com'],
    goodFor: ['games', 'music', 'events', 'nightlife', 'esports'],
  },
  {
    id: 'playful-pop',
    name: 'Playful Pop',
    vibe: 'cheerful, bouncy, friendly',
    description: 'Candy colors, chunky rounded grotesk, sticker-like cards with soft offset shadows and doodle shapes. Suits consumer apps, education, kids, food delivery and community products.',
    palette: { bg: '#fff5e6', surface: '#ffffff', fg: '#1e1b3a', muted: '#58547a', accent: '#ff6b4a', accent2: '#7a5cff', accent3: '#ffd23f', border: '#1e1b3a' },
    fonts: { display: 'Bricolage Grotesque', body: 'Figtree', mono: 'Azeret Mono' },
    displayWeight: 800, displayTracking: '-0.045em', displayCase: 'none',
    radius: '26px', borderWidth: '2px', shadow: '0 6px 0 0 #1e1b3a',
    layout: 'bento',
    imageQuery: 'colorful happy people bright',
    imageTreatment: 'none',
    texture: 'none',
    art: 'shapes', accentText: 'underline', entrance: 'snap',
    motion: 'Springy scale-ins with overshoot, wiggling stickers, buttons that squish on press.',
    references: ['duolingo.com', 'headspace.com', 'mailchimp.com'],
    goodFor: ['consumer apps', 'education', 'kids', 'food delivery', 'community'],
  },
  {
    id: 'terminal-mono',
    name: 'Terminal Mono',
    vibe: 'raw, technical, hacker-honest',
    description: 'Everything monospaced: phosphor green on black, ASCII rules, blinking cursors and code-as-hero. Suits CLIs, dev tools, security, infra and technical newsletters.',
    palette: { bg: '#0a0e0b', surface: '#101712', fg: '#d3f5cf', muted: '#86a882', accent: '#4af626', accent2: '#f5c542', border: '#d3f5cf29' },
    fonts: { display: 'JetBrains Mono', body: 'IBM Plex Mono', mono: 'JetBrains Mono' },
    displayWeight: 800, displayTracking: '-0.04em', displayCase: 'none',
    radius: '0px', borderWidth: '1px', shadow: 'none',
    layout: 'split',
    imageQuery: 'circuit board macro',
    imageTreatment: 'duotone',
    texture: 'scanlines',
    art: 'terminal', accentText: 'cursor', entrance: 'snap',
    motion: 'Typewriter reveals, step-timed blinking cursor, instant state changes instead of easing.',
    references: ['warp.dev', 'charm.sh', 'ghostty.org'],
    goodFor: ['cli tools', 'developer tools', 'security', 'infrastructure', 'tech newsletters'],
  },
  {
    id: 'architectural-mono',
    name: 'Architectural Monochrome',
    vibe: 'austere, monumental, exacting',
    description: 'Greyscale photography at full bleed, thin wide uppercase type, generous margins and hairline dividers, like an architecture monograph. Suits architects, real estate, furniture and industrial brands.',
    palette: { bg: '#e8e6e1', surface: '#f2f0ec', fg: '#121212', muted: '#5b5955', accent: '#121212', accent2: '#8c8984', border: '#12121229' },
    fonts: { display: 'Archivo', body: 'Archivo', mono: 'Martian Mono' },
    displayWeight: 300, displayTracking: '-0.02em', displayCase: 'uppercase',
    radius: '0px', borderWidth: '1px', shadow: 'none',
    layout: 'fullbleed',
    imageQuery: 'brutalist architecture black and white',
    imageTreatment: 'grayscale',
    texture: 'none',
    art: 'lines', accentText: 'none', entrance: 'fade',
    motion: 'Slow curtain reveals, images scaling from 1.08 to 1, precise hairlines drawing in.',
    references: ['big.dk', 'johnpawson.com', 'zaha-hadid.com'],
    goodFor: ['architecture', 'real estate', 'furniture', 'industrial', 'galleries'],
  },
  {
    id: 'wabi-sabi',
    name: 'Wabi-Sabi Zen',
    vibe: 'quiet, imperfect, meditative',
    description: 'Japanese restraint: rice-paper neutrals, a gentle mincho serif, asymmetric white space, an ink ensō and earthy muted photography. Suits tea, ceramics, retreats, skincare and mindful products.',
    palette: { bg: '#eee8dc', surface: '#f6f2ea', fg: '#2f2b25', muted: '#6d655a', accent: '#8b5a36', accent2: '#5b6a50', border: '#2f2b2524' },
    fonts: { display: 'Shippori Mincho', body: 'Zen Kaku Gothic New', mono: 'Spline Sans Mono' },
    displayWeight: 500, displayTracking: '-0.01em', displayCase: 'none',
    radius: '2px', borderWidth: '1px', shadow: 'none',
    layout: 'editorial',
    imageQuery: 'japanese ceramics tea minimal',
    imageTreatment: 'grain',
    texture: 'grain',
    art: 'enso', accentText: 'color', entrance: 'fade',
    motion: 'Very slow fades, generous delays between elements, ink strokes that draw themselves.',
    references: ['muji.com', 'kinto.co.jp', 'aesop.com'],
    goodFor: ['tea & coffee', 'ceramics', 'retreats', 'skincare', 'mindfulness'],
  },
  {
    id: 'gradient-saas',
    name: 'Gradient SaaS',
    vibe: 'optimistic, polished, trustworthy',
    description: 'Stripe-like clarity: crisp white surfaces, deep navy text, a vivid mesh gradient slicing the hero, layered product cards with soft shadows. Suits fintech, B2B SaaS and platforms that must feel reliable and ambitious.',
    palette: { bg: '#f6f9fc', surface: '#ffffff', fg: '#0a2540', muted: '#425466', accent: '#635bff', accent2: '#00c2ff', accent3: '#ff5996', border: '#0a25401a' },
    fonts: { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', mono: 'Source Code Pro' },
    displayWeight: 700, displayTracking: '-0.04em', displayCase: 'none',
    radius: '12px', borderWidth: '1px', shadow: '0 30px 60px -12px #32325d40, 0 18px 36px -18px #0000004d',
    layout: 'split',
    imageQuery: 'modern office people laptop',
    imageTreatment: 'none',
    texture: 'noise-gradient',
    art: 'mesh', accentText: 'gradient', entrance: 'rise',
    motion: 'Animated mesh gradient, cards floating up in stagger, numbers counting up.',
    references: ['stripe.com', 'plaid.com', 'mercury.com'],
    goodFor: ['fintech', 'b2b saas', 'platforms', 'payments', 'analytics'],
  },
  {
    id: 'bauhaus-geometric',
    name: 'Bauhaus Geometric',
    vibe: 'constructive, bold, primary',
    description: 'Primary red, blue and yellow, circles, quarter-circles and bars on warm paper, geometric sans in caps. Suits cultural spaces, education, design-forward consumer goods and bold kids brands.',
    palette: { bg: '#f1ead8', surface: '#faf6ec', fg: '#141414', muted: '#524d44', accent: '#d4322b', accent2: '#1d4f9c', accent3: '#f2b632', border: '#1414142e' },
    fonts: { display: 'Jost', body: 'Jost', mono: 'Red Hat Mono' },
    displayWeight: 700, displayTracking: '-0.02em', displayCase: 'uppercase',
    radius: '0px', borderWidth: '2px', shadow: 'none',
    layout: 'poster',
    imageQuery: 'geometric architecture shadows',
    imageTreatment: 'grayscale',
    texture: 'grain',
    art: 'bauhaus', accentText: 'color', entrance: 'slide',
    motion: 'Shapes rotating and sliding into a composition, hard stops, mechanical timing.',
    references: ['bauhaus-dessau.de', 'pentagram.com', 'hay.dk'],
    goodFor: ['culture & museums', 'education', 'furniture', 'toys', 'design goods'],
  },
  {
    id: 'magazine-maximalist',
    name: 'Magazine Maximalist',
    vibe: 'loud, eclectic, collage-rich',
    description: 'A fashion-magazine collage: towering condensed caps mixed with a Bodoni italic, clashing color blocks, tilted photos, halftones and stickers. Suits fashion, culture, festivals and bold D2C brands.',
    palette: { bg: '#f2e8da', surface: '#fffaf2', fg: '#160f0b', muted: '#5c4c41', accent: '#ff3d1f', accent2: '#1f3cff', accent3: '#ffcf1f', border: '#160f0b' },
    fonts: { display: 'Anton', body: 'Libre Franklin', mono: 'Space Mono', accent: 'Bodoni Moda' },
    displayWeight: 400, displayTracking: '0em', displayCase: 'uppercase',
    radius: '0px', borderWidth: '2px', shadow: 'none',
    layout: 'bento',
    imageQuery: 'fashion editorial color portrait',
    imageTreatment: 'high-contrast',
    texture: 'grain',
    art: 'halftone', accentText: 'italic', entrance: 'snap', tilt: 2.5,
    motion: 'Cut-and-paste: elements slam in with slight rotation, marquees, stickers that spin.',
    references: ['itsnicethat.com', 'dazeddigital.com', 'wallpaper.com'],
    goodFor: ['fashion', 'culture', 'festivals', 'media', 'bold d2c'],
  },
];

// Font metadata: available weights ([min,max] = variable range, or explicit
// list), italic availability and an average glyph width factor (em per char,
// lowercase at 400) used to size headlines without overflow.
export const FONT_META = {
  'Inter Tight': { w: [100, 900], ital: true, width: 0.5 },
  'Inter': { w: [100, 900], ital: true, width: 0.53 },
  'JetBrains Mono': { w: [100, 800], ital: true, width: 0.6, mono: true },
  'Instrument Serif': { w: [400], ital: true, width: 0.42 },
  'Newsreader': { w: [200, 800], ital: true, width: 0.47 },
  'Source Serif 4': { w: [200, 900], ital: true, width: 0.5 },
  'IBM Plex Mono': { w: [100, 200, 300, 400, 500, 600, 700], ital: true, width: 0.6, mono: true },
  'Archivo Black': { w: [400], ital: false, width: 0.66 },
  'Space Grotesk': { w: [300, 700], ital: false, width: 0.55 },
  'Space Mono': { w: [400, 700], ital: true, width: 0.61, mono: true },
  'Cormorant Garamond': { w: [300, 700], ital: true, width: 0.42 },
  'Manrope': { w: [200, 800], ital: false, width: 0.56 },
  'DM Mono': { w: [300, 400, 500], ital: true, width: 0.6, mono: true },
  'Sora': { w: [100, 800], ital: false, width: 0.6 },
  'Outfit': { w: [100, 900], ital: false, width: 0.52 },
  'Geist': { w: [100, 900], ital: false, width: 0.54 },
  'Geist Mono': { w: [100, 900], ital: false, width: 0.6, mono: true },
  'Unbounded': { w: [200, 900], ital: false, width: 0.74 },
  'Hanken Grotesk': { w: [100, 900], ital: true, width: 0.52 },
  'Silkscreen': { w: [400, 700], ital: false, width: 0.75, mono: true },
  'Fraunces': { w: [100, 900], ital: true, width: 0.53 },
  'DM Sans': { w: [100, 1000], ital: true, width: 0.53 },
  'Orbitron': { w: [400, 900], ital: false, width: 0.74 },
  'Exo 2': { w: [100, 900], ital: true, width: 0.53 },
  'VT323': { w: [400], ital: false, width: 0.45, mono: true },
  'Bricolage Grotesque': { w: [200, 800], ital: false, width: 0.52 },
  'Figtree': { w: [300, 900], ital: true, width: 0.52 },
  'Azeret Mono': { w: [100, 900], ital: true, width: 0.6, mono: true },
  'Archivo': { w: [100, 900], ital: true, width: 0.55 },
  'Martian Mono': { w: [100, 800], ital: false, width: 0.66, mono: true },
  'Shippori Mincho': { w: [400, 500, 600, 700, 800], ital: false, width: 0.52 },
  'Zen Kaku Gothic New': { w: [300, 400, 500, 700, 900], ital: false, width: 0.52 },
  'Spline Sans Mono': { w: [300, 700], ital: true, width: 0.6, mono: true },
  'Plus Jakarta Sans': { w: [200, 800], ital: true, width: 0.56 },
  'Source Code Pro': { w: [200, 900], ital: true, width: 0.6, mono: true },
  'Jost': { w: [100, 900], ital: true, width: 0.48 },
  'Red Hat Mono': { w: [300, 700], ital: true, width: 0.6, mono: true },
  'Anton': { w: [400], ital: false, width: 0.42 },
  'Libre Franklin': { w: [100, 900], ital: true, width: 0.54 },
  'Bodoni Moda': { w: [400, 900], ital: true, width: 0.5 },
  'Courier Prime': { w: [400, 700], ital: true, width: 0.6, mono: true },
  'Playfair Display': { w: [400, 900], ital: true, width: 0.5 },
  'DM Serif Display': { w: [400], ital: true, width: 0.5 },
  'Bebas Neue': { w: [400], ital: false, width: 0.4 },
  'Syne': { w: [400, 800], ital: false, width: 0.6 },
  'Poppins': { w: [100, 200, 300, 400, 500, 600, 700, 800, 900], ital: true, width: 0.58 },
  'Montserrat': { w: [100, 900], ital: true, width: 0.6 },
  'Roboto': { w: [100, 900], ital: true, width: 0.53 },
  'Work Sans': { w: [100, 900], ital: true, width: 0.55 },
  'Lora': { w: [400, 700], ital: true, width: 0.52 },
  'EB Garamond': { w: [400, 800], ital: true, width: 0.45 },
};

const DEFAULT_STYLE = {
  id: 'custom-style',
  name: 'Custom Style',
  vibe: 'clean, modern, clear',
  description: 'A custom direction.',
  palette: { bg: '#f7f7f5', surface: '#ffffff', fg: '#111111', muted: '#5f5f5f', accent: '#3355ff', accent2: '#111111', border: '#1111111f' },
  fonts: { display: 'Inter Tight', body: 'Inter', mono: 'JetBrains Mono' },
  displayWeight: 600, displayTracking: '-0.04em', displayCase: 'none',
  radius: '12px', borderWidth: '1px', shadow: 'none',
  layout: 'split',
  imageQuery: '',
  imageTreatment: 'none',
  texture: 'none',
  art: 'grid', accentText: 'color', entrance: 'rise', tilt: 0,
  motion: 'Subtle fade-and-rise on load.',
  references: [],
  goodFor: [],
};

// Sensible art/texture pairing when a custom style gives a layout but no art.
const ART_BY_TEXTURE = { grid: 'grid', dots: 'shapes', scanlines: 'terminal', 'noise-gradient': 'mesh', grain: 'lines', none: 'grid' };

export function getPreset(id) {
  if (!id) return null;
  const key = String(id).toLowerCase().trim();
  const p = STYLE_PRESETS.find((s) => s.id === key) || STYLE_PRESETS.find((s) => slugify(s.name) === slugify(key));
  return p ? clone(p) : null;
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/**
 * resolveStyle(input) -> complete style object.
 *   'swiss-minimal'                          preset by id
 *   { preset:'swiss-minimal', palette:{accent:'#00f'}, name:'Swiss Blue' }
 *   { name:'My Look', palette:{bg,fg,accent}, fonts:{display}, layout:'bento' }  fully custom
 * Palette and fonts are deep-merged; everything else is shallow-overridden.
 * Missing palette keys on custom styles are derived from bg/fg/accent.
 */
export function resolveStyle(input) {
  if (input == null) return clone(STYLE_PRESETS[0]);
  if (typeof input === 'string') input = { preset: input };
  if (typeof input !== 'object') return clone(STYLE_PRESETS[0]);

  const { preset: presetId, palette = {}, fonts = {}, ...rest } = input;
  const base = presetId ? getPreset(presetId) : null;
  const isCustom = !base;
  const start = base || clone(DEFAULT_STYLE);

  const out = { ...start };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && k !== 'palette' && k !== 'fonts') out[k] = Array.isArray(v) ? [...v] : v;
  }

  // Palette: preset values, then overrides. Custom styles derive missing keys.
  const pal = { ...(isCustom ? {} : start.palette) };
  for (const [k, v] of Object.entries(palette || {})) if (typeof v === 'string' && v.trim()) pal[k] = v.trim();
  if (isCustom) {
    const d = DEFAULT_STYLE.palette;
    const bg = pal.bg || d.bg;
    const fg = pal.fg || (isDark(bg) ? '#f5f5f5' : d.fg);
    pal.bg = bg;
    pal.fg = fg;
    pal.surface = pal.surface || mixHex(bg, isDark(bg) ? '#ffffff' : '#ffffff', isDark(bg) ? 0.05 : 0.6) || d.surface;
    pal.muted = pal.muted || mixHex(fg, bg, 0.42) || d.muted;
    pal.accent = pal.accent || (isDark(bg) ? '#7c8cff' : d.accent);
    pal.accent2 = pal.accent2 || fg;
    pal.border = pal.border || (toHex6(fg) ? toHex6(fg) + '22' : d.border);
  }
  out.palette = pal;

  out.fonts = { ...(isCustom ? DEFAULT_STYLE.fonts : start.fonts) };
  for (const [k, v] of Object.entries(fonts || {})) if (typeof v === 'string' && v.trim()) out.fonts[k] = v.trim();
  if (fonts && fonts.display && !fonts.body && isCustom) out.fonts.body = DEFAULT_STYLE.fonts.body;

  // Validate enums.
  if (!LAYOUTS.includes(out.layout)) out.layout = start.layout || 'split';
  if (!IMAGE_TREATMENTS.includes(out.imageTreatment)) out.imageTreatment = 'none';
  if (!TEXTURES.includes(out.texture)) out.texture = 'none';
  if (!ARTS.includes(out.art)) out.art = ART_BY_TEXTURE[out.texture] || 'grid';
  if (!ACCENT_TEXTS.includes(out.accentText)) out.accentText = 'color';
  if (!ENTRANCES.includes(out.entrance)) out.entrance = 'rise';
  if (!['none', 'uppercase'].includes(out.displayCase)) out.displayCase = 'none';
  out.displayWeight = Number(out.displayWeight) || 600;
  out.tilt = Number(out.tilt) || 0;
  for (const k of ['radius', 'borderWidth', 'displayTracking']) if (typeof out[k] === 'number') out[k] = out[k] + (k === 'displayTracking' ? 'em' : 'px');
  if (!Array.isArray(out.references)) out.references = [];
  if (!Array.isArray(out.goodFor)) out.goodFor = [];

  // Identity.
  const nameGiven = typeof input.name === 'string' && input.name.trim();
  if (isCustom) {
    out.id = slugify(input.id) || slugify(input.name) || 'custom-style';
    if (!nameGiven) out.name = input.id ? String(input.id) : 'Custom Style';
  } else {
    out.preset = start.id;
    out.id = input.id ? slugify(input.id) : nameGiven ? slugify(input.name) : start.id;
  }
  return out;
}

// ---- small color helpers (shared with specimen.js) ----

export function parseColor(c) {
  if (typeof c !== 'string') return null;
  const s = c.trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    let a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  return null;
}

export function toHex6(c) {
  const p = parseColor(c);
  if (!p) return null;
  return '#' + p.slice(0, 3).map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function mixHex(a, b, t) {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return null;
  return toHex6(`rgb(${A[0] + (B[0] - A[0]) * t}, ${A[1] + (B[1] - A[1]) * t}, ${A[2] + (B[2] - A[2]) * t})`);
}

/** Composite a (possibly translucent) color over an opaque background. */
export function flatten(c, over = '#ffffff') {
  const p = parseColor(c), o = parseColor(over) || [255, 255, 255, 1];
  if (!p) return null;
  const a = p[3];
  return toHex6(`rgb(${p[0] * a + o[0] * (1 - a)}, ${p[1] * a + o[1] * (1 - a)}, ${p[2] * a + o[2] * (1 - a)})`);
}

export function luminance(c) {
  const p = parseColor(c);
  if (!p) return 0.5;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isDark(c) { return luminance(c) < 0.2; }

function clone(o) { return JSON.parse(JSON.stringify(o)); }
