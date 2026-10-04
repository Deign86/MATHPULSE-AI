import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: student quiz navigation reaches Quiz Battle without matchmaking', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Quiz Battle from the student navigation');
  await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
});

test('student completes an assigned quiz and sees its retake lock after reload', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await app.open('/modules?section=assigned-quizzes');
  await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible({ timeout: 120_000 });
  await agent.act('open the available assigned quiz, answer its questions, and submit it; wait until the completed quiz score is shown');
  await expect(screen.getByText(/Quiz Complete|Score:\s*\d+\/\d+|Final Accuracy/i).first()).toBeVisible({ timeout: 120_000 });

  await app.open('/modules?section=assigned-quizzes&quizId=e2e_assigned_quiz');
  await expect(screen.getByText('Assigned quizzes are single-attempt and cannot be retaken.', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
  await app.open('/modules?section=assigned-quizzes');
  await app.open('/modules?section=assigned-quizzes&quizId=e2e_assigned_quiz');
  await expect(screen.getByText('Assigned quizzes are single-attempt and cannot be retaken.', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
});
