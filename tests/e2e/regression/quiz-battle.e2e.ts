import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('quiz battle lobby regression', { tags: ['student', 'quiz-battle', 'regression'] }, () => {
  test('entering Quiz Battle from the sidebar collapses the sidebar and shows the hub tiles', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
    await expect(screen.getByRole('heading', 'MathPulse AI')).toBeVisible();
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();

    await screen.getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/battle');

    await expect(screen.getByRole('complementary')).toBeVisible();
    await expect(screen.getByRole('heading', 'MathPulse AI')).toBeHidden();
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();
    await expect(screen.getByRole('button', 'Expand sidebar')).toBeHidden();
    await expect(screen.getByRole('button', 'Dashboard')).toBeHidden();
    await expect(screen.getByRole('button', 'Leadership Board')).toBeHidden();

    await expect(screen.getByText('Live Arena')).toBeVisible();
    await expect(screen.getByText(/^Connection: (connected|reconnecting|disconnected)$/)).toBeVisible();
    await expect(screen.getByRole('heading', 'BATTLE MODES')).toBeVisible();
    await expect(screen.getByRole('button', /^VS Player/)).toContainText('Match with a classmate or join with a room code.');
    await expect(screen.getByRole('button', /^VS Bot/)).toContainText('Practice by yourself with adjustable bot difficulty.');
    await expect(screen.getByRole('heading', 'Hall of Fame')).toBeVisible();
    await expect(screen.getByText('Top Arena Champions')).toBeVisible();
    await expect(screen.getByRole('heading', 'My Stats')).toBeVisible();
    await expect(screen.getByRole('button', 'View Stats →')).toBeVisible();
    for (const stat of ['Total XP', 'Win Rate', 'Matches', 'Avg Speed']) {
      await expect(screen.getByText(stat)).toBeVisible();
    }
    await expect(screen.getByRole('heading', 'Match History')).toBeVisible();
    await expect(screen.getByRole('button', 'View All →')).toBeVisible();

    // Collapsed sidebar items are icon-only buttons with no accessible name.
    await browser.locator('aside button:has(svg.lucide-layout-dashboard)').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeHidden();
  });

  test('a /battle deep link opens the hub with the sidebar already collapsed', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await expect(screen.getByRole('complementary')).toBeVisible();
    await expect(screen.getByRole('heading', 'MathPulse AI')).toBeHidden();
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();
    await expect(screen.getByRole('button', 'Quiz Battle')).toBeHidden();
    await expect(screen.getByRole('button', /^VS Player/)).toBeVisible();
    await expect(screen.getByRole('button', /^VS Bot/)).toBeVisible();
  });

  test('Alt+B then Alt+D returns to the Dashboard with the sidebar expanded again', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();

    await browser.keyboard.press('Alt+b');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();

    await browser.keyboard.press('Alt+d');
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeHidden({ timeout: 15_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });

  test('browser Back from Quiz Battle returns to the Dashboard with the sidebar expanded again', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();

    await screen.getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();

    await browser.back();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeHidden({ timeout: 15_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });
});
