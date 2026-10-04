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

  await agent.act('open the available module named DepEd SSHS General Mathematics Q1 Lesson Exemplar 1 (Business & Finance)');
  await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  await expect(screen.getByText('Lesson 1')).toBeVisible();
  await agent.act('minimize the floating AI tutor launcher if it overlaps page content, scroll the Lesson 1 lesson card into view, then open Lesson 1 by tapping its lesson card');
  await agent.waitFor('the lesson content has finished loading and lesson sections are visible', { timeout: 300_000 });
  await agent.waitFor('the lesson Practice section showing the Try It Yourself heading is visible', { timeout: 180_000 });
  await expect(screen.getByRole('heading', 'Try It Yourself').first()).toBeVisible();
  await expect(screen.getByRole('button', /Start Practice Quiz/).first()).toBeVisible();
});
