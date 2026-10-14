/**
 * Capture README screenshots from the live Firebase deploy.
 * Usage: node scripts/capture-readme-screenshots.mjs [login|student|teacher|admin]  (no arg = all)
 * Opens a visible Chrome window per role (student, teacher, admin), each in a fresh
 * incognito context. Sign in by hand in each window; capture starts once the
 * dashboard loads. The script never handles credentials.
 * Output: docs/screenshots/*.png (1280x800)
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
const APP = 'https://mathpulse-ai-2026.web.app/';
const SIGN_IN_TIMEOUT = 5 * 60 * 1000;
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
      const el = els.find((e) => (e.textContent || '').trim() === text)
        ?? els.find((e) => (e.textContent || '').includes(text));
      if (!el) throw new Error(`click target not found: ${text}`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    },
    tag,
    text,
  );
}

/** Close the Daily Rewards modal if it is showing. */
async function dismissDailyModal(page) {
  await sleep(1200);
  const dismissed = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('h1,h2,h3')];
    const hit = heads.find((h) => (h.textContent || '').toUpperCase().includes('DAILY REWARDS'));
    if (!hit) return false;
    const root = hit.closest('div[class]')?.parentElement ?? document;
    const closer = [...root.querySelectorAll('button')].find((b) => !(b.textContent || '').trim());
    if (closer) closer.click();
    return true;
  });
  if (dismissed) await sleep(800);
}

/** Close the Initial Assessment prompt with Escape (session-only; "Skip for now" would write to Firestore). */
async function closeAssessmentPrompt(page) {
  const open = await page.evaluate(() => Boolean(document.getElementById('iar-title')));
  if (!open) return;
  await page.keyboard.press('Escape');
  await sleep(800);
}

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  args: ['--window-size=1300,900'],
});

const done = [];

async function openRole(role, dashboardText) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
  console.log(`[${role}] Sign in as the ${role} in the open Chrome window...`);
  await waitForBodyText(page, dashboardText, SIGN_IN_TIMEOUT);
  await dismissDailyModal(page);
  await sleep(2500);
  await closeAssessmentPrompt(page);
  return { context, page };
}

async function shoot(page, file) {
  await page.screenshot({ path: `${OUT}/${file}` });
  done.push(file);
  console.log(`captured ${file}`);
}

const only = process.argv[2];
const want = (part) => !only || only === part;

try {
  // 1 — Login (fresh context, nobody signed in)
  if (want('login')) {
    const loginContext = await browser.createBrowserContext();
    const loginPage = await loginContext.newPage();
    await loginPage.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
    await waitForBodyText(loginPage, 'Sign In');
    await sleep(2500);
    await shoot(loginPage, '01-login.png');
    await loginContext.close();
  }

  // 2-4 — Student
  if (want('student')) {
    const student = await openRole('student', 'Start Learning');
    await shoot(student.page, '02-student-dashboard.png');
    await clickByText(student.page, 'button', 'Modules');
    await waitForBodyText(student.page, 'Curriculum Modules');
    await dismissDailyModal(student.page);
    await closeAssessmentPrompt(student.page);
    await sleep(2000);
    await shoot(student.page, '03-modules.png');
    await clickByText(student.page, 'button', 'AI Chat');
    await waitForBodyText(student.page, 'L.O.L.I.', 45000).catch(async (err) => {
      await student.page.screenshot({ path: 'tmp/capture-ai-chat-debug.png' });
      throw err;
    });
    await sleep(2000);
    await closeAssessmentPrompt(student.page);
    await shoot(student.page, '04-ai-chat.png');
    await student.context.close();
  }

  // 5 — Teacher
  if (want('teacher')) {
    const teacher = await openRole('teacher', 'Teacher Dashboard');
    await shoot(teacher.page, '05-teacher-dashboard.png');
    await teacher.context.close();
  }

  // 6 — Admin
  if (want('admin')) {
    const admin = await openRole('admin', 'Admin Dashboard');
    await sleep(1000);
    await shoot(admin.page, '06-admin-dashboard.png');
    await admin.context.close();
  }
} catch (err) {
  console.error('CAPTURE FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
console.log(`captured ${done.length}:`, done.join(', '));
