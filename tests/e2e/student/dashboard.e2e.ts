import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeInterruptions =
  "if an Initial Assessment or Daily Rewards dialog is open, close it with its X close button without starting, skipping or claiming anything (never press 'Skip for now'); otherwise do nothing";
const greeting = /^Good (Morning|Afternoon|Evening), .+!$/;

describe('student dashboard', { tags: ['student', 'dashboard'] }, () => {
  test('hero greets the student and Continue Learning opens Modules', { session: 'student', timeout: 240_000 }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Today is a great day to move one step forward in math mastery.')).toBeVisible();
    await screen.getByRole('button', 'Continue Learning').tap();

    await expect(browser).toHaveURL('/modules', { timeout: 30_000 });
    await agent.waitFor('the Modules area shows the Curriculum Modules library, a module Study Journey, or an opened lesson', {
      timeout: 60_000,
    });
  });

  test('Assessment Complete bubble opens Assessment Results and the X dismisses the bubble', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const bubble = screen.getByRole('button', /^Assessment Complete!/);
    const assessed = await bubble.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!assessed, 'the e2e student has no completed diagnostic on record');

    await bubble.tap();
    const results = screen.getByRole('dialog', 'Assessment Results');
    await expect(results).toBeVisible();
    await expect(results.getByText('Your diagnostic score, competency profile, and learning progress.')).toBeVisible();
    await results.getByRole('button', 'History & Trends').tap();
    await expect(results.getByRole('heading', 'Performance Over Time')).toBeVisible();
    await results.getByRole('button', 'Last Results').tap();
    await expect(results.getByRole('heading', 'Performance Over Time')).toBeHidden();
    await expect(results.getByRole('button', 'Continue to Learning Path')).toBeVisible();
    await results.getByRole('button', 'Close').tap();
    await expect(results).toBeHidden();

    await screen.getByRole('button', 'Dismiss assessment complete notification').tap();
    await expect(bubble).toBeHidden();
    await expect(results).toBeHidden();
  });

  test('a dismissed Assessment Complete bubble stays dismissed after a reload', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const bubble = screen.getByRole('button', /^Assessment Complete!/);
    const assessed = await bubble.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!assessed, 'the e2e student has no completed diagnostic on record');

    await screen.getByRole('button', 'Dismiss assessment complete notification').tap();
    await expect(bubble).toBeHidden();

    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('Maintain your daily practice pace', { visible: true })).toBeVisible({ timeout: 30_000 });
    await expect(bubble).not.toBeVisible({ timeout: 5_000 });
  });

  test('learning path View All opens the Curriculum Modules library', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', /^(Start|Continue) Learning$/)).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'View All').tap();

    await expect(browser).toHaveURL('/modules');
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test('learning path module card opens that module Study Journey', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', /^(Start|Continue) Learning$/)).toBeVisible({ timeout: 30_000 });
    const card = screen.getByRole('button').filter({ hasText: /\d+ lessons?/ }).first();
    const available = await card.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!available, 'no learning path module is available to open for this student');

    const title = (await card.getByRole('heading').textContent()) ?? '';
    await card.tap();

    await expect(browser).toHaveURL('/modules');
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', title, { level: 1 })).toBeVisible();
  });

  test('Competency Matrix Refresh reloads the skill analytics card', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', 'Competency Matrix')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Realtime performance across modules')).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh');
    await expect(refresh).toBeVisible({ timeout: 30_000 });
    await refresh.tap();

    await expect(refresh).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(/^(Mastery check|Unable to load competency data)$/)).toBeVisible({ timeout: 30_000 });
  });

  test('right sidebar shows Daily Goals, XP and Streak at 1280px and the slabs open Daily Rewards & Goals', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', 'Daily Goals')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Target Tracker', { visible: true })).toBeVisible();
    await expect(screen.getByText('Lesson Progress', { visible: true })).toBeVisible();

    const summary = screen.getByRole('heading', 'Daily Rewards & Goals');
    await screen.getByRole('button', /^XP \d+$/).tap();
    await expect(summary).toBeVisible();
    await screen.getByRole('button', 'Close rewards summary').tap();
    await expect(summary).toBeHidden();

    await screen.getByRole('button', /^Streak \d+ Days?$/).tap();
    await expect(summary).toBeVisible();
    await screen.getByRole('button', 'Close rewards summary').tap();
    await expect(summary).toBeHidden();
  });

  test('right sidebar Streak slab uses the singular Day for a one-day streak', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const streak = screen.getByRole('button', /^Streak \d+ Days?$/);
    await expect(streak).toBeVisible({ timeout: 30_000 });
    const streakText = (await streak.textContent()) ?? '';
    test.skip(!/\s1 Days?$/.test(streakText), 'the singular form only applies while the e2e student has a one-day streak');

    await expect(streak).toHaveAccessibleName('Streak 1 Day');
  });

  test('Daily Goals card opens Modules for an assessed student', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const assessed = await screen
      .getByText('Maintain your daily practice pace', { visible: true })
      .waitFor({ timeout: 20_000 })
      .then(() => true, () => false);
    test.skip(!assessed, 'unassessed students get the Initial Assessment from this card instead of Modules');

    await screen.getByRole('heading', 'Daily Goals').tap();
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test('Leaderboards preview card shows the podium and opens the Leaderboard', { session: 'student', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const card = screen.getByRole('heading', 'Leaderboards');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Weekly Race', { visible: true })).toBeVisible();
    await expect(screen.getByText('Loading rankings...', { visible: true })).toBeHidden({ timeout: 20_000 });
    await agent.assert(
      'The "Leaderboards" card shows either a top-three podium with student names and XP totals, or a message that rankings are unavailable',
    );

    await card.tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
  });

  test('Leaderboard opened from the dashboard card survives a reload', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('heading', 'Leaderboards').tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });

    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
  });

  test('below 1280px the main column shows Current XP, Streak and the Leaderboards card', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await browser.setViewport({ width: 1100, height: 800 });
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', 'Daily Goals')).toBeVisible({ timeout: 30_000 });
    const headerXp = screen.getByRole('button', /^XP: \d+$/);
    const currentXp = screen.getByRole('button', /^Current XP \d+$/);
    await expect(currentXp).toBeVisible();
    await expect
      .poll(
        async () =>
          `${(await headerXp.getAttribute('aria-label'))?.match(/\d+/)?.[0]} = ${(await currentXp.textContent())?.match(/\d+/)?.[0]}`,
        { timeout: 15_000, message: 'the header XP chip and the Current XP slab show different totals' },
      )
      .toMatch(/^(\d+) = \1$/);
    await expect(screen.getByRole('button', /^Streak \d+ Days?$/)).toHaveAccessibleName(/^Streak (1 Day|(?!1 Days)\d+ Days)$/);

    const summary = screen.getByRole('heading', 'Daily Rewards & Goals');
    await currentXp.tap();
    await expect(summary).toBeVisible();
    await screen.getByRole('button', 'Close rewards summary').tap();
    await expect(summary).toBeHidden();

    await screen.getByRole('heading', 'Leaderboards').tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
  });

  test('Assessment Focus Review banner opens Modules when the diagnostic flagged topics', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', /^(Start|Continue) Learning$/)).toBeVisible({ timeout: 30_000 });
    const flagged = await screen
      .getByText('Assessment Focus Review')
      .waitFor({ timeout: 10_000 })
      .then(() => true, () => false);
    test.skip(!flagged, 'the e2e student has no at-risk topics from a completed diagnostic');

    await expect(
      screen.getByText('Your latest diagnostic flagged these topics for review. Modules are prioritized based on this focus order.'),
    ).toBeVisible();
    await screen.getByRole('button', 'Open Modules').tap();
    await expect(browser).toHaveURL('/modules');
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test('Recommended for Review chip opens study tips or the At-Risk Study Brief', { session: 'student', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', /^(Start|Continue) Learning$/)).toBeVisible({ timeout: 30_000 });
    const carousel = screen.getByRole('heading', 'Recommended for Review');
    const flagged = await carousel.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!flagged, 'the e2e student has no flagged or at-risk topics');

    await agent.act('tap the first topic chip in the row under the "Recommended for Review" heading');
    const tips = screen.getByText(/^Study Tips · /);
    await expect(screen.getByText(/^(Study Tips · .+|At-Risk Study Brief)$/)).toBeVisible();

    if (await tips.isVisible()) {
      await expect(screen.getByText('Generating personalized tips...')).toBeHidden({ timeout: 120_000 });
      await agent.assert('The Study Tips panel shows study tips for the topic or a prompt to open the module');
      await screen.getByRole('button', 'Go to Module →').tap();
      await expect(screen.getByRole('heading', /^(Curriculum Modules|Study Journey)$/)).toBeVisible({ timeout: 30_000 });
    } else {
      const brief = screen.getByRole('dialog').filter({ hasText: 'At-Risk Study Brief' });
      await expect(brief).toBeVisible();
      await brief.getByRole('button', 'Close').tap();
      await expect(brief).toBeHidden();
    }
  });

  test('floating AI tutor opens, closes, minimizes to a pill and restores', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const launcher = screen.getByRole('button', 'Open AI tutor chat');
    const restore = screen.getByRole('button', 'Restore AI tutor launcher');
    await expect(screen.getByRole('button', /^(Open AI tutor chat|Restore AI tutor launcher)$/)).toBeVisible({ timeout: 30_000 });
    if (await restore.isVisible()) await restore.tap();

    const panel = screen.getByRole('dialog', 'AI tutor chat');
    await launcher.tap();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', 'L.O.L.I. AI Tutor')).toBeVisible();
    await expect(panel.getByRole('textbox', 'Ask AI tutor a question')).toBeVisible();
    await panel.getByRole('button', 'Close chat').tap();
    await expect(panel).toBeHidden();

    await launcher.tap();
    await expect(panel).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    await launcher.tap();
    await panel.getByRole('button', 'Minimize AI tutor launcher').tap();
    await expect(panel).toBeHidden();
    await expect(launcher).toBeHidden();
    await restore.tap();
    await expect(launcher).toBeVisible();
    await expect(restore).toBeHidden();
  });

  test('floating AI tutor Open fullscreen switches to AI Chat', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const launcher = screen.getByRole('button', 'Open AI tutor chat');
    const restore = screen.getByRole('button', 'Restore AI tutor launcher');
    await expect(screen.getByRole('button', /^(Open AI tutor chat|Restore AI tutor launcher)$/)).toBeVisible({ timeout: 30_000 });
    if (await restore.isVisible()) await restore.tap();

    await launcher.tap();
    await screen.getByRole('dialog', 'AI tutor chat').getByRole('button', 'Open fullscreen').tap();
    await expect(screen.getByPlaceholder('Search conversations...')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', /AI tutor chat$/)).toBeHidden();
  });
});
