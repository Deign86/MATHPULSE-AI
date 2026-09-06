/**
 * Capture README screenshots from the live Firebase deploy.
 * Usage: node scripts/capture-readme-screenshots.mjs
 * Output: docs/screenshots/*.png (1280x800, same viewport as Chrome DevTools pass)
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBodyText(page, needle, timeout = 25000) {
  await page.waitForFunction(
    (n) => (document.body.innerText || '').includes(n),
    { timeout },
    needle,
  );
}

async function clickByText(page, tag, text) {
  await page.evaluate(
    (tag, text) => {
      const els = [...document.querySelectorAll(tag)];
      const el = els.find((e) => (e.textContent || '').includes(text));
      if (!el) throw new Error(`click target not found: ${text}`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    },
    tag,
    text,
  );
}

/** Dismiss the Daily Rewards modal if it is showing. */
async function dismissDailyModal(page) {
  await sleep(1200);
  const dismissed = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('h1,h2,h3')];
    const hit = heads.find((h) => (h.textContent || '').includes('DAILY REWARDS'));
    if (!hit) return false;
    const root = hit.closest('div[class]')?.parentElement ?? document;
    const btns = [...root.querySelectorAll('button')];
    // Close (X) button is the first empty-text button in the modal.
    const closer = btns.find((b) => !(b.textContent || '').trim());
    if (closer) closer.click();
    return true;
  });
  if (dismissed) await sleep(800);
  return dismissed;
}

async function logout(page) {
  await clickByText(page, 'button', 'Log Out');
  await sleep(1200);
  // Confirm modal says "Logout" (student says "Logout", teacher/admin "Logout").
  await clickByText(page, 'button', 'Logout');
  await waitForBodyText(page, 'QUICK DEMO ACCESS');
  await sleep(1000);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

const done = [];
try {
  // 1 — Login
  await page.goto('https://mathpulse-ai-2026.web.app/', { waitUntil: 'networkidle2', timeout: 60000 });
  await waitForBodyText(page, 'QUICK DEMO ACCESS');
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/01-login.png` });
  done.push('01-login.png');

  // 2 — Student dashboard
  await clickByText(page, 'button', 'Student Account');
  await waitForBodyText(page, 'Start Learning');
  await dismissDailyModal(page);
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/02-student-dashboard.png` });
  done.push('02-student-dashboard.png');

  // 3 — Curriculum modules
  await clickByText(page, 'button', 'Modules');
  await waitForBodyText(page, 'Curriculum Modules');
  await dismissDailyModal(page);
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/03-modules.png` });
  done.push('03-modules.png');

  // 4 — AI Chat (L.O.L.I.)
  await clickByText(page, 'button', 'AI Chat');
  await waitForBodyText(page, 'L.O.L.I.');
  await dismissDailyModal(page);
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/04-ai-chat.png` });
  done.push('04-ai-chat.png');

  // 5 — Teacher dashboard
  await logout(page);
  await clickByText(page, 'button', 'Teacher Account');
  await waitForBodyText(page, 'Teacher Dashboard');
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/05-teacher-dashboard.png` });
  done.push('05-teacher-dashboard.png');

  // 6 — Admin dashboard
  await logout(page);
  await clickByText(page, 'button', 'Admin Account');
  await waitForBodyText(page, 'Admin Dashboard');
  await sleep(3000);
  await page.screenshot({ path: `${OUT}/06-admin-dashboard.png` });
  done.push('06-admin-dashboard.png');
} catch (err) {
  console.error('CAPTURE FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
console.log(`captured ${done.length}/6:`, done.join(', '));
