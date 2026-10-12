import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// One setup per account so tests and `e2e explore --session <name>` start signed in.
// The first-use guide offer (src/hooks/useOnboardingTour.ts) only appears for accounts created with
// users/{uid}.guideOfferPending, so these existing test accounts land without it.
const landings = [
  { account: 'student', role: 'button', name: 'Dashboard' },
  { account: 'student2', role: 'button', name: 'Dashboard' },
  { account: 'teacher', role: 'heading', name: 'Teacher Dashboard' },
  { account: 'admin', role: 'heading', name: 'Admin Dashboard' },
] as const;

for (const landing of landings) {
  test.setup(`sign in as ${landing.account}`, { sessions: [landing.account], timeout: 600_000 }, async ({ app, screen, session }) => {
    const user = credentials.user(landing.account);
    await app.open('/');
    await screen.getByLabel('Email Address').fill(user.username);
    await screen.getByLabel('Password').fill(user.password);
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByRole(landing.role, landing.name)).toBeVisible({ timeout: 45_000 });
    // Student tests expect a completed diagnostic, student2 an unassessed account. Recreating the
    // student account erases its result, so take the diagnostic through the product when it is missing.
    if (landing.account === 'student') {
      await app.open('/assessment');
      const prompt = screen.getByRole('dialog', 'Initial Assessment');
      await expect(screen.getByRole('dialog', /^(Initial Assessment|Assessment Results)$/)).toBeVisible({ timeout: 45_000 });
      if (await prompt.isVisible()) {
        await prompt.getByRole('button', 'Start Assessment').tap();
        const submit = screen.getByRole('button', 'Submit Assessment');
        await expect(screen.getByRole('button', 'Exit Assessment')).toBeVisible({ timeout: 90_000 });
        while (!(await submit.isVisible())) {
          await screen.getByRole('button', /^A\b/).first().tap();
          await screen.getByRole('button', 'Next Question').tap();
        }
        await screen.getByRole('button', /^A\b/).first().tap();
        await submit.tap();
        await expect(screen.getByRole('button', 'Exit Assessment')).toBeHidden({ timeout: 120_000 });
        await app.open('/assessment');
        await expect(screen.getByRole('dialog', 'Assessment Results')).toBeVisible({ timeout: 60_000 });
      }
    }
    await session.save(landing.account);
  });
}
