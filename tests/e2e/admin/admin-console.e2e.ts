import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('navigation/read-only: admin views user and class management tables', async ({ app, agent, screen }) => {
  const admin = credentials.user('admin');
  await app.open('/');
  await expect(screen.getByRole('button', 'Sign In')).toBeVisible();

  await agent.act('sign in to MathPulse using the supplied admin email and password', {
    params: { username: admin.username, password: admin.password },
  });
  await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();

  await agent.act('open User Management from the admin navigation');
  await expect(screen.getByRole('heading', 'User Management')).toBeVisible();
  await expect(screen.getByText('user records', { exact: false })).toBeVisible();
  await expect(screen.getByRole('columnheader', 'User Identity')).toBeVisible();
  await expect(screen.getByRole('columnheader', 'Role')).toBeVisible();
  await expect(screen.getByRole('columnheader', 'Status')).toBeVisible();

  await agent.act('open Class Management from the admin navigation');
  await expect(screen.getByRole('heading', 'Class Management')).toBeVisible();
  await expect(screen.getByText('Total Sections', { exact: true })).toBeVisible();
  await expect(screen.getByText('Class Sections & Teacher Assignments', { exact: true })).toBeVisible();
});
