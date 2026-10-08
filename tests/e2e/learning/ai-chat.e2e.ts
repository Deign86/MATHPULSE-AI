import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeInterruptions =
  "if an Initial Assessment or Daily Rewards dialog is open, close it with its X close button without starting, skipping or claiming anything (never press 'Skip for now'); otherwise do nothing";
const scopeRefusal = /outside my math scope|math-only support|built for math tutoring/;

describe('student AI chat', { tags: ['student', 'ai-chat'] }, () => {
  test('a math question gets a rendered answer that can be searched, reopened, and deleted', { session: 'student', timeout: 300_000 }, async ({ app, agent, screen, browser }) => {
    const marker = `E2E-${Date.now()}`;
    const question = `${marker} 12 * 3 = ? Use LaTeX`;
    const ownRow = screen.getByRole('button', `Open conversation: ${question}`);
    const ownHeader = screen.getByRole('heading', question, { level: 2 });
    const conversationRows = screen.getByRole('button', /^Open conversation:/);
    const copyButtons = screen.getByRole('button', 'Copy message');
    const explainPrompt = screen.getByRole('button', 'Explain step-by-step');
    const search = screen.getByPlaceholder('Search conversations...');
    const back = screen.getByRole('button', 'Back to conversations');
    const landing = screen.getByRole('heading', 'Meet L.O.L.I.', { level: 1 });

    await app.open('/chat');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    // The IAR dialog opens on a timer after load; the session-only flag its X button sets stops a late popup from covering the chat.
    await browser.evaluate(() => {
      sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
      return true;
    });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    await expect(screen.getByRole('heading', 'L.O.L.I.', { level: 2 })).toBeVisible({ timeout: 15_000 });
    // Loading the history replaces the session list, so a chat started before it lands is dropped.
    await expect(conversationRows.first()).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(/^\d+ Conversations?$/i)).toBeVisible();

    await screen.getByRole('button', 'New chat').tap();
    const composer = screen.getByPlaceholder('Ask me anything about math...');
    await expect(composer).toBeVisible();
    await expect(copyButtons).toHaveCount(1);

    await composer.fill(question);
    await screen.getByRole('button', 'Send message').tap();
    await expect(ownHeader).toBeVisible();
    await expect(ownRow).toBeVisible();
    await expect(composer).toHaveValue('');
    await agent.waitFor(
      `the open conversation shows the student message "${question}" followed by a reply from L.O.L.I. about multiplying 12 by 3 (it may guide instead of stating the result; a typing indicator alone does not count)`,
      { timeout: 120_000 },
    );
    await expect(explainPrompt).toBeEnabled({ timeout: 120_000 });
    await expect(copyButtons).toHaveCount(2);
    await expect(browser.locator('.chat-markdown .katex').first()).toBeVisible();

    await search.fill(marker);
    await expect(conversationRows).toHaveCount(1);
    await expect(ownRow).toBeVisible();
    await expect(screen.getByText(/^1 Conversation$/i)).toBeVisible();
    await search.fill(`${marker}-none`);
    await expect(conversationRows).toHaveCount(0);
    await expect(screen.getByText('No conversations yet')).toBeVisible();
    await expect(screen.getByText(/^0 Conversations$/i)).toBeVisible();
    await search.fill('');
    await expect(ownRow).toBeVisible();

    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(landing).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('button', 'Start New Chat')).toBeVisible();
    await expect(screen.getByText(/^Explore Topics$/i)).toBeVisible();
    await expect(screen.getByText(/^Recent Conversations$/i)).toBeVisible({ timeout: 30_000 });
    await search.fill(marker);
    await ownRow.tap();
    await expect(ownHeader).toBeVisible();
    await expect(copyButtons).toHaveCount(2);
    await agent.assert(`the open conversation shows the student message "${question}" and a L.O.L.I. reply to it`);

    await browser.setViewport({ width: 390, height: 844 });
    await expect(back).toBeVisible();
    await back.tap();
    await expect(search).toBeVisible();
    await expect(back).toHaveCount(0);
    await ownRow.tap();
    await expect(ownHeader).toBeVisible();
    await expect(search).toBeHidden();
    await expect(back).toBeVisible();
    await browser.setViewport({ width: 1280, height: 720 });
    await expect(back).toBeHidden();
    await expect(search).toBeVisible();

    await ownRow.hover();
    await screen.getByRole('button', `Delete conversation: ${question}`).tap();
    await expect(ownRow).not.toBeAttached();
    await expect(landing).toBeVisible();

    await browser.reload();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(conversationRows.first()).toBeVisible({ timeout: 30_000 });
    await search.fill(marker);
    await expect(conversationRows).toHaveCount(0);
  });

  test('floating AI tutor answers a question, minimizes and restores, and opens fullscreen in AI Chat', { session: 'student', tags: ['floating-tutor'], timeout: 300_000 }, async ({ app, agent, screen, browser }) => {
    const marker = `E2E-${Date.now()}`;
    const question = `${marker} 7 + 5 = ? Use LaTeX`;
    const launcher = screen.getByRole('button', 'Open AI tutor chat');
    const panel = screen.getByRole('dialog', 'AI tutor chat');
    const restore = screen.getByRole('button', 'Restore AI tutor launcher');
    const ownRow = screen.getByRole('button', `Open conversation: ${question}`);
    const conversationRows = screen.getByRole('button', /^Open conversation:/);

    await app.open('/chat');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    // The IAR dialog opens on a timer after load; the session-only flag its X button sets stops a late popup from covering the launcher.
    await browser.evaluate(() => {
      sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
      return true;
    });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    // Loading the history replaces the session list, so a tutor session started before it lands is dropped.
    await expect(conversationRows.first()).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(launcher).toBeVisible({ timeout: 30_000 });
    await launcher.tap();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', 'L.O.L.I. AI Tutor')).toBeVisible();
    await expect(panel.getByText('Senior High Math Assistant')).toBeVisible();
    await expect(screen.getByRole('button', 'Close AI tutor chat')).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(launcher).toBeFocused();

    await launcher.tap();
    await expect(panel).toBeVisible();
    const tutorInput = panel.getByRole('textbox', 'Ask AI tutor a question');
    await tutorInput.fill(question);
    await panel.getByRole('button', 'Send message').tap();
    await expect(panel.getByText(question)).toBeVisible();
    await expect(tutorInput).toHaveValue('');
    await agent.waitFor(
      `the AI tutor chat panel shows the student message "${question}" followed by a reply from L.O.L.I. about adding 7 and 5 (it may guide instead of stating the result; a typing indicator alone does not count)`,
      { timeout: 120_000 },
    );

    await panel.getByRole('button', 'Close chat').tap();
    await expect(panel).toBeHidden();
    await launcher.tap();
    await expect(panel.getByText(question)).toBeVisible();

    await panel.getByRole('button', 'Minimize AI tutor launcher').tap();
    await expect(panel).toBeHidden();
    await expect(restore).toBeVisible();
    await expect(launcher).toHaveCount(0);
    await restore.tap();
    await expect(launcher).toBeVisible();

    await launcher.tap();
    await panel.getByRole('button', 'Open fullscreen').tap();
    await expect(screen.getByPlaceholder('Ask me anything about math...')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('heading', question, { level: 2 })).toBeVisible();
    await expect(screen.getByLabel('Open AI tutor chat')).toHaveCount(0);
    await expect(screen.getByLabel('Close AI tutor chat')).toHaveCount(0);
    await expect(screen.getByRole('button', 'Explain step-by-step')).toBeEnabled({ timeout: 120_000 });
    await expect(screen.getByRole('button', 'Copy message')).toHaveCount(2);

    await ownRow.hover();
    await screen.getByRole('button', `Delete conversation: ${question}`).tap();
    await expect(ownRow).not.toBeAttached();

    await browser.goto('/chat');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(conversationRows.first()).toBeVisible({ timeout: 30_000 });
    await screen.getByPlaceholder('Search conversations...').fill(marker);
    await expect(conversationRows).toHaveCount(0);
  });

  test('floating AI tutor is desktop-only and leaves the AI Chat tab', { session: 'student', tags: ['floating-tutor'], timeout: 120_000 }, async ({ app, agent, screen, browser }) => {
    const launcherNode = screen.getByLabel('Open AI tutor chat');
    const launcher = screen.getByRole('button', 'Open AI tutor chat');

    await browser.setViewport({ width: 1000, height: 800 });
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    // The IAR dialog opens on a timer after load; the session-only flag its X button sets stops a late popup from covering the page.
    await browser.evaluate(() => {
      sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
      return true;
    });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await expect(launcherNode).toBeAttached({ timeout: 30_000 });
    await expect(launcherNode).toBeHidden();

    await browser.setViewport({ width: 1280, height: 720 });
    await expect(launcher).toBeVisible();

    await screen.getByRole('button', 'AI Chat').tap();
    await expect(screen.getByRole('button', 'New chat')).toBeVisible({ timeout: 15_000 });
    await expect(launcherNode).toHaveCount(0);
    await expect(browser).toHaveURL('/chat');

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(launcher).toBeVisible({ timeout: 15_000 });
    await expect(browser).toHaveURL('/');
  });

  test('phone chat keeps the composer clear of the bottom bar, titles new chats, and answers quick prompts', { session: 'student', tags: ['phone'], timeout: 420_000 }, async ({ app, agent, screen, browser }) => {
    const marker = `E2E-${Date.now()}`;
    const question = `${marker} 9 * 4 = ? Use LaTeX`;
    const ownRow = screen.getByRole('button', `Open conversation: ${question}`);
    const copyButtons = screen.getByRole('button', 'Copy message');
    const explainPrompt = screen.getByRole('button', 'Explain step-by-step');

    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/chat');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    // The IAR dialog opens on a timer after load; the session-only flag its X button sets stops a late popup from covering the chat.
    await browser.evaluate(() => {
      sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
      return true;
    });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    // Loading the history replaces the session list, so a chat started before it lands is dropped.
    await expect(screen.getByRole('button', /^Open conversation:/).first()).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'New chat').tap();
    const composer = screen.getByPlaceholder('Ask me anything about math...');
    await expect(composer).toBeVisible();
    await expect(screen.getByRole('button', 'Back to conversations')).toBeVisible();
    await expect.soft(screen.getByRole('heading', 'New Chat', { level: 2 })).toBeVisible();

    const sendBounds = await screen.getByRole('button', 'Send message').boundingBox();
    const navBounds = await screen.getByRole('navigation', 'Mobile and Tablet navigation').boundingBox();
    if (!sendBounds || !navBounds) throw new Error('the Send message button or the mobile navigation bar has no layout box');
    expect.soft(sendBounds.y + sendBounds.height, 'Send message sits above the mobile bottom navigation').toBeLessThanOrEqual(navBounds.y);

    await composer.fill(question);
    await composer.press('Enter');
    await expect(screen.getByRole('heading', question, { level: 2 })).toBeVisible();
    await agent.waitFor(
      `the open conversation shows the student message "${question}" followed by a reply from L.O.L.I. about multiplying 9 by 4 (it may guide instead of stating the result; a typing indicator alone does not count)`,
      { timeout: 120_000 },
    );
    await expect(explainPrompt).toBeEnabled({ timeout: 120_000 });
    await expect(copyButtons).toHaveCount(2);

    await explainPrompt.tap();
    await expect(copyButtons).toHaveCount(3, { timeout: 120_000 });
    await expect(explainPrompt).toBeEnabled({ timeout: 120_000 });
    await expect.soft(screen.getByText(scopeRefusal, { visible: true })).toHaveCount(0);

    await screen.getByRole('button', 'Back to conversations').tap();
    await screen.getByPlaceholder('Search conversations...').fill(marker);
    await ownRow.hover();
    await screen.getByRole('button', `Delete conversation: ${question}`).tap();
    await expect(ownRow).not.toBeAttached();
  });
});
