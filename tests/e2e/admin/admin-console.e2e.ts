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
  await expect(screen.getByText('user records', { exact: false }).first()).toBeVisible();
  await expect(screen.getByRole('columnheader', 'User Identity')).toBeVisible();
  await expect(screen.getByRole('columnheader', 'Role')).toBeVisible();
  await expect(screen.getByRole('columnheader', 'Status')).toBeVisible();

  await agent.act('open Class Management from the admin navigation');
  await expect(screen.getByRole('heading', 'Class Management')).toBeVisible();
  await expect(screen.getByText('Total Sections', { exact: true })).toBeVisible();
  await expect(screen.getByText('Class Sections & Teacher Assignments', { exact: true })).toBeVisible();
});

test('persisted: admin creates a disposable account and removes it', async ({ app, agent, browser, screen }) => {
  const admin = credentials.user('admin');
  const uniqueName = `E2E disposable ${Date.now()}`;
  const uniqueEmail = `e2e-disposable-${Date.now()}@mathpulse-qa.test`;
  const password = `QaRun-${Date.now()}!`;
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied admin email and password', {
    params: { username: admin.username, password: admin.password },
  });
  await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();

  await agent.act('open User Management from the admin navigation');
  await expect(screen.getByRole('columnheader', 'User Identity')).toBeVisible({ timeout: 120_000 });
  await screen.getByRole('button', 'Add User').tap();
  await expect(screen.getByText('Full Name')).toBeVisible();
  await screen.getByPlaceholder('e.g. Maria Santos').fill(uniqueName);
  await screen.getByPlaceholder('name@school.edu.ph').fill(uniqueEmail);
  await screen.getByPlaceholder('STEM A').fill('E2E QA');
  await screen.getByPlaceholder('123456789012').fill(String(Date.now()).padStart(12, '0').slice(-12));
  await browser.locator('input[type="password"]').nth(0).fill(password);
  await browser.locator('input[type="password"]').nth(1).fill(password);
  await screen.getByRole('button', 'Onboard User').tap();
  await screen.getByPlaceholder('Search name, email, LRN…').fill(uniqueEmail);
  await expect(screen.getByRole('button', `Delete ${uniqueName}`)).toBeVisible({ timeout: 120_000 });

  await app.open('/');
  await agent.act('reopen User Management and search for the disposable account');
  await expect(screen.getByRole('columnheader', 'User Identity')).toBeVisible({ timeout: 120_000 });
  await screen.getByPlaceholder('Search name, email, LRN…').fill(uniqueEmail);
  await expect(screen.getByRole('button', `Delete ${uniqueName}`)).toBeVisible({ timeout: 120_000 });
  await screen.getByRole('button', `Delete ${uniqueName}`).tap();
  await expect(screen.getByText('Delete User?', { exact: false })).toBeVisible();
  await screen.getByRole('button', /^Delete$/).tap();
  await expect(screen.getByRole('button', `Delete ${uniqueName}`)).not.toBeVisible({ timeout: 120_000 });
});
