import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student submits a practice quiz and keeps the score after reopening Practice Center', async ({ app, agent, screen }) => {
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
  await agent.waitFor('the generated practice questions and answer options are visible', { timeout: 300_000 });
  await agent.act('answer the generated practice questions and submit the quiz; wait until the completed quiz score is shown');
  await expect(screen.getByText(/Quiz Complete|Score:\s*\d+\/\d+|Final Accuracy/i).first()).toBeVisible({ timeout: 120_000 });

  await app.open('/modules');
  await agent.act('select the Practice tab');
  await expect(screen.getByText('Practice Center').first()).toBeVisible();
  await expect(screen.getByText('Average Score', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByText(/\d+%/).first()).toBeVisible();
});
