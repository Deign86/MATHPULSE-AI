import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student can open a curriculum module for a RAG lesson', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Modules from the student navigation');
  await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

  await agent.act('open a visible mathematics module and select its first lesson without waiting for the lesson content to finish loading');
  await agent.waitFor('the lesson content has finished loading and lesson text is visible', { timeout: 300_000 });
  await expect(screen.getByText(/Lesson|Objectives|Overview/i).first()).toBeVisible();
});
