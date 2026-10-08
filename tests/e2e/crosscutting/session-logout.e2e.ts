import { describe, test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// The dialog's X button sets this same session-only flag. Setting it before the app's 1 s diagnostic timer reads
// it keeps the Initial Assessment dialog from opening, with no agent step that could press the persisted "Skip for now".
const dismissInitialAssessmentForSession = () => {
  sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
  return true;
};
const loaderSubtitle = 'Preparing your MathPulse AI experience...';
const dashboardGreeting = /^Good (Morning|Afternoon|Evening), .*!$/;

describe('session persistence and sign out', { tags: ['any', 'session'] }, () => {
  test('student session and the current tab survive a page reload', { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'AI Chat').tap();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/chat');

    await browser.reload();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/chat');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('student session survives closing and reopening the app', { session: 'student', tags: ['student'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 45_000 });

    await app.restart();
    await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('teacher session survives a reload and the view resets to Teacher Dashboard', { session: 'teacher', tags: ['teacher'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible({ timeout: 30_000 });

    await browser.reload();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('admin session survives a reload and the view resets to Admin Dashboard', { session: 'admin', tags: ['admin'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible({ timeout: 30_000 });

    await browser.reload();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('student tab loader shows while a deep-linked tab loads, then the tab renders', { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
    await browser.route(/\/src\/components\/GradesPage\.tsx/, async (route) => {
      await new Promise<void>((resolve) => { setTimeout(resolve, 5_000); });
      await route.continue();
    });
    await app.open('/grades');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('status', 'Loading content...')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeVisible();

    await expect(screen.getByText('Grades & Assessment')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeHidden();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('teacher bootstrap loader ends on Teacher Dashboard', { session: 'teacher', tags: ['teacher'] }, async ({ app, browser, screen }) => {
    await browser.route(/\/src\/components\/TeacherDashboard\.tsx/, async (route) => {
      await new Promise<void>((resolve) => { setTimeout(resolve, 5_000); });
      await route.continue();
    });
    await app.open('/');
    await expect(screen.getByRole('status', 'Loading teacher dashboard...')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeVisible();

    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeHidden();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('admin bootstrap loader ends on Admin Dashboard', { session: 'admin', tags: ['admin'] }, async ({ app, browser, screen }) => {
    await browser.route(/\/src\/components\/AdminDashboard\.tsx/, async (route) => {
      await new Promise<void>((resolve) => { setTimeout(resolve, 5_000); });
      await route.continue();
    });
    await app.open('/');
    await expect(screen.getByRole('status', 'Loading admin dashboard...')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeVisible();

    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(loaderSubtitle)).toBeHidden();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('student header Sign Out: Stay keeps the session, Logout returns to Welcome Back', { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await expect(screen.getByRole('heading', 'Confirm Logout')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByText('Are you sure you want to log out? Your progress is saved automatically.')).toBeVisible();
    await screen.getByRole('button', 'Stay').tap();
    await expect(screen.getByRole('heading', 'Confirm Logout')).toBeHidden();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Sign In')).toBeVisible();
    await expect(screen.getByRole('button', /^Profile menu: /)).toBeHidden();

    await browser.reload();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
  });

  test('student Settings My Data & Files Log Out asks to confirm, Stay keeps Settings, Logout signs out', { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
    await app.open('/settings');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByText('System Settings')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'My Data & Files').tap();
    await screen.getByRole('button', 'Log Out').tap();
    await expect(screen.getByRole('heading', 'Confirm Logout')).toBeVisible({ timeout: 15_000 });
    await screen.getByRole('button', 'Stay').tap();
    await expect(screen.getByRole('heading', 'Confirm Logout')).toBeHidden();
    await expect(screen.getByText('System Settings')).toBeVisible();

    await screen.getByRole('button', 'Log Out').tap();
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });
  });

  test('signing back in after a Settings Log Out shows the Dashboard at /', { session: 'student', tags: ['student', 'known-bug'] }, async ({ app, browser, screen }) => {
    const student = credentials.user('student');
    await app.open('/settings');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByText('System Settings')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'My Data & Files').tap();
    await screen.getByRole('button', 'Log Out').tap();
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });

    await screen.getByLabel('Email Address').fill(student.username);
    await screen.getByLabel('Password').fill(student.password);
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('System Settings')).toBeHidden();
    await expect(browser).toHaveURL('/');
  });

  test('student phone bottom-nav Profile Sign Out returns to Welcome Back', { session: 'student', tags: ['student', 'phone'] }, async ({ app, browser, screen }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', /^Profile options for /).tap();
    await screen.getByRole('button', 'Sign Out').tap();
    await expect(screen.getByRole('heading', 'Confirm Logout')).toBeVisible({ timeout: 15_000 });
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', /^Profile options for /)).toBeHidden();
  });

  test('teacher header Sign Out: Cancel keeps the session, Logout returns to Welcome Back', { session: 'teacher', tags: ['teacher'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await expect(screen.getByRole('heading', 'Logout')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByText('Are you sure you want to logout?')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Logout')).toBeHidden();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeHidden();

    await browser.reload();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
  });

  test('admin header Sign Out: Cancel keeps the session, Logout returns to Welcome Back', { session: 'admin', tags: ['admin'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await expect(screen.getByRole('heading', 'Logout Confirmation')).toBeVisible({ timeout: 15_000 });
    await expect(screen.getByText('Are you sure you want to log out? This will end your current session.')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Logout Confirmation')).toBeHidden();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Sign Out').tap();
    await screen.getByRole('button', 'Logout').tap();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeHidden();

    await browser.reload();
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
  });
});
