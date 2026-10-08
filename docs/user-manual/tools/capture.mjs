// Captures mobile screenshots for the user manual.
// Usage: node docs/user-manual/tools/capture.mjs <student|teacher|admin|public> [shot-name ...]
// Credentials come from E2E_USER_<ROLE>_USERNAME / _PASSWORD in .env.local.
// Writes screens/<shot>.png (390x844 @2x) and writes highlight rects to screens/rects-<role>.json.
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SHOTS } from './shots.mjs';

const BASE = process.env.MANUAL_BASE_URL ?? 'http://127.0.0.1:5173';
const OUT = new URL('../screens/', import.meta.url);
const RECTS = new URL(`rects-${process.argv[2]}.json`, OUT);
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// A role ending in "Ios" signs in as the base role with an iPhone Safari user agent.
const [role, ...only] = process.argv.slice(2);
const credRole = role.replace(/Ios$/, '');
const shots = (SHOTS[role] ?? []).filter((shot) => (only.length === 0 ? shot.once !== true : only.includes(shot.name)));
if (shots.length === 0) throw new Error(`No shots for role "${role}"`);

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('E2E_USER_'))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
mkdirSync(OUT, { recursive: true });
const rects = existsSync(RECTS) ? JSON.parse(readFileSync(RECTS, 'utf8')) : {};

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 180000 });
const page = await browser.newPage();
// Vite reloads the page whenever any repo file changes (including the files this script writes).
// Drop HMR reload/update messages so a capture run is not interrupted mid-screen.
await page.evaluateOnNewDocument(() => {
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = class extends NativeWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      if (!String(protocols ?? '').includes('vite-hmr')) return;
      const addListener = this.addEventListener.bind(this);
      this.addEventListener = (type, listener, options) =>
        addListener(
          type,
          type === 'message'
            ? (event) => !/"type":"(full-reload|update)"/.test(String(event.data)) && listener(event)
            : listener,
          options,
        );
    }
  };
});
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// Finds the smallest visible element matching a target spec and returns it.
// Spec: { label } aria-label, { text } visible text, { css } selector; optional min [w, h] and pick ('first'|'last').
const findTarget = (spec) =>
  page.evaluateHandle((target) => {
    const visible = (el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const [minW, minH] = target.min ?? [0, 0];
    let pool = [...document.querySelectorAll(target.css ?? 'body *')];
    if (target.label) pool = pool.filter((el) => el.getAttribute('aria-label') === target.label);
    if (target.text) {
      // text may be one string or a list that must all appear inside the element.
      const needles = [target.text].flat().map((needle) => needle.toLowerCase());
      pool = pool.filter((el) => {
        const text = (el.innerText ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
        return target.exact === true ? text === needles[0] : needles.every((needle) => text.includes(needle));
      });
    }
    const fits = pool.filter((el) => {
      if (!visible(el)) return false;
      const box = el.getBoundingClientRect();
      return box.width >= minW && box.height >= minH;
    });
    // Keep innermost matches only, so a page wrapper never wins over the card it contains.
    const innermost = fits.filter((el) => !fits.some((other) => other !== el && el.contains(other)));
    if (target.pick === 'first' || target.pick === 'last') {
      const sorted = innermost.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return target.pick === 'first' ? sorted[0] : sorted[sorted.length - 1];
    }
    const area = (el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height;
    return fits.sort((a, b) => area(a) - area(b))[0] ?? null;
  }, spec);

const runStep = async (step) => {
  if (step.goto) {
    await page.goto(BASE + step.goto, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  } else if (step.click) {
    let element = null;
    for (let tries = 0; tries < 10 && !element; tries += 1) {
      element = (await findTarget(step.click)).asElement();
      if (!element && !step.optional) await sleep(1000);
    }
    if (!element) {
      if (step.optional) return;
      throw new Error(`click target not found: ${JSON.stringify(step.click)}`);
    }
    // Radix triggers open on pointerdown, so they need a real mouse click.
    if (step.real) await element.click();
    else await element.evaluate((el) => el.click());
  } else if (step.scroll) {
    const handle = await findTarget(step.scroll);
    const element = handle.asElement();
    if (!element) throw new Error(`scroll target not found: ${JSON.stringify(step.scroll)}`);
    await element.evaluate((el, block) => el.scrollIntoView({ block }), step.block ?? 'start');
  } else if (step.key) {
    await page.keyboard.press(step.key);
  } else if (step.type) {
    await page.type(step.type[0], step.type[1]);
  } else if (step.js) {
    await page.evaluate(step.js);
  }
  await sleep(step.wait ?? 1800);
};

// Lazy-loaded pages show a full-screen loader first; wait it out.
const waitForLoader = (label) =>
  page
    .waitForFunction(() => !/Loading[^\n]{0,40}\.\.\./.test(document.body.innerText), { timeout: 90000 })
    .catch(() => console.warn(`  ! ${label}: still loading`));

const signIn = async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('input[type=email]', { timeout: 60000 });
  await page.type('input[type=email]', env[`E2E_USER_${credRole.toUpperCase()}_USERNAME`]);
  await page.type('input[type=password]', env[`E2E_USER_${credRole.toUpperCase()}_PASSWORD`]);
  await page.evaluate(() =>
    [...document.querySelectorAll('button')].find((button) => button.textContent.trim().startsWith('Sign In')).click(),
  );
  await page.waitForFunction(() => !document.querySelector('input[type=password]'), { timeout: 60000 });
  await sleep(4000);
  await waitForLoader('sign-in');
  await sleep(3000);
};

if (role.endsWith('Ios')) await page.setUserAgent(IPHONE_UA);
if (credRole !== 'public') await signIn();

const captureShot = async (shot) => {
  for (const step of shot.steps) await runStep(step);
  await waitForLoader(shot.name);
  // Dismiss transient notification toasts so they do not cover the screen.
  await page.evaluate(() => {
    document
      .querySelectorAll('[aria-label^="Dismiss"][aria-label$="notification"]')
      .forEach((el) => el.getBoundingClientRect().width > 0 && el.click());
  });
  await sleep(shot.settle ?? 1500);
  // Privacy: blur personal email addresses (demo @mathpulse.ai accounts stay readable).
  // blurNames also blurs the name line paired with each email, for user directories.
  await page.evaluate((blurNames) => {
    const email = /[\w.+-]+@(?!mathpulse\.ai)[\w-]+\.[\w.]+/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) if (email.test(walker.currentNode.textContent)) hits.push(walker.currentNode.parentElement);
    // A <select> paints its chosen option itself, so blur the select instead of the option.
    for (const select of document.querySelectorAll('select')) {
      if (email.test(select.selectedOptions[0]?.text ?? '')) hits.push(select);
    }
    for (const el of hits) {
      el.style.filter = 'blur(4px)';
      if (blurNames && el.previousElementSibling) el.previousElementSibling.style.filter = 'blur(4px)';
    }
  }, shot.blurNames === true);
  const found = {};
  for (const [id, spec] of Object.entries(shot.highlights ?? {})) {
    const element = (await findTarget(spec)).asElement();
    if (!element) {
      console.warn(`  ! ${shot.name}: highlight "${id}" not found`);
      continue;
    }
    const box = await element.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    found[id] = box;
  }
  rects[shot.name] = found;
  await page.screenshot({ path: fileURLToPath(new URL(`${shot.name}.png`, OUT)) });
  console.log(`ok ${shot.name} ${JSON.stringify(found)}`);
  for (const step of shot.after ?? []) await runStep({ ...step, optional: true });
};

// One failed shot should not lose the rest of the run: log it, reset to home, continue.
for (const shot of shots) {
  try {
    await captureShot(shot);
    writeFileSync(RECTS, JSON.stringify(rects, null, 2));
  } catch (error) {
    console.error(`FAIL ${shot.name}: ${error.message}`);
    await runStep({ goto: '/', wait: 7000 });
  }
}
await browser.close();
