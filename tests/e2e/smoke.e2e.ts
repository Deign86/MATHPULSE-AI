import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// No saved session: this is the one test that signs in from the login form. It uses form fills and taps instead of
// agent steps so a slow model cannot stall it (the agent version hung past its 120 s limit), and it closes the
// first-use prompts a fresh browser meets (Daily Rewards, Initial Assessment, the student guide).
test('student can boot, sign in, and navigate to Quiz Battle', { timeout: 240_000 }, async ({ app, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await expect(screen.getByRole('button', 'Sign In')).toBeVisible();

  await screen.getByLabel('Email Address').fill(student.username);
  await screen.getByLabel('Password').fill(student.password);
  await screen.getByRole('button', 'Sign In').tap();
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 60_000 });

  const rewards = screen.getByRole('heading', 'Daily Rewards');
  const assessment = screen.getByRole('dialog', 'Initial Assessment');
  const skipGuide = screen.getByRole('button', 'Skip tour');
  for (let pass = 0; pass < 3; pass += 1) {
    let closedAny = false;
    await rewards.waitFor({ timeout: 6_000 }).catch(() => undefined);
    if (await rewards.isVisible()) {
      await screen.getByRole('button', 'Close daily rewards').tap();
      await expect(rewards).toBeHidden({ timeout: 10_000 });
      closedAny = true;
    }
    if (await assessment.isVisible()) {
      await assessment.getByRole('button', 'Close').tap();
      await expect(assessment).toBeHidden({ timeout: 10_000 });
      closedAny = true;
    }
    // The guide opens about 2 s after the last dialog closes.
    await skipGuide.waitFor({ timeout: 4_000 }).catch(() => undefined);
    if (await skipGuide.isVisible()) {
      await skipGuide.tap();
      await expect(skipGuide).toBeHidden({ timeout: 10_000 });
      break;
    }
    if (!closedAny) break;
  }

  await screen.getByRole('button', 'Quiz Battle').tap();
  await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
});
