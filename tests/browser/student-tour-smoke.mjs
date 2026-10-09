import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const artifacts = resolve('.tmp/student-tour-browser');
await mkdir(artifacts, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port: 5187, strictPort: true, open: false, hmr: false, warmup: { clientFiles: [] } },
});
const fixture = 'http://127.0.0.1:5187/tests/browser/student-tour.html';
const pageGuides = ['Dashboard', 'Modules', 'Grades & Assessment', 'AI Chat', 'Quiz Battle', 'Leaderboard', 'Avatar Studio', 'Rewards', 'Profile', 'Settings'];
let browser;
const checks = [];
const sizes = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844, pageGuides: true },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900, pageGuides: true },
  { name: 'wide-desktop', width: 1920, height: 1080 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'dark-reduced-motion', width: 375, height: 667 },
  { name: 'large-text-phone', width: 320, height: 568 },
];

/** Walks an open guide to Finish, checking every rendered step; returns the step numbers shown. */
async function walkGuide(page, size, label) {
  const dialog = page.locator('[data-tour-dialog]');
  const scroller = page.getByTestId('page-scroll');
  const shown = [];
  for (let guard = 0; guard < 120; guard++) {
    await page.waitForTimeout(300);
    await page.waitForFunction(() => document.querySelector('[data-tour-dialog]')?.getAttribute('aria-busy') !== 'true', null, { timeout: 5000 });
    const step = Number(await dialog.getAttribute('data-tour-step'));
    assert(!shown.length || step > shown.at(-1), `${label}: guide went backwards or restarted at step ${step}`);
    shown.push(step);
    const box = await dialog.boundingBox();
    assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${label}: dialog outside viewport at step ${step}`);
    for (const control of await dialog.getByRole('button').all()) {
      const bounds = await control.boundingBox();
      assert(bounds && bounds.height >= 44 && bounds.y + bounds.height <= size.height + 1, `${label}: inaccessible controls at step ${step}`);
    }
    const highlight = page.locator('[data-tour-overlay] svg > rect[stroke]');
    await highlight.waitFor({ timeout: 3000 }).catch(() => {});
    assert.equal(await highlight.count(), 1, `${label}: no spotlight at step ${step} (${await dialog.locator('h2').textContent()})`);
    const spot = await highlight.boundingBox();
    // Nothing pinned (sticky filters, bottom navigation) may sit over the highlighted region, unless it holds the feature.
    await page.evaluate(({ x, y }) => {
      const previous = document.body.style.pointerEvents;
      document.body.style.pointerEvents = 'auto';
      window.__tourTarget = document.elementsFromPoint(x, y).find(element => !element.closest('[data-tour-overlay],[data-tour-dialog]'));
      document.body.style.pointerEvents = previous;
    }, { x: spot.x + spot.width / 2, y: spot.y + Math.min(spot.height / 2, 30) });
    const pinnedOver = await page.evaluate(({ x, y, w, h }) => [...document.querySelectorAll('[data-tour-sticky]')].some(bar => {
      const r = bar.getBoundingClientRect();
      return r.height > 0 && r.left < x + w - 1 && r.right > x + 1 && r.top < y + h - 1 && r.bottom > y + 1 && !bar.contains(window.__tourTarget);
    }), { x: spot.x + 6, y: spot.y + 6, w: spot.width - 12, h: spot.height - 12 });
    assert(!pinnedOver, `: a pinned bar covers the highlight at step ${step}`);
    const overlaps = Math.min(box.x + box.width, spot.x + spot.width) > Math.max(box.x, spot.x) + 1 && Math.min(box.y + box.height, spot.y + spot.height) > Math.max(box.y, spot.y) + 1;
    // Overlap is only a defect when the card could have fit beside the highlighted region.
    const roomBeside = Math.max(spot.y - 32, size.height - spot.y - spot.height - 32) >= box.height || Math.max(spot.x - 32, size.width - spot.x - spot.width - 32) >= box.width;
    if (overlaps && roomBeside) await page.screenshot({ path: resolve(artifacts, `${label}-overlap-${step}.png`) });
    assert(!(overlaps && roomBeside), `${label}: explanation covers the highlighted feature at step ${step}`);
    if (step === 3) {
      // The student cannot scroll the page while the guide is open.
      const before = await scroller.evaluate(element => element.scrollTop);
      await page.mouse.move(size.width / 2, size.height - 40);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(200);
      assert.equal(await scroller.evaluate(element => element.scrollTop), before, `${label}: page scrolled under the guide`);
    }
    await page.keyboard.press('Tab');
    const focusInside = await page.evaluate(() => Boolean(document.activeElement?.closest('[data-tour-dialog]')));
    const focused = focusInside ? '' : await page.evaluate(() => { const el = document.activeElement; return `${el?.tagName} ${el?.getAttribute('aria-label') || el?.textContent?.slice(0, 30)}`; });
    assert(focusInside, `${label}: focus escaped the guide at step ${step} (to ${focused})`);
    if ([5, 20, 40].includes(step)) await page.screenshot({ path: resolve(artifacts, `${label}-step-${step}.png`) });
    const finish = dialog.getByRole('button', { name: 'Finish tour' });
    if (await finish.count()) {
      await finish.click();
      await dialog.waitFor({ state: 'detached' });
      return shown;
    }
    await dialog.getByRole('button', { name: 'Continue' }).click();
  }
  throw new Error(`${label}: guide did not finish`);
}

try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: process.env.TOUR_BROWSER_CHANNEL || 'msedge' });
  for (const size of sizes.filter(candidate => !process.env.TOUR_VIEWPORT || candidate.name === process.env.TOUR_VIEWPORT)) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(fixture);
    if (size.name === 'dark-reduced-motion') await page.locator('html').evaluate(element => element.classList.add('dark'));
    if (size.name === 'large-text-phone') await page.locator('html').evaluate(element => element.style.setProperty('--font-size', '24px'));
    // Scroll away before the guide launches; the first step must bring its feature back into view.
    await page.getByTestId('page-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    const dialog = page.locator('[data-tour-dialog]');
    await dialog.waitFor({ timeout: 60000 });
    const full = await walkGuide(page, size, `${size.name}-full`);
    const record = { viewport: size.name, width: size.width, height: size.height, fullGuideSteps: full.length, skippedOptional: full.at(-1) - full.length };

    if (size.pageGuides) {
      record.pageGuides = {};
      await page.goto(`${fixture}?tab=Settings`);
      for (const guide of pageGuides) {
        await page.getByRole('group', { name: 'Page guides' }).getByRole('button', { name: guide, exact: true }).click();
        await dialog.waitFor();
        assert.match(await dialog.textContent(), new RegExp(`${guide} guide`), `${guide}: wrong guide label`);
        record.pageGuides[guide] = (await walkGuide(page, size, `${size.name}-${guide.replace(/\W+/g, '-')}`)).length;
        await page.getByRole('group', { name: 'Page guides' }).waitFor({ timeout: 5000 });
      }
      // The header button asks first: Skip leaves the page alone, Play guide starts this page's guide.
      const confirm = page.getByRole('alertdialog');
      await page.getByRole('button', { name: 'Guide for this page' }).click();
      await confirm.waitFor();
      assert.match(await confirm.textContent(), /Play the Settings guide\?/, 'header button must offer the current page guide');
      await confirm.getByRole('button', { name: 'Skip' }).click();
      await confirm.waitFor({ state: 'detached' });
      assert.equal(await dialog.count(), 0, 'Skip must not start the guide');
      await page.getByRole('button', { name: 'Guide for this page' }).click();
      await confirm.getByRole('button', { name: 'Play guide' }).click();
      await dialog.waitFor();
      assert.match(await dialog.textContent(), /Settings guide/, 'header button must play the current page guide');
      await page.waitForFunction(() => Boolean(document.activeElement?.closest('[data-tour-dialog]')), null, { timeout: 5000 });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    }

    await page.goto(`${fixture}?tab=Settings`);
    await page.getByRole('button', { name: 'Replay student guide' }).click();
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.goto(fixture);
    await page.waitForTimeout(2500);
    assert.equal(await dialog.count(), 0, 'Dismissed guide relaunched');
    assert.deepEqual(errors, [], 'Browser runtime errors');
    checks.push(record);
    await context.close();
    console.log('PASS viewport:', size.name, JSON.stringify(record));
  }
  await writeFile(resolve(artifacts, 'report.json'), JSON.stringify({ fixture: 'Real tour engine, step config, Sidebar, MobileBottomNav and SettingsPage; feature blocks generated from step anchors, optional features omitted', checks }, null, 2));
  console.log('PASS: student tour browser checks');
} finally {
  await browser?.close();
  await server.close();
}
