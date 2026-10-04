import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: student opens completed IAR results and their breakdown', async ({ app, agent, screen }) => {
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
  await screen.getByRole('button', 'View Full Analysis').tap();
  await expect(screen.getByText('Diagnostic Assessment Breakdown')).toBeVisible();
});

test('persisted: student completes a diagnostic question by question', async ({ app, agent, browser, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await app.open('/assessment');
  await expect(screen.getByRole('heading', 'Assessment Results')).toBeVisible({ timeout: 120_000 });
  await browser.keyboard.press('Escape');
  await screen.getByRole('button', 'Retake assessment').tap();
  await screen.getByRole('button', 'Start Assessment').tap();
  await expect(screen.getByText(/Question 1 of \d+/)).toBeVisible({ timeout: 120_000 });

  for (let questionNumber = 1; questionNumber <= 14; questionNumber += 1) {
    await screen.getByRole('button', /^[A-D] /).first().tap();
    await screen.getByRole('button', 'Next Question').tap();
    await expect(screen.getByText(new RegExp(`Question ${questionNumber + 1} of \\d+`))).toBeVisible({ timeout: 120_000 });
  }
  await screen.getByRole('button', /^[A-D] /).first().tap();
  await screen.getByRole('button', 'Submit Assessment').tap();
  await expect(screen.getByText('Taken / Completed', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible({ timeout: 120_000 });

  await app.open('/grades');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByText('Diagnostic Score')).toBeVisible();
  await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
});
