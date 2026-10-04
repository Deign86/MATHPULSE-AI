import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

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
