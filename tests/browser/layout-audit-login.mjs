// Headless layout audit of the sign-in page (needs no account) at the eight target sizes, with touch
// emulation up to 1024px. Needs the dev server on 127.0.0.1:5174 (npm run dev).
// Usage: node tests/browser/layout-audit-login.mjs [outDir]   (default .tmp/layout-audit-login)
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve(process.argv[2] ?? '.tmp/layout-audit-login');
const origin = process.env.LAYOUT_AUDIT_ORIGIN ?? 'http://127.0.0.1:5174';
const sizes = [
  ['xs', 320, 568], ['phone', 390, 844], ['land', 844, 390], ['tab', 768, 1024],
  ['tabL', 1024, 768], ['lap', 1280, 800], ['desk', 1440, 900], ['wide', 1920, 1080],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.TOUR_BROWSER_CHANNEL || 'msedge' });
const reports = [];
try {
  for (const [name, width, height] of sizes) {
    const touch = width <= 1024;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 768 });
    const page = await context.newPage();
    await page.goto(`${origin}/`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForSelector('input[type=password]', { timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.addScriptTag({ url: '/tests/browser/layout-audit.js', type: 'module' });
    await page.waitForFunction(() => Boolean(window.__audit && window.__touchSweep));
    const audit = await page.evaluate(() => window.__audit());
    const under44 = touch ? await page.evaluate(() => window.__touchSweep()) : [];
    reports.push({ name, ...audit, touchUnder44: under44 });
    await page.screenshot({ path: join(outDir, `${name}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(join(outDir, 'report.json'), JSON.stringify(reports, null, 1));
for (const { name, size, overflowX, docScrollY, clipped, truncated, dialogs, freeHeight, touchUnder44 } of reports) {
  const issues = [
    overflowX > 0 && `overflowX ${overflowX}`,
    docScrollY > 0 && `docScrollY ${docScrollY}`,
    clipped.length > 0 && `clipped [${clipped.join('; ')}]`,
    truncated.length > 0 && `truncated [${truncated.join('; ')}]`,
    dialogs.length > 0 && `dialogs [${dialogs.join('; ')}]`,
    touchUnder44.length > 0 && `touch under 44 [${touchUnder44.join('; ')}]`,
  ].filter(Boolean);
  console.log(`${name} ${size} free ${freeHeight ?? '-'}${issues.length ? ` ${issues.join(' ')}` : ''}`);
}
console.log(`report: ${join(outDir, 'report.json')}`);
