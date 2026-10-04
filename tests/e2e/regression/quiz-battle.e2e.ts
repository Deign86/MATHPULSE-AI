import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: Quiz Battle opens without starting live matchmaking', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Quiz Battle from the student navigation');
  await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
  await agent.act('inspect the Quiz Battle screen without joining a match or submitting a battle answer');
  await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
});
