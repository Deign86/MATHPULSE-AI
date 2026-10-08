import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeStartupDialogs =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
const practiceTopic = 'Function Notation and Evaluation';

describe('student practice center', { tags: ['student', 'practice-center'] }, () => {
  test('the Practice tab shows stat tiles, difficulty pills that relabel the topic cards, and search, status, and subject filters', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await expect(screen.getByText('Practice Center')).toBeVisible();
    await expect(screen.getByText('Quizzes Completed')).toBeVisible();
    await expect(screen.getByText('Total XP Earned')).toBeVisible();
    await expect(screen.getByText('Average Score')).toBeVisible();
    await expect(screen.getByText('Difficulty:')).toBeVisible();
    await expect(screen.getByText('AI • Medium').first()).toBeVisible();
    await expect(screen.getByText('+50 XP').first()).toBeVisible();

    await screen.getByRole('button', 'Hard').tap();
    await expect(screen.getByText('AI • Hard').first()).toBeVisible();
    await expect(screen.getByText('+75 XP').first()).toBeVisible();
    await expect(screen.getByText('AI • Medium')).toHaveCount(0);

    await screen.getByRole('button', 'Easy').tap();
    await expect(screen.getByText('AI • Easy').first()).toBeVisible();
    await expect(screen.getByText('+25 XP').first()).toBeVisible();
    await expect(screen.getByText('AI • Hard')).toHaveCount(0);

    await screen.getByLabel('Search modules').fill('Function Notation');
    await expect(screen.getByRole('heading', practiceTopic)).toBeVisible();
    await expect(screen.getByRole('heading', 'Composite Functions')).toBeHidden();

    await screen.getByLabel('Search modules').fill('zz-e2e-no-such-topic');
    await expect(screen.getByText('No topics found')).toBeVisible();
    await expect(screen.getByText('Try adjusting your filters or search query')).toBeVisible();

    // With no matching topic, the empty-state copy shows which status pill is active. The Recommended tab above shares the pill's name and comes earlier in the DOM.
    await screen.getByRole('button', 'Recommended').last().tap();
    await expect(screen.getByText('Practice Center')).toBeVisible();
    await expect(screen.getByText('No recommended practice topics yet')).toBeVisible();
    await expect(screen.getByText('Recommended practice topics come from your diagnostic results. Teacher-assigned quizzes appear in the Assigned by your teacher section above.')).toBeVisible();
    await expect(screen.getByText('No topics found')).toBeHidden();
    await screen.getByRole('button', 'All').tap();
    await expect(screen.getByText('No topics found')).toBeVisible();
    await expect(screen.getByText('No recommended practice topics yet')).toBeHidden();

    await screen.getByLabel('Search modules').clear();
    await expect(screen.getByRole('heading', 'Composite Functions')).toBeVisible();
    await expect(screen.getByText('No topics found')).toBeHidden();

    // The Practice Center subject select has no label; the page filters above the tabs come earlier in the DOM.
    await screen.getByRole('combobox').last().selectOption('Finite Mathematics');
    await expect(screen.getByRole('heading', 'Matrix Operations')).toBeVisible();
    await expect(screen.getByRole('heading', 'Composite Functions')).toBeHidden();
  });

  test('a topic card generates an AI practice quiz that is answered, finished, and recorded on the card with its history', { session: 'student', timeout: 420_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await expect(screen.getByText('Practice Center')).toBeVisible();
    await screen.getByLabel('Search modules').fill(practiceTopic);
    await screen.getByRole('heading', practiceTopic).tap();

    await agent.waitFor('an AI practice quiz shows a question counter such as "Q1 of 5" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    await expect(screen.getByText(`Practice Quiz: ${practiceTopic} (AI)`)).toBeVisible();
    // textContent() reads innerText, and the counter pill is CSS-uppercased ("Q1 OF 5").
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    expect(questionCount).toBeGreaterThan(0);

    for (let questionNumber = 1; questionNumber <= questionCount; questionNumber += 1) {
      await expect(screen.getByText(`Q${questionNumber} of ${questionCount}`)).toBeVisible();
      await agent.act(`choose any one answer choice for question ${questionNumber}, and do not press Next Question or View Results`);
      await expect(screen.getByText(`Question ${questionNumber} Explanation`)).toBeVisible();
      await screen.getByRole('button', questionNumber < questionCount ? 'Next Question' : 'View Results').tap();
    }

    await expect(screen.getByText(/^Quiz Completed! \+\d+ XP$/)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', /^(EXCELLENT!|GOOD JOB!|KEEP TRYING!)$/)).toBeVisible();
    await expect(screen.getByText(new RegExp(`^Quiz Complete • Score: \\d+/${questionCount}$`))).toBeVisible();
    await expect(screen.getByRole('heading', 'Performance Details')).toBeVisible();

    await screen.getByRole('button', 'FINISH').tap();
    await expect(screen.getByText(/^Score: [\d.]+%/)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();
    await expect(screen.getByText('Practice Center')).toBeVisible();
    await expect(screen.getByRole('heading', practiceTopic)).toBeVisible();
    await expect(screen.getByText('Retry')).toBeVisible();
    await expect(screen.getByText(/^Best: \d+%$/)).toBeVisible();

    await screen.getByRole('button', 'History').tap();
    await expect(screen.getByRole('heading', 'Quiz History')).toBeVisible();
    await agent.assert('the Quiz History dialog lists at least one attempt with a date, a difficulty, and a percentage score');
    await agent.act('close the Quiz History dialog');
    await expect(screen.getByRole('heading', 'Quiz History')).toBeHidden();

    await screen.getByLabel('Search modules').clear();
    await screen.getByRole('button', 'Completed').tap();
    await expect(screen.getByRole('heading', practiceTopic)).toBeVisible();
    await expect(screen.getByRole('heading', 'Composite Functions')).toBeHidden();
    await screen.getByRole('button', 'All').tap();
    await expect(screen.getByRole('heading', 'Composite Functions')).toBeVisible();
  });

  test('one practice attempt reports the same XP in the XP toast and in the score toast', { session: 'student', timeout: 420_000, tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await screen.getByLabel('Search modules').fill(practiceTopic);
    await screen.getByRole('heading', practiceTopic).tap();
    await agent.waitFor('an AI practice quiz shows a question counter such as "Q1 of 5" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    expect(questionCount).toBeGreaterThan(0);

    for (let questionNumber = 1; questionNumber <= questionCount; questionNumber += 1) {
      await expect(screen.getByText(`Q${questionNumber} of ${questionCount}`)).toBeVisible();
      await agent.act(`choose any one answer choice for question ${questionNumber}, and do not press Next Question or View Results`);
      await expect(screen.getByText(`Question ${questionNumber} Explanation`)).toBeVisible();
      await screen.getByRole('button', questionNumber < questionCount ? 'Next Question' : 'View Results').tap();
    }

    const xpToast = screen.getByText(/^Quiz Completed! \+\d+ XP$/);
    await expect(xpToast).toBeVisible({ timeout: 30_000 });
    const toastXp = Number((await xpToast.textContent())?.replace(/\D/g, '') ?? '0');

    await screen.getByRole('button', 'FINISH').tap();
    const scoreToast = screen.getByText(/^Score: .+ \| \+\d+ XP$/);
    await expect(scoreToast).toBeVisible({ timeout: 30_000 });
    const scoreToastXp = Number((await scoreToast.textContent())?.match(/\+(\d+) XP$/)?.[1] ?? '0');

    expect(scoreToastXp).toBe(toastXp);
  });

  test('the Practice Center hides topics from shelved subjects', { session: 'student', timeout: 120_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', 'Practice').tap();
    await expect(screen.getByText('Practice Center')).toBeVisible();
    await expect(screen.getByRole('heading', practiceTopic)).toBeVisible();
    await screen.getByLabel('Search modules').fill('Random Variables');
    await expect(screen.getByText('No topics found')).toBeVisible();
    await expect(screen.getByRole('heading', 'Random Variables')).toBeHidden();
  });
});
