import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('IAR assessment exposes the completed placement state', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open the Diagnostic Assessment from the student application');
  await expect(screen.getByRole('heading', 'Diagnostic Assessment')).toBeVisible();

  await agent.act('show the completed assessment results entry point');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible();
  await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
});
