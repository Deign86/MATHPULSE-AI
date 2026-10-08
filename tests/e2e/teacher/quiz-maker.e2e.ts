import { afterEach, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const quizStatus = /^(draft|published|assigned|completed)$/;
const bankFilters = [
  ['Draft', 'draft'],
  ['Published', 'published'],
  ['Assigned', 'assigned'],
  ['Completed', 'completed'],
] as const;

let undeletedDraftTitle = '';

describe('teacher AI quiz maker', { tags: ['teacher', 'quiz-maker'] }, () => {
  afterEach(async ({ app, screen }) => {
    const title = undeletedDraftTitle;
    if (!title) return;
    undeletedDraftTitle = '';
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    const main = screen.getByRole('main');
    await main.getByRole('button', 'Quiz Bank').tap();
    const view = main.getByRole('button', 'View');
    const empty = main.getByText('No quizzes found');
    await expect.poll(async () => (await view.count()) + (await empty.count()), { timeout: 30_000 }).toBeGreaterThan(0);
    const draft = main.getByRole('button').filter({ hasText: title });
    if ((await draft.count()) > 0) {
      await draft.getByRole('button', 'Delete').tap();
      await expect(draft).toHaveCount(0);
    }
  });

  test('Setup step shows the stepper, guidelines and grade level and clamps the question count', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('button', 'Create Quiz')).toBeVisible();
    await expect(screen.getByRole('button', 'Quiz Bank')).toBeVisible();
    for (const label of ['Setup', 'Topics', 'Question Style', 'Preview']) {
      await expect(screen.getByText(label)).toBeVisible();
    }

    const guidelines = screen.getByRole('button', /^Assessment Guidelines & Limits/);
    const limits = screen.getByText(/Generation limit: up to 12 questions and 12 topics per quiz\./);
    await expect(guidelines).not.toBeExpanded();
    await guidelines.tap();
    await expect(guidelines).toBeExpanded();
    await expect(limits).toBeVisible();
    await expect(screen.getByText('Hide details')).toBeVisible();
    await guidelines.tap();
    await expect(limits).toBeHidden();

    await expect(screen.getByText('Basic Settings')).toBeVisible();
    await expect(screen.getByLabel('Grade level')).toHaveValue('Grade 11');

    const questionCount = screen.getByLabel('Number of questions');
    await expect(questionCount).toHaveValue('5');
    await screen.getByRole('button', 'Decrease number of questions').tap();
    await expect(questionCount).toHaveValue('4');
    await questionCount.fill('50');
    await expect(questionCount).toHaveValue('12');
    await screen.getByRole('button', 'Increase number of questions').tap();
    await expect(questionCount).toHaveValue('12');
    await questionCount.fill('0');
    await expect(questionCount).toHaveValue('1');
    await screen.getByRole('button', 'Decrease number of questions').tap();
    await expect(questionCount).toHaveValue('1');
  });

  test('Setup step has a single Quiz title field', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Basic Settings')).toBeVisible();

    await expect(screen.getByText('Quiz title')).toHaveCount(1);
  });

  test('Topics step keeps Next disabled until a topic is selected and Clear all resets the selection', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Next: Select Topics').tap();
    await expect(screen.getByRole('heading', 'Select topics')).toBeVisible();
    await expect(screen.getByText('0 of 12 selected')).toBeVisible();
    const next = screen.getByRole('button', 'Next: Question Style');
    await expect(next).toBeDisabled();
    await expect(screen.getByRole('button', 'Clear all')).toBeHidden();

    const financial = screen.getByRole('button', /^General Mathematics - Financial Mathematics/);
    await expect(financial).toHaveAccessibleName(/0 selected$/, { timeout: 30_000 });
    await financial.tap();
    const topic = screen.getByText('Simple and Compound Interest');
    await expect(topic).toBeVisible();
    await expect(screen.getByText('Foundation').first()).toBeVisible();
    await topic.tap();
    await expect(screen.getByText('1 of 12 selected')).toBeVisible();
    await expect(financial).toHaveAccessibleName(/1 selected$/);
    await expect(next).toBeEnabled();

    await screen.getByRole('button', 'Clear all').tap();
    await expect(screen.getByText('0 of 12 selected')).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(screen.getByRole('button', 'Clear all')).toBeHidden();

    await screen.getByRole('button', 'Back').tap();
    await expect(screen.getByText('Basic Settings')).toBeVisible();
  });

  test('Question Style keeps one type and Bloom level, rebalances difficulty, and Preview summarizes the settings', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    await screen.getByRole('button', 'Next: Select Topics').tap();
    await screen.getByRole('button', /^General Mathematics - Financial Mathematics/).tap();
    await screen.getByText('Simple and Compound Interest').tap();
    await expect(screen.getByText('1 of 12 selected')).toBeVisible();
    await screen.getByRole('button', 'Next: Question Style').tap();

    await expect(screen.getByText('Question Types')).toBeVisible();
    await expect(screen.getByText("Bloom's Taxonomy Levels")).toBeVisible();
    await expect(screen.getByText('Difficulty Distribution')).toBeVisible();

    await screen.getByRole('button', 'Word Problem').tap();
    await screen.getByRole('button', 'Identification').tap();
    await screen.getByRole('button', 'Multiple Choice').tap();
    for (const level of ['understand', 'apply', 'analyze', 'remember']) {
      await screen.getByRole('button', level).tap();
    }

    await expect(screen.getByDisplayValue('30%')).toBeVisible();
    await expect(screen.getByDisplayValue('50%')).toBeVisible();
    await expect(screen.getByDisplayValue('20%')).toBeVisible();
    await screen.getByDisplayValue('30%').press('Tab');
    await browser.keyboard.press('Enter');
    await expect(screen.getByDisplayValue('35%')).toBeVisible();
    await expect(screen.getByDisplayValue('46%')).toBeVisible();
    await expect(screen.getByDisplayValue('19%')).toBeVisible();

    await screen.getByRole('button', 'Next: Preview').tap();
    await expect(screen.getByRole('heading', 'Quiz Summary')).toBeVisible();
    await expect(screen.getByText('Grade 11 Quiz')).toBeVisible();
    await expect(screen.getByText('Gr. 11')).toBeVisible();
    await expect(
      screen.getByText(/^Multiple Choice questions across 1 topics? .*aligned to Remember levels of Bloom's Taxonomy\. Easy 35% • Medium 46% • Hard 19%\.$/),
    ).toBeVisible();
    await expect(screen.getByRole('button', 'Generate Quiz')).toBeEnabled();

    await screen.getByRole('button', 'Back').tap();
    await expect(screen.getByText('Question Types')).toBeVisible();
    await expect(screen.getByDisplayValue('35%')).toBeVisible();
  });

  test(
    'Generate Quiz runs the queued AI task, auto-saves a private draft, then the draft is previewed and deleted from the Quiz Bank',
    { session: 'teacher', tags: ['ai'], timeout: 300_000 },
    async ({ app, agent, browser, screen }) => {
      const title = `E2E-quiz-${Date.now()}`;
      await app.open('/');
      await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
      await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
      await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
      const main = screen.getByRole('main');

      await screen.getByPlaceholder('Enter a title (optional)').fill(title);
      await screen.getByLabel('Number of questions').fill('2');
      await expect(screen.getByLabel('Number of questions')).toHaveValue('2');
      await screen.getByRole('button', 'Next: Select Topics').tap();
      await screen.getByRole('button', /^General Mathematics - Financial Mathematics/).tap();
      await screen.getByText('Simple and Compound Interest').tap();
      await expect(screen.getByText('1 of 12 selected')).toBeVisible();
      await screen.getByRole('button', 'Next: Question Style').tap();
      await screen.getByRole('button', 'Next: Preview').tap();
      await expect(screen.getByRole('heading', 'Quiz Summary')).toBeVisible();
      await expect(screen.getByText(title)).toBeVisible();

      undeletedDraftTitle = title;
      await screen.getByRole('button', 'Generate Quiz').tap();
      await expect(screen.getByText('Generating Quiz in Background')).toBeVisible();
      await expect(screen.getByRole('heading', 'Quiz Generated')).toBeVisible({ timeout: 180_000 });
      const reviewHeading = screen.getByRole('heading', 'Review Questions');
      await expect(reviewHeading).toBeVisible();
      await reviewHeading.scrollIntoView();
      await expect(screen.getByText('Q1')).toBeVisible();
      await agent.assert('the Review Questions list shows at least one generated math quiz question');

      await expect(screen.getByRole('button', 'Publish')).toBeVisible({ timeout: 30_000 });
      await expect(screen.getByRole('button', 'Assign to Class')).toBeVisible();
      await expect(screen.getByRole('button', 'Save to Library')).toBeHidden();

      await screen.getByRole('button', 'Copy All').tap();
      await expect(screen.getByRole('button', 'Copied!')).toBeVisible();
      const exported = await browser.waitForDownload(() => screen.getByRole('button', 'Export JSON').tap());
      expect(exported.suggestedFilename).toMatch(/^quiz_Grade_11_\d+\.json$/);

      await main.getByRole('button', 'Quiz Bank').tap();
      const card = main.getByRole('button').filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 30_000 });
      await expect(card.getByText('draft')).toBeVisible();
      await expect(card.getByText(/^\d+ questions$/)).toBeVisible();

      await main.getByRole('button', 'Published').tap();
      await expect(card).toHaveCount(0);
      await main.getByRole('button', 'Draft').tap();
      await expect(card).toBeVisible();
      await main.getByRole('button', 'All').tap();
      await expect(card).toBeVisible();

      await card.getByRole('button', 'Preview quiz').tap();
      await expect(screen.getByText('Try It Yourself!')).toBeVisible();
      await screen.getByRole('button', 'Exit quiz').tap();
      await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeVisible();
      await screen.getByRole('button', 'Leave Quiz').tap();
      await expect(screen.getByText('Try It Yourself!')).toBeHidden();

      await card.getByRole('button', 'Delete').tap();
      await expect(screen.getByText('Quiz deleted')).toBeVisible();
      await expect(card).toHaveCount(0);

      await main.getByRole('button', 'Create Quiz').tap();
      await main.getByRole('button', 'Quiz Bank').tap();
      await expect
        .poll(async () => (await main.getByRole('button', 'View').count()) + (await main.getByText('No quizzes found').count()), { timeout: 30_000 })
        .toBeGreaterThan(0);
      await expect(card).toHaveCount(0);
      undeletedDraftTitle = '';
    },
  );

  test('Quiz Bank status filters show only quizzes with the chosen status', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    const main = screen.getByRole('main');

    await main.getByRole('button', 'Quiz Bank').tap();
    await expect(
      main.getByText('Quizzes are for registered students only. Use Preview quiz to take one yourself without saving progress or earning XP.'),
    ).toBeVisible();
    const view = main.getByRole('button', 'View');
    const empty = main.getByText('No quizzes found');
    await expect.poll(async () => (await view.count()) + (await empty.count()), { timeout: 30_000 }).toBeGreaterThan(0);
    const total = await view.count();
    await expect(main.getByText(quizStatus)).toHaveCount(total);
    await expect(main.getByText(/^\d+ questions$/)).toHaveCount(total);
    await expect(main.getByText(/^\S+ pts$/)).toHaveCount(total);

    for (const [chip, status] of bankFilters) {
      await main.getByRole('button', chip).tap();
      const shown = await view.count();
      expect(shown).toBeLessThanOrEqual(total);
      await expect(main.getByText(quizStatus)).toHaveCount(shown);
      await expect(main.getByText(status)).toHaveCount(shown);
      if (shown === 0) {
        await expect(empty).toBeVisible();
        await expect(main.getByText('Generate your first quiz in the Create tab')).toBeVisible();
      }
    }

    await main.getByRole('button', 'All').tap();
    await expect(view).toHaveCount(total);
  });

  test('Quiz Bank View opens a saved quiz, Back to Quiz Bank returns, and Done leaves the Quiz Maker', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    const main = screen.getByRole('main');
    await main.getByRole('button', 'Quiz Bank').tap();
    const view = main.getByRole('button', 'View');
    await expect
      .poll(async () => (await view.count()) + (await main.getByText('No quizzes found').count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    test.skip((await view.count()) === 0, 'the e2e teacher has no saved quizzes in the Quiz Bank');

    await view.first().tap();
    await expect(screen.getByRole('heading', 'Quiz Generated')).toBeVisible();
    await expect(screen.getByRole('heading', 'Review Questions')).toBeVisible();
    await expect(main.getByRole('button', 'Preview quiz')).toBeVisible();
    await expect(main.getByRole('button', 'Assign')).toBeVisible();
    await expect(main.getByRole('button', 'Publish')).toBeHidden();
    await expect(main.getByRole('button', 'Assign to Class')).toBeHidden();

    await main.getByRole('button', 'Back to Quiz Bank').tap();
    await expect(main.getByRole('button', 'All')).toBeVisible();
    await expect(view.first()).toBeVisible();

    await view.first().tap();
    await main.getByRole('button', 'Done').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('Quiz Bank Preview quiz runs in preview mode and Leave Quiz closes it', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    const main = screen.getByRole('main');
    await main.getByRole('button', 'Quiz Bank').tap();
    const preview = main.getByRole('button', 'Preview quiz');
    await expect
      .poll(async () => (await preview.count()) + (await main.getByText('No quizzes found').count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    test.skip((await preview.count()) === 0, 'the e2e teacher has no saved quizzes in the Quiz Bank');

    await preview.first().tap();
    const banner = screen.getByText('Try It Yourself!');
    await expect(banner).toBeVisible();
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();

    await screen.getByRole('button', 'Exit quiz').tap();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeVisible();
    await screen.getByRole('button', 'Stay').tap();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeHidden();
    await expect(banner).toBeVisible();

    await screen.getByRole('button', 'Exit quiz').tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(banner).toBeHidden();
    await expect(main.getByRole('button', 'All')).toBeVisible();
  });

  test('Quiz Bank Assign dialog searches students and closes without assigning', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'AI Quiz Maker').tap();
    await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible();
    const main = screen.getByRole('main');
    await main.getByRole('button', 'Quiz Bank').tap();
    const cards = main.getByRole('button').filter({ has: screen.getByRole('button', 'Delete') });
    await expect
      .poll(async () => (await cards.count()) + (await main.getByText('No quizzes found').count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    test.skip((await cards.count()) === 0, 'the e2e teacher has no saved quizzes in the Quiz Bank');

    const firstCard = cards.first();
    const statusBefore = await firstCard.getByText(quizStatus).textContent();
    await firstCard.getByRole('button', 'Assign').tap();
    const dialogTitle = screen.getByRole('heading', 'Assign to Student');
    await expect(dialogTitle).toBeVisible();
    await expect(screen.getByRole('button', 'Assign', { disabled: true })).toBeVisible();
    await expect(screen.getByRole('button', 'Cancel')).toBeVisible();

    const search = screen.getByRole('textbox', 'Search students');
    await search.fill('zz-e2e-no-such-student');
    await expect(screen.getByText('No students found')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Clear search').tap();
    await expect(search).toHaveValue('');

    await screen.getByRole('button', 'Close assign dialog').tap();
    await expect(dialogTitle).toBeHidden();
    await expect(firstCard.getByText(quizStatus)).toHaveText(statusBefore ?? '');
  });
});
