import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// Depth: navigation/interaction. Claim persistence is not asserted without an independent readback.
test('student dashboard shows gamification and daily check-in', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await expect(screen.getByRole('heading', 'Daily Goals')).toBeVisible();
  await expect(screen.getByRole('button', 'Streak 7 Days')).toBeVisible();

  await agent.act('open Modules to show the daily check-in reward');
  await expect(screen.getByRole('heading', 'Daily Rewards')).toBeVisible();
  await expect(screen.getByRole('button', 'Claim!')).toBeVisible();
  await agent.act('claim the currently available daily reward using the visible Claim! button');
  await expect(screen.getByRole('heading', 'Daily Rewards')).toBeVisible();
});

// Depth: navigation. No avatar or leaderboard outcome is treated as persisted.
test('student can open avatar studio, leaderboard, grades, and competency radar', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open Avatar Studio from the student navigation');
  await expect(screen.getByRole('button', 'Avatar Studio')).toBeVisible();

  await agent.act('open Leaderboard from the student navigation');
  await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible();

  await agent.act('open Grades from the student navigation');
  await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible();

  await agent.act('return to Dashboard from the student navigation');
  await expect(screen.getByText('Competency Matrix')).toBeVisible();
});
