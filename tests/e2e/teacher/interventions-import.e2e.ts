import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('teacher at-risk chip', { tags: ['teacher', 'intervention'] }, () => {
  test('the at-risk header chip opens an Intervention Center the teacher can act on', { session: 'teacher', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Classes')).toBeVisible();

    await screen.getByRole('button', /^\d+ at risk$/).tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Identify and support at-risk students.')).toBeVisible();
    await expect(screen.getByRole('heading', 'My Classes')).toBeHidden();

    await expect(screen.getByRole('main')).toHaveText(/\S/, { timeout: 15_000 });
    await agent.assert(
      "below the Intervention Center header the page lists at-risk students to choose from, shows an at-risk student's intervention details, or says that no students are at risk",
    );
  });

  test('from the at-risk view the sidebar still reaches My Classes and the Dashboard', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const sidebar = screen.getByRole('navigation').filter({ hasText: 'Teaching' });

    await screen.getByRole('button', /^\d+ at risk$/).tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await sidebar.getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeHidden();

    await sidebar.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
    await expect(screen.getByRole('button', /^\d+ at risk$/)).toBeVisible();
  });
});
