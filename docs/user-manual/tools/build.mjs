// Builds the user manual: merges callout rects, prints manual.html to PDF,
// and exports every phone figure (with its callouts) as a standalone PNG.
// Usage: node docs/user-manual/tools/build.mjs
import puppeteer from 'puppeteer';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const SCREENS = new URL('screens/', ROOT);
const FIGURES = new URL('figures/', ROOT);
const PDF = fileURLToPath(new URL('MathPulse-AI-User-Manual.pdf', ROOT));

const rects = {};
for (const file of readdirSync(SCREENS).filter((name) => /^rects-.+\.json$/.test(name))) {
  Object.assign(rects, JSON.parse(readFileSync(new URL(file, SCREENS), 'utf8')));
}
writeFileSync(new URL('rects.js', SCREENS), `window.RECTS = ${JSON.stringify(rects)};\n`);

// File access lets pages read local screenshots into a canvas (JPEG conversion, status-bar colors).
const browser = await puppeteer.launch({ headless: 'new', args: ['--allow-file-access-from-files'] });

// Chrome embeds PNG screenshots losslessly (~23 MB PDF). JPEG copies are embedded as-is,
// so the PDF uses them; the PNGs in screens/ stay the lossless deliverable.
const jpegDir = mkdtempSync(join(tmpdir(), 'mathpulse-manual-'));
const converter = await browser.newPage();
await converter.goto(SCREENS.href);
for (const name of readdirSync(SCREENS).filter((file) => file.endsWith('.png'))) {
  const dataUrl = await converter.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, new URL(name, SCREENS).href);
  writeFileSync(join(jpegDir, name.replace(/\.png$/, '.jpg')), Buffer.from(dataUrl.split(',')[1], 'base64'));
}
await converter.close();

const openManual = async (screenDir, extension) => {
  const page = await browser.newPage();
  page.on('console', (message) => ['warn', 'warning'].includes(message.type()) && console.warn(`page: ${message.text()}`));
  await page.evaluateOnNewDocument((dir, ext) => {
    window.SCREEN_DIR = dir;
    window.SCREEN_EXT = ext;
  }, screenDir, extension);
  await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor: 1 });
  await page.goto(new URL('manual.html', ROOT).href, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.MANUAL_READY === true, { timeout: 60000 });
  return page;
};

const printPage = await openManual(`${pathToFileURL(jpegDir).href}/`, 'jpg');
await printPage.pdf({ path: PDF, preferCSSPageSize: true, printBackground: true });
await printPage.close();
rmSync(jpegDir, { recursive: true, force: true });
console.log(`pdf ${PDF}`);

// Figures: lossless PNG sources, transparent background, 3x scale, clipped to the phone plus its callouts.
const page = await openManual('screens/', 'png');
mkdirSync(FIGURES, { recursive: true });
await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor: 3 });
await page.evaluate(() => document.documentElement.classList.add('export'));
const figures = await page.$$('figure.shot[data-export]');
for (const figure of figures) {
  const { name, clip } = await figure.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
    const boxes = [el, ...el.querySelectorAll('.zoom')].map((node) => node.getBoundingClientRect());
    const left = Math.min(...boxes.map((box) => box.left)) - 16;
    const top = Math.min(...boxes.map((box) => box.top)) - 16;
    const right = Math.max(...boxes.map((box) => box.right)) + 16;
    const bottom = Math.max(...boxes.map((box) => box.bottom)) + 24;
    return {
      name: el.dataset.export,
      clip: { x: left + window.scrollX, y: top + window.scrollY, width: right - left, height: bottom - top },
    };
  });
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, FIGURES)), clip, omitBackground: true, captureBeyondViewport: true });
}
console.log(`figures ${figures.length}`);
await browser.close();
