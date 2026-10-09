import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeStartupDialogs =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
const emptyAssignments = 'You have no pending assigned quizzes. Check back when your teacher assigns one.';

describe('student assigned quizzes', { tags: ['student', 'assigned-quizzes'] }, () => {
  test('the Practice tab lists teacher assignments or the empty state under Assigned by your teacher', { session: 'student', timeout: 120_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await expect(screen.getByRole('region', 'Assigned by your teacher')).toBeVisible();
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await expect
      .poll(async () => (await screen.getByRole('button', 'Take quiz').count()) + (await screen.getByText(emptyAssignments).count()), {
        timeout: 30_000,
        message: 'the assigned quizzes list never finished loading',
      })
      .toBeGreaterThan(0);
    await expect(screen.getByText('Could not load assigned quizzes.')).toBeHidden();

    const assignmentCount = await screen.getByRole('button', 'Take quiz').count();
    if (assignmentCount === 0) {
      await expect(screen.getByText(emptyAssignments)).toBeVisible();
    } else {
      await expect(screen.getByText(/ · \d+ questions · /)).toHaveCount(assignmentCount);
      await expect(screen.getByText(emptyAssignments)).toBeHidden();
    }
  });

  test('the Recommended tab shows the same Assigned by your teacher section', { session: 'student', timeout: 120_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Recommended').tap();
    await expect(screen.getByText('Suggested Next')).toBeVisible();
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await expect
      .poll(async () => (await screen.getByRole('button', 'Take quiz').count()) + (await screen.getByText(emptyAssignments).count()), {
        timeout: 30_000,
        message: 'the assigned quizzes list never finished loading',
      })
      .toBeGreaterThan(0);
    await expect(screen.getByText('Could not load assigned quizzes.')).toBeHidden();
  });

  test('the assigned-quizzes deep link opens the Practice tab on the Assigned by your teacher section', { session: 'student', timeout: 120_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/modules?section=assigned-quizzes');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();

    await expect(screen.getByText('Practice Center')).toBeVisible();
    await expect(screen.getByText('Quizzes Completed')).toBeVisible();
    await expect(browser).toHaveURL(/\/modules\?section=assigned-quizzes$/);
    await expect
      .poll(async () => (await screen.getByRole('button', 'Take quiz').count()) + (await screen.getByText(emptyAssignments).count()), {
        timeout: 30_000,
        message: 'the assigned quizzes list never finished loading',
      })
      .toBeGreaterThan(0);
  });

  test('a deep link to a quiz that is not assigned shows the unavailable notice and Retry keeps it', { session: 'student', timeout: 120_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules?section=assigned-quizzes&quizId=e2e-unassigned-quiz');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();

    const unavailableNotice = screen.getByRole('status').filter({ hasText: 'This assigned quiz is unavailable' });
    await expect(screen.getByText('This assigned quiz is unavailable. It may have been removed or completed. Retry or check with your teacher.')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();

    await unavailableNotice.getByRole('button', 'Retry').tap();
    await expect(screen.getByText('This assigned quiz is unavailable. It may have been removed or completed. Retry or check with your teacher.')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();
  });

  test('a pending assignment opens in the quiz player and can be left without submitting it', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await expect
      .poll(async () => (await screen.getByRole('button', 'Take quiz').count()) + (await screen.getByText(emptyAssignments).count()), {
        timeout: 30_000,
        message: 'the assigned quizzes list never finished loading',
      })
      .toBeGreaterThan(0);
    const assignmentCount = await screen.getByRole('button', 'Take quiz').count();
    test.skip(assignmentCount === 0, 'the e2e student has no pending teacher assignment, and tests may not assign one; play-through skipped');

    await screen.getByRole('button', 'Take quiz').first().tap();
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(/^Q1 of \d+$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Previous question')).toBeDisabled();

    await screen.getByRole('button', 'Exit quiz').tap();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeVisible();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();
    await expect(screen.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await expect(screen.getByRole('button', 'Take quiz')).toHaveCount(assignmentCount, { timeout: 30_000 });
  });
});
