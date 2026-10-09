import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeInitialAssessment =
  "if an Initial Assessment dialog is open, close it with its X close button without starting or skipping it (never press 'Skip for now'); otherwise do nothing";
const closeInterruptions =
  "if an Initial Assessment or Daily Rewards dialog is open, close it with its X close button without starting, skipping or claiming anything (never press 'Skip for now'); otherwise do nothing";
const greeting = /^Good (Morning|Afternoon|Evening), .+!$/;

describe('student gamification', { tags: ['student', 'gamification'] }, () => {
  test('header Level chip opens the Daily Rewards & Goals summary', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', /^Level \d+$/).tap();
    const summary = screen.getByRole('heading', 'Daily Rewards & Goals');
    await expect(summary).toBeVisible();
    await expect(screen.getByText('Quick Overview')).toBeVisible();
    await expect(screen.getByText('Total XP')).toBeVisible();
    await expect(screen.getByText(/^\d+ \/ \d+ XP$/)).toBeVisible();
    await expect(screen.getByRole('heading', "Today's Daily Tasks")).toBeVisible();
    await expect(screen.getByText(/^\d+ \/ 3 Done$/)).toBeVisible();
    await expect(screen.getByText('Complete 1 Math Lesson')).toBeVisible();
    await expect(screen.getByText('Score 80%+ on Practice Quiz')).toBeVisible();
    await expect(screen.getByText('Duel in Quiz Battle Arena')).toBeVisible();
    await expect(screen.getByText('Achievements Unlocked')).toBeVisible();
    await expect(screen.getByText(/^\d+ Badges$/)).toBeVisible();

    await screen.getByRole('button', 'Close rewards summary').tap();
    await expect(summary).toBeHidden();
  });

  test('header XP chip leads through the summary to the Rewards & Trophy Room and Go back returns to the opening tab', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', /^XP: \d+$/).tap();
    await expect(screen.getByRole('heading', 'Daily Rewards & Goals')).toBeVisible();
    await screen.getByRole('button', 'Open Full Rewards & Trophy Hall').tap();

    await expect(browser).toHaveURL('/rewards');
    await expect(screen.getByRole('heading', 'Rewards & Trophy Room')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Daily Rewards & Goals')).toBeHidden();
    await expect(screen.getByText('Level Progress')).toBeVisible();
    await expect(screen.getByText('Total Career XP')).toBeVisible();
    await expect(screen.getByText('Active Streak')).toBeVisible();

    await screen.getByRole('button', 'Go back').tap();
    await expect(browser).toHaveURL('/grades');
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 30_000 });
  });

  test('Rewards & Trophy Room tabs switch between achievements, daily quests and the progression journey', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/rewards');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(screen.getByRole('heading', 'Rewards & Trophy Room')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Loading trophies and achievements…')).toBeHidden({ timeout: 30_000 });

    await expect(screen.getByRole('button', 'All Badges')).toBeVisible();
    const badgeStatuses = screen.getByText(/^(Locked|Unlocked)$/);
    await expect.poll(() => badgeStatuses.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const allBadges = await badgeStatuses.count();

    await screen.getByRole('button', 'Combat & Duels').tap();
    await expect.poll(() => badgeStatuses.count()).toBeLessThan(allBadges);
    await screen.getByRole('button', 'All Badges').tap();
    await expect.poll(() => badgeStatuses.count()).toBe(allBadges);

    await screen.getByRole('button', /^Unlocked \(\d+\)$/).tap();
    await expect(screen.getByText('Locked')).toHaveCount(0);
    await screen.getByRole('button', /^Incomplete \(\d+\)$/).tap();
    await expect(screen.getByText('Unlocked')).toHaveCount(0);
    await screen.getByRole('button', 'All').tap();
    await expect.poll(() => badgeStatuses.count()).toBe(allBadges);

    await screen.getByRole('button', /^Daily Quests \(\d+\)$/).tap();
    await expect(screen.getByRole('heading', 'Daily Quests & Bounties')).toBeVisible();
    await expect(screen.getByText('Total Daily Bounty')).toBeVisible();
    await expect(screen.getByRole('button', 'All Badges')).toBeHidden();

    await screen.getByRole('button', 'Progression Journey').tap();
    await expect(screen.getByRole('heading', 'Level Journey & Rank Milestones')).toBeVisible();

    await screen.getByRole('button', /^All Achievements \(\d+\)$/).tap();
    await expect(screen.getByRole('button', 'All Badges')).toBeVisible();

    await screen.getByRole('button', 'Go back').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
  });

  test('header XP chip and the right sidebar XP slab show the same total', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const headerXp = screen.getByRole('button', /^XP: \d+$/);
    const sidebarXp = screen.getByRole('button', /^XP \d+$/);
    await expect(sidebarXp).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () =>
          `${(await headerXp.getAttribute('aria-label'))?.match(/\d+/)?.[0]} = ${(await sidebarXp.textContent())?.match(/\d+/)?.[0]}`,
        { timeout: 15_000, message: 'the header XP chip and the right sidebar XP slab show different totals' },
      )
      .toMatch(/^(\d+) = \1$/);
  });

  test('Daily Rewards check-in can be closed, then claimed when a reward is ready', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInitialAssessment);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible({ timeout: 30_000 });

    const checkIn = screen.getByRole('dialog', 'Daily Rewards');
    const claimable = await checkIn.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!claimable, "today's daily reward was already claimed by the e2e student");

    await expect(checkIn.getByRole('heading', 'Welcome Back!')).toBeVisible();
    await expect(checkIn.getByText('Claim your daily reward to keep your streak alive.')).toBeVisible();
    await expect(checkIn.getByText('Ready!')).toBeVisible();
    await expect(checkIn.getByText('Day 7 • Epic Reward')).toBeVisible();
    await expect(checkIn.getByText('until next reset')).toBeVisible();
    await checkIn.getByRole('button', 'Close daily rewards').tap();
    await expect(checkIn).toBeHidden();

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Modules').tap();
    await expect(checkIn).toBeVisible({ timeout: 15_000 });

    await checkIn.getByRole('button', 'Claim!').tap();
    await expect(checkIn).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Failed to claim daily reward. Please try again.')).toBeHidden();
  });

  test('student navigation tour reaches Avatar Studio, Leadership Board and Assessment, then returns to the Competency Matrix', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Avatar Studio').tap();
    await expect(browser).toHaveURL('/avatar');
    await expect(screen.getByRole('heading', /'s Closet$/)).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Leadership Board').tap();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Assessment').tap();
    await expect(browser).toHaveURL('/grades');
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'Competency Matrix')).toBeVisible({ timeout: 30_000 });
  });
});
