// End-to-end: spawn the MCP server over stdio and drive it like Claude would.
// Usage: node test/e2e.mjs [--styles-only]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stylesOnly = process.argv.includes('--styles-only');
const transport = new StdioClientTransport({
  command: 'node', args: [path.join(root, 'src/server.js')],
  env: { ...process.env, INSPO_DIR: path.join(root, '.probe/sessions'), INSPO_PORT: '4790' },
  stderr: 'inherit',
});
const client = new Client({ name: 'e2e', version: '0' });
await client.connect(transport);

const call = async (name, args = {}) => {
  const t = Date.now();
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 600000 });
  const txt = r.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  console.log(`\n── ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)${r.isError ? ' ERROR' : ''}\n${txt.slice(0, 1400)}`);
  if (r.isError) process.exitCode = 1;
  return { r, txt, json: (() => { try { return JSON.parse(txt); } catch { return null; } })() };
};

const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));

const start = await call('inspo_start', {
  title: 'Tueste',
  idea: 'Suscripción de café de especialidad mexicano: granos de productores de Veracruz, Chiapas y Oaxaca, tostados cada semana y enviados a tu casa. Público: 25-40, urbanos, les gusta el café bien hecho.',
  context: { audience: 'urbanos 25-40 en México', language: 'es-MX', keywords: ['coffee', 'subscription'] },
  copy: {
    brand: 'Tueste',
    headline: 'Café mexicano de origen, tostado *esta semana*',
    subheadline: 'Granos de pequeños productores de Chiapas, Veracruz y Oaxaca. Tostamos los lunes y llegan a tu puerta el miércoles.',
    cta: 'Arma tu suscripción', secondaryCta: 'Conoce a los productores',
    nav: ['Cafés', 'Productores', 'Suscripción', 'Historia'],
    features: [
      { title: 'Directo del productor', body: 'Pagamos 40% arriba del precio justo y te contamos de qué finca viene cada bolsa.' },
      { title: 'Tostado fresco', body: 'Nada de bodegas: tu café sale del tostador máximo 48 horas antes de enviarse.' },
      { title: 'A tu ritmo', body: 'Cada semana, cada quince días o cada mes. Pausa o cambia cuando quieras.' },
    ],
    stats: [{ value: '38', label: 'fincas aliadas' }, { value: '48 h', label: 'del tostador a tu casa' }, { value: '4.9', label: 'de 2,300 reseñas' }],
    quote: { text: 'Por fin un café que sabe a la tierra de donde viene.', author: 'Mariana R., suscriptora desde 2024' },
  },
  sections: [{ id: 'navbar' }, { id: 'hero', why: 'Primera impresión' }, { id: 'catalog' }, { id: 'footer' }],
});
const session = start.json.session;

await call('inspo_add_styles', {
  session, imageSubject: 'coffee', imagesPerStyle: 4,
  styles: (await import('../src/styles/presets.js')).STYLE_PRESETS.map((p) => ({ preset: p.id })),
});

if (!stylesOnly) {
  await call('inspo_sections', {});
  await call('inspo_harvest', { session, query: 'coffee', target: 8, maxSites: 4, sites: ['https://bluebottlecoffee.com'] });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await client.callTool({ name: 'inspo_status', arguments: { session } });
    const j = JSON.parse(st.content[0].text);
    if (j.job?.status !== 'running') { console.log('harvest', j.job?.status, JSON.stringify(j.countsBySection)); break; }
  }
  await Promise.all([
    call('inspo_search', { session, query: 'coffee', sources: ['awwwards', 'siteinspire', 'onepagelove'], limit: 6, captureLive: 2 }),
    call('inspo_search', { session, query: 'coffee branding', sources: ['dribbble', 'landbook', 'lapa'], limit: 6 }),
  ]);
  await call('inspo_capture', { session, urls: ['https://bluebottlecoffee.com', 'https://www.graza.co'], why: 'Best-in-class DTC food & coffee' });
  await call('inspo_add_images', { session, query: 'coffee farm mexico', count: 4 });
  await call('inspo_catalog');
}
const open = await call('inspo_open', { session, open: false });
console.log('\nBOARD', open.json?.url);
await call('inspo_feedback', { session });
await call('inspo_add_build', { session, html: '<!doctype html><html><body><header data-inspo="navbar">Tueste</header><section data-inspo="hero"><h1>Café</h1></section><footer data-inspo="footer">©</footer></body></html>', label: 'v1 smoke test' });
if (!stylesOnly) await call('inspo_export_pdf', { session, open: false });
await call('inspo_brief', {
  session,
  name: 'Tostado Suizo',
  summary: 'Rigor suizo con calidez de tostador: tipografía grotesca enorme, una sola señal roja, fotografía de producto honesta y mucha retícula.',
  principles: ['La tipografía es la imagen', 'Un solo color de acento, usado con disciplina', 'Fotos reales de fincas, nunca stock genérico'],
  palette: { bg: '#f3f3ef', fg: '#0d0d0d', accent: '#e2231a', muted: '#595955' },
  fonts: { display: 'Inter Tight', body: 'Inter' },
  sections: ['Hero con titular gigante', 'Tira de stats', 'Productores (grid 3)', 'Cómo funciona', 'Testimonio', 'CTA'],
  components: ['lib-text-reveal', 'lib-velocity-marquee'],
  do: ['Titulares de 2-3 líneas máximo'], dont: ['Degradados', 'Glassmorphism'],
  tokensCss: ':root{--bg:#f3f3ef;--fg:#0d0d0d;--accent:#e2231a}',
});
if (process.argv.includes('--keep')) { console.log('keeping server alive… ctrl+c'); await new Promise(() => {}); }
await client.close();
