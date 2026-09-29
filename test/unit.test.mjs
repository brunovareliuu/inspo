// Offline unit tests: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.INSPO_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'inspo-test-'));
const { STYLE_PRESETS, resolveStyle, contrastRatio } = await import('../src/styles/presets.js');
const { renderSpecimen, googleFontsHref, styleTokensCSS } = await import('../src/styles/specimen.js');
const { createSession, addItems, saveFeedback, loadFeedback, loadSession, slugify } = await import('../src/session.js');
const { summarizeFeedback } = await import('../src/feedback.js');
const { listLibrary, parseMeta } = await import('../src/components.js');

test('every preset resolves and renders without images', () => {
  for (const p of STYLE_PRESETS) {
    const style = resolveStyle(p.id);
    const html = renderSpecimen({ style, copy: { brand: 'Tueste', headline: 'Café de *origen*' } });
    assert.match(html, /<!doctype html>/i, p.id);
    assert.match(html, /<em>origen<\/em>/, p.id);
    assert.ok(html.includes(googleFontsHref(style).replace(/&/g, '&amp;')), `${p.id} links its fonts`);
    assert.ok(contrastRatio(style.palette.fg, style.palette.bg) >= 4.5, `${p.id} fg/bg contrast`);
  }
});

test('presets are distinct and complete', () => {
  const ids = new Set(STYLE_PRESETS.map((p) => p.id));
  assert.equal(ids.size, STYLE_PRESETS.length);
  assert.ok(STYLE_PRESETS.length >= 12);
  for (const p of STYLE_PRESETS) for (const k of ['bg', 'fg', 'accent']) assert.ok(p.palette[k], `${p.id}.${k}`);
});

test('custom styles and overrides merge', () => {
  const s = resolveStyle({ preset: 'swiss-minimal', palette: { accent: '#0055ff' }, name: 'Swiss Blue' });
  assert.equal(s.palette.accent, '#0055ff');
  assert.equal(s.palette.bg, STYLE_PRESETS.find((p) => p.id === 'swiss-minimal').palette.bg);
  const c = resolveStyle({ name: 'Night Shift', palette: { bg: '#050505' } });
  assert.equal(c.id, 'night-shift');
  assert.ok(contrastRatio(c.palette.fg, c.palette.bg) > 7);
  assert.match(styleTokensCSS(c), /--bg:#050505/);
});

test('specimen escapes user copy', () => {
  const html = renderSpecimen({ style: resolveStyle('tech-noir'), copy: { brand: '<script>alert(1)</script>', headline: '"><img src=x onerror=alert(1)>' }, images: [{ src: 'javascript:alert(1)', alt: 'x' }] });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('javascript:alert'));
});

test('session lifecycle, dedupe and feedback summary', async () => {
  const s = await createSession({ idea: 'Café de especialidad', title: 'Tueste Café' });
  assert.equal(s.id, 'tueste-cafe');
  const added = await addItems(s.id, [
    { kind: 'reference', source: 'awwwards', title: 'A', url: 'https://a.com', image: 'assets/a.jpg', analysis: { fonts: [{ family: 'Inter', role: 'body' }], tech: ['GSAP'] } },
    { kind: 'reference', source: 'dribbble', title: 'A again', url: 'https://a.com', image: 'assets/b.jpg' },
    { kind: 'style', title: 'Swiss', style: resolveStyle('swiss-minimal'), file: 'styles/x.html' },
  ]);
  assert.equal(added.length, 2, 'duplicate url skipped');
  const [ref, style] = added;
  await saveFeedback(s.id, { items: { [ref.id]: { vote: 1, reasons: ['type'], note: 'love it' }, [style.id]: { vote: -1 }, 'lib-tilt-card': { vote: 1, star: true } }, general: 'more warmth', submit: true });
  const fb = await loadFeedback(s.id);
  assert.ok(fb.submittedAt);
  const sum = summarizeFeedback(await loadSession(s.id), fb, [{ id: 'lib-tilt-card', name: 'Tilt Card', category: 'motion', tags: ['css'], file: 'tilt-card.html', library: true }]);
  assert.equal(sum.totals.liked, 2);
  assert.equal(sum.totals.disliked, 1);
  assert.equal(sum.general, 'more warmth');
  assert.deepEqual(sum.patterns.likedReasons, { type: 1 });
  assert.equal(sum.patterns.likedTech.GSAP, 1);
  assert.equal(sum.patterns.dislikedFonts['Inter Tight'], 1);
});

test('feedback input is sanitized', async () => {
  const s = await createSession({ idea: 'x', title: 'sanitize' });
  await saveFeedback(s.id, { items: { a: { vote: 99, note: 'n'.repeat(5000), reasons: 'nope' } } });
  const fb = await loadFeedback(s.id);
  assert.equal(fb.items.a.vote, 0);
  assert.equal(fb.items.a.note.length, 2000);
  assert.deepEqual(fb.items.a.reasons, []);
});

test('component library has valid metadata', async () => {
  const lib = await listLibrary();
  assert.ok(lib.length >= 18, `found ${lib.length}`);
  for (const c of lib) {
    assert.ok(['3d', 'motion', 'layout', 'text', 'cursor'].includes(c.category), `${c.id} category`);
    assert.ok(c.description.length > 20, `${c.id} description`);
  }
  assert.equal(parseMeta('<!--inspo {"name":"X"} -->', 'x').name, 'X');
});

test('slugify handles accents', () => {
  assert.equal(slugify('Café Ñandú & Co.'), 'cafe-nandu-co');
});

test('section taxonomy: every regex compiles and recommended sets are valid', async () => {
  const { SECTION_TYPES, RECOMMENDED, SECTION_IDS } = await import('../src/sections.js');
  for (const [id, t] of Object.entries(SECTION_TYPES)) {
    if (t.rx) assert.doesNotThrow(() => new RegExp(`\\b(${t.rx})`, 'i'), id);
    if (t.link) assert.doesNotThrow(() => new RegExp(`(^|[/\\s-])(${t.link})([/\\s-]|$)`, 'i'), id);
    assert.ok(t.dribbble?.length, `${id} has gallery queries`);
    assert.ok(t.name.en && t.name.es, `${id} names`);
  }
  for (const [kind, ids] of Object.entries(RECOMMENDED)) for (const id of ids) assert.ok(SECTION_IDS.includes(id), `${kind}: ${id}`);
});

test('section crops of one site are kept apart; feedback groups by section and build', async () => {
  const s = await createSession({ idea: 'x', title: 'sections', sections: [{ id: 'hero', name: 'Hero' }, { id: 'footer', name: 'Footer' }] });
  const added = await addItems(s.id, [
    { kind: 'reference', source: 'live', section: 'hero', url: 'https://a.com', image: 'assets/h.jpg' },
    { kind: 'reference', source: 'live', section: 'footer', url: 'https://a.com', image: 'assets/f.jpg' },
    { kind: 'reference', source: 'live', section: 'footer', url: 'https://a.com', image: 'assets/f2.jpg' },
  ]);
  assert.equal(added.length, 2, 'same site, different sections kept; same section deduped');
  const [hero, footer] = added;
  const { updateSession } = await import('../src/session.js');
  await updateSession(s.id, (ss) => { ss.builds = [{ v: 1, label: 'first', kind: 'html', src: 'builds/v1.html' }]; });
  await saveFeedback(s.id, {
    items: {
      [hero.id]: { vote: 1, star: true, note: 'big type' },
      [footer.id]: { vote: -1, note: 'too busy' },
      'b1:hero': { vote: -1, note: 'headline too small' },
      'p1:abc': { note: 'make this red', meta: { version: 1, section: 'hero', selector: 'h1', text: 'Hello', evil: '<x>' } },
    },
  });
  const sum = summarizeFeedback(await loadSession(s.id), await loadFeedback(s.id), []);
  assert.equal(sum.bySection.hero.liked.length, 1);
  assert.equal(sum.bySection.footer.dislikedCount, 1);
  assert.equal(sum.bySection.footer.dislikedNotes[0].note, 'too busy');
  assert.deepEqual(sum.build.sections, [{ section: 'hero', vote: -1, note: 'headline too small', reasons: [] }]);
  assert.equal(sum.build.comments[0].selector, 'h1');
  assert.equal((await loadFeedback(s.id)).items['p1:abc'].meta.evil, undefined, 'meta is whitelisted');
  await saveFeedback(s.id, { items: { 'p1:abc': { deleted: true } } });
  assert.equal((await loadFeedback(s.id)).items['p1:abc'], undefined, 'comments can be deleted');
});

test('gallery cards must show the section they are filed under', async () => {
  const { cardMatchesSection } = await import('../src/sections.js');
  assert.ok(cardMatchesSection('footer', { title: 'Website footer design', tags: 'footer web ui' }));
  assert.ok(!cardMatchesSection('footer', { title: 'Coffee landing page', tags: 'hero homepage web' }));
  assert.ok(!cardMatchesSection('navbar', { title: 'Tab bar', tags: 'mobile app ios navigation bottom nav' }));
  assert.ok(cardMatchesSection('testimonials', { title: 'Customer reviews section', tags: 'saas website' }));
});

test('plan: user edits win over Claude, drafts come from likes, removed refs stay blocked', async () => {
  const { effectivePlan } = await import('../src/feedback.js');
  const { updateSession, removeItems } = await import('../src/session.js');
  const s = await createSession({ idea: 'x', title: 'plan', sections: [{ id: 'hero', name: 'Hero' }, { id: 'footer', name: 'Footer' }] });
  const [a, b, c, f] = await addItems(s.id, ['a', 'b', 'c'].map((k) => ({ kind: 'reference', source: 'dribbble', section: 'hero', url: `https://d/${k}`, title: k, image: `assets/${k}.jpg` }))
    .concat([{ kind: 'reference', source: 'live', section: 'footer', url: 'https://x.com', title: 'f', image: 'assets/f.jpg' }]));
  await saveFeedback(s.id, { items: { [a.id]: { vote: 1 }, [b.id]: { vote: 1, star: true }, [f.id]: { vote: 1 } } });
  let plan = effectivePlan(await loadSession(s.id), await loadFeedback(s.id));
  assert.equal(plan.drafted, true);
  assert.equal(plan.sections.find((x) => x.id === 'hero').primary.id, b.id, 'draft picks the starred like');

  await updateSession(s.id, (ss) => { ss.plan = { summary: 'warm', sections: [{ id: 'hero', primary: a.id, alternates: [b.id], components: ['lib-x'], analysis: { summary: 'big serif' } }] }; });
  await saveFeedback(s.id, { plan: { sections: { hero: { primary: c.id, extra: [a.id], note: 'bigger', approved: true } } } });
  plan = effectivePlan(await loadSession(s.id), await loadFeedback(s.id), [{ id: 'lib-x', name: 'X', file: 'x.html' }]);
  const hero = plan.sections.find((x) => x.id === 'hero');
  assert.equal(plan.drafted, false);
  assert.equal(hero.primary.id, c.id);
  assert.equal(hero.changedByUser.primary, true);
  assert.deepEqual(hero.extra.map((x) => x.id), [a.id]);
  assert.equal(hero.components[0].title, 'X', 'Claude components kept when the user did not touch them');
  assert.equal(hero.analysis.summary, 'big serif');
  assert.equal(hero.approved, true);
  assert.equal(plan.sections.find((x) => x.id === 'footer').primary.id, f.id, 'unplanned sections fall back to likes');

  assert.equal(await removeItems(s.id, [c.id]), 1);
  const again = await addItems(s.id, [{ kind: 'reference', source: 'dribbble', section: 'hero', url: 'https://d/c', image: 'assets/c2.jpg' }]);
  assert.equal(again.length, 0, 'removed reference is blocked');
});

test('app screens: platform-aware queries and filters', async () => {
  const { sectionQueries, cardMatchesSection, SECTION_TYPES, RECOMMENDED } = await import('../src/sections.js');
  assert.ok(SECTION_TYPES.dashboard.screen && !SECTION_TYPES.footer.screen);
  assert.equal(sectionQueries('dashboard', { platform: 'web', industry: 'logistics' })[0], 'logistics saas dashboard');
  assert.equal(sectionQueries('appnav', { platform: 'mobile' })[0], 'mobile app tab bar');
  assert.ok(cardMatchesSection('dashboard', { title: 'SaaS dashboard for payments' }, 'web'));
  assert.ok(!cardMatchesSection('dashboard', { title: 'Finance app', tags: 'mobile app ios dashboard' }, 'web'), 'mobile shots are not web screens');
  assert.ok(cardMatchesSection('apphome', { title: 'Coffee ordering app', tags: 'mobile app ios' }, 'mobile'));
  assert.ok(!cardMatchesSection('apphome', { title: 'Web dashboard home', tags: 'saas web' }, 'mobile'), 'web screens are not mobile screens');
  for (const k of ['webapp', 'admin', 'mobile']) assert.ok(RECOMMENDED[k].every((id) => SECTION_TYPES[id]?.screen), k);
});

test('page comments carry an action and safe attachments', async () => {
  const s = await createSession({ idea: 'x', title: 'attach' });
  const [ref] = await addItems(s.id, [{ kind: 'reference', source: 'maxibestof', section: 'footer', url: 'https://m/f', image: 'assets/f.jpg', title: 'Big footer' }]);
  const { updateSession } = await import('../src/session.js');
  await updateSession(s.id, (ss) => { ss.builds = [{ v: 1, kind: 'html', src: 'builds/v1.html' }]; });
  await saveFeedback(s.id, { items: {
    'b1:footer': { note: 'make it like this', meta: { version: 1, section: 'footer', action: 'replace', refs: [ref.id, '../evil'], uploads: ['assets/u-abc123.png', '/etc/passwd', 'assets/x.png'] } },
    'p1:zz': { note: 'add this above', meta: { version: 1, section: 'footer', action: 'nuke', refs: [ref.id] } },
  } });
  const fb = await loadFeedback(s.id);
  assert.deepEqual(fb.items['b1:footer'].meta.uploads, ['assets/u-abc123.png'], 'only uploaded assets');
  assert.deepEqual(fb.items['b1:footer'].meta.refs, [ref.id], 'no path tricks in refs');
  assert.equal(fb.items['p1:zz'].meta.action, 'tweak', 'unknown action falls back to tweak');
  const sum = summarizeFeedback(await loadSession(s.id), fb, []);
  const sec = sum.build.sections.find((x) => x.section === 'footer');
  assert.equal(sec.action, 'replace');
  assert.equal(sec.refs[0].title, 'Big footer');
  assert.equal(sec.uploads[0], 'assets/u-abc123.png');
});
