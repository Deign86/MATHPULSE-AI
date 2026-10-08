import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeAssessmentPrompt =
  'if an Initial Assessment dialog is open, close it with Escape or its close button without pressing "Skip for now" or starting the assessment; otherwise do nothing';
const draftName = 'E2E-Profile Draft';
const smartDarkClass = /(^|\s)smart-dark(\s|$)/;
const noSmartDarkClass = /^(?![\s\S]*(^|\s)smart-dark(\s|$))/;

const sampleSmartDarkForOneSecond = async () => {
  const seen: boolean[] = [];
  for (let tick = 0; tick < 20; tick += 1) {
    seen.push(document.documentElement.classList.contains('smart-dark'));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return seen;
};

const countDensityWritesForOneSecond = () =>
  new Promise<number>((resolve) => {
    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-density'] });
    setTimeout(() => {
      observer.disconnect();
      resolve(writes);
    }, 1000);
  });

describe('student profile and settings', { tags: ['student', 'profile-settings'], timeout: 180_000 }, () => {
  test('the profile shows the Student ID pass, which flips to its back and returns', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const pass = screen.getByRole('button', 'Cute MathPulse Student Pass. Click to flip.');
    await expect(pass).toBeVisible();
    await expect(screen.getByText('STUDENT PASS')).toBeVisible();
    await expect(pass.getByText('Official Student Pass')).toBeVisible();
    await expect(screen.getByRole('button', 'Change profile photo')).toBeVisible();
    await expect(screen.getByText('Enrolled Learner')).toBeVisible();

    await screen.getByRole('button', /^Tap to flip card/).tap();
    await expect(screen.getByRole('button', 'Flip back to front')).toBeVisible();
    await screen.getByRole('button', 'Flip back to front').tap();
    await expect(screen.getByRole('button', /^Tap to flip card/)).toBeVisible();
  });

  test('Grade Level and school records stay read-only, even in Edit Profile mode', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const gradeLevel = screen.getByDisplayValue('Grade 11');
    const fullName = screen.getByPlaceholder('Learner Full Name');
    const gender = screen.getByRole('combobox');
    await expect(gradeLevel).toHaveAttribute('readonly');
    await expect(fullName).toHaveAttribute('readonly');
    await expect(gender).toBeDisabled();
    await expect(screen.getByPlaceholder('12-digit DepEd LRN')).toBeDisabled();
    await expect(screen.getByPlaceholder('e.g. STEM-11A')).toBeDisabled();
    await expect(screen.getByText('Admin only')).toHaveCount(2);
    await expect(screen.getByText('Locked — school records are managed by your administrator')).toBeVisible();

    await screen.getByRole('button', 'Edit Profile').tap();
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
    await expect(fullName).not.toHaveAttribute('readonly');
    await expect(gender).toBeEnabled();
    await expect(gradeLevel).toHaveAttribute('readonly');
    await expect(screen.getByPlaceholder('12-digit DepEd LRN')).toBeDisabled();
    await expect(screen.getByPlaceholder('e.g. STEM-11A')).toBeDisabled();

    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();
    await expect(fullName).toHaveAttribute('readonly');
  });

  test('Edit Profile: a changed Full Name previews on the pass and Cancel restores the saved name', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Learner Full Name');
    const savedName = await fullName.inputValue();
    await screen.getByRole('button', 'Edit Profile').tap();
    await fullName.fill(draftName);
    await expect(fullName).toHaveValue(draftName);
    await expect(screen.getByRole('heading', draftName)).toBeVisible();

    await screen.getByRole('button', 'Cancel').tap();
    await expect(fullName).toHaveValue(savedName);
    await expect(screen.getByRole('heading', draftName)).toBeHidden();
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Changes')).toBeHidden();
  });

  test('leaving the profile with an unsaved edit asks first: Stay on Profile keeps it, Leave Without Saving drops it', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Learner Full Name');
    const savedName = await fullName.inputValue();
    await screen.getByRole('button', 'Edit Profile').tap();
    await fullName.fill(draftName);

    const guardHeading = screen.getByRole('heading', 'Leave Without Saving?');
    await screen.getByRole('button', 'Dashboard').tap();
    await expect(guardHeading).toBeVisible();
    await expect(screen.getByText(/navigate to Dashboard, your unsaved changes will be lost\.$/)).toBeVisible();

    await screen.getByRole('button', 'Stay on Profile').tap();
    await expect(guardHeading).toBeHidden();
    await expect(fullName).toHaveValue(draftName);
    await expect(browser).toHaveURL('/profile');

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(guardHeading).toBeVisible();
    await screen.getByRole('button', 'Leave Without Saving').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'My Profile')).toBeHidden();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible();
    await expect(fullName).toHaveValue(savedName);
  });

  test('Back with an unsaved edit asks to discard and Keep Editing keeps the draft', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Learner Full Name');
    await screen.getByRole('button', 'Edit Profile').tap();
    await fullName.fill(draftName);

    const discardHeading = screen.getByRole('heading', 'Discard Unsaved Changes?');
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(discardHeading).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(discardHeading).toBeHidden();
    await expect(fullName).toHaveValue(draftName);
  });

  test('Discard Changes after Back leaves My Profile without saving the draft', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Edit Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Learner Full Name');
    const savedName = await fullName.inputValue();
    await screen.getByRole('button', 'Edit Profile').tap();
    await fullName.fill(draftName);

    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(screen.getByRole('heading', 'Discard Unsaved Changes?')).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(screen.getByRole('heading', 'My Profile')).toBeHidden({ timeout: 15_000 });

    await app.open('/profile');
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await expect(fullName).toHaveValue(savedName);
  });

  test('Change Email opens a re-authentication form that is cancelled, never submitted', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Change')).toBeVisible();

    const emailHeading = screen.getByRole('heading', 'Change Email Address');
    await screen.getByRole('button', 'Change').tap();
    await expect(emailHeading).toBeVisible();
    await expect(screen.getByText('Enter your current password to confirm your identity before updating your email address.')).toBeVisible();
    await expect(screen.getByText('New Email Address')).toBeVisible();
    await expect(screen.getByText('Current Password')).toBeVisible();
    await expect(screen.getByPlaceholder('••••••••')).toBeVisible();
    await expect(screen.getByRole('button', 'Update Email')).toBeEnabled();

    const newEmail = screen.getByPlaceholder('new.email@example.com');
    await newEmail.fill('nobody+profile-email@example.test');
    await expect(newEmail).toHaveValue('nobody+profile-email@example.test');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(emailHeading).toBeHidden();

    await screen.getByRole('button', 'Change').tap();
    await expect(emailHeading).toBeVisible();
    await expect(screen.getByPlaceholder('new.email@example.com')).toHaveValue('');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(emailHeading).toBeHidden();
  });

  test('Open Avatar Studio on the profile goes to the Avatar Studio wardrobe', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/profile');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Open Avatar Studio')).toBeVisible();

    await screen.getByRole('button', 'Open Avatar Studio').tap();
    await expect(browser).toHaveURL('/avatar');
    await expect(screen.getByRole('heading', 'My Profile')).toBeHidden();
    await expect.poll(async () => (await screen.getByRole('button', 'Surprise Outfit').isVisible()) || (await screen.getByText('Avatar Studio Locked').isVisible()), { timeout: 30_000 }).toBe(true);
  });

  test('settings opens on Display & Theme and the folder tabs reach all four sheets', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();

    await expect(screen.getByText('System Settings')).toBeVisible();
    await expect(screen.getByText('Settings Sheet')).toBeVisible();
    await expect(screen.getByRole('button', 'Select settings section')).toBeHidden();

    await screen.getByRole('button', 'Alerts & Reminders').tap();
    await expect(screen.getByRole('heading', 'Alerts & Reminders')).toBeVisible();
    await expect(screen.getByRole('heading', 'In-App Reminders')).toBeVisible();

    await screen.getByRole('button', 'Login & Password').tap();
    await expect(screen.getByRole('heading', 'Login & Password')).toBeVisible();
    await expect(screen.getByRole('heading', 'Change Password')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    await expect(screen.getByRole('heading', 'My Data & Files')).toBeVisible();
    await expect(screen.getByRole('heading', 'Save Records & Free Up Space')).toBeVisible();

    await screen.getByRole('button', 'Display & Theme').tap();
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible();
    await expect(screen.getByRole('heading', 'Screen Theme & Brightness')).toBeVisible();

    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeHidden();
  });

  test('Display & Theme: Dark Mode applies the dark theme and Light Mode switches it back, without saving', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByText('Day & Night Mode')).toBeVisible();
    const html = browser.locator('html');

    await screen.getByRole('button', 'Dark Mode').tap();
    await expect(browser).toHaveClass(html, smartDarkClass);
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();

    await screen.getByRole('button', 'Light Mode').tap();
    await expect(browser).toHaveClass(html, noSmartDarkClass);
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
  });

  test('Settings applies display settings once and keeps Dark Mode steady instead of re-rendering in a loop', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();

    expect(await browser.evaluate(countDensityWritesForOneSecond), 'display settings re-applied while Settings sat idle for a second').toBeLessThanOrEqual(3);

    await screen.getByRole('button', 'Dark Mode').tap();
    await expect(browser).toHaveClass(browser.locator('html'), smartDarkClass);
    expect(await browser.evaluate(sampleSmartDarkForOneSecond), 'dark theme stays applied for a full second').not.toContain(false);
  });

  test('Daily Study Targets: a new Daily XP Target updates the goal and marks the sheet unsaved', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('heading', 'Daily Study Targets')).toBeVisible();
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();

    const practiceLevel = screen.getByRole('combobox').filter({ hasText: /^(Adaptive|Foundational|Standard|Advanced) \(/ });
    const savedLevel = (await practiceLevel.textContent()) ?? '';
    await practiceLevel.tap();
    await expect(screen.getByRole('option', 'Adaptive (Matches my pace)')).toBeVisible();
    await expect(screen.getByRole('option', 'Foundational (Easy review)')).toBeVisible();
    await expect(screen.getByRole('option', 'Standard (Grade 11-12 STEM)')).toBeVisible();
    await expect(screen.getByRole('option', 'Advanced (Honor challenges)')).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(screen.getByRole('option', 'Foundational (Easy review)')).toBeHidden();
    await expect(practiceLevel).toHaveText(savedLevel);
    await expect(screen.getByRole('combobox').filter({ hasText: /^(Morning|Afternoon|Evening|Night) \(/ })).toBeVisible();

    const goal = screen.getByText(/^\d+ XP \/ day$/);
    const nextGoal = (await goal.textContent()) === '50 XP / day' ? '100' : '50';
    await screen.getByRole('button', `${nextGoal} XP`).tap();
    await expect(goal).toHaveText(`${nextGoal} XP / day`);
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
  });

  test('leaving Settings without saving drops the unsaved Daily XP Target instead of showing it as saved', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();

    const goal = screen.getByText(/^\d+ XP \/ day$/);
    const savedGoal = (await goal.textContent()) ?? '';
    const nextGoal = savedGoal === '50 XP / day' ? '100' : '50';
    await screen.getByRole('button', `${nextGoal} XP`).tap();
    await expect(goal).toHaveText(`${nextGoal} XP / day`);
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();

    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(screen.getByRole('heading', 'Daily Study Targets')).toBeHidden();
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Daily Study Targets')).toBeVisible();
    await expect(goal).toHaveText(savedGoal);
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();
  });

  test('Alerts & Reminders shows the device alert control and five reminder switches without granting permission', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Alerts & Reminders')).toBeVisible();

    await screen.getByRole('button', 'Alerts & Reminders').tap();
    await expect(screen.getByRole('heading', 'Alerts & Reminders')).toBeVisible();
    await expect(screen.getByRole('heading', 'Phone & Device Alerts')).toBeVisible();
    await expect(screen.getByText('Device Alert Status')).toBeVisible();
    await expect(screen.getByRole('button', 'Turn On Alerts')).toBeVisible();

    await expect(screen.getByRole('heading', 'In-App Reminders')).toBeVisible();
    await expect(screen.getByRole('switch')).toHaveCount(5);
    await expect(screen.getByText('Streak Saver Alerts')).toBeVisible();
    await expect(screen.getByText('1v1 Quiz Battle Invites')).toBeVisible();
    await expect(screen.getByText('Teacher Lessons & Exercises')).toBeVisible();
    await expect(screen.getByText('Badges & Level Ups')).toBeVisible();
    await expect(screen.getByText('Daily Streak & Practice Prompts')).toBeVisible();
    await expect(screen.getByRole('button', 'Saved')).toBeVisible();
  });

  test('Login & Password shows the Change Password form, locked until filled, and the account status', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Login & Password')).toBeVisible();

    await screen.getByRole('button', 'Login & Password').tap();
    await expect(screen.getByRole('heading', 'Change Password')).toBeVisible();
    await expect(screen.getByText('Current Password')).toBeVisible();
    await expect(screen.getByText('New Password (at least 8 characters)')).toBeVisible();
    await expect(screen.getByText('Confirm New Password')).toBeVisible();
    await expect(screen.getByPlaceholder('••••••••')).toHaveCount(3);
    await expect(screen.getByRole('button', 'Update Password')).toBeDisabled();

    await expect(screen.getByRole('heading', 'Account Safety & Status')).toBeVisible();
    await expect(screen.getByText('MathPulse Student ID')).toBeVisible();
    await expect(screen.getByText('Verified')).toBeVisible();
    await expect(screen.getByText('School Role')).toBeVisible();
    await expect(screen.getByText('Senior High STEM Scholar')).toBeVisible();
    await expect(screen.getByText('School Computer Tip:')).toBeVisible();
  });

  test('My Data & Files: Save Copy downloads the learning summary as JSON', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'My Data & Files')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    await expect(screen.getByText('Download Learning Summary')).toBeVisible();
    const download = await browser.waitForDownload(() => screen.getByRole('button', 'Save Copy').tap(), { timeout: 90_000 });
    expect(download.suggestedFilename).toMatch(/^mathpulse-data-export-.+-\d+\.json$/);
    await expect(screen.getByText('Data export downloaded')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Copy')).toBeEnabled();
  });

  test('My Data & Files: Free Up Space clears temporary files and keeps the student signed in', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'My Data & Files')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    await expect(screen.getByText('Clear Temporary Files')).toBeVisible();
    const markerKey = 'e2e-free-up-space-marker';
    await browser.evaluate((key: string) => {
      window.localStorage.setItem(key, 'present');
      return window.localStorage.getItem(key);
    }, markerKey);
    await screen.getByRole('button', 'Free Up Space').tap();
    await expect(screen.getByText('Local cache cleared')).toBeVisible({ timeout: 15_000 });
    expect(await browser.evaluate((key: string) => window.localStorage.getItem(key), markerKey), 'the device storage marker survived Free Up Space').toBeNull();
    await expect(screen.getByRole('button', 'Free Up Space')).toBeEnabled();
    await expect(screen.getByRole('heading', 'My Data & Files')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });

  test('My Data & Files: Retake Test asks "Reset Diagnostic Assessment?" and Cancel leaves the data alone', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'My Data & Files')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    await expect(screen.getByText('Retake Initial Diagnostic Test')).toBeVisible();
    const resetHeading = screen.getByRole('heading', 'Reset Diagnostic Assessment?');
    await screen.getByRole('button', 'Retake Test').tap();
    await expect(resetHeading).toBeVisible();
    await expect(screen.getByText(/^Are you sure you want to reset your diagnostic testing data\?/)).toBeVisible();
    await expect(screen.getByRole('button', 'Yes, Reset Data')).toBeVisible();

    await screen.getByRole('button', 'Cancel').tap();
    await expect(resetHeading).toBeHidden();
    await expect(screen.getByRole('button', 'Yes, Reset Data')).toBeHidden();
    await expect(browser).toHaveURL('/settings');
    await expect(screen.getByRole('heading', 'My Data & Files')).toBeVisible();
  });

  test('Retake Test warns that the reset also wipes XP before it is confirmed', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'My Data & Files')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    const resetHeading = screen.getByRole('heading', 'Reset Diagnostic Assessment?');
    await screen.getByRole('button', 'Retake Test').tap();
    await expect(resetHeading).toBeVisible();
    await expect(screen.getByText(/^Are you sure you want to reset your diagnostic testing data\?/)).toContainText(/\bXP\b/);

    await screen.getByRole('button', 'Cancel').tap();
    await expect(resetHeading).toBeHidden();
  });

  test('My Data & Files: Log Out asks to confirm and Stay keeps the session', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'My Data & Files')).toBeVisible();

    await screen.getByRole('button', 'My Data & Files').tap();
    await expect(screen.getByRole('heading', 'Assessment Reset & Sign Out')).toBeVisible();
    await expect(screen.getByText('Safely log out of your session on this device')).toBeVisible();

    const logoutHeading = screen.getByRole('heading', 'Confirm Logout');
    await screen.getByRole('button', 'Log Out').tap();
    await expect(logoutHeading).toBeVisible();
    await expect(screen.getByText('Are you sure you want to log out? Your progress is saved automatically.')).toBeVisible();
    await expect(screen.getByRole('button', 'Logout')).toBeVisible();
    await screen.getByRole('button', 'Stay').tap();
    await expect(logoutHeading).toBeHidden();
    await expect(browser).toHaveURL('/settings');
    await expect(screen.getByRole('button', 'Log Out')).toBeVisible();
  });

  test('settings side links open the Student ID pass and Avatar Studio', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'View & Edit Student ID Pass')).toBeVisible();

    await screen.getByRole('button', 'View & Edit Student ID Pass').tap();
    await expect(browser).toHaveURL('/profile');
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible();
    await expect(screen.getByRole('button', 'Back to Settings')).toBeVisible();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(browser).toHaveURL('/settings');
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible();

    await screen.getByRole('button', 'Open Avatar Studio').tap();
    await expect(browser).toHaveURL('/avatar');
    await expect.poll(async () => (await screen.getByRole('button', 'Surprise Outfit').isVisible()) || (await screen.getByText('Avatar Studio Locked').isVisible()), { timeout: 30_000 }).toBe(true);
  });

  test('below lg the Select settings section dropdown switches sheets', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/settings');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    const sectionPicker = screen.getByRole('button', 'Select settings section');
    await expect(sectionPicker).toBeVisible({ timeout: 30_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(sectionPicker).toHaveAttribute('aria-expanded', 'false');
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible();
    await expect(screen.getByRole('button', 'Login & Password')).toBeHidden();

    await sectionPicker.tap();
    await expect(sectionPicker).toHaveAttribute('aria-expanded', 'true');
    await screen.getByRole('button', /^Login & Password/).tap();
    await expect(sectionPicker).toHaveAttribute('aria-expanded', 'false');
    await expect(screen.getByRole('heading', 'Login & Password')).toBeVisible();
    await expect(screen.getByRole('heading', 'Change Password')).toBeVisible();

    await sectionPicker.tap();
    await screen.getByRole('button', /^My Data & Files/).tap();
    await expect(screen.getByRole('heading', 'My Data & Files')).toBeVisible();
    await expect(screen.getByRole('button', 'Retake Test')).toBeVisible();

    await sectionPicker.tap();
    await screen.getByRole('button', /^Alerts & Reminders/).tap();
    await expect(screen.getByRole('heading', 'Alerts & Reminders')).toBeVisible();
    await expect(screen.getByRole('switch')).toHaveCount(5);

    await sectionPicker.tap();
    await screen.getByRole('button', /^Display & Theme/).tap();
    await expect(screen.getByRole('heading', 'Display & Theme')).toBeVisible();
    await expect(sectionPicker).toHaveAttribute('aria-expanded', 'false');
  });
});
