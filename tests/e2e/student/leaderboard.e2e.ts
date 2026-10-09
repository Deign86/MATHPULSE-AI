import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student leaderboard', { tags: ['student', 'leaderboard'] }, () => {
  test('Leadership Board in the sidebar opens the Leaderboard with School Standings', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

    await screen.getByRole('button', 'Leadership Board').tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByText('Hall of Champions')).toBeVisible();
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible();
    await expect(screen.getByText(/^\d+ Learners$/)).toBeVisible();
    await expect(screen.getByText(/^#\d+$/)).toBeVisible();
    await expect(
      screen.getByText(/^(Only \d+ XP needed to overtake .+!|You hold the #1 rank! Keep mastering drills!|You're outside the top \d+\. Keep mastering drills to climb in!)$/),
    ).toBeVisible();
    await expect(screen.getByRole('main').getByText('All Time')).toBeVisible();
  });

  // Issue #233: the leaderboard collection only stores all-time XP, so the page shows a single
  // All Time ranking instead of Daily/Weekly pills that could not change the order.
  test('the ranking is all-time only, with no Daily or Weekly filter pills', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });

    await expect(screen.getByRole('main').getByText('All Time')).toBeVisible();
    await expect(screen.getByRole('button', 'Show daily leaderboard')).toHaveCount(0);
    await expect(screen.getByRole('button', 'Show weekly leaderboard')).toHaveCount(0);
    await expect(screen.getByRole('button', 'Show All Time leaderboard')).toHaveCount(0);
  });

  test('School Standings highlights the signed-in student row and opens their profile', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });

    const youBadge = screen.getByText(/^you$/i);
    test.skip(
      (await screen.getByRole('main').getByText(/^you$/i).count()) === 0,
      'the e2e student is on the podium or outside the top 25, so School Standings has no You row',
    );
    const youRow = browser.locator('main div.group.rounded-2xl').filter({ has: youBadge });
    await expect(browser).toHaveClass(youRow, /border-purple-500/);

    await youRow.tap();
    await expect(screen.getByRole('heading', 'Performance Stats')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('heading', 'Rankings')).toBeVisible();
    await expect(screen.getByRole('heading', 'Achievements')).toBeVisible();
    await screen.getByRole('button', 'Close profile modal').tap();
    await expect(screen.getByRole('heading', 'Performance Stats')).toBeHidden();
  });

  test('the rank bar claims the #1 rank only when the rank badge reads #1', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });

    const rankBadge = await screen.getByText(/^#\d+$/).textContent();
    const holdsFirst = screen.getByText('You hold the #1 rank! Keep mastering drills!');
    if (rankBadge === '#1') {
      await expect(holdsFirst).toBeVisible();
    } else {
      await expect(holdsFirst).toBeHidden();
    }
  });

  test('a podium student opens the profile modal, which closes again', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });

    // Podium names render in the order 2nd, 1st, 3rd, ahead of the School Standings heading.
    await screen.getByRole('main').getByRole('heading', { level: 3 }).nth(1).tap();
    await expect(screen.getByRole('heading', 'Performance Stats')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('heading', 'Rankings')).toBeVisible();
    await expect(screen.getByRole('heading', 'Achievements')).toBeVisible();

    await screen.getByRole('button', 'Close profile modal').tap();
    await expect(screen.getByRole('heading', 'Performance Stats')).toBeHidden();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible();
  });

  test('Battle, Quiz Battle, and Modules shortcuts leave the Leaderboard', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen, browser }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');

    await browser.back();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('main').getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');

    await browser.back();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('heading', 'School Standings')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('main').getByRole('button', 'Modules').tap();
    await expect(browser).toHaveURL('/modules');
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeHidden({ timeout: 15_000 });
  });

  test('on a phone, Battle Options opens the Leaderboard and then Quiz Battle', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

    const mobileNav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const battleOptions = mobileNav.getByRole('button', 'Battle Options: Quiz Battle and Leaderboard');
    await battleOptions.tap();
    await expect(battleOptions).toBeExpanded();
    await mobileNav.getByRole('button', 'Leaderboard').tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('main').getByText('All Time')).toBeVisible();

    await battleOptions.tap();
    await expect(battleOptions).toBeExpanded();
    await mobileNav.getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');
  });

  test(
    'a teacher-locked leaderboard shows the Leaderboard Locked card',
    { session: 'student', skip: 'needs users.lockedFeatures to contain leaderboard, which only a teacher or the risk trigger can set on the shared e2e student' },
    async ({ app, screen }) => {
      await app.open('/leaderboard');
      await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
      await expect(screen.getByText('Leaderboard Locked')).toBeVisible({ timeout: 30_000 });
      await expect(screen.getByText('This feature is temporarily unavailable while you focus on your learning.')).toBeVisible();
      await expect(screen.getByRole('heading', 'School Standings')).toBeHidden();
    },
  );

  test(
    'a failed leaderboard load shows Couldn\'t load leaderboard with Try Again',
    { session: 'student', skip: 'getLeaderboard swallows Firestore errors and returns an empty list, and Firestore reads cannot be faulted without breaking the session', tags: ['known-bug'] },
    async ({ app, screen }) => {
      await app.open('/leaderboard');
      await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
      await expect(screen.getByText("Couldn't load leaderboard")).toBeVisible({ timeout: 30_000 });
      await expect(screen.getByRole('button', 'Try Again')).toBeVisible();
    },
  );
});
