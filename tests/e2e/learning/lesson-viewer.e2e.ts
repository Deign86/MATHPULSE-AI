import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student opens a module and sees its lessons and checkpoint', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Modules from the student navigation');
  await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

  await agent.act('open an available mathematics module');
  await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  await expect(screen.getByText('Lesson 1')).toBeVisible();
  await expect(screen.getByRole('button', 'START')).toBeVisible();
});
