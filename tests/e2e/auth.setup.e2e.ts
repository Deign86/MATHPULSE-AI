import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// One setup per account so tests and `e2e explore --session <name>` start signed in.
const landings = [
  { account: 'student', tourScope: 'student', role: 'button', name: 'Dashboard' },
  { account: 'student2', tourScope: 'student', role: 'button', name: 'Dashboard' },
  { account: 'teacher', tourScope: 'teacher', role: 'heading', name: 'Teacher Dashboard' },
  { account: 'admin', tourScope: 'admin', role: 'heading', name: 'Admin Dashboard' },
] as const;

for (const landing of landings) {
  test.setup(`sign in as ${landing.account}`, { sessions: [landing.account], timeout: 600_000 }, async ({ app, browser, screen, session }) => {
    const user = credentials.user(landing.account);
    await app.open('/');
    await screen.getByLabel('Email Address').fill(user.username);
    await screen.getByLabel('Password').fill(user.password);
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByRole(landing.role, landing.name)).toBeVisible({ timeout: 45_000 });
    // Mark the first-use guide seen (src/hooks/useOnboardingTour.ts) so its modal doesn't cover every test's page.
    const marked = await browser.evaluate(async (scope) => {
      const uid = await new Promise<string>((resolve) => {
        const open = indexedDB.open('firebaseLocalStorageDb');
        open.onerror = () => resolve('');
        open.onsuccess = () => {
          const read = open.result.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll();
          read.onerror = () => resolve('');
          read.onsuccess = () => resolve(read.result.find((entry) => entry?.value?.uid)?.value.uid ?? '');
        };
      });
      if (uid) localStorage.setItem(`mathpulse:${scope}-tour:v1:${uid}`, 'seen');
      return uid !== '';
    }, landing.tourScope);
    expect(marked).toBe(true);
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
