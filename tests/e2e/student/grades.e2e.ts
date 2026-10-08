import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student grades and assessment', { tags: ['student', 'grades'] }, () => {
  test('sidebar Assessment opens Grades & Assessment at /grades', { session: 'student' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'Assessment').tap();
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/grades');
    await expect(screen.getByText('Check your math grades, quiz scores, and subject progress')).toBeVisible();
    await expect(screen.getByRole('heading', 'Subject Grades & Passing Line')).toBeVisible();
    await expect(screen.getByRole('heading', 'Subject Standings')).toBeVisible();
    await expect(screen.getByRole('heading', 'Recent Quizzes & Practice')).toBeVisible();
    await expect(screen.getByRole('heading', 'Exam Readiness')).toBeVisible();
    await expect(screen.getByRole('heading', 'Ready to Boost Your Grades?')).toBeVisible();
  });

  test('View Full Analysis and Open Full AI Study Plan open the diagnostic breakdown over Grades', { session: 'student', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 45_000 });
    const diagnosticCard = screen.getByRole('heading', 'Initial Diagnostic Results');
    await expect(diagnosticCard).toBeVisible({ timeout: 30_000 });

    const breakdownHeading = screen.getByRole('heading', 'Diagnostic Assessment Breakdown');
    await screen.getByRole('button', 'View Full Analysis').tap();
    await expect(breakdownHeading).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'AI Insights')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Close Analysis').tap();
    await expect(breakdownHeading).toBeHidden();
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible();

    await screen.getByRole('button', 'Open Full AI Study Plan').tap();
    await expect(breakdownHeading).toBeVisible();
    await screen.getByRole('button', 'Close modal').tap();
    await expect(breakdownHeading).toBeHidden();
    await expect(diagnosticCard).toBeVisible();
  });

  test('Practice Weak Areas in the full analysis opens the Modules Practice Center', { session: 'student', timeout: 180_000 }, async ({ app, browser, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'View Full Analysis').tap();
    const practiceWeakAreas = screen.getByRole('button', 'Practice Weak Areas');
    await expect(practiceWeakAreas).toBeVisible({ timeout: 30_000 });
    await practiceWeakAreas.tap();

    await expect(screen.getByRole('heading', 'Diagnostic Assessment Breakdown')).toBeHidden();
    await expect(screen.getByText('Practice Center')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/modules');
  });

  test('a Topics to Practice chip opens the Modules Practice Center', { session: 'student' }, async ({ app, agent, browser, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Initial Diagnostic Results')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('Topics to Practice')).toBeVisible();
    test.skip(
      await screen.getByText('All foundational topics look solid!').isVisible(),
      'the diagnostic lists no weak topics, so no Topics to Practice chips are rendered',
    );

    await agent.act('On the "Initial Diagnostic Results" card, tap the first topic chip listed under "Topics to Practice"');
    await expect(screen.getByText('Practice Center')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/modules');
  });

  test('the history type filter narrows Recent Quizzes & Practice', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Recent Quizzes & Practice')).toBeVisible({ timeout: 45_000 });

    const typeFilter = screen.getByRole('combobox').filter({ hasText: 'All Types' });
    await expect(typeFilter).toHaveValue('all');

    await typeFilter.selectOption({ label: 'Practice' });
    await expect(typeFilter).toHaveValue('practice');
    await agent.assert(
      'every record listed under "Recent Quizzes & Practice" has the type badge "Practice" next to its score, or the list shows "No assessments match filters"',
    );

    await typeFilter.selectOption({ label: 'Quiz' });
    await expect(typeFilter).toHaveValue('quiz');
    await agent.assert(
      'every record listed under "Recent Quizzes & Practice" has the type badge "Quiz" next to its score, or the list shows "No assessments match filters"',
    );

    await typeFilter.selectOption({ label: 'All Types' });
    await expect(typeFilter).toHaveValue('all');
  });

  test('a subject card and a different subject filter leave the history empty until cleared', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Subject Grades & Passing Line')).toBeVisible({ timeout: 45_000 });
    const emptyHistory = screen.getByRole('heading', 'No assessments match filters');
    const hasHistory = await emptyHistory.waitFor({ state: 'hidden', timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasHistory, 'the e2e student has no quiz or practice records, so clearing the filters cannot bring rows back');

    const subjectFilter = screen.getByRole('combobox').filter({ hasText: 'All Subjects' });
    await expect(subjectFilter).toHaveValue('all');

    await agent.act('In the "Subject Grades & Passing Line" chart, tap the first subject card so it becomes highlighted');
    const clearFilter = screen.getByRole('button', /^Clear Filter/);
    await expect(clearFilter).toBeVisible();

    await agent.act(
      'In the "Recent Quizzes & Practice" subject dropdown that shows "All Subjects", choose the subject that is different from the subject card highlighted in the "Subject Grades & Passing Line" chart',
    );
    await expect(subjectFilter).not.toHaveValue('all');
    await expect(emptyHistory).toBeVisible();
    await expect(screen.getByText('Try switching filters or start a new practice session')).toBeVisible();

    await clearFilter.tap();
    await expect(clearFilter).toBeHidden();
    await subjectFilter.selectOption({ label: 'All Subjects' });
    await expect(subjectFilter).toHaveValue('all');
    await expect(emptyHistory).toBeHidden();
  });

  test('Full Graph and Expand view open the Subject Grades & Benchmark Analysis modal', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/grades');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Subject Grades & Passing Line')).toBeVisible({ timeout: 45_000 });

    const graphHeading = screen.getByRole('heading', 'Subject Grades & Benchmark Analysis');
    await screen.getByRole('button', 'Full Graph').tap();
    await expect(graphHeading).toBeVisible();
    await expect(screen.getByText('Quarter Subject Comparison')).toBeVisible();
    await screen.getByRole('button', 'Close Modal').tap();
    await expect(graphHeading).toBeHidden();

    await screen.getByRole('button', /^Expand view/).tap();
    await expect(graphHeading).toBeVisible();
    await screen.getByRole('button', 'Close Modal').tap();
    await expect(graphHeading).toBeHidden();
  });
});
