import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('navigation/read-only: teacher opens Intervention Center and Data Import without uploading', async ({ app, agent, screen }) => {
  const teacher = credentials.user('teacher');
  await app.open('/');
  await expect(screen.getByRole('button', 'Sign In')).toBeVisible();

  await agent.act('sign in to MathPulse using the supplied teacher email and password', {
    params: { username: teacher.username, password: teacher.password },
  });
  await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

  await agent.act('open the Intervention Center from the teacher dashboard at-risk indicator');
  await expect(screen.getByRole('heading', 'Intervention Center')).toBeVisible();

  await agent.act('open Data Import from the teacher navigation');
  await expect(screen.getByRole('heading', 'Data Import')).toBeVisible();
  await expect(screen.getByRole('heading', 'Upload Class Spreadsheet')).toBeVisible();
});

test('persisted: teacher imports a tiny workbook and verifies roster rows after reopen', async ({ app, agent, browser, screen }) => {
  const teacher = credentials.user('teacher');
  const rosterTs = Date.now();
  const workbookPath = `tests/e2e/teacher/e2e-roster-${rosterTs}.csv`;
  writeFileSync(workbookPath, 'Name,LRN,Email\nE2E Import Learner,991234567890,e2e-import-learner@mathpulse-qa.test\n');

  try {
    await app.open('/');
    await agent.act('sign in to MathPulse using the supplied teacher email and password', {
      params: { username: teacher.username, password: teacher.password },
    });
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
    await agent.act('open Data Import from the teacher navigation');
    await expect(screen.getByRole('heading', 'Upload Class Spreadsheet')).toBeVisible();
    await browser.locator('input[type="file"]').first().setInputFiles(workbookPath);
    await expect(screen.getByRole('heading', 'Confirm Class Records Upload')).toBeVisible({ timeout: 120_000 });
    await screen.getByRole('button', 'Preview rows').tap();
    await expect(screen.getByText('E2E Import Learner', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
    await screen.getByRole('button', /Upload \d+ rows/).tap();
    await expect(screen.getByText(/Successfully imported \d+ student record/, { exact: false }).first()).toBeVisible({ timeout: 120_000 });

    await app.open('/');
    await agent.act('reopen Data Import from the teacher navigation');
    await expect(screen.getByRole('heading', 'Recent Uploads')).toBeVisible();
    await expect(screen.getByText(`e2e-roster-${rosterTs}.csv`, { exact: false }).first()).toBeVisible({ timeout: 120_000 });
    await expect(screen.getByText(/1 student record/, { exact: false }).first()).toBeVisible({ timeout: 120_000 });
  } finally {
    rmSync(join(process.cwd(), workbookPath), { force: true });
  }
});
