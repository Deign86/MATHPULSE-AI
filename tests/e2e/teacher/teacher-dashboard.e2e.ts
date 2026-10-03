import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('teacher signs in and sees classes with risk badges', async ({ app, agent, screen }) => {
  const teacher = credentials.user('teacher');
  await app.open('/');
  await expect(screen.getByRole('button', 'Sign In')).toBeVisible();

  await agent.act('sign in to MathPulse using the supplied teacher email and password', {
    params: { username: teacher.username, password: teacher.password },
  });
  await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  await expect(screen.getByRole('heading', 'My Classes')).toBeVisible();
  await expect(screen.getByRole('button', '66 at risk')).toBeVisible();
});
