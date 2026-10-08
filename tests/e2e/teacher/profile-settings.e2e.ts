import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const profileMenu = /^Profile menu: /;
const draftName = 'E2E-Profile Draft';
const smartDarkClass = /(^|\s)smart-dark(\s|$)/;
const flippedCard = /rotateY\(180deg\)/;
const notificationLabels = ['Email Notifications', 'At-Risk Student Alerts', 'Quiz & Assessment Submissions', 'Weekly Class Summary'];

describe('teacher profile and settings', { tags: ['teacher', 'profile-settings'], timeout: 120_000 }, () => {
  test('My Profile shows the Faculty ID card, which flips to its back and returns', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeVisible();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeHidden();
    await expect(screen.getByRole('button', 'Back to Dashboard')).toBeVisible();

    const card = screen.getByRole('button', 'Faculty ID Card. Click to flip.');
    await expect(card).toBeVisible();
    await expect(screen.getByText('Faculty Credential')).toBeVisible();
    await expect(screen.getByText('ACTIVE FACULTY')).toBeVisible();
    await expect(screen.getByText('Verified Teaching Clearance')).toBeVisible();
    await expect(screen.getByText('Flip for QR Pass')).toBeVisible();
    await expect(card).not.toHaveAttribute('style', flippedCard);

    await card.tap();
    await expect(card).toHaveAttribute('style', flippedCard);
    await card.press('Enter');
    await expect(card).not.toHaveAttribute('style', flippedCard);
  });

  test('Edit Profile unlocks the form, Reset Changes reverts a draft, and Cancel restores the saved name', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeVisible();

    const fullName = screen.getByPlaceholder('Faculty Name');
    const phone = screen.getByPlaceholder('+63 912 345 6789');
    const unsavedBadge = screen.getByText('Unsaved Changes');
    await expect(fullName).toBeDisabled();
    await expect(phone).toBeDisabled();
    await expect(screen.getByRole('button', 'Edit Profile')).toHaveCount(2);
    const savedName = await fullName.inputValue();

    await screen.getByRole('button', 'Edit Profile').first().tap();
    await expect(fullName).toBeEnabled();
    await expect(phone).toBeEnabled();
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
    await expect(screen.getByRole('button', 'Save')).toBeVisible();
    await expect(screen.getByRole('button', 'Edit Profile')).toHaveCount(0);
    await expect(unsavedBadge).toBeHidden();

    await fullName.fill(draftName);
    await expect(unsavedBadge).toBeVisible();
    await expect(screen.getByText(draftName)).toBeVisible();
    await screen.getByRole('button', 'Reset Changes').tap();
    await expect(screen.getByText('Changes reverted to saved profile')).toBeVisible();
    await expect(fullName).toHaveValue(savedName);
    await expect(unsavedBadge).toBeHidden();
    await expect(fullName).toBeEnabled();

    await fullName.fill(draftName);
    // The Reset Changes toast covers the top-bar Cancel in the top-right corner, so use the one in the form card.
    await screen.getByRole('button', 'Cancel').last().tap();
    await expect(fullName).toHaveValue(savedName);
    await expect(fullName).toBeDisabled();
    await expect(screen.getByText(draftName)).toHaveCount(0);
    await expect(screen.getByRole('button', 'Edit Profile')).toHaveCount(2);
    await expect(screen.getByRole('button', 'Save Changes')).toBeHidden();
  });

  test('Back with an unsaved profile edit asks to discard: Keep Editing keeps the draft, Discard Changes returns to the Dashboard', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeVisible();

    const fullName = screen.getByPlaceholder('Faculty Name');
    const savedName = await fullName.inputValue();
    await screen.getByRole('button', 'Edit Profile').first().tap();
    await fullName.fill(draftName);

    const discardHeading = screen.getByRole('heading', 'Discard Unsaved Changes?');
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(discardHeading).toBeVisible();
    await expect(screen.getByText('You have unsaved changes to your teacher profile. Discarding will revert all edits back to their previous values.')).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(discardHeading).toBeHidden();
    await expect(fullName).toHaveValue(draftName);

    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(discardHeading).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(fullName).toHaveValue(savedName);
    await expect(fullName).toBeDisabled();
  });

  test('Open Account Settings goes to Teacher Settings and View Faculty Profile comes back', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeVisible();

    await screen.getByRole('button', /^Open Account Settings/).tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeHidden();

    await screen.getByRole('button', /^View Faculty Profile/).tap();
    await expect(screen.getByRole('heading', 'Teacher Information')).toBeVisible();
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('Settings opens on Appearance and the four tabs switch panels', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();

    await expect(screen.getByRole('button', /^Light Theme/)).toBeVisible();
    await expect(screen.getByRole('button', /^Dark Theme/)).toBeVisible();
    await expect(screen.getByText('System Sync')).toBeVisible();
    await expect(screen.getByText('Compact Class Density')).toBeVisible();
    await expect(screen.getByText('Reduce Dynamic Animations')).toBeVisible();
    await expect(screen.getByRole('switch')).toHaveCount(2);
    await expect(screen.getByText('All settings up to date')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Settings')).toBeDisabled();
    await expect(screen.getByRole('button', 'Discard')).toBeHidden();

    await screen.getByRole('button', 'Notifications').tap();
    await expect(screen.getByRole('heading', 'Class Alerts & Notifications')).toBeVisible();
    for (const label of notificationLabels) {
      await expect(screen.getByText(label)).toBeVisible();
    }
    await expect(screen.getByRole('switch')).toHaveCount(4);

    await screen.getByRole('button', 'Security').tap();
    await expect(screen.getByRole('heading', 'Password & Account Security')).toBeVisible();
    await expect(screen.getByText('All settings up to date')).toBeHidden();
    await expect(screen.getByRole('button', 'Save Settings')).toBeHidden();

    await screen.getByRole('button', 'Data & Records').tap();
    await expect(screen.getByRole('heading', 'Data Records & Storage')).toBeVisible();
    await expect(screen.getByRole('button', 'Export JSON')).toBeVisible();
    await expect(screen.getByRole('button', 'Clear Cache')).toBeVisible();
    await expect(screen.getByText('All settings up to date')).toBeVisible();

    await screen.getByRole('button', 'Appearance').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('Appearance: Dark Theme previews the dark workspace, Light Theme switches back, and Discard leaves nothing to save', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    const html = browser.locator('html');

    await screen.getByRole('button', /^Dark Theme/).tap();
    await expect(browser).toHaveClass(html, smartDarkClass);
    await expect(screen.getByText('You have unsaved changes')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Settings')).toBeEnabled();

    await screen.getByRole('button', /^Light Theme/).tap();
    await expect(browser).not.toHaveClass(html, smartDarkClass);

    await screen.getByRole('button', 'Discard').tap();
    await expect(screen.getByText('All settings up to date')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Settings')).toBeDisabled();
    await expect(browser).not.toHaveClass(html, smartDarkClass);
  });

  test('Appearance: Discard after previewing Dark Theme returns to the saved light theme', { session: 'teacher', tags: ['known-bug'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    const html = browser.locator('html');
    const savedDark = await browser.evaluate(() => document.documentElement.classList.contains('smart-dark'));
    test.skip(savedDark, 'the e2e teacher saved the Dark Theme, so there is no light theme to return to');

    await screen.getByRole('button', /^Dark Theme/).tap();
    await expect(browser).toHaveClass(html, smartDarkClass);
    await screen.getByRole('button', 'Discard').tap();
    await expect(screen.getByText('All settings up to date')).toBeVisible();
    await expect(browser).not.toHaveClass(html, smartDarkClass);
  });

  test('Appearance: Discard reverts an unsaved Compact Class Density switch', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    await expect(screen.getByRole('switch')).toHaveCount(2);
    // The switches have no accessible name; the first one sits beside 'Compact Class Density'.
    const compact = screen.getByRole('switch').first();
    const savedCompact = await compact.isChecked();

    await compact.tap();
    await expect(compact).toBeChecked({ checked: !savedCompact });
    await expect(screen.getByText('You have unsaved changes')).toBeVisible();
    await screen.getByRole('button', 'Discard').tap();
    await expect(screen.getByText('All settings up to date')).toBeVisible();
    await expect(compact).toBeChecked({ checked: savedCompact });
  });

  test('Back with an unsaved setting asks to discard: Keep Editing stays, Discard Changes returns to the Dashboard unsaved', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    await expect(screen.getByRole('switch')).toHaveCount(2);
    // The switches have no accessible name; the first one sits beside 'Compact Class Density'.
    const compact = screen.getByRole('switch').first();
    const savedCompact = await compact.isChecked();
    await compact.tap();
    await expect(compact).toBeChecked({ checked: !savedCompact });

    const discardHeading = screen.getByRole('heading', 'Discard Unsaved Settings?');
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(discardHeading).toBeVisible();
    await expect(screen.getByText('You have unsaved configuration changes. Discarding will revert preferences back to their previously saved values.')).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(discardHeading).toBeHidden();
    await expect(compact).toBeChecked({ checked: !savedCompact });
    await expect(screen.getByText('You have unsaved changes')).toBeVisible();

    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(discardHeading).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();
    await expect(compact).toBeChecked({ checked: savedCompact });
    await expect(screen.getByText('All settings up to date')).toBeVisible();
  });

  test('Notifications: a saved Weekly Class Summary switch keeps its state after a reload', { session: 'teacher', tags: ['known-bug'], timeout: 180_000 }, async ({ app, screen }) => {
    // The switches have no accessible name; the fourth one sits beside 'Weekly Class Summary'.
    const weeklySummary = screen.getByRole('switch').nth(3);
    const openNotifications = async () => {
      await app.open('/');
      await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
      await screen.getByRole('button', profileMenu).tap();
      await screen.getByRole('menuitem', 'Settings').tap();
      await screen.getByRole('button', 'Notifications').tap();
      await expect(screen.getByRole('heading', 'Class Alerts & Notifications')).toBeVisible();
      await expect(screen.getByRole('switch')).toHaveCount(4);
    };

    await openNotifications();
    const savedOn = await weeklySummary.isChecked();
    await weeklySummary.tap();
    await expect(weeklySummary).toBeChecked({ checked: !savedOn });
    await screen.getByRole('button', 'Save Settings').tap();
    try {
      await expect(screen.getByText('Teacher settings saved successfully')).toBeVisible({ timeout: 30_000 });
      await expect(screen.getByText('All settings up to date')).toBeVisible();
      await openNotifications();
      await expect(weeklySummary).toBeChecked({ checked: !savedOn, timeout: 10_000 });
    } finally {
      // Save the account's Weekly Class Summary preference back as it was, whatever failed above; Save Settings needs a change first.
      await openNotifications();
      if ((await weeklySummary.isChecked()) === savedOn) await weeklySummary.tap();
      await weeklySummary.tap();
      await expect(weeklySummary).toBeChecked({ checked: savedOn });
      await screen.getByRole('button', 'Save Settings').tap();
      await expect(screen.getByText('All settings up to date')).toBeVisible({ timeout: 30_000 });
    }
  });

  test('Security shows the Update Password form, disabled while empty and never submitted', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();

    await screen.getByRole('button', 'Security').tap();
    await expect(screen.getByRole('heading', 'Password & Account Security')).toBeVisible();
    await expect(screen.getByText('Current Password')).toBeVisible();
    await expect(screen.getByText('New Password')).toBeVisible();
    await expect(screen.getByText('Confirm New Password')).toBeVisible();
    await expect(screen.getByPlaceholder('••••••••')).toBeVisible();
    await expect(screen.getByPlaceholder('Minimum 6 characters')).toBeVisible();
    await expect(screen.getByPlaceholder('Repeat new password')).toBeVisible();
    await expect(screen.getByRole('button', 'Update Password')).toBeDisabled();
    await expect(screen.getByText('Session Security & FERPA/DepEd Compliance')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Settings')).toBeHidden();
  });

  test('Data & Records: Clear Cache empties local storage and keeps the teacher signed in on Settings', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();

    await screen.getByRole('button', 'Data & Records').tap();
    await expect(screen.getByText('Clear Browser Cache')).toBeVisible();
    const probe = await browser.evaluate(() => {
      localStorage.setItem('e2e-clear-cache-probe', 'set');
      return localStorage.getItem('e2e-clear-cache-probe');
    });
    expect(probe).toBe('set');

    await screen.getByRole('button', 'Clear Cache').tap();
    await expect(screen.getByText('Local cache cleared')).toBeVisible({ timeout: 15_000 });
    expect(await browser.evaluate(() => localStorage.getItem('e2e-clear-cache-probe')), 'Clear Cache empties localStorage').toBeNull();
    await expect(screen.getByRole('heading', 'Data Records & Storage')).toBeVisible();
    await expect(screen.getByRole('button', 'Clear Cache')).toBeEnabled();
    await expect(screen.getByRole('button', 'Back to Dashboard')).toBeVisible();
  });

  test('Data & Records: Export JSON downloads the records snapshot', { session: 'teacher', tags: ['known-bug'] }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', profileMenu).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Display & Appearance')).toBeVisible();

    await screen.getByRole('button', 'Data & Records').tap();
    await expect(screen.getByText('Export Class Records Snapshot')).toBeVisible();
    // Fails today: exportUserDataSnapshot queries the top-level 'notifications' collection, which firestore.rules deny, so no file is produced.
    const download = await browser.waitForDownload(() => screen.getByRole('button', 'Export JSON').tap(), { timeout: 45_000 });
    expect(download.suggestedFilename).toMatch(/^mathpulse-data-export-.+-\d+\.json$/);
    await expect(screen.getByText('Data export downloaded')).toBeVisible();
  });
});
