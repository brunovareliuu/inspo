import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export const INSPO_HOME = process.env.INSPO_HOME || path.join(os.homedir(), '.inspo');
export const PROFILE_DIR = path.join(INSPO_HOME, 'profile');

const LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

let shared = null;

async function launch(opts = {}) {
  // Prefer the user's installed Chrome (fewer bot walls), fall back to Playwright's Chromium.
  try {
    return await chromium.launch({ channel: 'chrome', args: LAUNCH_ARGS, ...opts });
  } catch {
    try {
      return await chromium.launch({ args: LAUNCH_ARGS, ...opts });
    } catch (err) {
      throw new Error(
        `Could not launch a browser. Install Chrome, or run \`npx playwright install chromium\`.\n${err.message}`,
      );
    }
  }
}

/** A shared headless context for scraping and screenshots. */
export async function getContext() {
  if (shared) return shared.context;
  const browser = await launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent: UA,
    locale: 'en-US',
    colorScheme: 'light',
  });
  shared = { browser, context };
  browser.on('disconnected', () => (shared = null));
  return context;
}

/**
 * A persistent, logged-in context (for Mobbin and other walled sources).
 * Only one process can hold it at a time, so it is opened per call and closed after.
 */
export async function withProfile(fn, { headless = true } = {}) {
  await fs.mkdir(PROFILE_DIR, { recursive: true });
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',
      headless,
      args: LAUNCH_ARGS,
      viewport: headless ? { width: 1440, height: 900 } : null,
      userAgent: headless ? UA : undefined,
    });
  } catch {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      args: LAUNCH_ARGS,
      viewport: headless ? { width: 1440, height: 900 } : null,
    });
  }
  try {
    return await fn(context);
  } finally {
    await context.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (shared) await Promise.race([shared.browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
  shared = null;
}

/**
 * Remove newsletter/discount popups, chat widgets and their backdrops: anything fixed that
 * covers the middle of the screen and isn't the site header.
 */
export async function killPopups(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page
    .evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky' && !el.matches('[role="dialog"], [aria-modal="true"], dialog[open]')) continue;
        const r = el.getBoundingClientRect();
        const isBar = r.top <= 2 && r.height < 200 && r.width > vw * 0.5; // header / announcement bar: keep
        const modalish = el.matches('[role="dialog"], [aria-modal="true"], dialog[open], [class*="modal" i], [class*="popup" i], [class*="klaviyo" i], [id*="popup" i], [class*="newsletter" i], [id*="attentive" i], [class*="overlay" i], [class*="backdrop" i], iframe[id*="chat" i]');
        const covers = r.width * r.height > vw * vh * 0.18 && r.left < vw / 2 && r.right > vw / 2 && r.top < vh / 2 && r.bottom > vh / 2;
        const corner = r.width < 420 && r.height < 620 && r.bottom > vh - 40 && (r.right > vw - 40 || r.left < 40) && cs.position === 'fixed'; // chat bubbles, promo toasts
        if (!isBar && (modalish || covers || corner)) el.remove();
      }
      for (const el of [document.documentElement, document.body]) {
        el.style.setProperty('overflow', 'auto', 'important');
        el.style.setProperty('position', 'static', 'important');
      }
    })
    .catch(() => {});
}

/** Dismiss the usual cookie banners so they don't end up in screenshots. */
export async function dismissOverlays(page) {
  const labels = [
    'Accept all', 'Accept All', 'Accept', 'I agree', 'Agree', 'Got it', 'GOT IT', 'OK', 'Allow all',
    'Aceptar', 'Aceptar todo', 'Entendido', 'Allow all cookies', 'Accept cookies',
  ];
  for (const label of labels) {
    const btn = page.getByRole('button', { name: label, exact: true }).first();
    if (await btn.isVisible({ timeout: 150 }).catch(() => false)) {
      await btn.click({ timeout: 1000 }).catch(() => {});
      break;
    }
  }
  await page
    .addStyleTag({
      content: `[id*="cookie" i],[class*="cookie-banner" i],[class*="cookieconsent" i],[id*="consent" i],
        [class*="consent-banner" i],#onetrust-banner-sdk,.cc-window,#CybotCookiebotDialog,
        [aria-label*="cookie" i][role="dialog"]{display:none!important}`,
    })
    .catch(() => {});
}

/** Scroll down in steps so lazy images and scroll-triggered sections load. */
export async function autoScroll(page, { maxPx = 6000, step = 700, delay = 120 } = {}) {
  await page
    .evaluate(
      async ({ maxPx, step, delay }) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        let y = 0;
        const limit = Math.min(maxPx, document.documentElement.scrollHeight);
        while (y < limit) {
          y += step;
          window.scrollTo(0, y);
          await sleep(delay);
        }
        window.scrollTo(0, 0);
        await sleep(300);
      },
      { maxPx, step, delay },
    )
    .catch(() => {});
}
