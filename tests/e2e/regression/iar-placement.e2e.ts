import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('interaction-only: IAR hub exposes existing results without changing placement', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await app.open('/assessment');
  await expect(screen.getByRole('heading', 'Assessment Results')).toBeVisible();
  await expect(screen.getByRole('heading', 'Latest Score')).toBeVisible();
  await expect(screen.getByText(/\d+(\.\d+)?%/).first()).toBeVisible();

  await agent.act('show the completed assessment results entry point without starting or retaking the assessment');
  await expect(screen.getByRole('button', 'History & Trends')).toBeVisible();

  await app.open('/grades');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible();
  await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
});

test('persisted: completed placement persists in grades across attempts', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  await app.open('/assessment');
  await expect(screen.getByRole('heading', 'Assessment Results')).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByRole('heading', 'Latest Score')).toBeVisible();
  await expect(screen.getByText(/\d+(\.\d+)?%/).first()).toBeVisible();

  await app.open('/grades');
  await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 120_000 });
  await expect(screen.getByText(/\d+(\.\d+)?%/).first()).toBeVisible();
  await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
});
