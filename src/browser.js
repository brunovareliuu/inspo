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
  if (shared) await shared.browser.close().catch(() => {});
  shared = null;
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
