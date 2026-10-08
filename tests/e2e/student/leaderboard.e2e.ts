import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student leaderboard', { tags: ['student', 'leaderboard'] }, () => {
  test('Leadership Board in the sidebar opens the Leaderboard with Class Standings', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

    await screen.getByRole('button', 'Leadership Board').tap();
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByText('Hall of Champions')).toBeVisible();
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible();
    await expect(screen.getByText(/^\d+ Learners$/)).toBeVisible();
    await expect(screen.getByText(/^#\d+$/)).toBeVisible();
    await expect(
      screen.getByText(/^(Only \d+ XP needed to overtake .+!|You hold the #1 rank! Keep mastering drills!)$/),
    ).toBeVisible();
    for (const filter of ['Show daily leaderboard', 'Show weekly leaderboard', 'Show All Time leaderboard']) {
      await expect(screen.getByRole('button', filter)).toBeVisible();
    }
  });

  test('daily, weekly, and All Time pills each become the highlighted filter', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });

    const daily = screen.getByRole('button', 'Show daily leaderboard');
    const weekly = screen.getByRole('button', 'Show weekly leaderboard');
    const allTime = screen.getByRole('button', 'Show All Time leaderboard');
    await expect(daily).toHaveText(/^daily$/i);
    await expect(weekly).toHaveText(/^weekly$/i);
    await expect(allTime).toHaveText('All Time');
    await expect(browser).toHaveClass(weekly, /from-purple-600/);

    await daily.tap();
    await expect(browser).toHaveClass(daily, /from-purple-600/, { timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });
    await expect(browser).not.toHaveClass(weekly, /from-purple-600/);

    await allTime.tap();
    await expect(browser).toHaveClass(allTime, /from-purple-600/, { timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });
    await expect(browser).not.toHaveClass(daily, /from-purple-600/);

    await weekly.tap();
    await expect(browser).toHaveClass(weekly, /from-purple-600/, { timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });
    await expect(browser).not.toHaveClass(allTime, /from-purple-600/);
  });

  test('the weekly and All Time filters rank by different XP', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });

    const podiumXp = screen.getByRole('main').getByText(/^\d+(\.\d)?k? XP$/);
    await expect(podiumXp).toHaveCount(3);
    const weeklyXp = (await podiumXp.allTextContents()).join(' | ');

    await screen.getByRole('button', 'Show All Time leaderboard').tap();
    await expect
      .poll(
        async () => {
          const shown = await podiumXp.allTextContents();
          return shown.length === 3 ? shown.join(' | ') : weeklyXp;
        },
        { timeout: 20_000 },
      )
      .not.toBe(weeklyXp);
  });

  test('Class Standings highlights the signed-in student row and opens their profile', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });

    const youBadge = screen.getByText(/^you$/i);
    test.skip(
      (await screen.getByRole('main').getByText(/^you$/i).count()) === 0,
      'the e2e student is on the podium or outside the top 25, so Class Standings has no You row',
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

  test('the rank bar claims the #1 rank only when the rank badge reads #1', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/leaderboard');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });

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
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });

    // Podium names render in the order 2nd, 1st, 3rd, ahead of the Class Standings heading.
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
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');

    await browser.back();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('main').getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');

    await browser.back();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible({ timeout: 30_000 });
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
    await expect(screen.getByRole('button', 'Show All Time leaderboard')).toBeVisible();

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
      await expect(screen.getByRole('heading', 'Class Standings')).toBeHidden();
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
