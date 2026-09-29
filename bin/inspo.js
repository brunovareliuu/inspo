#!/usr/bin/env node
// inspo CLI: open the board without Claude, check your setup, or log in to Mobbin.
import { startBoard, boardUrl, openInBrowser } from '../src/board/server.js';
import { listSessions, latestSessionId, SESSIONS_DIR } from '../src/session.js';

const [cmd = 'help', ...args] = process.argv.slice(2);

const help = `inspo — design research board

  inspo serve [session]   Open the voting board for a session (default: latest in ./.inspo)
  inspo sessions          List sessions in this folder
  inspo login [mobbin]    Log in to Mobbin once (visible browser, saved in ~/.inspo/profile)
  inspo doctor            Check browser, network and sources
`;

async function doctor() {
  const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
  const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  console.log('inspo doctor\n');
  const [major] = process.versions.node.split('.').map(Number);
  major >= 20 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} (need 20+)`);

  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome' });
    ok('Google Chrome found (used for scraping)');
  } catch {
    try {
      browser = await chromium.launch();
      ok('Playwright Chromium found');
    } catch {
      bad('No browser. Install Chrome or run: npx playwright install chromium');
    }
  }
  await browser?.close();

  try {
    const r = await fetch('https://api.openverse.org/v1/images/?q=architecture&page_size=1');
    r.ok ? ok('Openverse reachable (style images)') : bad(`Openverse returned ${r.status}`);
  } catch (e) {
    bad(`Openverse unreachable: ${e.message}`);
  }

  if (browser) {
    const { searchSources } = await import('../src/sources/index.js');
    const { closeBrowser } = await import('../src/browser.js');
    const res = await searchSources({ query: 'portfolio', sources: ['awwwards', 'dribbble', 'landbook', 'siteinspire', 'onepagelove', 'lapa'], limit: 3 });
    for (const r of res) r.error ? bad(`${r.source}: ${r.error}`) : r.cards.length ? ok(`${r.source}: ${r.cards.length} results`) : bad(`${r.source}: 0 results (layout may have changed)`);
    await closeBrowser();
  }
  console.log(`\n  sessions dir: ${SESSIONS_DIR}`);
}

switch (cmd) {
  case 'serve':
  case 'board': {
    const id = args[0] || (await latestSessionId());
    const b = await startBoard();
    const url = id ? boardUrl(b.url, id) : b.url;
    console.log(`inspo board → ${url}  (ctrl+c to stop)`);
    openInBrowser(url);
    break;
  }
  case 'sessions':
    for (const s of await listSessions()) console.log(`${s.id.padEnd(32)} round ${s.round} · ${s.items} items · ${s.title}`);
    break;
  case 'login': {
    const { loginFlow } = await import('../src/sources/index.js');
    console.log('Log in in the window that opens, then close it.');
    await loginFlow(args[0] || 'mobbin');
    console.log('Saved.');
    break;
  }
  case 'doctor':
    await doctor();
    break;
  default:
    console.log(help);
}
