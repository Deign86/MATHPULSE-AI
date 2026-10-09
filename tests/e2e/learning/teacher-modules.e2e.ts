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


const noModulesReason = 'no teacher-uploaded module is assigned to the e2e student or its section, and tests may not assign one';
const noStepsReason = 'the first teacher module has no study steps, so there is no Study Guide to open';
const openStepQuestions =
  'if a Start Questions button is shown, press it and wait until the practice questions are listed; otherwise, if a Go to Practice button is shown, press it; otherwise do nothing';
const moduleCta = /^(Start Interactive Module|Resume at Step \d+|Review Module from Step 1)$/;
const studyRoadmap = /^Interactive Study Roadmap \(\d+\)$/;

describe('student teacher uploaded modules', { tags: ['student', 'teacher-modules'] }, () => {
  test('the Teacher Uploaded tab shows its banner with module cards or the empty state', { session: 'student', timeout: 120_000 }, async ({ app, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect(screen.getByText('Teacher Uploaded Modules')).toBeVisible();
    await expect(screen.getByRole('heading', 'Teacher-Assigned Modules & Interventions')).toBeVisible();
    await expect(screen.getByText(/^\d+ Modules? Available$/)).toBeVisible();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);

    const moduleCount = await screen.getByText('Teacher Upload').count();
    if (moduleCount === 0) {
      await expect(screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet')).toBeVisible();
      await expect(screen.getByText('0 Modules Available')).toBeVisible();
    } else {
      await expect(screen.getByText(`${moduleCount} ${moduleCount === 1 ? 'Module' : 'Modules'} Available`)).toBeVisible();
      await expect(screen.getByText('Open')).toHaveCount(moduleCount);
      await expect(screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet')).toBeHidden();
    }
  });

  test('a search with no match shows No matching teacher modules and Reset Filters restores the cards', { session: 'student', timeout: 120_000 }, async ({ app, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);
    const moduleCount = await screen.getByText('Teacher Upload').count();
    test.skip(moduleCount === 0, noModulesReason);

    await screen.getByLabel('Search modules').fill('zz-e2e-no-such-module');
    await expect(screen.getByRole('heading', 'No matching teacher modules')).toBeVisible();
    await expect(screen.getByText('0 Modules Available')).toBeVisible();
    await screen.getByRole('button', 'Reset Filters').tap();
    await expect(screen.getByLabel('Search modules')).toHaveValue('');
    await expect(screen.getByText('Teacher Upload')).toHaveCount(moduleCount);
  });

  test('opening a module shows its overview, and a finished Study Guide step updates progress for the session', { session: 'student', timeout: 300_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);
    test.skip((await screen.getByText('Teacher Upload').count()) === 0, noModulesReason);

    await screen.getByText('Open').first().tap();
    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
    await expect(screen.getByText('Teacher-Curated Intervention')).toBeVisible();
    await expect(screen.getByText('SHS STEM Verified')).toBeVisible();
    await expect(screen.getByText('Module Progress')).toBeVisible();
    await expect(screen.getByText('Lesson Steps')).toBeVisible();
    await expect(screen.getByText('Estimated Time')).toBeVisible();
    await expect(screen.getByText('Self-Check')).toBeVisible();
    test.skip((await screen.getByRole('heading', studyRoadmap).count()) === 0, noStepsReason);
    await expect(screen.getByRole('heading', studyRoadmap)).toBeVisible();
    await expect(screen.getByText(/^\d+ of \d+ steps finished$/)).toBeVisible();

    await screen.getByRole('button', moduleCta).tap();
    await expect(screen.getByRole('button', 'Close study guide')).toBeVisible();
    await expect(screen.getByRole('button', 'Back to module')).toBeVisible();
    await expect(screen.getByText(/^Step \d+ of \d+$/)).toBeVisible();
    await expect(screen.getByRole('heading', 'Step Overview')).toBeVisible();
    await expect(screen.getByRole('heading', 'L.O.L.I. AI Guide')).toBeVisible();

    await agent.act(openStepQuestions, { timeout: 180_000 });
    const questionGroups = await screen.getByRole('group').filter({ has: screen.getByRole('radio') }).all();
    for (const questionGroup of questionGroups) {
      await questionGroup.getByRole('radio').first().check();
    }
    for (let checked = 0; checked < questionGroups.length; checked += 1) {
      await screen.getByRole('button', 'Check Answer').first().tap();
    }
    const advanceButton = screen.getByRole('button', /^(Next Step|Finish Module)$/);
    await expect(advanceButton).toBeEnabled({ timeout: 30_000 });
    const advanceLabel = await advanceButton.textContent();
    await advanceButton.tap();
    if (advanceLabel === 'Next Step') {
      await screen.getByRole('button', 'Back to module').tap();
    }

    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
    await expect(screen.getByText(/^[1-9]\d* of \d+ steps finished$/)).toBeVisible();
    const progressLabel = await screen.getByText(/^\d+ of \d+ steps finished$/).textContent();

    await screen.getByRole('button', 'Back to Modules').tap();
    await expect(screen.getByRole('heading', 'Teacher-Assigned Modules & Interventions')).toBeVisible();
    await screen.getByText('Open').first().tap();
    await expect(screen.getByText(progressLabel ?? '')).toBeVisible();
  });

  test('the Study Guide AI Guide answers a quick prompt and can be minimized and reopened', { session: 'student', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);
    test.skip((await screen.getByText('Teacher Upload').count()) === 0, noModulesReason);

    await screen.getByText('Open').first().tap();
    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
    test.skip((await screen.getByRole('heading', studyRoadmap).count()) === 0, noStepsReason);
    await screen.getByRole('button', moduleCta).tap();
    await expect(screen.getByRole('heading', 'L.O.L.I. AI Guide')).toBeVisible();

    await screen.getByRole('button', 'Explain simply').tap();
    await expect(screen.getByText(/^Can you explain the main idea of ".+" in simple words\?$/)).toBeVisible();
    await agent.waitFor('the AI Guide chat shows an assistant reply below the student question asking to explain the step in simple words', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Explain simply')).toBeEnabled();

    await screen.getByRole('button', 'Minimize AI Chatbot to side tab').tap();
    await expect(screen.getByRole('heading', 'L.O.L.I. AI Guide')).toBeHidden();
    await screen.getByRole('button', 'Open AI Guide side-by-side').tap();
    await expect(screen.getByRole('heading', 'L.O.L.I. AI Guide')).toBeVisible();

    await screen.getByRole('button', 'Close study guide').tap();
    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
  });

  test('answering a self-check item counts the attempt and marks the correct option', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);
    test.skip((await screen.getByText('Teacher Upload').count()) === 0, noModulesReason);

    await screen.getByText('Open').first().tap();
    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
    const selfCheckHeading = screen.getByRole('heading', /^Interactive Self-Check Practice \(\d+\)$/);
    test.skip((await selfCheckHeading.count()) === 0, 'the first teacher module has no self-check practice items');

    await expect(screen.getByText(/^0 of \d+ Attempted$/)).toBeVisible();
    await agent.act('in Interactive Self-Check Practice, choose any option for the first question');
    await expect(screen.getByText(/^1 of \d+ Attempted$/)).toBeVisible();
    await agent.assert('the first self-check question now highlights its correct option in green', { vision: true });

    await screen.getByRole('button', 'Back to Modules').tap();
    await screen.getByText('Open').first().tap();
    await expect(screen.getByText(/^0 of \d+ Attempted$/)).toBeVisible();
  });

  test('Study Guide step progress is still shown after a page reload', { session: 'student', timeout: 300_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await expect
      .poll(async () => (await screen.getByText('Teacher Upload').count()) + (await screen.getByRole('heading', 'No Teacher-Uploaded Modules Yet').count()), {
        timeout: 30_000,
        message: 'the teacher module list never finished loading',
      })
      .toBeGreaterThan(0);
    test.skip((await screen.getByText('Teacher Upload').count()) === 0, noModulesReason);

    await screen.getByText('Open').first().tap();
    await expect(screen.getByRole('button', 'Back to Modules')).toBeVisible();
    test.skip((await screen.getByRole('heading', studyRoadmap).count()) === 0, noStepsReason);
    await screen.getByRole('button', moduleCta).tap();
    await expect(screen.getByRole('button', 'Close study guide')).toBeVisible();
    await agent.act(openStepQuestions, { timeout: 180_000 });
    const questionGroups = await screen.getByRole('group').filter({ has: screen.getByRole('radio') }).all();
    for (const questionGroup of questionGroups) {
      await questionGroup.getByRole('radio').first().check();
    }
    for (let checked = 0; checked < questionGroups.length; checked += 1) {
      await screen.getByRole('button', 'Check Answer').first().tap();
    }
    const advanceButton = screen.getByRole('button', /^(Next Step|Finish Module)$/);
    await expect(advanceButton).toBeEnabled({ timeout: 30_000 });
    const advanceLabel = await advanceButton.textContent();
    await advanceButton.tap();
    if (advanceLabel === 'Next Step') {
      await screen.getByRole('button', 'Back to module').tap();
    }
    await expect(screen.getByText(/^[1-9]\d* of \d+ steps finished$/)).toBeVisible();
    const progressLabel = await screen.getByText(/^\d+ of \d+ steps finished$/).textContent();

    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    await screen.getByRole('button', 'Teacher Uploaded').tap();
    await screen.getByText('Open').first().tap();
    await expect(screen.getByText(progressLabel ?? '')).toBeVisible();
  });
});
