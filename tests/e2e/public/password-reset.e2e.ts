import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const RESET_SUCCESS =
  'If an account exists for this email, a password reset link has been sent. Please check your inbox.';

describe('public password reset', { tags: ['public', 'password-reset'] }, () => {
  test('Forgot password? opens Reset password with the typed email prefilled', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-reset@example.test');
    await screen.getByRole('button', 'Forgot password?').tap();

    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();
    await expect(screen.getByText('We will email you a link to set a new password.')).toBeVisible();
    await expect(screen.getByText('Enter your account email and we will send you a reset link.')).toBeVisible();
    await expect(screen.getByLabel('Email Address')).toHaveValue('nobody+e2e-reset@example.test');
    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(screen.getByRole('button', 'Send reset link')).toBeEnabled();
    await expect(screen.getByRole('button', 'Back to sign in')).toBeVisible();
    await expect(screen.getByRole('button', "Don't have an account? Create one")).toBeVisible();

    await expect(screen.getByLabel('Password')).toBeHidden();
    await expect(screen.getByRole('button', 'Sign In')).toBeHidden();
    await expect(screen.getByRole('button', 'Continue with Google')).toBeHidden();
  });

  test('Send reset link to an example.test address shows the neutral success text', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();

    await screen.getByLabel('Email Address').fill('nobody+e2e-reset@example.test');
    await screen.getByRole('button', 'Send reset link').tap();
    await expect(screen.getByText(RESET_SUCCESS)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('alert')).toBeHidden();
    await expect(screen.getByRole('button', 'Send reset link')).toBeEnabled();

    await screen.getByRole('button', 'Back to sign in').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible();
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();
    await expect(screen.getByText(RESET_SUCCESS)).toBeHidden();
  });

  test('browser validation stops an empty or malformed reset email', async ({ app, screen, browser }) => {
    let resetRequests = 0;
    await browser.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:sendOobCode/, async (route) => {
      resetRequests += 1;
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();

    await screen.getByRole('button', 'Send reset link').tap();
    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(browser.locator('#login-reset-email:invalid')).toBeVisible();

    await screen.getByLabel('Email Address').fill('not-an-email');
    await screen.getByRole('button', 'Send reset link').tap();
    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(browser.locator('#login-reset-email:invalid')).toBeVisible();

    await expect(screen.getByText(RESET_SUCCESS)).toBeHidden();
    await expect(screen.getByRole('alert')).not.toBeVisible();
    expect(resetRequests).toBe(0);
  });

  test('a network failure while sending the reset link shows the network error alert', async ({ app, screen, browser }) => {
    await browser.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:sendOobCode/, async (route) => {
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();

    await screen.getByLabel('Email Address').fill('nobody+e2e-reset@example.test');
    await screen.getByRole('button', 'Send reset link').tap();
    await expect(screen.getByRole('alert')).toHaveText(
      'Network error. Please check your internet connection and try again.',
      { timeout: 30_000 },
    );
    await expect(screen.getByText(RESET_SUCCESS)).toBeHidden();
    await expect(screen.getByRole('button', 'Send reset link')).toBeEnabled();
  });

  test('Back to sign in returns to Welcome Back and keeps the typed email', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();
    await screen.getByLabel('Email Address').fill('nobody+e2e-reset@example.test');

    await screen.getByRole('button', 'Back to sign in').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible();
    await expect(screen.getByLabel('Email Address')).toHaveValue('nobody+e2e-reset@example.test');
    await expect(screen.getByRole('button', 'Sign In')).toBeVisible();
    await expect(screen.getByRole('button', 'Send reset link')).toBeHidden();
  });

  test('Create one from the reset view opens Create Account', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Forgot password?').tap();
    await expect(screen.getByRole('heading', 'Reset password')).toBeVisible();

    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByRole('button', 'Send reset link')).toBeHidden();
  });
});
