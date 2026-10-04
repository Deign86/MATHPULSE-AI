import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('service worker serves the cached shell with the network blocked', async ({ app, agent, browser, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await app.open('/');
  await app.open('/');
  const swScript = await browser.evaluate<string | null>(
    `() => navigator.serviceWorker.controller?.scriptURL ?? null`,
  );
  if (!swScript || !swScript.endsWith('/sw.js')) throw new Error(`app service worker not controlling (got ${swScript})`);

  await browser.route(/.*/, (route) => route.abort());
  try {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Loading...')).toBeVisible({ timeout: 120_000 });
    const offlineCached = await browser.evaluate<boolean>(
      `() => caches.keys().then((names) => (async () => { for (const n of names) { const cache = await caches.open(n); if (await cache.match('/offline.html')) return true; } return false; })())`,
    );
    if (!offlineCached) throw new Error('offline fallback page not precached');
  } finally {
    await browser.unroute(/.*/);
  }

  await app.open('/');
  await expect(screen.getByText('Preparing your MathPulse AI experience...')).not.toBeVisible({ timeout: 120_000 });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
});

test('notification read syncs to the server after reconnecting', async ({ app, agent, browser, screen }) => {
  const student = credentials.user('student');
  await app.open('/');
  await agent.act('sign in to MathPulse using the supplied student email and password', {
    params: { username: student.username, password: student.password },
  });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

  await agent.act('open the notifications panel from the notification bell and inspect its visible items');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();

  let offlineOpen = true;
  let resolveFlush: () => void = () => undefined;
  const flushSeen = new Promise<void>((resolve) => {
    resolveFlush = resolve;
  });
  await browser.route(/firestore\.googleapis\.com/, (route) => {
    if (offlineOpen) return route.abort();
    const candidate = route.request;
    const payload = candidate.postData ?? '';
    if (candidate.method === 'POST' && payload.includes('e2e-offline-probe-B')) resolveFlush();
    return route.continue();
  });
  const dispatchResult = await browser.evaluate<string>(
    `() => {
      const items = [...document.querySelectorAll('div[role="button"]')].filter(
        (el) => el.querySelector('h4') && el.querySelector('span.bg-purple-600'),
      );
      const probe = items.find((el) => (el.textContent ?? '').includes('E2E Offline Probe B'));
      if (!probe) return 'none';
      probe.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return 'dispatched';
    }`,
  );
  if (dispatchResult !== 'dispatched') throw new Error('probe B not available unread');
  const probeBReadLocal = await browser.evaluate<boolean>(
    `async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const items = [...document.querySelectorAll('div[role="button"]')];
        const probe = items.find((el) => (el.textContent ?? '').includes('E2E Offline Probe B'));
        if (probe && !probe.querySelector('span.bg-purple-600')) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return false;
    }`,
  );
  if (!probeBReadLocal) throw new Error('probe B still shows unread while offline');
  offlineOpen = false;
  const flushed = await Promise.race([
    flushSeen.then(() => true),
    new Promise<boolean>((finish) => {
      setTimeout(() => finish(false), 120000);
    }),
  ]);
  if (!flushed) throw new Error('offline write never flushed to the server after reconnect');
  await browser.unroute(/firestore\.googleapis\.com/);
  await app.open('/');
  await expect(screen.getByText('Preparing your MathPulse AI experience...')).not.toBeVisible({ timeout: 120_000 });
  await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  await agent.act('open the Notifications panel from the notification bell');
  await expect(screen.getByRole('heading', 'Notifications')).toBeVisible();
  const probeBReadServer = await browser.evaluate<boolean>(
    `async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const items = [...document.querySelectorAll('div[role="button"]')];
        const probe = items.find((el) => (el.textContent ?? '').includes('E2E Offline Probe B'));
        if (probe && !probe.querySelector('span.bg-purple-600')) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return false;
    }`,
  );
  if (!probeBReadServer) throw new Error('probe B read state did not persist after reconnect');
});
