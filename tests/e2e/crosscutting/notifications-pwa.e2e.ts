import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: student opens the notification bell and inspects the panel', async ({ app, agent, screen }) => {
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
  await expect(screen.getByRole('heading', 'Diagnostic Assessment Complete')).toBeVisible();

  await agent.act('delete the Diagnostic Assessment Complete notification using its Delete notification button');
  const unreadText = await screen.getByText(/unread alerts/, { exact: false }).first().textContent();
  const unreadAfterDelete = Number.parseInt(unreadText ?? '', 10);
  await expect(screen.getByText(`${unreadAfterDelete} unread alerts`)).toBeVisible();

  await agent.act('mark one uniquely titled remaining notification as read, choosing a notification other than Diagnostic Assessment Complete');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();
  await expect(screen.getByText(`${unreadAfterDelete - 1} unread alerts`, { exact: false }).first()).toBeAttached({ timeout: 120_000 });

  await app.open('/');
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  await agent.act('open the Notifications panel from the notification bell');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();
  await expect(screen.getByText(`${unreadAfterDelete - 1} unread alerts`, { exact: false }).first()).toBeAttached({ timeout: 120_000 });
});
