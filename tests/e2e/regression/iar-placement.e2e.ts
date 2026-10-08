import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('IAR placement regression', { tags: ['student', 'iar-placement'] }, () => {
  test('an assessed student lands on the completed hub and is never re-prompted', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/assessment');
    // The auto-opened Radix dialog aria-hides the sidebar, so wait on the dialog rather than the Dashboard button.

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Taken / Completed')).toBeVisible();
    await expect(screen.getByRole('heading', 'Diagnostic Assessment')).toBeHidden();
    await expect(screen.getByRole('button', 'Start Initial Assessment')).toBeHidden();
    await expect(screen.getByText(/Content Coming Soon/)).toBeHidden();

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('button', 'Continue Learning')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Open initial assessment')).not.toBeVisible();
    await expect(screen.getByRole('dialog', 'Initial Assessment')).not.toBeVisible();
  });

  test('the completed placement persists on the Grades page', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 45_000 });

    await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Diagnostic Score')).toBeVisible();
    await expect(screen.getByText('Topics to Practice')).toBeVisible();
    await expect(screen.getByRole('button', 'View Full Analysis')).toBeVisible();
    await expect(screen.getByRole('button', 'Open Full AI Study Plan')).toBeVisible();
  });
});
