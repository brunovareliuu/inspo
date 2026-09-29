// Contact sheets: numbered grids of references so Claude can check, visually and in bulk,
// that every item really belongs to its section.
import { getContext } from './browser.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function contactSheets({ boardUrl, sessionId, items, perSheet = 12, cols = 4, title = '' }) {
  const context = await getContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });
  const sheets = [];
  try {
    for (let start = 0; start < items.length; start += perSheet) {
      const chunk = items.slice(start, start + perSheet);
      const cells = chunk
        .map((it, i) => {
          const src = /^https?:/.test(it.image) ? it.image : `${boardUrl}/s/${sessionId}/${it.image}`;
          return `<figure><b>#${start + i + 1}</b><img src="${esc(src)}"><figcaption>${esc(it.source)} · ${esc((it.title || '').slice(0, 60))}</figcaption></figure>`;
        })
        .join('');
      await page.setContent(`<!doctype html><html><head><style>
        body{margin:0;background:#161616;color:#eee;font:15px system-ui;padding:14px}
        h1{font-size:18px;margin:0 0 12px;font-weight:600}
        main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px}
        figure{margin:0;position:relative;background:#222;border-radius:8px;overflow:hidden}
        img{display:block;width:100%;height:300px;object-fit:contain;object-position:top;background:#fff}
        b{position:absolute;top:6px;left:6px;background:#d6ff3d;color:#000;font-size:22px;padding:2px 10px;border-radius:6px}
        figcaption{padding:6px 8px;font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      </style></head><body><h1>${esc(title)} — ${start + 1}–${start + chunk.length} of ${items.length}</h1><main>${cells}</main></body></html>`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      const buffer = await page.screenshot({ type: 'jpeg', quality: 72, fullPage: true });
      sheets.push({ buffer, labels: chunk.map((it, i) => ({ n: start + i + 1, id: it.id })) });
    }
  } finally {
    await page.close().catch(() => {});
  }
  return sheets;
}
