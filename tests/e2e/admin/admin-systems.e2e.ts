import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('navigation/read-only: admin views RAG and AI system status', async ({ app, agent, screen }) => {
  const admin = credentials.user('admin');
  await app.open('/');
  await expect(screen.getByRole('button', 'Sign In')).toBeVisible();

  await agent.act('sign in to MathPulse using the supplied admin email and password', {
    params: { username: admin.username, password: admin.password },
  });
  await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();

  await agent.act('open RAG Manager from the admin navigation');
  await expect(screen.getByRole('heading', 'RAG Manager')).toBeVisible();
  await expect(screen.getByText('RAG Pipeline Status', { exact: true })).toBeVisible();
  await agent.act('read the displayed RAG Pipeline Status value without triggering re-indexing');

  await agent.act('open AI Monitoring from the admin navigation');
  await expect(screen.getByRole('heading', 'AI Monitoring')).toBeVisible();
  await expect(screen.getByText('Platform AI usage and system health.')).toBeVisible();
  await expect(screen.getByText('Live Sync Active', { exact: true })).toBeVisible();
});
