import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

declare global {
  interface Window {
    __streamLog?: Array<{ t: number; len: number }>;
    __streamObserver?: { disconnect(): void };
  }
}

test('student gets a math answer in AI Chat and opens the floating tutor', async ({ app, agent, browser, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open AI Chat from the student navigation');
  await expect(screen.getByRole('heading', 'Meet L.O.L.I.')).toBeVisible();

  await agent.act('start a new chat');
  await expect(screen.getByPlaceholder('Ask me anything about math...')).toBeVisible();
  await browser.evaluate(`() => {
    const samples = [{ t: Date.now(), len: document.body.innerText.length }];
    window.__streamLog = samples;
    const observer = new MutationObserver(() => {
      const textLength = document.body.innerText.length;
      const log = window.__streamLog ?? samples;
      if (log.length < 300 && textLength !== log[log.length - 1].len) {
        log.push({ t: Date.now(), len: textLength });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.__streamObserver = observer;
    return true;
  }`);

  await screen.getByPlaceholder('Ask me anything about math...').fill('What is 2 + 2?');
  await screen.getByRole('button', 'Send message').tap();
  await agent.waitFor('a tutor message responding to the 2 + 2 question is visible', { timeout: 300_000 });
  const streamLog = await browser.evaluate<Array<{ t: number; len: number }>>(
    `() => { window.__streamObserver?.disconnect(); return (window.__streamLog ?? []).slice(-100); }`,
  );
  const distinctLengths = Array.from(new Set(streamLog.map((sample) => sample.len)));
  if (distinctLengths.length < 3) throw new Error(`no incremental chat streaming observed (${distinctLengths.length} distinct states)`);
  if (distinctLengths[distinctLengths.length - 1] <= distinctLengths[0]) throw new Error('chat content never grew during streaming');
  await expect(screen.getByRole('button', 'Open conversation: What is 2 + 2?').first()).toBeVisible();
  await expect(screen.getByRole('button', 'Copy message').first()).toBeVisible({ timeout: 120_000 });
  await agent.assert('the tutor shows a visible message responding to the 2 + 2 question');
  await expect(screen.getByRole('button', 'Copy message').first()).toBeVisible();

  await agent.act('open Dashboard from the student navigation');
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await screen.getByRole('button', 'Open AI tutor chat').tap();
  await expect(screen.getByRole('dialog', 'AI tutor chat')).toBeVisible();
});
