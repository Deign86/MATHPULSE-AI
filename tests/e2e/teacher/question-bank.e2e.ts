import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('teacher question bank', { tags: ['teacher', 'question-bank'] }, () => {
  test('stat cards and Processing Status show the PDF table or its empty state', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Question Bank').tap();
    await expect(screen.getByRole('heading', 'Question Bank', { level: 1 })).toBeVisible();

    await expect(screen.getByText('Total PDFs')).toBeVisible();
    await expect(screen.getByText('Total Questions')).toBeVisible();
    await expect(screen.getByText('Processed', { visible: true }).first()).toBeVisible();
    await expect(screen.getByRole('heading', 'Processing Status')).toBeVisible();

    const refresh = screen.getByRole('button', 'Refresh processing status');
    await refresh.tap({ timeout: 45_000 });
    await expect(refresh).toBeEnabled({ timeout: 45_000 });

    const table = screen.getByRole('table');
    const empty = screen.getByText('No PDFs processed yet');
    await expect.poll(async () => (await table.count()) + (await empty.count()), { timeout: 30_000 }).toBe(1);

    if (await empty.isVisible()) {
      await expect(screen.getByText('Upload or ingest a PDF using the form above to extract curriculum questions into the bank.')).toBeVisible();
      return;
    }
    for (const column of ['Filename', 'Grade', 'Topic', 'Questions', 'Status', 'Processed']) {
      await expect(table.getByRole('columnheader', column)).toBeVisible();
    }
    const rows = await table.getByRole('row').count();
    expect(rows).toBeGreaterThan(1);
    await expect(table.getByText(/^(Completed|Processing\.\.\.)$/)).toHaveCount(rows - 1);
  });

  test('Question Bank list loads and a question expands to show its choices', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Question Bank').tap();
    await expect(screen.getByRole('heading', 'Question Bank', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', /^Question Bank \(\d+\)$/)).toBeVisible();

    const empty = screen.getByText('No questions in the bank yet');
    const filled = screen.getByRole('heading', /^Question Bank \([1-9]\d*\)$/);
    // The panel paints its empty state for a frame before the fetch starts, so wait for a settled state on three reads in a row.
    let settledReads = 0;
    await expect
      .poll(
        async () => {
          settledReads = (await empty.count()) + (await filled.count()) === 1 ? settledReads + 1 : 0;
          return settledReads;
        },
        { timeout: 30_000, interval: 500 },
      )
      .toBeGreaterThanOrEqual(3);
    if (await empty.isVisible()) {
      await expect(screen.getByText('Ingest a PDF above to populate the question bank.')).toBeVisible();
    }
    test.skip(await empty.isVisible(), 'the question bank is empty, so there is no question to expand');

    const difficulty = screen.getByText(/^(easy|medium|hard)$/i).first();
    const firstChoice = screen.getByText(/^A\. /);
    await expect(firstChoice).toHaveCount(0);
    await difficulty.tap();
    await expect(firstChoice).toBeVisible();
    await difficulty.tap();
    await expect(firstChoice).toBeHidden();
  });

  test('Ingest New PDF form shows its fields and defaults and is never submitted', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Question Bank').tap();
    await expect(screen.getByRole('heading', 'Question Bank', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('heading', 'Ingest New PDF')).toBeVisible();
    await expect(screen.getByText('Firebase Storage Path')).toBeVisible();
    await expect(screen.getByText('Grade Level')).toBeVisible();
    await expect(screen.getByText('Topic Slug')).toBeVisible();
    await expect(screen.getByPlaceholder('quiz_pdfs/grade_11/gen_math_q1.pdf')).toHaveValue('');
    await expect(screen.getByPlaceholder('11')).toHaveValue('11');
    await expect(screen.getByPlaceholder('general_mathematics')).toHaveValue('general_mathematics');
    await expect(screen.getByRole('button', 'Ingest PDF')).toBeEnabled();
  });

  test('Ingest New PDF fields are reachable by their labels', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Question Bank').tap();
    await expect(screen.getByRole('heading', 'Ingest New PDF')).toBeVisible();

    await expect(screen.getByLabel('Firebase Storage Path')).toHaveValue('');
    await expect(screen.getByLabel('Grade Level')).toHaveValue('11');
    await expect(screen.getByLabel('Topic Slug')).toHaveValue('general_mathematics');
  });
});
