import { describe, test } from '@e2e-dev/web';
import { expect, type Screen } from 'e2e';

// Regression for scoped RAG + formatted AI output:
//  - every model-generated string shown to a student is rendered (bold, lists, typeset math) and never
//    leaks raw markup such as `**bold**`, `\(x\)`, `<think>` blocks, literal `\n` or ```fences```;
//  - tutor chat turns only carry a small curriculum reference and skip retrieval for small talk, so a
//    "thanks" reply is short and quick while a content question is answered with curriculum grounding.

const rawModelMarkup = /\*\*|\\\(|\\\[|<think|\\n|```|&lt;think/;

async function closeStartupDialogs(screen: Screen) {
  const rewards = screen.getByRole('heading', 'Daily Rewards');
  const assessment = screen.getByRole('dialog', 'Initial Assessment');
  await rewards.waitFor({ timeout: 6_000 }).catch(() => undefined);
  for (let pass = 0; pass < 2; pass += 1) {
    if (await rewards.isVisible()) {
      await screen.getByRole('button', 'Close daily rewards').tap();
      await expect(rewards).toBeHidden({ timeout: 10_000 });
    }
    await assessment.waitFor({ timeout: 3_000 }).catch(() => undefined);
    if (await assessment.isVisible()) {
      await assessment.getByRole('button', 'Close').tap();
      await expect(assessment).toBeHidden({ timeout: 10_000 });
    }
  }
}

const lessonLoaded =
  'The lesson screen has finished loading: either a lesson notebook with section text is shown, or an error or "AI lesson unavailable" message is shown. The "Loading lesson from DepEd curriculum..." screen is gone.';

describe('AI text formatting regression', { tags: ['student', 'ai-formatting'] }, () => {
  test('lesson sections and Try It Yourself hints/explanations render formatted text, not raw markup', { session: 'student', timeout: 420_000, tags: ['ai'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await closeStartupDialogs(screen);
    const content = screen.getByRole('main');
    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();
    await content.getByRole('button', /^Lesson 1\s*Identify and describe/).tap();
    await agent.waitFor(lessonLoaded, { timeout: 180_000 });
    await expect(screen.getByText('AI lesson unavailable')).toBeHidden();

    for (const part of ['Intro', 'Concepts', 'Examples', 'Summary']) {
      await screen.getByRole('button', `Go to ${part} section`).tap();
      await expect(content).not.toContainText(rawModelMarkup);
    }
    await screen.getByRole('button', 'Go to Concepts section').tap();
    await expect(browser.locator('main .katex').first()).toBeVisible({ timeout: 15_000 });
    await agent.assert(
      'The Key Concepts part shows formulas typeset as math (not as dollar signs, backslash-paren or backslash-bracket text) and any emphasised terms appear bold rather than wrapped in literal asterisks.',
    );

    await screen.getByRole('button', 'Go to Practice section').tap();
    await screen.getByRole('button', /^Start Practice Quiz/).tap();
    await agent.waitFor(
      'The "Try It Yourself!" practice quiz has opened and shows a question, or an error about practice questions is shown. The "Generating Quiz..." screen is gone.',
      { timeout: 120_000 },
    );
    await expect(screen.getByText('Try It Yourself!')).toBeVisible();
    const quiz = screen.getByRole('dialog').first();

    const hint = screen.getByRole('button', 'Use hint');
    if (await hint.isEnabled()) {
      await hint.tap();
      await expect(screen.getByText(/^Hints \(\d+\/\d+\)$/)).toBeVisible();
      await expect(quiz).not.toContainText(rawModelMarkup);
    }

    await agent.act('Answer the current practice question by choosing any one answer option (or typing any short answer and submitting it).');
    const explain = screen.getByRole('button', 'Explain question');
    await explain.waitFor({ timeout: 20_000 }).catch(() => undefined);
    if (await explain.isVisible() && await explain.isEnabled()) {
      await explain.tap();
      await expect(screen.getByText('Explanation')).toBeVisible();
      await expect(quiz).not.toContainText(rawModelMarkup);
      await agent.assert('The Explanation panel shows readable prose and typeset math, with no literal asterisks, backslash-paren delimiters or "<think>" text.');
    }

    await screen.getByRole('button', 'Open quiz menu').tap();
    await screen.getByRole('button', /^Leave Quiz\s*Exit$/).tap();
    await screen.getByRole('button', 'Leave Quiz').tap();
    await expect(screen.getByText('Try It Yourself!')).toBeHidden();
  });

  test('tutor chat grounds a curriculum question and answers small talk without a retrieval pause', { session: 'student', timeout: 300_000, tags: ['ai', 'ai-chat'] }, async ({ app, agent, screen, browser }) => {
    const marker = `E2E-${Date.now()}`;
    const question = `${marker} In General Mathematics, what is the difference between simple interest and compound interest? Give the formulas.`;
    const ownRow = screen.getByRole('button', `Open conversation: ${question}`);
    const replies = browser.locator('.chat-markdown');

    await app.open('/chat');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await browser.evaluate(() => {
      sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
      return true;
    });
    await closeStartupDialogs(screen);
    await expect(screen.getByRole('button', /^Open conversation:/).first()).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'New chat').tap();
    const composer = screen.getByPlaceholder('Ask me anything about math...');
    await composer.fill(question);
    await screen.getByRole('button', 'Send message').tap();
    await expect(ownRow).toBeVisible();
    await agent.waitFor(
      'the open conversation shows a finished L.O.L.I. reply (not just a typing indicator) that explains simple versus compound interest',
      { timeout: 150_000 },
    );
    await expect(replies.last()).toContainText(/interest/i);
    await expect(browser.locator('.chat-markdown .katex').first()).toBeVisible();
    await expect(replies.last()).not.toContainText(rawModelMarkup);
    await agent.assert(
      'The reply stays on the DepEd General Mathematics topic (simple and compound interest formulas such as I = Prt or A = P(1 + r)^t) and does not paste long verbatim excerpts, citations or page references from source documents.',
    );

    // Small talk: no curriculum lookup, so the reply is short and arrives quickly.
    const repliesBefore = await replies.count();
    const started = Date.now();
    await composer.fill('thanks!');
    await screen.getByRole('button', 'Send message').tap();
    await expect(replies).toHaveCount(repliesBefore + 1, { timeout: 60_000 });
    await agent.waitFor('the newest L.O.L.I. reply has finished (no typing indicator)', { timeout: 60_000 });
    expect(Date.now() - started).toBeLessThan(60_000);
    await expect(replies.last()).not.toContainText(/RELEVANT CURRICULUM|Excerpt:|p\.\d+\]/);
    await expect(replies.last()).not.toContainText(rawModelMarkup);

    await ownRow.hover();
    await screen.getByRole('button', `Delete conversation: ${question}`).tap();
    await expect(ownRow).not.toBeAttached();
  });
});
