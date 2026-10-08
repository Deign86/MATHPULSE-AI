import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('public sign in', { tags: ['public', 'login'] }, () => {
  test('the signed-out root shows the Welcome Back card with labeled fields', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('Sign in to continue learning')).toBeVisible();
    await expect(screen.getByText('MathPulse')).toBeVisible();
    await expect(screen.getByRole('image', 'MathPulse AI')).toBeVisible();

    await expect(screen.getByLabel('Email Address')).toBeVisible();
    await expect(screen.getByPlaceholder('your.email@school.edu')).toBeVisible();
    await expect(screen.getByLabel('Password')).toBeVisible();
    await expect(screen.getByRole('button', 'Show password')).toBeVisible();
    await expect(screen.getByRole('button', 'Forgot password?')).toBeVisible();
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
    await expect(screen.getByRole('button', "Don't have an account? Create one")).toBeVisible();
    await expect(screen.getByText('Sign-in protected by TLS; data encrypted in transit and at rest')).toBeVisible();
  });

  test('Continue with Google is offered but not triggered', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('button', 'Continue with Google')).toBeVisible();
    await expect(screen.getByRole('button', 'Continue with Google')).toBeEnabled();
    await expect(screen.getByRole('button', 'Sign up with Google')).toBeHidden();
  });

  test('Quick Demo Access is absent without the demo env vars', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('Quick Demo Access')).toBeHidden();
    await expect(screen.getByText('1-CLICK')).toBeHidden();
    await expect(screen.getByRole('button', /^(Student|Teacher|Admin) Account/)).toHaveCount(0);
  });

  test('Show password reveals the password and Hide password masks it again', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Password').fill('Visible-Check-1');
    await expect(screen.getByRole('textbox', 'Password')).toBeHidden();

    await screen.getByRole('button', 'Show password').tap();
    await expect(screen.getByRole('button', 'Hide password')).toBeVisible();
    await expect(screen.getByRole('textbox', 'Password')).toBeVisible();

    await screen.getByRole('button', 'Hide password').tap();
    await expect(screen.getByRole('button', 'Show password')).toBeVisible();
    await expect(screen.getByRole('textbox', 'Password')).toBeHidden();
  });

  test('a revealed password masks itself again after ten seconds', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Password').fill('Visible-Check-1');
    await screen.getByRole('button', 'Show password').tap();
    await expect(screen.getByRole('textbox', 'Password')).toBeVisible();

    await expect(screen.getByRole('button', 'Show password')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByRole('textbox', 'Password')).toBeHidden();
  });

  test('an unknown example.test account gets the invalid credentials alert', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-login@example.test');
    await screen.getByLabel('Password').fill('Not-A-Real-Password-1!');
    await screen.getByRole('button', 'Sign In').tap();

    await expect(screen.getByRole('alert')).toHaveText(
      'Invalid email or password. Please check your credentials and try again.',
      { timeout: 30_000 },
    );
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible();
  });

  test('a network failure during sign in shows the network error alert', async ({ app, screen, browser }) => {
    await browser.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword/, async (route) => {
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-login@example.test');
    await screen.getByLabel('Password').fill('Not-A-Real-Password-1!');
    await screen.getByRole('button', 'Sign In').tap();

    await expect(screen.getByRole('alert')).toHaveText(
      'Network error. Please check your internet connection and try again.',
      { timeout: 30_000 },
    );
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
  });

  test('empty fields are stopped by browser required validation', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Sign In').tap();

    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
    await expect(screen.getByRole('alert')).not.toBeVisible();

    await screen.getByLabel('Email Address').fill('nobody+e2e-login@example.test');
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByLabel('Password')).toBeFocused();
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
    await expect(screen.getByRole('alert')).not.toBeVisible();
  });

  test('a malformed email is stopped by browser format validation', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByLabel('Email Address').fill('not-an-email');
    await screen.getByLabel('Password').fill('Not-A-Real-Password-1!');
    await screen.getByRole('button', 'Sign In').tap();

    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(browser.locator('#login-email:invalid')).toBeVisible();
    await expect(screen.getByRole('button', 'Sign In')).toBeEnabled();
    await expect(screen.getByRole('alert')).not.toBeVisible();
  });

  test('the sign-in card fits a phone viewport', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await browser.setViewport({ width: 390, height: 844 });
    await expect(screen.getByLabel('Email Address')).toBeVisible();
    await expect(screen.getByLabel('Password')).toBeVisible();
    await expect(screen.getByRole('button', 'Sign In')).toBeVisible();
    await expect(screen.getByRole('button', 'Continue with Google')).toBeVisible();

    expect(await browser.evaluate(() => window.innerWidth)).toBe(390);
    const signIn = await screen.getByRole('button', 'Sign In').boundingBox();
    expect(signIn?.x).toBeGreaterThanOrEqual(0);
    expect((signIn?.x ?? 0) + (signIn?.width ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(390);
  });

  for (const path of ['/modules', '/settings', '/battle']) {
    test(`signed-out deep link ${path} renders the sign-in card and keeps the URL`, async ({ app, screen, browser }) => {
      await app.open(path);
      await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
      await expect(screen.getByRole('button', 'Sign In')).toBeVisible();
      await expect(browser).toHaveURL(path);
    });
  }
});
