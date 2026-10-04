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

  await agent.act('answer the first diagnostic question by selecting a visible answer choice and continue');
  await expect(screen.getByText(/Question 2 of \d+/)).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByText(/\d+%/).first()).toBeVisible();
  await agent.act('answer diagnostic questions 2 through 6 by selecting a visible answer choice and continuing after each');
  await expect(screen.getByText(/Question 7 of \d+/)).toBeVisible({ timeout: 120_000 });
  await agent.act('answer diagnostic questions 7 through 9 by selecting a visible answer choice and continuing after each');
  await expect(screen.getByText(/Question 10 of \d+/)).toBeVisible({ timeout: 120_000 });
  await agent.act('answer diagnostic questions 10 through 12 by selecting a visible answer choice and continuing after each');
  await expect(screen.getByText(/Question 13 of \d+/)).toBeVisible({ timeout: 120_000 });
  await agent.act('answer the remaining diagnostic questions with visible answer choices until results appear');
  await expect(screen.getByText('Taken / Completed', { exact: false }).first()).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible({ timeout: 120_000 });

  await app.open('/grades');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByText('Diagnostic Score')).toBeVisible();
  await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
});
