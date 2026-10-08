import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeStartupDialogs =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';

describe('student quiz player', { tags: ['student', 'quiz-player'] }, () => {
  test('the checkpoint quiz offers sound, hint, and calculator controls, answer feedback, question arrows, and a leave confirmation', { session: 'student', timeout: 300_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', /\d+ lessons?/).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(screen.getByText('COMPETENCY CHECK · General Quiz')).toBeVisible();
    await screen.getByRole('button', /^(START|Retake)$/).tap();

    await agent.waitFor('the quiz player shows a question counter such as "Q1 of 5" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    await expect(screen.getByText('Try It Yourself!')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeHidden();
    // textContent() reads innerText, and the counter pill is CSS-uppercased ("Q1 OF 8").
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    test.skip(questionCount < 2, 'the generated checkpoint quiz has fewer than two questions, so there is nothing to navigate between');
    await expect(screen.getByRole('button', 'Previous question')).toBeDisabled();
    await expect(screen.getByRole('button', 'Next question')).toBeDisabled();

    await screen.getByRole('button', 'Mute sound').tap();
    await expect(screen.getByRole('button', 'Unmute sound')).toBeVisible();
    await screen.getByRole('button', 'Unmute sound').tap();
    await expect(screen.getByRole('button', 'Mute sound')).toBeVisible();

    await screen.getByRole('button', /Hint$/).tap();
    await agent.assert('exactly one answer choice is crossed out or disabled, and the key counter next to the hearts counter reads 4');

    await screen.getByRole('button', 'Toggle calculator').tap();
    await expect(screen.getByRole('button', 'Close calculator')).toBeVisible();
    await expect(screen.getByRole('button', 'Verify with SymPy')).toBeVisible();
    await screen.getByRole('button', 'AC').tap();
    // The calculator portal mounts after the question card, so its keys are the last match when an answer choice reads the same digit.
    await screen.getByRole('button', '7').last().tap();
    await screen.getByRole('button', '×').tap();
    await screen.getByRole('button', '8').last().tap();
    await screen.getByRole('button', '=').tap();
    await expect(screen.getByText('7×8 =')).toBeVisible();
    await expect(screen.getByText('56').last()).toBeVisible();
    await screen.getByRole('button', 'Close calculator').tap();
    await expect(screen.getByRole('button', 'Verify with SymPy')).toBeHidden();

    await agent.act('choose any answer choice for question 1 that is not crossed out, and do not press Next Question');
    await expect(screen.getByText('Question 1 Explanation')).toBeVisible();
    await expect(screen.getByRole('button', 'Toggle calculator')).toBeHidden();
    await screen.getByRole('button', 'Next Question').tap();
    await expect(screen.getByText(`Q2 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByText('Question 2 Explanation')).toBeHidden();
    await expect(screen.getByRole('button', 'Toggle calculator')).toBeVisible();
    await expect(screen.getByRole('heading', 'Correct!')).toBeHidden();

    await screen.getByRole('button', 'Previous question').tap();
    await expect(screen.getByText(`Q1 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByText(/^(Correct!|Incorrect)$/)).toBeVisible();
    await screen.getByRole('button', 'Next question').tap();
    await expect(screen.getByText(`Q2 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByRole('button', 'Next question')).toBeDisabled();

    await screen.getByRole('button', 'Exit quiz').tap();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeVisible();
    await expect(screen.getByText("Your progress will be reset and you'll need to start over.")).toBeVisible();
    await screen.getByRole('button', 'Stay').tap();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeHidden();
    await expect(screen.getByText(`Q2 of ${questionCount}`)).toBeVisible();

    await screen.getByRole('button', 'Exit quiz').tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });

  test('reviewing an earlier question offers Back to Current Question instead of skipping the unanswered one', { session: 'student', timeout: 300_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', /\d+ lessons?/).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await screen.getByRole('button', /^(START|Retake)$/).tap();
    await agent.waitFor('the quiz player shows a question counter such as "Q1 of 5" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    test.skip(questionCount < 2, 'the generated checkpoint quiz has fewer than two questions, so there is no earlier question to review');

    await agent.act('choose any answer choice for question 1, and do not press Next Question');
    await expect(screen.getByText('Question 1 Explanation')).toBeVisible();
    await screen.getByRole('button', 'Next Question').tap();
    await expect(screen.getByText(`Q2 of ${questionCount}`)).toBeVisible();

    await screen.getByRole('button', 'Previous question').tap();
    await expect(screen.getByText(`Q1 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByRole('button', 'Back to Current Question')).toBeVisible();
    await expect(screen.getByRole('button', /^(Next Question|View Results)$/)).toBeHidden();

    await screen.getByRole('button', 'Back to Current Question').tap();
    await expect(screen.getByText(`Q2 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByText('Question 2 Explanation')).toBeHidden();

    await screen.getByRole('button', 'Exit quiz').tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  });

  test('a correct answer shows the Correct! celebration on top of the question card', { session: 'student', timeout: 300_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', /\d+ lessons?/).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await screen.getByRole('button', /^(START|Retake)$/).tap();
    await agent.waitFor('the quiz player shows a question counter such as "Q1 of 5" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();

    await agent.act('work out question 1 and choose the answer choice that is mathematically correct, and do not press Next Question');
    await expect(screen.getByText('Question 1 Explanation')).toBeVisible();
    test.skip((await screen.getByRole('heading', 'Correct!').count()) === 0, 'question 1 was graded Incorrect, so no celebration is due');
    await agent.assert('a celebration card with the mascot, the large word CORRECT! and an XP pill is drawn over the middle of the quiz, in front of the question card', { vision: 'only' });

    await screen.getByRole('button', 'Exit quiz').tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  });

  test('a lesson practice quiz runs to results with XP feedback, an answer review, and a retake', { session: 'student', timeout: 420_000 }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', /\d+ lessons?/).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(screen.getByText('Lesson 1')).toBeVisible();
    await screen.getByRole('button', /^(Quiz|Retry)$/).first().tap();

    await agent.waitFor('the quiz player shows a question counter such as "Q1 of 6" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    await expect(screen.getByText(/^Practice Quiz: /)).toBeVisible();
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    expect(questionCount).toBeGreaterThan(0);

    for (let questionNumber = 1; questionNumber <= questionCount; questionNumber += 1) {
      await expect(screen.getByText(`Q${questionNumber} of ${questionCount}`)).toBeVisible();
      await agent.act(`choose any one answer choice for question ${questionNumber}, and do not press Next Question or View Results`);
      await expect(screen.getByText(`Question ${questionNumber} Explanation`)).toBeVisible();
      await screen.getByRole('button', questionNumber < questionCount ? 'Next Question' : 'View Results').tap();
    }

    await expect(screen.getByText(/^Quiz Complete! \+\d+ XP$/)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', /^(EXCELLENT!|GOOD JOB!|KEEP TRYING!)$/)).toBeVisible();
    await expect(screen.getByText(new RegExp(`^Quiz Complete • Score: \\d+/${questionCount}$`))).toBeVisible();
    await expect(screen.getByRole('heading', 'Performance Details')).toBeVisible();
    await expect(screen.getByText('Correct Answers')).toBeVisible();
    await expect(screen.getByText('Total XP Earned')).toBeVisible();
    await expect(screen.getByText('Final Accuracy')).toBeVisible();
    await agent.waitFor('the Total XP Earned row of the results card shows a number greater than zero', { timeout: 15_000 });

    await expect(screen.getByText(/^Your answer: /).first()).toBeHidden();
    await screen.getByText('Review answers').tap();
    await expect(screen.getByText(/^Your answer: /).first()).toBeVisible();
    await expect(screen.getByRole('button', 'FINISH')).toBeVisible();

    await screen.getByRole('button', 'RETAKE QUIZ').tap();
    await expect(screen.getByText(`Q1 of ${questionCount}`)).toBeVisible();
    await expect(screen.getByRole('heading', 'Performance Details')).toBeHidden();
    await expect(screen.getByRole('button', 'Previous question')).toBeDisabled();
    await expect(screen.getByText('Question 1 Explanation')).toBeHidden();

    await screen.getByRole('button', 'Exit quiz').tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();
    await expect(screen.getByRole('heading', 'Leave this quiz?')).toBeHidden();
  });

  test("finishing a lesson quiz turns that lesson's Quiz button into Retry", { session: 'student', timeout: 480_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();
    await agent.act(closeStartupDialogs);
    await expect(screen.getByRole('heading', 'Curriculum Modules')).toBeVisible();

    await screen.getByRole('button', /\d+ lessons?/).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    const moduleTitle = (await screen.getByRole('heading', { level: 1 }).textContent()) ?? '';
    const retryCount = await screen.getByRole('button', 'Retry').count();
    test.skip((await screen.getByRole('button', 'Quiz').count()) === 0, 'every lesson quiz in the first module is already marked done');
    await screen.getByRole('button', 'Quiz').first().tap();

    await agent.waitFor('the quiz player shows a question counter such as "Q1 of 6" and multiple-choice answer buttons', { timeout: 120_000 });
    await expect(screen.getByRole('button', 'Exit quiz')).toBeVisible();
    const questionCount = Number((await screen.getByText(/^Q1 of \d+$/).textContent())?.match(/\d+$/)?.[0] ?? '0');
    expect(questionCount).toBeGreaterThan(0);
    for (let questionNumber = 1; questionNumber <= questionCount; questionNumber += 1) {
      await expect(screen.getByText(`Q${questionNumber} of ${questionCount}`)).toBeVisible();
      await agent.act(`choose any one answer choice for question ${questionNumber}, and do not press Next Question or View Results`);
      await expect(screen.getByText(`Question ${questionNumber} Explanation`)).toBeVisible();
      await screen.getByRole('button', questionNumber < questionCount ? 'Next Question' : 'View Results').tap();
    }
    // The XP toast fires only after the quiz completion is written to progress, so the reload below reads saved data.
    await expect(screen.getByText(/^Quiz Complete! \+\d+ XP$/)).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'FINISH').tap();
    await expect(screen.getByRole('button', 'Exit quiz')).toBeHidden();

    // FINISH reopens the lesson, and the module restores a remembered lesson from sessionStorage, so a reload would skip the Study Journey.
    await browser.evaluate(() => {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('mathpulse_module_')) sessionStorage.removeItem(key);
      }
      return true;
    });
    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStartupDialogs);
    await screen.getByRole('button', /\d+ lessons?/).filter({ hasText: moduleTitle }).first().tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(screen.getByRole('button', 'Retry')).toHaveCount(retryCount + 1, { timeout: 15_000 });
  });
});
