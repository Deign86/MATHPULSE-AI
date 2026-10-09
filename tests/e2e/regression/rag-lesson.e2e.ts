import { describe, test } from '@e2e-dev/web';
import { expect, type Screen } from 'e2e';

// The Daily Rewards and Initial Assessment prompts mount on timers after the profile loads. Close them with
// their own buttons: an agent step needed 70-120 s per test under load and left the page covered.
async function closeStartupDialogs(screen: Screen) {
  const rewards = screen.getByRole('heading', 'Daily Rewards');
  const assessment = screen.getByRole('dialog', 'Initial Assessment');
  await rewards.waitFor({ timeout: 6_000 }).catch(() => undefined);
  for (let pass = 0; pass < 2; pass += 1) {
    if (await rewards.isVisible()) {
      await screen.getByRole('button', 'Close daily rewards').tap();
      await expect(rewards).toBeHidden({ timeout: 10_000 });
    }
    await assessment.waitFor({ timeout: 3_000 }).catch(() => undefined);
    if (await assessment.isVisible()) {
      await assessment.getByRole('button', 'Close').tap();
      await expect(assessment).toBeHidden({ timeout: 10_000 });
    }
  }
}


const lessonLoaded =
  'The lesson screen has finished loading: either a lesson notebook with section text is shown, or an error or "AI lesson unavailable" message is shown. The "Loading lesson from DepEd curriculum..." screen is gone.';
const lessonTitle = 'Represent business transactions and financial goals using variables and equations.';
const ragLessonRoute = '**/api/rag/lesson/stream';

describe('RAG lesson regression', { tags: ['student', 'rag-lesson'] }, () => {
  test('a curriculum lesson renders grounded AI content instead of an error or the PDF fallback', { session: 'student', timeout: 360_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Business and Finance/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Represent business transactions/).tap();
    await agent.waitFor(lessonLoaded, { timeout: 180_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await expect(screen.getByRole('heading', 'Failed to Load Lesson')).toBeHidden();
    await expect(screen.getByRole('heading', 'Lesson Source Unavailable')).toBeHidden();
    await expect(screen.getByRole('heading', lessonTitle, { level: 1 })).toBeVisible();
    // Issue #164: students get no staff RAG telemetry.
    await expect(screen.getByRole('button', 'Inspect evidence')).toBeHidden();

    await screen.getByRole('button', 'Go to Intro section').tap();
    await expect(screen.getByText('Lesson Mission & Overview')).toBeVisible();
    await agent.assert(
      'The lesson introduction gives an overview or learning objectives about representing business transactions or financial goals (such as prices, budgets, savings or income) with variables and equations. It is real lesson text, not an error message, a loading screen or a placeholder.',
    );

    await screen.getByRole('button', 'Go to Concepts section').tap();
    await expect(screen.getByText(/^Part 2 of \d+$/)).toBeVisible();
    await agent.assert(
      'The page explains mathematical concepts such as variables, expressions or equations applied to business or personal finance situations.',
    );

    await screen.getByRole('button', 'Go to Examples section').tap();
    await expect(screen.getByText(/^Part 4 of \d+$/)).toBeVisible();
    await agent.assert('The page shows at least one worked example problem about a business or financial situation.');
  });

  test('a failed RAG request falls back to the DepEd source PDF and Retry recovers the AI lesson', { session: 'student', timeout: 360_000, tags: ['ai'] }, async ({ app, agent, screen, browser }) => {
    await browser.route(ragLessonRoute, async (route) => {
      await route.abort();
    });
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Business and Finance/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Represent business transactions/).tap();
    await expect(screen.getByText('AI lesson unavailable')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('DepEd PDF')).toBeVisible();
    await expect(screen.getByText(lessonTitle)).toBeVisible();
    const openPdf = screen.getByRole('link', 'Open PDF in new tab');
    await expect(openPdf).toHaveAttribute(
      'href',
      /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/mathpulse-ai-2026\.firebasestorage\.app\/o\/.+\.pdf\?alt=media$/,
    );
    await expect(openPdf).toHaveAttribute('target', '_blank');

    await screen.getByRole('button', 'View Options').tap();
    await expect(screen.getByRole('heading', 'Read DepEd Curriculum Material')).toBeVisible();
    await expect(screen.getByRole('link', /^Open PDF in New Window \/ Tab/)).toBeVisible();
    await expect(screen.getByRole('button', 'Retry Generating AI Lesson')).toBeVisible();
    await screen.getByRole('button', 'Back to PDF preview').tap();
    await expect(screen.getByRole('heading', 'Read DepEd Curriculum Material')).toBeHidden();

    await browser.unroute(ragLessonRoute);
    await screen.getByRole('button', 'Retry AI lesson').tap();
    await agent.waitFor(lessonLoaded, { timeout: 180_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await expect(screen.getByRole('button', 'Go to Intro section')).toBeVisible();
    await expect(screen.getByRole('heading', lessonTitle, { level: 1 })).toBeVisible();
  });

  test('a lesson whose curriculum PDF is not ingested explains why the AI lesson is unavailable', { session: 'student' }, async ({ app, screen, browser }) => {
    // Mirrors the backend 404 body for missing curriculum context: FastAPI nests it under "detail".
    await browser.route(ragLessonRoute, async (route) => {
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      };
      if (route.request.method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({
        status: 404,
        headers: cors,
        json: {
          detail: {
            error: 'no_curriculum_context',
            message: 'No curriculum content found for this lesson. Please ensure the PDF has been ingested.',
            retrievalBand: 'low',
            sources: [],
          },
          status: 404,
        },
      });
    });
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Business and Finance/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Represent business transactions/).tap();
    await expect(screen.getByText('AI lesson unavailable')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(/Please ensure the PDF has been ingested\./)).toBeVisible();
  });

  // lessonService used to throw a plain Error, so useLessonContent never saw the HTTP status and
  // every failure, a rejected session included, read "Failed to load lesson content.".
  test('a lesson request the backend rejects as unauthenticated asks the student to sign in again', { session: 'student' }, async ({ app, screen, browser }) => {
    await browser.route(ragLessonRoute, async (route) => {
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      };
      if (route.request.method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({ status: 401, headers: cors, json: { detail: 'Invalid or expired token' } });
    });
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Business and Finance/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Represent business transactions/).tap();
    await expect(screen.getByText('AI lesson unavailable')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(/Please sign in again to access lessons\./)).toBeVisible();
    await expect(screen.getByText(/Failed to load lesson content\./)).toBeHidden();
  });

  test('the PDF fallback offers a way back to the module', { session: 'student' }, async ({ app, screen, browser }) => {
    await browser.route(ragLessonRoute, async (route) => {
      await route.abort();
    });
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Business and Finance/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Represent business transactions/).tap();
    await expect(screen.getByText('AI lesson unavailable')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Go back').tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  });
});
