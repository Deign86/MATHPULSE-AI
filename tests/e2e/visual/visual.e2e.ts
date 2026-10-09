import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Baselines live in visual.e2e.ts-snapshots/, one per target and OS. Refresh after an intended UI change:
//   e2e run --tag visual --update-snapshots
// Signed-in screens are not compared: sessions come from a password fill, and the runner withholds pixels
// from any session a secret was filled into (POLICY_DENIED).

const viewports = [
  { label: 'desktop', size: { width: 1440, height: 900 } },
  { label: 'phone', size: { width: 390, height: 844 } },
] as const;

// The login decor animates through framer-motion, which the runner's CSS animation freeze does not stop;
// the page already honours prefers-reduced-motion, so report it before the app loads.
const reducedMotion = `{
  const matchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) =>
    query.includes('prefers-reduced-motion') ? Object.assign(matchMedia('all'), { media: query }) : matchMedia(query);
}`;

// The desktop robot video is paused on a frame picked from the cursor position; wait until that frame is decoded.
const videoFrameReady = () => (document.querySelector('video')?.readyState ?? HTMLMediaElement.HAVE_ENOUGH_DATA) >= HTMLMediaElement.HAVE_CURRENT_DATA;

describe('visual regression', { tags: ['visual', 'public'] }, () => {
  for (const viewport of viewports) {
    describe(`public auth screens (${viewport.label})`, () => {
      test(`Welcome Back sign in card (${viewport.label})`, async ({ app, browser, screen }) => {
        await browser.setViewport(viewport.size);
        await browser.addInitScript(reducedMotion);
        await app.open('/');
        await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
        await expect.poll(() => browser.evaluate(videoFrameReady), { timeout: 30_000 }).toBe(true);
        await expect(screen).toHaveScreenshot(`sign-in-${viewport.label}.png`, { maxDiffPixelRatio: 0.002 });
      });

      test(`Create Account form (${viewport.label})`, async ({ app, browser, screen }) => {
        await browser.setViewport(viewport.size);
        await browser.addInitScript(reducedMotion);
        await app.open('/');
        await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
        await screen.getByRole('button', "Don't have an account? Create one").tap();
        await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
        await expect.poll(() => browser.evaluate(videoFrameReady), { timeout: 30_000 }).toBe(true);
        await expect(screen).toHaveScreenshot(`create-account-${viewport.label}.png`, { maxDiffPixelRatio: 0.002 });
      });

      test(`Reset password form (${viewport.label})`, async ({ app, browser, screen }) => {
        await browser.setViewport(viewport.size);
        await browser.addInitScript(reducedMotion);
        await app.open('/');
        await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
        await screen.getByRole('button', 'Forgot password?').tap();
        await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();
        await expect.poll(() => browser.evaluate(videoFrameReady), { timeout: 30_000 }).toBe(true);
        await expect(screen).toHaveScreenshot(`reset-password-${viewport.label}.png`, { maxDiffPixelRatio: 0.002 });
      });
    });
  }
});
