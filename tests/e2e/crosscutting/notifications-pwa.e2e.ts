import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: student opens the notification bell and inspects the panel', async ({ app, agent, browser, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  const notificationBell = screen.getByRole('button', 'Notifications');
  await expect(notificationBell).toBeVisible();
  await agent.act('open the notifications panel from the notification bell and inspect its visible items');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();

  await browser.evaluate<string>(
    `() => {
      const items = [...document.querySelectorAll('div[role="button"]')];
      const target = items.find((el) => (el.textContent ?? '').includes('Diagnostic Assessment Complete'));
      const del = target?.querySelector('button[aria-label="Delete notification"]');
      if (del instanceof HTMLElement) {
        del.click();
        return 'clicked';
      }
      return 'none';
    }`,
  ).then((deleteResult) => {
    if (deleteResult !== 'clicked') throw new Error('diagnostic notification delete control not found');
  });
  await expect(screen.getByText('Diagnostic Assessment Complete', { exact: false })).not.toBeVisible({ timeout: 120_000 });

  await agent.act('tap the E2E Offline Probe A notification item');
  const probeARead = await browser.evaluate<boolean>(
    `async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const items = [...document.querySelectorAll('div[role="button"]')];
        const probe = items.find((el) => (el.textContent ?? '').includes('E2E Offline Probe A'));
        if (probe && !probe.querySelector('span.bg-purple-600')) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return false;
    }`,
  );
  if (!probeARead) throw new Error('probe A still shows unread after marking read');

  await app.open('/');
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  await agent.act('open the Notifications panel from the notification bell');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();
  const probeAReadPersisted = await browser.evaluate<boolean>(
    `async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const items = [...document.querySelectorAll('div[role="button"]')];
        const probe = items.find((el) => (el.textContent ?? '').includes('E2E Offline Probe A'));
        if (probe && !probe.querySelector('span.bg-purple-600')) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return false;
    }`,
  );
  if (!probeAReadPersisted) throw new Error('probe A read state did not persist after reload');
});
