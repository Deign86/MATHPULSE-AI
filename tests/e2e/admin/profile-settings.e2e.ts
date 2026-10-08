import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const flippedCard = /rotateY\(180deg\)/;
const draftName = 'E2E-Admin Draft';

describe('admin profile and settings', { tags: ['admin', 'profile-settings'], timeout: 180_000 }, () => {
  test('My Profile opens the Executive Profile, whose Admin ID card flips to the Governance Pass and back', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
    await expect(screen.getByRole('heading', 'Administrative Profile')).toBeVisible();

    await expect(screen.getByText('Executive Pass')).toBeVisible();
    await expect(screen.getByText('Flip for Governance Pass')).toBeVisible();
    await expect(screen.getByRole('button', 'Change administrator profile photo')).toBeVisible();
    await expect(screen.getByText('Active Administrator')).toBeVisible();
    for (const placeholder of ['Administrator Name', '+63 912 345 6789', 'ADM-2025-001', 'e.g. Curriculum Administrator', 'Department or Division']) {
      await expect(screen.getByPlaceholder(placeholder)).toBeEnabled();
    }
    await expect(screen.getByRole('main').getByRole('textbox', { disabled: true })).toHaveCount(2);
    await expect(screen.getByDisplayValue('Full Governance')).toBeDisabled();
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
    await expect(screen.getByRole('button', 'Discard')).toBeHidden();

    const card = screen.getByRole('button', 'Executive Administrator ID Card. Click to flip.');
    await expect(card).not.toHaveAttribute('style', flippedCard);
    await card.tap();
    await expect(card).toHaveAttribute('style', flippedCard);
    await card.tap();
    await expect(card).not.toHaveAttribute('style', flippedCard);
  });

  test('Go to System Settings, Go to Admin Profile and Back to Overview move between the admin pages', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    await screen.getByRole('button', 'Go to Admin Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
    await screen.getByRole('button', 'Go to System Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();
    await screen.getByRole('button', 'Back to Overview').tap();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();

    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
    await screen.getByRole('button', 'Back to Overview').tap();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();
  });

  test('an unsaved Full Name previews on the ID card; Discard asks first, Keep Editing keeps it and Discard Changes restores the saved name', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Administrator Name');
    await expect(fullName).toBeVisible();
    const savedName = await fullName.inputValue();
    await fullName.fill(draftName);
    await expect(screen.getByRole('heading', draftName)).toBeVisible();

    const discard = screen.getByRole('button', 'Discard');
    const confirmHeading = screen.getByRole('heading', 'Discard Unsaved Changes?');
    await discard.tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(confirmHeading).toBeHidden();
    await expect(fullName).toHaveValue(draftName);

    await discard.tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(confirmHeading).toBeHidden();
    await expect(screen.getByText('Changes discarded')).toBeVisible();
    await expect(fullName).toHaveValue(savedName);
    await expect(screen.getByRole('heading', draftName)).toBeHidden();
    await expect(discard).toBeHidden();
  });

  test('Back to Overview with an unsaved profile edit asks first: Keep Editing stays, Discard Changes returns to the Admin Dashboard', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();

    const fullName = screen.getByPlaceholder('Administrator Name');
    await fullName.fill(draftName);
    const confirmHeading = screen.getByRole('heading', 'Discard Unsaved Changes?');
    await screen.getByRole('button', 'Back to Overview').tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(confirmHeading).toBeHidden();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
    await expect(fullName).toHaveValue(draftName);

    await screen.getByRole('button', 'Back to Overview').tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();
  });

  test('Office / Department keeps a saved value after Save Changes and a reload', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'My Profile').tap();
    await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();

    const office = screen.getByPlaceholder('Department or Division');
    await expect(office).toBeVisible();
    const savedOffice = await office.inputValue();
    const officeDraft = `E2E-Office ${Date.now()}`;
    await office.fill(officeDraft);
    await screen.getByRole('button', 'Save Changes').tap();
    await expect(screen.getByText('Administrator profile updated successfully')).toBeVisible({ timeout: 30_000 });

    try {
      await expect(office).toHaveValue(officeDraft);
      await browser.reload();
      await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
      await screen.getByRole('button', /^Profile menu: /).tap();
      await screen.getByRole('menuitem', 'My Profile').tap();
      await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
      await expect(office).toHaveValue(officeDraft);
    } finally {
      if (await screen.getByRole('heading', 'Executive Profile').isHidden()) {
        await screen.getByRole('button', /^Profile menu: /).tap();
        await screen.getByRole('menuitem', 'My Profile').tap();
      }
      await expect(screen.getByRole('heading', 'Executive Profile')).toBeVisible();
      await expect(office).toBeVisible();
      if ((await office.inputValue()) !== savedOffice) {
        await office.fill(savedOffice);
        await screen.getByRole('button', 'Save Changes').tap();
        await expect(screen.getByRole('button', 'Discard')).toBeHidden({ timeout: 30_000 });
      }
    }
  });

  test('Appearance: Dark Mode and Light Mode preview the theme on the page, and picking the saved theme again leaves nothing to save after Discard', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await expect(main.getByRole('heading', 'Appearance')).toBeVisible();
    await expect(main.getByRole('heading', 'Interface Theme')).toBeVisible();
    await expect(main.getByText('Compact Table & Card View')).toBeVisible();
    await expect(main.getByText('Reduce Motion & Animations')).toBeVisible();
    await expect(main.getByRole('switch')).toHaveCount(2);

    const isSmartDark = () => browser.evaluate(() => document.documentElement.classList.contains('smart-dark'));
    const startedDark = await isSmartDark();
    await main.getByRole('button', 'Dark Mode').tap();
    await expect.poll(isSmartDark).toBe(true);
    await expect(main.getByRole('button', 'Save Settings')).toBeVisible();
    await main.getByRole('button', 'Light Mode').tap();
    await expect.poll(isSmartDark).toBe(false);

    await main.getByRole('button', startedDark ? 'Dark Mode' : 'Light Mode').tap();
    await expect.poll(isSmartDark).toBe(startedDark);
    await main.getByRole('button', 'Discard').tap();
    await expect(main.getByRole('button', 'Save Settings')).toBeHidden();
    await expect.poll(isSmartDark).toBe(startedDark);
  });

  test('Appearance: Discard reverts a previewed theme to the saved theme', { session: 'admin', tags: ['known-bug'] }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await expect(main.getByRole('heading', 'Interface Theme')).toBeVisible();
    const isSmartDark = () => browser.evaluate(() => document.documentElement.classList.contains('smart-dark'));
    const startedDark = await isSmartDark();
    await main.getByRole('button', startedDark ? 'Light Mode' : 'Dark Mode').tap();
    await expect.poll(isSmartDark).toBe(!startedDark);

    await main.getByRole('button', 'Discard').tap();
    await expect(main.getByRole('button', 'Save Settings')).toBeHidden();
    await expect.poll(isSmartDark).toBe(startedDark);
  });

  test('Settings: Back to Overview with an unsaved change asks first; Keep Editing stays and Discard Changes returns to the Admin Dashboard', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await expect(main.getByRole('switch')).toHaveCount(2);
    await main.getByRole('switch').first().tap();
    await expect(main.getByRole('button', 'Save Settings')).toBeVisible();

    const confirmHeading = screen.getByRole('heading', 'Discard Settings Changes?');
    await main.getByRole('button', 'Back to Overview').tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Keep Editing').tap();
    await expect(confirmHeading).toBeHidden();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();
    await expect(main.getByRole('button', 'Save Settings')).toBeVisible();

    await main.getByRole('button', 'Back to Overview').tap();
    await expect(confirmHeading).toBeVisible();
    await screen.getByRole('button', 'Discard Changes').tap();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();
  });

  test('Notifications: the four alert preferences are listed, and a toggled switch offers Save Settings until it is discarded', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await main.getByRole('button', 'Notifications').tap();
    await expect(main.getByRole('heading', 'Notifications')).toBeVisible();
    for (const label of ['Administrative Email Notifications', 'Academic Support Alerts', 'Security & Ingestion Telemetry Alerts', 'Daily Curriculum Digest']) {
      await expect(main.getByText(label)).toBeVisible();
    }
    const switches = main.getByRole('switch');
    await expect(switches).toHaveCount(4);

    const academic = switches.nth(1);
    const academicWasOn = await academic.isChecked();
    await academic.tap();
    await expect(academic).toBeChecked({ checked: !academicWasOn });
    await expect(main.getByRole('button', 'Save Settings')).toBeVisible();
    await academic.tap();
    await expect(academic).toBeChecked({ checked: academicWasOn });
    await main.getByRole('button', 'Discard').tap();
    await expect(main.getByRole('button', 'Save Settings')).toBeHidden();
  });

  test('Notifications: Academic Support Alerts and Security & Ingestion Telemetry Alerts keep a saved change after a reload', { session: 'admin', tags: ['known-bug'] }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    const notificationsHeading = main.getByRole('heading', 'Notifications');
    await main.getByRole('button', 'Notifications').tap();
    await expect(notificationsHeading).toBeVisible();
    const switches = main.getByRole('switch');
    await expect(switches).toHaveCount(4);
    const academic = switches.nth(1);
    const security = switches.nth(2);
    const academicWasOn = await academic.isChecked();
    const securityWasOn = await security.isChecked();

    await academic.tap();
    await security.tap();
    await expect(academic).toBeChecked({ checked: !academicWasOn });
    await expect(security).toBeChecked({ checked: !securityWasOn });
    await main.getByRole('button', 'Save Settings').tap();
    await expect(screen.getByText('System settings saved successfully')).toBeVisible({ timeout: 30_000 });

    try {
      await browser.reload();
      await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
      await screen.getByRole('button', /^Profile menu: /).tap();
      await screen.getByRole('menuitem', 'Settings').tap();
      await main.getByRole('button', 'Notifications').tap();
      await expect(switches).toHaveCount(4);
      await expect(academic).toBeChecked({ checked: !academicWasOn });
      await expect(security).toBeChecked({ checked: !securityWasOn });
    } finally {
      if (await notificationsHeading.isHidden()) {
        await screen.getByRole('button', /^Profile menu: /).tap();
        await screen.getByRole('menuitem', 'Settings').tap();
        await main.getByRole('button', 'Notifications').tap();
        await expect(switches).toHaveCount(4);
      }
      if ((await academic.isChecked()) !== academicWasOn) await academic.tap();
      if ((await security.isChecked()) !== securityWasOn) await security.tap();
      if (await main.getByRole('button', 'Save Settings').isVisible()) {
        await main.getByRole('button', 'Save Settings').tap();
        await expect(main.getByRole('button', 'Save Settings')).toBeHidden({ timeout: 30_000 });
      }
    }
  });

  test('Security: the Change Password form shows its three fields and Update Password without being submitted', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await main.getByRole('button', 'Security').tap();
    await expect(main.getByRole('heading', 'Security')).toBeVisible();
    await expect(main.getByRole('heading', 'Change Password')).toBeVisible();
    await expect(main.getByPlaceholder('••••••••')).toBeVisible();
    await expect(main.getByPlaceholder('Minimum 6 characters')).toBeVisible();
    await expect(main.getByPlaceholder('Re-enter new password')).toBeVisible();
    await expect(main.getByRole('button', 'Update Password')).toBeEnabled();
    await expect(main.getByText('Firebase Authentication Token Valid')).toBeVisible();
    await expect(main.getByText('Protected')).toBeVisible();
  });

  test('Data & Governance: Maintenance Mode, Export CSV, Clear Cache and the platform environment are shown, and Maintenance Mode is never toggled', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await main.getByRole('button', 'Data & Governance').tap();
    await expect(main.getByRole('heading', 'Data & Governance')).toBeVisible();
    await expect(main.getByRole('heading', 'System Maintenance')).toBeVisible();
    await expect(main.getByText('Maintenance Mode')).toBeVisible();
    const maintenance = main.getByRole('switch', 'Toggle maintenance mode');
    await expect(maintenance).toBeVisible();
    await expect(maintenance).toBeEnabled({ timeout: 30_000 });
    await expect(main.getByText('Maintenance settings could not be loaded; refresh to try again.')).toBeHidden();

    await expect(main.getByText('Export System Audit Trail')).toBeVisible();
    await expect(main.getByRole('button', 'Export CSV')).toBeVisible();
    await expect(main.getByText('Purge Local Browser Cache')).toBeVisible();
    await expect(main.getByRole('button', 'Clear Cache')).toBeVisible();
    await expect(main.getByText('MathPulse AI Platform Environment')).toBeVisible();
  });

  test('Data & Governance: Export CSV downloads the system audit trail as a .csv file', { session: 'admin', tags: ['known-bug'] }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', /^Profile menu: /).tap();
    await screen.getByRole('menuitem', 'Settings').tap();
    await expect(screen.getByRole('heading', 'Admin Settings')).toBeVisible();

    const main = screen.getByRole('main');
    await main.getByRole('button', 'Data & Governance').tap();
    await expect(main.getByRole('button', 'Export CSV')).toBeVisible();
    const exported = await browser.waitForDownload(() => main.getByRole('button', 'Export CSV').tap(), { timeout: 90_000 });
    expect(exported.suggestedFilename).toMatch(/\.csv$/);
  });
});
