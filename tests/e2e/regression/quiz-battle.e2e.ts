import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('Quiz Battle opens for a signed-in student', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Quiz Battle from the student navigation');
  await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
});
