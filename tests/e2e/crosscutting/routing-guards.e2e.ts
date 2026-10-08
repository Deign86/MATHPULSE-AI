import { describe, test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

// The dialog's X button sets this same session-only flag. Setting it before the app's 1 s diagnostic timer reads
// it keeps the Initial Assessment dialog from opening, with no agent step that could press the persisted "Skip for now".
const dismissInitialAssessmentForSession = () => {
  sessionStorage.setItem('mathpulse_iar_session_dismissed', 'true');
  return true;
};
const dashboardGreeting = /^Good (Morning|Afternoon|Evening), .*!$/;
const leaderboardLandmark = /^(Hall of Champions|Leaderboard Locked|Couldn't load leaderboard)$/;

// Text landmarks, not role queries: a Radix dialog that auto-opens (Initial Assessment,
// Assessment Results) aria-hides the page behind it, which would hide role matches.
const studentScreens = [
  { path: '/', screenName: 'Dashboard', landmark: dashboardGreeting },
  { path: '/modules', screenName: 'Modules', landmark: 'Curriculum Modules' },
  { path: '/chat', screenName: 'AI Chat', landmark: 'AI Math Tutor' },
  { path: '/assessment', screenName: 'Assessment hub', landmark: /^(Diagnostic Assessment|Assessment Complete)$/ },
  { path: '/battle', screenName: 'Quiz Battle', landmark: 'Live Arena' },
  { path: '/leaderboard', screenName: 'Leaderboard', landmark: leaderboardLandmark },
  { path: '/grades', screenName: 'Grades', landmark: 'Grades & Assessment' },
  { path: '/avatar', screenName: 'Avatar Studio', landmark: /^(Live Hologram Stage|Avatar Studio Locked)$/ },
  { path: '/profile', screenName: 'Profile', landmark: 'Manage your personal contact details, school records, and learning credentials.' },
  { path: '/rewards', screenName: 'Rewards', landmark: 'Rewards & Trophy Room' },
  { path: '/settings', screenName: 'Settings', landmark: 'System Settings' },
] as const;

const staffLandings = [
  { role: 'teacher', heading: 'Teacher Dashboard' },
  { role: 'admin', heading: 'Admin Dashboard' },
] as const;

describe('student deep links and role routing guards', { tags: ['any', 'routing'] }, () => {
  for (const studentScreen of studentScreens) {
    test(`deep link ${studentScreen.path} opens the ${studentScreen.screenName} screen`, { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
      await app.open(studentScreen.path);
      await expect(screen.getByText(studentScreen.landmark)).toBeVisible({ timeout: 45_000 });
      await expect(browser).toHaveURL(studentScreen.path);
      await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
    });
  }

  test('a signed-out deep link to /chat lands on AI Chat after signing in', { tags: ['student'] }, async ({ app, browser, screen }) => {
    const student = credentials.user('student');
    await app.open('/chat');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/chat');

    await screen.getByLabel('Email Address').fill(student.username);
    await screen.getByLabel('Password').fill(student.password);
    await screen.getByRole('button', 'Sign In').tap();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/chat');
    await expect(screen.getByRole('heading', 'Welcome Back')).toBeHidden();
  });

  test('assigned-quiz deep link with an unknown quizId opens Practice and reports the quiz unavailable', { session: 'student', tags: ['student'] }, async ({ app, screen }) => {
    await app.open('/modules?section=assigned-quizzes&quizId=e2e-missing-quiz');
    await expect(screen.getByText('Curriculum Modules')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('Assigned by your teacher')).toBeVisible({ timeout: 30_000 });
    await expect(
      screen.getByText('This assigned quiz is unavailable. It may have been removed or completed. Retry or check with your teacher.'),
    ).toBeVisible({ timeout: 30_000 });
  });

  for (const unknownPath of ['/e2e-no-such-page', '/admin']) {
    test(`unknown path ${unknownPath} renders the student Dashboard and keeps the URL`, { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
      await app.open(unknownPath);
      await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 45_000 });
      await expect(browser).toHaveURL(unknownPath);
      await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeHidden();
    });
  }

  test('browser back and forward move between student tabs and keep the URL in sync', { session: 'student', tags: ['student'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'AI Chat').tap();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/chat');

    await screen.getByRole('button', 'Assessment').tap();
    await expect(screen.getByText('Grades & Assessment')).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/grades');

    await browser.back();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/chat');

    await browser.back();
    await expect(screen.getByText(dashboardGreeting)).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/');

    await browser.forward();
    await expect(screen.getByText('AI Math Tutor')).toBeVisible({ timeout: 30_000 });
    await expect(browser).toHaveURL('/chat');
  });

  test('the dashboard Leaderboards card opens the Leaderboard and updates the URL', { session: 'student', tags: ['student', 'known-bug'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await browser.evaluate(dismissInitialAssessmentForSession);
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('heading', 'Leaderboards').tap();
    await expect(screen.getByText(leaderboardLandmark)).toBeVisible({ timeout: 45_000 });
    await expect(browser).toHaveURL('/leaderboard');
  });

  for (const staff of staffLandings) {
    test(`${staff.role} opening student paths stays on ${staff.heading}`, { session: staff.role, tags: [staff.role], timeout: 420_000 }, async ({ app, screen }) => {
      for (const studentScreen of studentScreens.filter((entry) => entry.path !== '/')) {
        await app.open(studentScreen.path);
        await expect(screen.getByRole('heading', staff.heading)).toBeVisible({ timeout: 45_000 });
        await expect(screen.getByText(studentScreen.landmark)).toBeHidden();
        await expect(screen.getByRole('button', /^Level \d+$/)).toBeHidden();
      }
    });
  }

  test('teacher opening /admin stays on Teacher Dashboard without reaching the Admin Dashboard', { session: 'teacher', tags: ['teacher'] }, async ({ app, screen }) => {
    await app.open('/admin');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeHidden();
    await expect(screen.getByRole('button', 'User Management')).toBeHidden();
  });
});
