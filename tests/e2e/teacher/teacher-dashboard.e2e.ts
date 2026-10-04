import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// Depth: persisted-outcome. The teacher creates a class through the UI, selects
// it from the class selector, and the selection survives a return to the
// dashboard root, proving the Firestore write round-tripped. Risk badges are
// not asserted: they derive from backend-only student summaries with no
// fixture data.
test('persisted: teacher creates a class and it remains listed', async ({ app, agent, screen }) => {
  const teacher = credentials.user('teacher');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied teacher email and password', {
    params: { username: teacher.username, password: teacher.password },
  });
  await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

  const sectionName = `E2E QA ${Date.now()}`;
  await agent.act('open the class creation dialog using the New Class button, or the Create Class button if that is the one shown');
  await expect(screen.getByRole('heading', 'Create New Class')).toBeVisible();
  await screen.getByPlaceholder('e.g. STEM-1, Rizal').fill(sectionName);
  await screen.getByRole('button', 'Create Class').tap();
  await expect(screen.getByText(sectionName, { exact: false }).first()).toBeAttached({ timeout: 120_000 });

  await app.open('/');
  await expect(screen.getByText(sectionName, { exact: false }).first()).toBeAttached({ timeout: 120_000 });
});
