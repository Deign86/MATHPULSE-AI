import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeStudentPrompts =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
// The subtitle reads 'All caught up' while the inbox is still loading, so wait for a row timestamp or the empty state first.
const settledPanel = / ago$|^You're all caught up!$/;
const unreadSubtitle = /^\d+ unread alerts?$/;
const reminderTitle = "Don't forget your daily check-in!";

const inboxes = [
  { account: 'student', landingRole: 'button', landingName: 'Dashboard' },
  { account: 'teacher', landingRole: 'heading', landingName: 'Teacher Dashboard' },
  { account: 'admin', landingRole: 'heading', landingName: 'Admin Dashboard' },
] as const;

describe('notifications bell and PWA install', { tags: ['any', 'notifications-pwa'] }, () => {
  for (const inbox of inboxes) {
    test(`${inbox.account} bell opens the panel with its list or empty state, and an outside click closes it`, { session: inbox.account, tags: [inbox.account] }, async ({ app, agent, screen }) => {
      await app.open('/');
      const landing = screen.getByRole(inbox.landingRole, inbox.landingName);
      await expect(landing).toBeVisible({ timeout: 45_000 });
      if (inbox.account === 'student') {
        await agent.act(closeStudentPrompts);
        await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
      }
      const bell = screen.getByRole('button', 'Notifications');
      const panel = screen.getByTestId('notification-panel');

      await expect(bell).toHaveAttribute('aria-expanded', 'false');
      await bell.tap();
      await expect(panel).toBeVisible();
      await expect(bell).toHaveAttribute('aria-expanded', 'true');
      await expect(panel.getByRole('heading', 'Notifications')).toBeVisible();
      await expect(panel.getByText(settledPanel).first()).toBeVisible({ timeout: 20_000 });

      if (await panel.getByText("You're all caught up!").isVisible()) {
        await expect(panel.getByText('No pending notifications at this moment.')).toBeVisible();
        await expect(panel.getByText('All caught up')).toBeVisible();
        await expect(panel.getByRole('button', 'Mark all notifications as read')).toBeHidden();
      } else {
        await expect(panel.getByText(/^(\d+ unread alerts?|All caught up)$/)).toBeVisible();
        await expect(panel.getByRole('button').filter({ hasText: / ago/ }).first()).toBeVisible();
      }

      await landing.tap();
      await expect(panel).toBeHidden();
      await expect(bell).toHaveAttribute('aria-expanded', 'false');
    });

    // Parallel tests share these inboxes: a quiz result or daily reward created mid-test leaves one unread row, so one retry absorbs it.
    test(`${inbox.account} Mark read clears the unread count and badge, and stays cleared after a reload`, { session: inbox.account, tags: [inbox.account], timeout: 180_000, retries: 1 }, async ({ app, agent, browser, screen }) => {
      await app.open('/');
      const landing = screen.getByRole(inbox.landingRole, inbox.landingName);
      await expect(landing).toBeVisible({ timeout: 45_000 });
      if (inbox.account === 'student') {
        await agent.act(closeStudentPrompts);
        await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
      }
      const bell = screen.getByRole('button', 'Notifications');
      const panel = screen.getByTestId('notification-panel');
      const markRead = panel.getByRole('button', 'Mark all notifications as read');
      // The unread badge is a bare span inside the bell; the bell's aria-label hides it from role queries.
      const badge = browser.locator('button[aria-label="Notifications"] > span');

      await bell.tap();
      await expect(panel.getByText(settledPanel).first()).toBeVisible({ timeout: 20_000 });
      if (await markRead.isVisible()) {
        const unreadTotal = Number.parseInt((await panel.getByText(unreadSubtitle).textContent()) ?? '', 10);
        await expect(badge).toHaveText(unreadTotal > 99 ? '99+' : String(unreadTotal));
        await markRead.tap();
      }
      await expect(panel.getByText('All caught up')).toBeVisible({ timeout: 15_000 });
      await expect(markRead).toBeHidden();
      await expect(badge).toBeHidden();

      await browser.reload();
      await expect(landing).toBeVisible({ timeout: 45_000 });
      if (inbox.account === 'student') {
        await agent.act(closeStudentPrompts);
        await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
      }
      await bell.tap();
      await expect(panel.getByText(settledPanel).first()).toBeVisible({ timeout: 20_000 });
      await expect(panel.getByText('All caught up')).toBeVisible();
      await expect(badge).toBeHidden();
    });

    test(`${inbox.account} Show more reveals the next page of 20 notifications`, { session: inbox.account, tags: [inbox.account] }, async ({ app, agent, screen }) => {
      await app.open('/');
      await expect(screen.getByRole(inbox.landingRole, inbox.landingName)).toBeVisible({ timeout: 45_000 });
      if (inbox.account === 'student') {
        await agent.act(closeStudentPrompts);
        await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
      }
      const panel = screen.getByTestId('notification-panel');
      const showMore = panel.getByRole('button', /^Show more notifications, \d+ remaining$/);
      const footer = panel.getByText(/^Showing \d+ of \d+$/);

      await screen.getByRole('button', 'Notifications').tap();
      await expect(panel.getByText(settledPanel).first()).toBeVisible({ timeout: 20_000 });
      test.skip(!(await showMore.isVisible()), `the ${inbox.account} inbox holds 20 or fewer notifications, so there is no second page`);

      await expect(footer).toHaveText(/^Showing 20 of \d+$/);
      const inboxTotal = Number.parseInt(((await footer.textContent()) ?? '').replace(/^Showing 20 of /, ''), 10);
      await expect(showMore).toHaveAccessibleName(`Show more notifications, ${inboxTotal - 20} remaining`);
      await showMore.tap();
      if (inboxTotal > 40) {
        await expect(footer).toHaveText(`Showing 40 of ${inboxTotal}`);
        await expect(showMore).toHaveAccessibleName(`Show more notifications, ${inboxTotal - 40} remaining`);
      } else {
        await expect(showMore).toBeHidden();
        await expect(footer).toBeHidden();
      }
    });
  }

  test('student daily check-in reminder opens Modules and is marked read', { session: 'student', tags: ['student'] }, async ({ app, agent, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const panel = screen.getByTestId('notification-panel');
    const reminder = panel.getByRole('button').filter({ hasText: reminderTitle });
    // CSS on purpose: the unread dot has no accessible name, and a Daily Rewards dialog opening on Modules aria-hides the panel.
    const reminderRow = browser.locator('[data-testid="notification-panel"] [role="button"]').filter({ hasText: reminderTitle });

    await screen.getByRole('button', 'Notifications').tap();
    await expect(panel.getByText(settledPanel).first()).toBeVisible({ timeout: 20_000 });
    test.skip((await reminder.count()) === 0, 'no daily check-in reminder is on the first page of the student inbox');

    await reminder.tap();
    await expect(browser).toHaveURL('/modules', { timeout: 30_000 });
    await expect(reminderRow).toBeAttached();
    await expect(reminderRow.filter({ has: browser.locator('span.bg-purple-600') })).toHaveCount(0, { timeout: 15_000 });
  });

  test('student header offers Install app when the browser fires beforeinstallprompt, and a dismissed prompt hides it', { session: 'student', tags: ['student', 'pwa'] }, async ({ app, agent, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });

    const offered = await browser.evaluate(() => {
      const installEvent = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => {
          document.documentElement.dataset.e2eInstallPrompt = 'shown';
        },
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      });
      return window.dispatchEvent(installEvent);
    });
    expect(offered).toBe(false);

    const install = screen.getByRole('button', 'Install MathPulse AI');
    await expect(install).toBeVisible();
    await expect(install).toContainText('Install app');
    await install.tap();
    await expect(install).toBeHidden();
    expect(await browser.evaluate(() => document.documentElement.dataset.e2eInstallPrompt ?? null)).toBe('shown');
  });

  test('service worker registers and precaches the app shell', {
    tags: ['student', 'pwa'],
    skip: 'e2e.config.ts runs the Vite dev server, and src/main.tsx registers /sw.js only in production builds or with VITE_ENABLE_SW_IN_DEV=true',
  }, async () => {});
});
