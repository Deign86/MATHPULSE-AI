import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// Depth: interaction. LLM-fresh answer correctness and persisted outcomes are not asserted.
test('disposable student interacts with a generated lesson checkpoint', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Modules from the student navigation');
  await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

  await agent.act('open the available module named DepEd SSHS General Mathematics Q1 Lesson Exemplar 1 (Business & Finance)');
  await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  await expect(screen.getByText('Lesson 1')).toBeVisible();
  await agent.act('open Lesson 1 by pressing START');
  await expect(screen.getByRole('button', 'START')).not.toBeVisible();

  await agent.act('advance the lesson content until the Try It Yourself checkpoint is shown');
  await expect(screen.getByText('Try It Yourself')).toBeVisible();
  await agent.act('open the Try It Yourself quiz and wait for its generated question');
  await expect(screen.getByRole('heading', 'Try It Yourself')).toBeVisible();

  await agent.act('use two displayed answer choices on the generated question without assuming which is correct; after the retry opportunity is available, use Reveal answer, then inspect the explanation and continue to the next question');
  await expect(screen.getByRole('heading', 'Explanation')).toBeVisible();
  await expect(screen.getByRole('button', 'Next question')).toBeVisible();
  await agent.act('continue to the next generated question');
  await expect(screen.getByText('Try It Yourself')).toBeVisible();
});
