import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('student gets a math answer in AI Chat and opens the floating tutor', async ({ app, agent, screen }) => {
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

  await screen.getByPlaceholder('Ask me anything about math...').fill('What is 2 + 2?');
  await screen.getByRole('button', 'Send message').tap();
  await expect(screen.getByRole('button', 'Open conversation: What is 2 + 2?').first()).toBeVisible();
  await expect(screen.getByRole('button', 'Copy message')).toBeVisible();

  await agent.act('open Dashboard from the student navigation');
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await screen.getByRole('button', 'Open AI tutor chat').tap();
  await expect(screen.getByRole('dialog', 'AI tutor chat')).toBeVisible();
});
