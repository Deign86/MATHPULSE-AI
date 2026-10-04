import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// Depth: navigation/interaction. The daily reward was already claimed for the
// seeded student, so the claim modal is not expected; Rewards tab content is
// asserted instead. No XP/streak value is treated as persisted.
test('student dashboard shows gamification and daily check-in', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await expect(screen.getByRole('heading', 'Daily Goals')).toBeVisible();
  await expect(screen.getByRole('button', 'Streak 7 Days')).toBeVisible();

  await app.open('/rewards');
  await expect(screen.getByRole('heading', 'Rewards & Trophy Room')).toBeVisible();
  await expect(screen.getByRole('heading', 'Study Streak')).toBeVisible();
});

// Depth: navigation. No avatar or leaderboard outcome is treated as persisted.
test('student can open avatar studio, leaderboard, grades, and competency radar', async ({ app, agent, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await app.open('/avatar');
  await expect(screen.getByRole('button', 'Avatar Studio')).toBeVisible();

  await app.open('/leaderboard');
  await expect(screen.getByRole('heading', 'Leaderboard')).toBeVisible();
  await expect(screen.getByRole('heading', 'Class Standings')).toBeVisible();

  await app.open('/grades');
  await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible();

  await app.open('/');
  await expect(screen.getByText('Competency Matrix')).toBeVisible();
});
