import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// One setup per account so tests and `e2e explore --session <name>` start signed in.
const landings = [
  { account: 'student', role: 'button', name: 'Dashboard' },
  { account: 'student2', role: 'button', name: 'Dashboard' },
  { account: 'teacher', role: 'heading', name: 'Teacher Dashboard' },
  { account: 'admin', role: 'heading', name: 'Admin Dashboard' },
] as const;

for (const landing of landings) {
  test.setup(`sign in as ${landing.account}`, { sessions: [landing.account] }, async ({ app, screen, session }) => {
    const user = credentials.user(landing.account);
    await app.open('/');
    await screen.getByLabel('Email Address').fill(user.username);
    await screen.getByLabel('Password').fill(user.password);
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByRole(landing.role, landing.name)).toBeVisible({ timeout: 45_000 });
    await session.save(landing.account);
  });
}
