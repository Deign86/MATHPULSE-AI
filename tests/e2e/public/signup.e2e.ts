import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Every submit below must stop client-side; aborting accounts:signUp guarantees no production account even on a regression.
const SIGN_UP_ENDPOINT = /identitytoolkit\.googleapis\.com\/v1\/accounts:signUp/;
// A regression that lets a submit through hits the aborted route and surfaces this alert.
const NETWORK_ERROR = 'Network error. Please check your internet connection and try again.';

describe('public sign up', { tags: ['public', 'signup'] }, () => {
  test('Create one switches to the Create Account form with student fields', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();

    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Begin your personalized mathematics journey')).toBeVisible();
    await expect(screen.getByLabel('Full Name')).toBeVisible();
    await expect(screen.getByPlaceholder('Juan Dela Cruz')).toBeVisible();
    const accountType = screen.getByRole('radiogroup', 'Account Type');
    await expect(accountType.getByRole('radio', 'Student')).toBeChecked();
    await expect(accountType.getByRole('radio', 'Teacher')).toBeChecked({ checked: false });
    await expect(screen.getByRole('radio', 'Admin')).toHaveCount(0);
    await expect(screen.getByLabel('Grade Level')).toHaveValue('Grade 11');
    await expect(screen.getByLabel('Section')).toHaveValue('');
    await expect(screen.getByLabel('Track')).toHaveValue('');
    await expect(screen.getByLabel('Email Address')).toBeVisible();
    await expect(screen.getByLabel('Password')).toBeVisible();
    await expect(screen.getByLabel('Confirm')).toBeVisible();
    await expect(screen.getByRole('button', 'Create Account')).toBeEnabled();
    await expect(screen.getByRole('button', 'Sign up with Google')).toBeEnabled();
    await expect(screen.getByRole('button', 'Already have an account? Sign in')).toBeVisible();

    await expect(screen.getByRole('button', 'Forgot password?')).toBeHidden();
    await expect(screen.getByRole('button', 'Continue with Google')).toBeHidden();
  });

  test('section and track selects load selectable options', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByLabel('Section')).toBeVisible();

    await expect(screen.getByText('Loading sections...')).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Loading tracks...')).toBeHidden({ timeout: 30_000 });
    await expect(
      screen.getByText('Registration options could not be loaded. Default options are available.'),
    ).toBeHidden();

    await screen.getByLabel('Section').selectOption({ index: 1 });
    await expect(screen.getByLabel('Section')).toHaveValue(/\S/);
    await screen.getByLabel('Track').selectOption({ index: 1 });
    await expect(screen.getByLabel('Track')).toHaveValue(/\S/);
  });

  test('the Teacher chip hides grade, section, and track and Student restores them', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();

    await screen.getByRole('radio', 'Teacher').tap();
    await expect(screen.getByRole('radio', 'Teacher')).toBeChecked();
    await expect(screen.getByRole('radio', 'Student')).toBeChecked({ checked: false });
    await expect(screen.getByLabel('Grade Level')).toBeHidden();
    await expect(screen.getByLabel('Section')).toBeHidden();
    await expect(screen.getByLabel('Track')).toBeHidden();
    await expect(screen.getByLabel('Full Name')).toBeVisible();
    await expect(screen.getByLabel('Email Address')).toBeVisible();
    await expect(screen.getByLabel('Confirm')).toBeVisible();
    await expect(screen.getByRole('button', 'Sign up with Google')).toBeVisible();

    await screen.getByRole('radio', 'Student').tap();
    await expect(screen.getByRole('radio', 'Student')).toBeChecked();
    await expect(screen.getByLabel('Grade Level')).toHaveValue('Grade 11');
    await expect(screen.getByLabel('Section')).toBeVisible();
    await expect(screen.getByLabel('Track')).toBeVisible();
  });

  test('the Password requirements checklist tracks each rule as the password changes', async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Password requirements')).toBeHidden();

    const rule = (label: string) => screen.getByRole('listitem').filter({ hasText: label });

    await screen.getByLabel('Password').fill('abc');
    await expect(screen.getByText('Password requirements')).toBeVisible();
    await expect(screen.getByRole('listitem')).toHaveText([
      'At least 8 characters',
      'Contains uppercase and lowercase letters',
      'Contains at least one number',
      'Contains at least one special character',
    ]);
    await expect(browser).toHaveClass(rule('At least 8 characters'), /text-slate-500/);
    await expect(browser).toHaveClass(rule('Contains uppercase and lowercase letters'), /text-slate-500/);
    await expect(browser).toHaveClass(rule('Contains at least one number'), /text-slate-500/);
    await expect(browser).toHaveClass(rule('Contains at least one special character'), /text-slate-500/);

    await screen.getByLabel('Password').fill('Abcdefg1');
    await expect(browser).toHaveClass(rule('At least 8 characters'), /text-emerald-700/);
    await expect(browser).toHaveClass(rule('Contains uppercase and lowercase letters'), /text-emerald-700/);
    await expect(browser).toHaveClass(rule('Contains at least one number'), /text-emerald-700/);
    await expect(browser).toHaveClass(rule('Contains at least one special character'), /text-slate-500/);

    await screen.getByLabel('Password').fill('Abcdefg1!');
    await expect(screen.getByText('Password requirements')).toBeHidden();
    await expect(screen.getByRole('listitem')).toHaveCount(0);
  });

  test('a mismatched Confirm shows Passwords do not match until it matches', async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();

    await screen.getByLabel('Password').fill('E2e-Strong-1!');
    await screen.getByLabel('Confirm').fill('E2e-Strong-2!');
    await expect(screen.getByText('Passwords do not match.')).toBeVisible();
    await expect(screen.getByRole('alert').filter({ hasText: 'Passwords do not match.' })).toBeVisible();

    await screen.getByLabel('Confirm').fill('E2e-Strong-1!');
    await expect(screen.getByText('Passwords do not match.')).toBeHidden();

    await screen.getByRole('button', 'Show password').tap();
    await expect.poll(() => browser.evaluate(() => document.querySelector<HTMLInputElement>('#login-password')?.type)).toBe('text');
    await expect.poll(() => browser.evaluate(() => document.querySelector<HTMLInputElement>('#login-confirm-password')?.type)).toBe('text');
    await screen.getByRole('button', 'Hide password').tap();
    await expect.poll(() => browser.evaluate(() => document.querySelector<HTMLInputElement>('#login-confirm-password')?.type)).toBe('password');
  });

  test('Already have an account? Sign in returns to Welcome Back', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();

    await screen.getByRole('button', 'Already have an account? Sign in').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible();
    await expect(screen.getByLabel('Full Name')).toBeHidden();
    await expect(screen.getByRole('button', 'Sign In')).toBeVisible();
  });

  test('browser validation stops an empty or malformed Create Account submit', async ({ app, screen, browser }) => {
    let signUpRequests = 0;
    await browser.route(SIGN_UP_ENDPOINT, async (route) => {
      signUpRequests += 1;
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Loading sections...')).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Loading tracks...')).toBeHidden({ timeout: 30_000 });

    await screen.getByRole('button', 'Create Account').tap();
    await expect(screen.getByLabel('Full Name')).toBeFocused();
    await expect(screen.getByText('Please enter your name')).toBeHidden();

    await screen.getByLabel('Full Name').fill('E2E-Signup-Probe');
    await screen.getByLabel('Section').selectOption({ index: 1 });
    await screen.getByLabel('Track').selectOption({ index: 1 });
    await screen.getByLabel('Email Address').fill('not-an-email');
    await screen.getByLabel('Password').fill('E2e-Strong-1!');
    await screen.getByLabel('Confirm').fill('E2e-Strong-1!');
    await screen.getByRole('button', 'Create Account').tap();

    await expect(screen.getByLabel('Email Address')).toBeFocused();
    await expect(browser.locator('#login-email:invalid')).toBeVisible();
    await expect(screen.getByRole('button', 'Create Account')).toBeEnabled();
    await expect(screen.getByText(NETWORK_ERROR)).not.toBeVisible();
    expect(signUpRequests).toBe(0);
  });

  test('a whitespace-only Full Name is rejected before any account request', async ({ app, screen, browser }) => {
    let signUpRequests = 0;
    await browser.route(SIGN_UP_ENDPOINT, async (route) => {
      signUpRequests += 1;
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Loading sections...')).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Loading tracks...')).toBeHidden({ timeout: 30_000 });

    await screen.getByLabel('Full Name').fill('   ');
    await screen.getByLabel('Section').selectOption({ index: 1 });
    await screen.getByLabel('Track').selectOption({ index: 1 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-signup@example.test');
    await screen.getByLabel('Password').fill('E2e-Strong-1!');
    await screen.getByLabel('Confirm').fill('E2e-Strong-1!');
    await screen.getByRole('button', 'Create Account').tap();

    await expect(screen.getByRole('alert').filter({ hasText: 'Please enter your name' })).toBeVisible();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByRole('button', 'Create Account')).toBeEnabled();
    await expect(screen.getByText(NETWORK_ERROR)).not.toBeVisible();
    expect(signUpRequests).toBe(0);
  });

  test('a weak password submit keeps the checklist and sends no account request', async ({ app, screen, browser }) => {
    let signUpRequests = 0;
    await browser.route(SIGN_UP_ENDPOINT, async (route) => {
      signUpRequests += 1;
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Loading sections...')).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Loading tracks...')).toBeHidden({ timeout: 30_000 });

    await screen.getByLabel('Full Name').fill('E2E-Signup-Probe');
    await screen.getByLabel('Section').selectOption({ index: 1 });
    await screen.getByLabel('Track').selectOption({ index: 1 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-signup@example.test');
    await screen.getByLabel('Password').fill('Abcdefg1');
    await screen.getByLabel('Confirm').fill('Abcdefg1');
    await screen.getByRole('button', 'Create Account').tap();

    await expect(screen.getByText('Password requirements')).toBeVisible();
    await expect(browser).toHaveClass(
      screen.getByRole('listitem').filter({ hasText: 'Contains at least one special character' }),
      /text-slate-500/,
    );
    await expect(screen.getByRole('button', 'Create Account')).toBeEnabled();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText(NETWORK_ERROR)).not.toBeVisible();
    expect(signUpRequests).toBe(0);
  });

  test('mismatched passwords on submit are rejected before any account request', async ({ app, screen, browser }) => {
    let signUpRequests = 0;
    await browser.route(SIGN_UP_ENDPOINT, async (route) => {
      signUpRequests += 1;
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', "Don't have an account? Create one").tap();
    await expect(screen.getByRole('heading', 'Create Account')).toBeVisible();
    await expect(screen.getByText('Loading sections...')).toBeHidden({ timeout: 30_000 });
    await expect(screen.getByText('Loading tracks...')).toBeHidden({ timeout: 30_000 });

    await screen.getByLabel('Full Name').fill('E2E-Signup-Probe');
    await screen.getByLabel('Section').selectOption({ index: 1 });
    await screen.getByLabel('Track').selectOption({ index: 1 });
    await screen.getByLabel('Email Address').fill('nobody+e2e-signup@example.test');
    await screen.getByLabel('Password').fill('E2e-Strong-1!');
    await screen.getByLabel('Confirm').fill('E2e-Strong-2!');
    await screen.getByRole('button', 'Create Account').tap();

    await expect(screen.getByText('Passwords do not match. Please re-enter your password.')).toBeVisible();
    await expect(screen.getByText('Passwords do not match.')).toBeVisible();
    await expect(screen.getByRole('button', 'Create Account')).toBeEnabled();
    await expect(screen.getByText(NETWORK_ERROR)).not.toBeVisible();
    expect(signUpRequests).toBe(0);
  });
});
