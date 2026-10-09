import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student initial assessment', { tags: ['student', 'assessment'] }, () => {
  test('the Initial Assessment prompt explains the diagnostic and closes for this session only', { session: 'student2' }, async ({ app, screen }) => {
    await app.open('/assessment');
    // The auto-opened Radix dialog aria-hides the sidebar, so wait on the dialog rather than the Dashboard button.
    await expect(screen.getByRole('dialog', /^(Initial Assessment|Assessment Results)$/)).toBeVisible({ timeout: 45_000 });

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    const startedAssessed = await resultsDialog.isVisible();
    if (startedAssessed) {
      await resultsDialog.getByRole('button', 'Close').tap();
      await expect(resultsDialog).toBeHidden();
      await screen.getByRole('button', 'Retake assessment').tap();
    }

    const prompt = screen.getByRole('dialog', 'Initial Assessment');
    await expect(prompt.getByRole('heading', 'Welcome to MathPulse AI!')).toBeVisible({ timeout: 30_000 });
    await expect(prompt.getByText('Analyze your strengths & weaknesses')).toBeVisible();
    await expect(
      prompt.getByText(/^To personalize your learning path, complete a DepEd competency-based SHS diagnostic \(\d+ items, around \d+(\.\d+)? minutes\)\.$/),
    ).toBeVisible();
    await expect(prompt.getByText('Personalized Path')).toBeVisible();
    await expect(prompt.getByText('Identify Risks')).toBeVisible();
    await expect(prompt.getByRole('button', 'Start Assessment')).toBeEnabled();
    await expect(prompt.getByRole('button', 'Skip for now')).toBeVisible();

    await prompt.getByRole('button', 'Close').tap();
    await expect(prompt).toBeHidden();

    if (startedAssessed) {
      await expect(screen.getByRole('heading', 'Assessment Complete')).toBeVisible();
      await expect(screen.getByRole('button', 'Exit Assessment')).toBeHidden();
    } else {
      await expect(screen.getByRole('heading', 'Diagnostic Assessment')).toBeVisible();
      await expect(screen.getByRole('button', 'Start Initial Assessment')).toBeVisible();

      await screen.getByRole('button', 'Start Initial Assessment').tap();
      await expect(prompt).toBeVisible();
      await prompt.getByRole('button', 'Close').tap();
      await expect(prompt).toBeHidden();
    }
  });

  test('the diagnostic runner advances one question and exits without submitting', { session: 'student2', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/assessment');
    await expect(screen.getByRole('dialog', /^(Initial Assessment|Assessment Results)$/)).toBeVisible({ timeout: 45_000 });

    const resultsDialog = screen.getByRole('dialog', 'Assessment Results');
    const startedAssessed = await resultsDialog.isVisible();
    if (startedAssessed) {
      await resultsDialog.getByRole('button', 'Close').tap();
      await expect(resultsDialog).toBeHidden();
      await screen.getByRole('button', 'Retake assessment').tap();
    }

    const prompt = screen.getByRole('dialog', 'Initial Assessment');
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    await prompt.getByRole('button', 'Start Assessment').tap();

    const exitAssessment = screen.getByRole('button', 'Exit Assessment');
    await expect(exitAssessment).toBeVisible({ timeout: 90_000 });
    await expect(screen.getByText(/^Q1 of \d+$/)).toBeVisible();
    await expect(screen.getByText(/^0 \/ \d+$/)).toBeVisible();
    await expect(screen.getByText(/^Item 1 •/)).toBeVisible();
    await expect(screen.getByText('Select the correct answer')).toBeVisible();
    await expect(screen.getByText('Select an answer to continue')).toBeVisible();
    await expect(screen.getByRole('button', 'Enter Fullscreen')).toBeVisible();
    const nextQuestion = screen.getByRole('button', 'Next Question');
    await expect(nextQuestion).toBeDisabled();

    await agent.act(
      'In the full-screen Diagnostic Assessment, tap the answer card labelled A for the current question. Do not tap Next Question, Submit Assessment, Exit Assessment or any other control.',
    );
    await expect(screen.getByText('Option A selected')).toBeVisible();
    await expect(nextQuestion).toBeEnabled();

    await nextQuestion.tap();
    await expect(screen.getByText(/^Q2 of \d+$/)).toBeVisible();
    await expect(screen.getByText(/^1 \/ \d+$/)).toBeVisible();
    await expect(screen.getByText(/^Item 2 •/)).toBeVisible();
    await expect(screen.getByText('Select an answer to continue')).toBeVisible();
    await expect(nextQuestion).toBeDisabled();

    await exitAssessment.tap();
    await expect(exitAssessment).toBeHidden();
    await expect(nextQuestion).toBeHidden();
    await expect(screen.getByRole('heading', 'Analyzing your results...')).toBeHidden();
    await expect(screen.getByRole('button', 'Continue Learning')).toBeVisible({ timeout: 30_000 });

    await app.open('/assessment');
    await expect(screen.getByRole('dialog', startedAssessed ? 'Assessment Results' : 'Initial Assessment')).toBeVisible({ timeout: 45_000 });
  });
});
