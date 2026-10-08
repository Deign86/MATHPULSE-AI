import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const offlineNotice = "You're offline — some features may be unavailable.";
const reconnectNotice = "You're back online.";
const noNetworkControl =
  'the web engine documents no offline or network-emulation API (node_modules/e2e/docs/browser.mdx), so a test cannot take the browser offline';

describe('offline and online banner', { tags: ['student', 'offline'] }, () => {
  test('student shell shows no connectivity banner while the browser is online', { session: 'student' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('button', 'Notifications')).toBeVisible();
    await expect(screen.getByText(offlineNotice)).toBeHidden();
    await expect(screen.getByText(reconnectNotice)).toBeHidden();
  });

  test('student shell shows the amber offline banner when the network drops', { skip: noNetworkControl }, async () => {});

  test("student shell shows You're back online for 4 seconds after reconnecting", { skip: noNetworkControl }, async () => {});

  test('an offline navigation serves the offline fallback page with Try again', {
    skip: `${noNetworkControl}; the /offline.html fallback also needs the /sw.js service worker, which src/main.tsx registers only in production builds`,
  }, async () => {});
});
