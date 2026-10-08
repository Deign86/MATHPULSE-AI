import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student assessment hub', { tags: ['student', 'assessment'] }, () => {
  test('the /assessment deep link auto-opens Assessment Results with Last Results and History & Trends', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/assessment');
    // The auto-opened Radix dialog aria-hides the sidebar, so wait on the dialog rather than the Dashboard button.

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await expect(resultsDialog.getByText('Your diagnostic score, competency profile, and learning progress.')).toBeVisible();
    await expect(resultsDialog.getByText(/^(Latest Score|Diagnostic Score|Preparing Learning Summary)$/)).toBeVisible({ timeout: 30_000 });
    await expect(resultsDialog.getByRole('button', 'Continue to Learning Path')).toBeVisible();

    await resultsDialog.getByRole('button', 'History & Trends').tap();
    await expect(resultsDialog.getByRole('heading', 'Performance Over Time')).toBeVisible();

    await resultsDialog.getByRole('button', 'Last Results').tap();
    await expect(resultsDialog.getByRole('heading', 'Performance Over Time')).toBeHidden();
    await expect(resultsDialog.getByText(/^(Latest Score|Diagnostic Score|Preparing Learning Summary)$/)).toBeVisible({ timeout: 30_000 });
  });

  test('the Assessment Complete card reopens results and Continue to Learning Path opens Modules', { session: 'student' }, async ({ app, browser, screen }) => {
    await app.open('/assessment');

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Taken / Completed')).toBeVisible();
    await expect(screen.getByText('Review your latest score, competency breakdown, and full attempt history.')).toBeVisible();
    await expect(screen.getByRole('button', 'Diagnostic breakdown')).toBeVisible();
    await expect(screen.getByRole('button', 'Retake assessment')).toBeEnabled();

    await screen.getByRole('button', 'View results & history').tap();
    await expect(resultsDialog).toBeVisible();
    await resultsDialog.getByRole('button', 'Continue to Learning Path').tap();
    await expect(resultsDialog).toBeHidden();
    await expect(screen.getByText('DepEd Strengthened SHS Modules')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/modules');
  });

  test('Retake assessment opens the Initial Assessment prompt, which closes without starting a retake', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/assessment');

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await screen.getByRole('button', 'Retake assessment').tap();
    const prompt = screen.getByRole('dialog', 'Initial Assessment');
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    await expect(prompt.getByRole('heading', 'Welcome to MathPulse AI!')).toBeVisible();
    await expect(prompt.getByRole('button', 'Start Assessment')).toBeEnabled();

    await prompt.getByRole('button', 'Close').tap();
    await expect(prompt).toBeHidden();
    await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible();
    await expect(screen.getByRole('button', 'Exit Assessment')).toBeHidden();
  });

  test('Diagnostic breakdown switches between AI Insights, Domain Mastery and Questions', { session: 'student', timeout: 180_000 }, async ({ app, browser, screen }) => {
    await app.open('/assessment');

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await screen.getByRole('button', 'Diagnostic breakdown').tap();
    const breakdownHeading = screen.getByRole('heading', 'Diagnostic Assessment Breakdown');
    await expect(breakdownHeading).toBeVisible({ timeout: 30_000 });

    const insightsTab = screen.getByRole('button', 'AI Insights');
    const domainsTab = screen.getByRole('button', 'Domain Mastery');
    const questionsTab = screen.getByRole('button', /^Questions \(\d+\)$/);
    await expect(insightsTab).toBeVisible({ timeout: 30_000 });
    await expect(domainsTab).toBeVisible();
    await expect(questionsTab).toBeVisible();
    await expect(screen.getByText('Overall Score')).toBeVisible();
    await expect(screen.getByText('Avg Pace')).toBeVisible();
    await expect(screen.getByText('Duration')).toBeVisible();
    await expect(screen.getByText('Risk Level')).toBeVisible();

    const summaryHeading = screen.getByRole('heading', 'AI Diagnostic Summary');
    await expect(summaryHeading).toBeVisible();
    await expect(screen.getByRole('heading', 'Key Strengths')).toBeVisible();
    await expect(screen.getByRole('heading', 'Focus Areas For Improvement')).toBeVisible();

    await domainsTab.tap();
    await expect(browser).toHaveClass(domainsTab, /(^|\s)bg-white(\s|$)/);
    await expect(summaryHeading).toBeHidden();

    await questionsTab.tap();
    const allFilter = screen.getByRole('button', /^All \(\d+\)$/);
    const correctFilter = screen.getByRole('button', /^Correct \(\d+\)$/);
    const needsWorkFilter = screen.getByRole('button', /^Needs Work \(\d+\)$/);
    await expect(allFilter).toBeVisible();
    await expect(correctFilter).toBeVisible();
    await expect(needsWorkFilter).toBeVisible();
    const activeChip = /(^|\s)text-white(\s|$)/;
    await expect(browser).toHaveClass(allFilter, activeChip);

    await needsWorkFilter.tap();
    await expect(browser).toHaveClass(needsWorkFilter, activeChip);
    await expect(browser).not.toHaveClass(allFilter, activeChip);
    await correctFilter.tap();
    await expect(browser).toHaveClass(correctFilter, activeChip);
    await expect(browser).not.toHaveClass(needsWorkFilter, activeChip);
    await allFilter.tap();
    await expect(browser).toHaveClass(allFilter, activeChip);
    await expect(browser).not.toHaveClass(correctFilter, activeChip);

    await insightsTab.tap();
    await expect(summaryHeading).toBeVisible();

    await screen.getByRole('button', 'Close Analysis').tap();
    await expect(breakdownHeading).toBeHidden();
  });

  test('Find matching lesson opens the matching lesson in Modules', { session: 'student', tags: ['known-bug'], timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/assessment');

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await screen.getByRole('button', 'Diagnostic breakdown').tap();
    const breakdownHeading = screen.getByRole('heading', 'Diagnostic Assessment Breakdown');
    await expect(breakdownHeading).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', 'AI Diagnostic Summary')).toBeVisible({ timeout: 30_000 });
    await agent.waitFor('the "AI Diagnostic Summary" card shows a written summary paragraph instead of grey loading bars', { timeout: 120_000 });

    const findLesson = screen.getByRole('button', 'Find matching lesson');
    test.skip((await findLesson.count()) === 0, 'the AI analysis lists no weak areas (or did not load), so no Find matching lesson button is rendered');
    await findLesson.first().tap();
    await expect(breakdownHeading).toBeHidden();
    await expect(screen.getByText(/^(Suggested Next|Study Journey)$/)).toBeVisible({ timeout: 30_000 });
  });

  test('Practice Weak Areas in the hub breakdown opens the Modules Practice Center', { session: 'student', tags: ['known-bug'], timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/assessment');

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    await expect(resultsDialog).toBeVisible({ timeout: 45_000 });
    await resultsDialog.getByRole('button', 'Close').tap();
    await expect(resultsDialog).toBeHidden();

    await screen.getByRole('button', 'Diagnostic breakdown').tap();
    const breakdownHeading = screen.getByRole('heading', 'Diagnostic Assessment Breakdown');
    await expect(breakdownHeading).toBeVisible({ timeout: 30_000 });
    const practiceWeakAreas = screen.getByRole('button', 'Practice Weak Areas');
    await expect(practiceWeakAreas).toBeVisible({ timeout: 30_000 });

    await practiceWeakAreas.tap();
    await expect(breakdownHeading).toBeHidden();
    await expect(screen.getByText('Practice Center')).toBeVisible({ timeout: 30_000 });
  });
});
