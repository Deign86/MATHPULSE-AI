/**
 * Capture login mascot left-to-right cursor-follow sequence.
 * Chrome-devtools MCP validated the scrub mapping (x=0.02 -> video t~0.05s Left).
 * Puppeteer replicates the MCP sweep for file output (MCP filePath saves are
 * blocked by workspace-roots config, so screenshots go through puppeteer).
 * Output: tmp/login-bot-frames/frame-*.png
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/login-bot-frames';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FRACTIONS = [0.02, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 0.98];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(
    () => (document.body.innerText || '').includes('QUICK DEMO ACCESS'),
    { timeout: 25000 },
  );
  await sleep(2500);
  const times = [];
  for (let i = 0; i < FRACTIONS.length; i++) {
    const f = FRACTIONS[i];
    const t = await page.evaluate(async (frac) => {
      const x = frac * window.innerWidth;
      const y = window.innerHeight * 0.5;
      for (const type of ['pointermove', 'mousemove']) {
        window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 650));
      const v = document.querySelector('video');
      return v ? v.currentTime : -1;
    }, f);
    times.push(t.toFixed(3));
    await page.screenshot({ path: `${OUT}/frame-${String(i + 1).padStart(2, '0')}.png` });
    console.log(`frame ${i + 1}/${FRACTIONS.length} x=${f} videoT=${t.toFixed(3)}s`);
  }
  console.log('video timeline sweep (s):', times.join(' -> '));
} finally {
  await browser.close();
}
console.log('done');
