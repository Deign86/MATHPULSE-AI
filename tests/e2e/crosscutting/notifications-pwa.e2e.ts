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
  await expect(screen.getByRole('heading', 'Daily Reward Claimed!')).toBeVisible();
  await expect(screen.getByText('All caught up')).toBeVisible();
});
