/** Turn raw votes into something an agent can reason about: what was liked, why, and what it has in common. */
export function summarizeFeedback(session, feedback, library = []) {
  const libItems = library.map((c) => ({ ...c, kind: 'component', title: c.name, source: 'library' }));
  const byId = new Map([...libItems, ...session.items].map((i) => [i.id, i]));
  const entries = Object.entries(feedback.items || {})
    .map(([id, f]) => ({ item: byId.get(id), f }))
    .filter((e) => e.item);

  const describe = ({ item, f }) => {
    const out = { id: item.id, kind: item.kind, title: item.title, source: item.source };
    if (item.liveUrl || item.url) out.url = item.liveUrl || item.url;
    if (f.star) out.star = true;
    if (f.reasons?.length) out.reasons = f.reasons;
    if (f.note) out.note = f.note;
    if (item.kind === 'style') {
      out.palette = item.style?.palette;
      out.fonts = item.style?.fonts;
      out.layout = item.style?.layout;
      out.preset = item.style?.preset || item.style?.id;
    }
    if (item.kind === 'component') out.component = item.library ? `library:${item.file}` : item.file;
    if (item.analysis) {
      out.fonts = item.analysis.fonts?.slice(0, 3).map((x) => x.family);
      out.colors = item.analysis.colors?.background?.slice(0, 4);
      out.tech = item.analysis.tech;
    }
    return out;
  };

  const liked = entries.filter((e) => e.f.vote === 1 || e.f.star);
  const disliked = entries.filter((e) => e.f.vote === -1);
  const noted = entries.filter((e) => e.f.note && e.f.vote === 0 && !e.f.star);

  const count = (list, pick) => {
    const m = new Map();
    for (const e of list) for (const k of pick(e) || []) if (k) m.set(k, (m.get(k) || 0) + 1);
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10));
  };

  const rated = new Set(entries.filter((e) => e.f.vote || e.f.star).map((e) => e.item.id));
  const unrated = session.items.filter((i) => !rated.has(i.id));
  const componentVotes = entries.filter((e) => e.item.kind === 'component').length;

  // Per-section view of the references (the main thing the user votes on).
  const sectionIds = [...new Set([...(session.sections || []).map((x) => x.id), ...session.items.filter((i) => i.section).map((i) => i.section)])];
  const bySection = Object.fromEntries(
    sectionIds.map((sid) => {
      const inSec = session.items.filter((i) => i.section === sid);
      const l = liked.filter((e) => e.item.section === sid);
      const d = disliked.filter((e) => e.item.section === sid);
      return [sid, {
        total: inSec.length,
        rated: inSec.filter((i) => rated.has(i.id)).length,
        liked: l.sort((a, b) => (b.f.star ? 1 : 0) - (a.f.star ? 1 : 0)).map(describe),
        dislikedCount: d.length,
        dislikedNotes: d.filter((e) => e.f.note || e.f.reasons?.length).map((e) => ({ title: e.item.title, note: e.f.note, reasons: e.f.reasons })),
        likedReasons: count(l, (e) => e.f.reasons),
        likedSites: count(l, (e) => [e.item.site || e.item.source]),
      }];
    }),
  );

  // Feedback on built pages: section votes (b<v>:<section>) and click-comments (p<v>:<id>),
  // each optionally carrying an action and reference images (from the board or uploaded).
  const attachments = (f) => {
    const m = f.meta || {};
    if (!m.refs?.length && !m.uploads?.length && (!m.action || m.action === 'tweak')) return {};
    return {
      action: m.action || 'tweak',
      refs: (m.refs || []).map((id) => byId.get(id)).filter(Boolean).map((i) => ({ id: i.id, title: i.title || i.name, section: i.section, image: i.image, url: i.liveUrl || i.url })),
      uploads: m.uploads || [],
    };
  };
  const builds = session.builds || [];
  const latest = builds.at(-1);
  const build = latest
    ? {
        version: latest.v,
        label: latest.label,
        sections: Object.entries(feedback.items || {})
          .filter(([k]) => k.startsWith(`b${latest.v}:`))
          .map(([k, f]) => ({ section: k.split(':').slice(1).join(':'), vote: f.vote, note: f.note, reasons: f.reasons, ...attachments(f) }))
          .filter((x) => x.vote || x.note || x.reasons?.length || x.refs?.length || x.uploads?.length),
        comments: Object.entries(feedback.items || {})
          .filter(([k]) => k.startsWith(`p${latest.v}:`))
          .map(([, f]) => ({ note: f.note, section: f.meta?.section, selector: f.meta?.selector, text: f.meta?.text, ...attachments(f) })),
        olderVersionsWithFeedback: [...new Set(Object.keys(feedback.items || {}).filter((k) => /^[bp]\d+:/.test(k)).map((k) => Number(k.slice(1).split(':')[0])))].filter((v) => v !== latest.v),
      }
    : null;

  return {
    session: session.id,
    bySection,
    build,
    round: session.round,
    submittedAt: feedback.submittedAt,
    general: feedback.general || '',
    totals: {
      items: session.items.length,
      liked: liked.length,
      disliked: disliked.length,
      starred: entries.filter((e) => e.f.star).length,
      unrated: unrated.length,
      componentVotes,
    },
    liked: liked.map(describe),
    disliked: disliked.map(describe),
    notesOnly: noted.map(describe),
    patterns: {
      likedReasons: count(liked, (e) => e.f.reasons),
      dislikedReasons: count(disliked, (e) => e.f.reasons),
      likedFonts: count(liked, (e) => (e.item.analysis?.fonts || []).map((x) => x.family).concat(e.item.style ? [e.item.style.fonts?.display, e.item.style.fonts?.body] : [])),
      dislikedFonts: count(disliked, (e) => (e.item.analysis?.fonts || []).map((x) => x.family).concat(e.item.style ? [e.item.style.fonts?.display] : [])),
      likedTech: count(liked, (e) => e.item.analysis?.tech),
      likedSources: count(liked, (e) => [e.item.source]),
      dislikedSources: count(disliked, (e) => [e.item.source]),
      likedComponentTags: count(liked.filter((e) => e.item.kind === 'component'), (e) => [e.item.category, ...(e.item.tags || [])]),
      likedLayouts: count(liked.filter((e) => e.item.kind === 'style'), (e) => [e.item.style?.layout]),
    },
  };
}

/**
 * The plan that will actually be built: Claude's per-section plan (session.plan) with the
 * user's board edits (feedback.plan) applied on top. Without a Claude plan it drafts one
 * from the likes so the board has something to show.
 */
export function effectivePlan(session, feedback = {}, library = []) {
  const claude = session.plan || { sections: [] };
  const user = feedback.plan || { sections: {} };
  const libItems = library.map((c) => ({ ...c, kind: 'component', title: c.name, source: 'library' }));
  const byId = new Map([...libItems, ...session.items].map((i) => [i.id, i]));
  const mini = (id) => {
    const it = byId.get(id);
    return it ? { id, title: it.title || it.name, source: it.source, url: it.liveUrl || it.url, image: it.image || it.images?.[0]?.src, kind: it.kind } : null;
  };
  const fb = feedback.items || {};
  const likedIn = (sid) =>
    session.items
      .filter((i) => i.section === sid && (fb[i.id]?.vote === 1 || fb[i.id]?.star))
      .sort((a, b) => (fb[b.id]?.star ? 1 : 0) - (fb[a.id]?.star ? 1 : 0))
      .map((i) => i.id);
  const ids = [...new Set([...(session.sections || []).map((x) => x.id), ...(claude.sections || []).map((x) => x.id)])];
  const sections = ids.map((sid) => {
    const c = (claude.sections || []).find((x) => x.id === sid) || { id: sid, alternates: [], components: [], analysis: null };
    const u = user.sections?.[sid] || {};
    const liked = likedIn(sid);
    const primary = u.primary || c.primary || liked[0] || null;
    const components = u.components ?? c.components ?? [];
    return {
      id: sid,
      name: (session.sections || []).find((x) => x.id === sid)?.name || sid,
      primary: mini(primary),
      alternates: (c.alternates?.length ? c.alternates : liked.filter((x) => x !== primary).slice(0, 4)).map(mini).filter(Boolean),
      extra: (u.extra || []).map(mini).filter(Boolean),
      components: components.map(mini).filter(Boolean),
      analysis: c.analysis || null,
      note: u.note || '',
      approved: Boolean(u.approved),
      likedCount: liked.length,
      changedByUser: {
        primary: Boolean(u.primary && u.primary !== c.primary),
        components: u.components != null,
        extra: Boolean(u.extra?.length),
      },
    };
  });
  const likedStyles = session.items.filter((i) => i.kind === 'style' && (fb[i.id]?.vote === 1 || fb[i.id]?.star)).map((i) => i.id);
  const styleId = user.style || claude.style || likedStyles[0] || null;
  const style = styleId ? session.items.find((i) => i.id === styleId) : null;
  return {
    drafted: !session.plan,
    summary: claude.summary || '',
    style: style ? { id: style.id, name: style.title, palette: style.style?.palette, fonts: style.style?.fonts } : null,
    styleChangedByUser: Boolean(user.style && user.style !== claude.style),
    approved: sections.length > 0 && sections.every((x) => x.approved),
    sections,
  };
}
