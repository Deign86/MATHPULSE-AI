import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student sees completed IAR diagnostic results without retaking', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open the Grades and Assessment page from the student navigation');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible();
  await expect(screen.getByText('Diagnostic Score')).toBeVisible();
  await expect(screen.getByText('Topics to Practice')).toBeVisible();
});
