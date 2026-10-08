import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const dismissDialogs =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
const lessonLoaded =
  'The lesson screen has finished loading: either a lesson notebook with section text is shown, or an error or "AI lesson unavailable" message is shown. The "Loading lesson from DepEd curriculum..." screen is gone.';
const firstLessonTitle = 'Identify and describe arithmetic and geometric patterns in data.';

describe('student lesson viewer', { tags: ['student', 'lesson-viewer'] }, () => {
  test('Study Materials opens the AI lesson notebook and its section tabs navigate the parts', { session: 'student', timeout: 240_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    // The Daily Rewards modal opens on a timer after the claim state loads, so give it a moment before dismissing.
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^(Study Materials|Review)$/).first().tap();
    await agent.waitFor(lessonLoaded, { timeout: 120_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await expect(screen.getByRole('heading', firstLessonTitle, { level: 1 })).toBeVisible();
    for (const part of ['Intro', 'Concepts', 'Video', 'Examples', 'Notes', 'Practice', 'Summary']) {
      await expect(screen.getByRole('button', `Go to ${part} section`)).toBeVisible();
    }

    await screen.getByRole('button', 'Go to Intro section').tap();
    await expect(screen.getByText(/^Part 1 of \d+$/)).toBeVisible();
    await expect(screen.getByText('Lesson Mission & Overview')).toBeVisible();
    await expect(screen.getByText('Lesson Roadmap')).toBeVisible();
    await expect(screen.getByRole('button', 'Previous section')).toBeDisabled();

    await screen.getByRole('button', 'Next section').tap();
    await expect(screen.getByText(/^Part 2 of \d+$/)).toBeVisible();
    await agent.assert('The notebook page explains key mathematical concepts about patterns, sequences or series.');

    await screen.getByRole('button', 'Go to Examples section').tap();
    await expect(screen.getByText(/^Part 4 of \d+$/)).toBeVisible();
    await screen.getByRole('button', 'Previous section').tap();
    await expect(screen.getByText(/^Part 3 of \d+$/)).toBeVisible();

    await screen.getByRole('button', 'Go back').tap();
    await expect(screen.getByRole('heading', 'Study Journey')).toBeVisible();
  });

  test('Try It Yourself Start Practice Quiz opens the practice engine and leaves without saving', { session: 'student', timeout: 300_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Identify and describe/).tap();
    await agent.waitFor(lessonLoaded, { timeout: 120_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await screen.getByRole('button', 'Go to Practice section').tap();
    await expect(screen.getByRole('heading', 'Try It Yourself', { level: 3 })).toBeVisible();
    // Lesson 1 has no linked module quiz, so the AI Try It engine is offered instead of "Start Practice".
    await expect(screen.getByRole('button', 'Start Practice')).toBeHidden();

    await screen.getByRole('button', /^Start Practice Quiz/).tap();
    await agent.waitFor(
      'The "Try It Yourself!" practice quiz has opened and shows a question, or an error about practice questions is shown. The "Generating Quiz..." screen is gone.',
      { timeout: 120_000 },
    );
    await expect(screen.getByText('Try It Yourself!')).toBeVisible();
    await expect(screen.getByRole('button', 'Open quiz menu')).toBeVisible();
    await expect(screen.getByRole('button', 'Mute sound')).toBeVisible();

    await screen.getByRole('button', 'Open quiz menu').tap();
    await expect(screen.getByRole('heading', 'Quiz Menu')).toBeVisible();
    await expect(screen.getByRole('button', /^Resume Quiz/)).toBeVisible();
    await screen.getByRole('button', /^Leave Quiz\s*Exit$/).tap();
    const leaveHeading = screen.getByRole('heading', 'Are you sure you want to leave?');
    await expect(leaveHeading).toBeVisible();
    await expect(screen.getByText("Your progress in this quiz session won't be saved.")).toBeVisible();
    await screen.getByRole('button', 'Stay & Keep Solving').tap();
    await expect(leaveHeading).toBeHidden();
    await expect(screen.getByText('Try It Yourself!')).toBeVisible();

    await screen.getByRole('button', 'Open quiz menu').tap();
    await screen.getByRole('button', /^Leave Quiz\s*Exit$/).tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByText('Try It Yourself!')).toBeHidden();
    await expect(screen.getByRole('button', /^Start Practice Quiz/)).toBeVisible();
  });

  test('Complete lesson stays disabled on the last part until the practice is done', { session: 'student', timeout: 240_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Identify and describe/).tap();
    await agent.waitFor(lessonLoaded, { timeout: 120_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await screen.getByRole('button', 'Go to Summary section').tap();
    await expect(screen.getByText(/^Part (\d+) of \1$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Next section')).toBeHidden();
    await expect(screen.getByRole('button', 'Complete lesson')).toBeDisabled();
    await expect(screen.getByRole('heading', 'Lesson Complete!')).toBeHidden();
    await agent.assert('The notebook page summarizes what the lesson on patterns, sequences or series covered.');
  });

  test('a lesson with a linked module quiz offers Start Practice in its Practice part', { session: 'student', timeout: 240_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 2\s*Construct explicit and recursive rules for sequences\./).tap();
    await agent.waitFor(lessonLoaded, { timeout: 120_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await screen.getByRole('button', 'Go to Practice section').tap();
    await expect(screen.getByRole('heading', 'Try It Yourself', { level: 3 })).toBeVisible();
    await expect(screen.getByRole('button', /^Start Practice Quiz/)).toBeHidden();
    if (await screen.getByText(/^Quiz Complete/).isVisible()) {
      await expect(screen.getByText('Great job! You can now complete this lesson.')).toBeVisible();
    } else {
      await expect(screen.getByText('Solve contextual problems involving finite series.')).toBeVisible();
      await expect(screen.getByText(/^\d+ questions · \d+ min$/)).toBeVisible();
      await expect(screen.getByRole('button', 'Start Practice')).toBeVisible();
    }
  });

  test('phone Module Parts menu jumps between notebook parts', { session: 'student', timeout: 240_000, tags: ['ai', 'phone'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    await browser.setViewport({ width: 390, height: 844 });
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();

    await content.getByRole('button', /^Lesson 1\s*Identify and describe/).tap();
    await agent.waitFor(lessonLoaded, { timeout: 120_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();
    await expect(screen.getByRole('button', 'Go to Intro section')).toBeHidden();

    await screen.getByRole('button', /^Section: Part \d+ \w+\. Tap to open module section menu\.$/).tap();
    await expect(screen.getByText('Module Parts')).toBeVisible();
    await expect(screen.getByText(/^\d+ of \d+$/)).toBeVisible();
    await screen.getByRole('button', /^Part 1\s*Intro$/).tap();
    await expect(screen.getByText('Module Parts')).toBeHidden();
    await expect(screen.getByRole('button', 'Section: Part 1 Intro. Tap to open module section menu.')).toBeVisible();
    await expect(screen.getByText('Lesson Mission & Overview')).toBeVisible();

    await screen.getByRole('button', 'Next section').tap();
    await expect(screen.getByRole('button', 'Section: Part 2 Concepts. Tap to open module section menu.')).toBeVisible();
  });
});
