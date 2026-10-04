import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student opens the scientific calculator and evaluates 2 + 2', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await screen.getByRole('button', 'Scientific Calculator').tap();
  await expect(screen.getByRole('dialog', 'Scientific Calculator')).toBeVisible();

  await screen.getByRole('button', 'AC').tap();
  await screen.getByRole('button', '2').tap();
  await screen.getByRole('button', '+').tap();
  await screen.getByRole('button', '2').tap();
  await screen.getByRole('button', '=').tap();
  await agent.assert('the calculator display shows 4 as the evaluated result');

  await screen.getByRole('button', 'Close calculator').tap();
});
