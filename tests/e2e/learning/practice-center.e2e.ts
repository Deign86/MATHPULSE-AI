import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// Depth: interaction. Generated question answers and persisted progress are intentionally not asserted.
test('student starts a practice session from a curriculum topic', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Modules from the student navigation');
  await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
  await agent.act('select the Practice tab');
  await expect(screen.getByText('Practice Center')).toBeVisible();

  await agent.act('start a practice quiz by selecting the Functions as Mathematical Models topic; wait for the generated quiz to open');
  await expect(screen.getByText('Functions as Mathematical Models', { exact: false }).first()).toBeVisible();
});
