import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const userRecordsFooter = /^Showing \d+–\d+ of \d+ user records$/;
const editButtonName = /^Edit .+$/;
const userSearchPlaceholder = 'Search name, email, LRN…';
const missingUserQuery = 'zz-no-such-user-e2e';

describe('admin console', { tags: ['admin', 'admin-console'] }, () => {
  test('Overview header chips show student, teacher and AI session totals', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('...')).toHaveCount(0, { timeout: 60_000 });

    const header = screen.getByRole('banner');
    await expect(header.getByText(/^[\d,]+ Students$/)).toBeVisible();
    await expect(header.getByText(/^[\d,]+ Teachers$/)).toBeVisible();
    await expect(header.getByText(/^[\d,]+ AI Sessions$/)).toBeVisible();
    await expect(screen.getByText('Teaching Faculty')).toBeVisible();
    await expect(screen.getByText('AI Tutor Sessions')).toBeVisible();
    await expect(screen.getByText('Academic Support Need')).toBeVisible();
  });

  test('Subject Mastery Matrix CSV button downloads subject-mastery-matrix.csv', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('...')).toHaveCount(0, { timeout: 60_000 });
    await expect(screen.getByRole('heading', 'Subject Mastery Matrix')).toBeVisible();

    const download = await browser.waitForDownload(() =>
      screen.getByRole('button', 'Export subject breakdown as CSV').tap(),
    );
    expect(download.suggestedFilename).toBe('subject-mastery-matrix.csv');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();
  });

  test('Analytics Hub shortcut opens Analytics and the sidebar returns to Overview', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'Analytics Hub').tap();
    await expect(screen.getByRole('heading', 'Analytics', { level: 1 })).toBeVisible();

    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Overview').tap();
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible();
  });

  test('Live Campus Stream shows the activity feed and its Audit Log link opens the Audit Log', { session: 'admin' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText('...')).toHaveCount(0, { timeout: 60_000 });

    await expect(screen.getByRole('heading', 'Live Campus Stream')).toBeVisible();
    await expect(screen.getByText('Real-time administrative actions and security logs')).toBeVisible();
    await screen.getByRole('heading', 'Live Campus Stream').scrollIntoView();
    await agent.assert('the Live Campus Stream card lists up to four recent audit actions, or says no recent system activity was recorded today');

    await screen.getByRole('main').getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
  });

  test('user search narrows to no matches, and Clear search and Reset Filters restore the list', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const editButtons = screen.getByRole('table').getByRole('button', editButtonName);
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    const footer = screen.getByText(userRecordsFooter);
    const footerBefore = (await footer.textContent()) ?? '';

    const search = screen.getByPlaceholder(userSearchPlaceholder);
    await search.fill(missingUserQuery);
    await expect(screen.getByRole('heading', 'No matching users')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText(`"${missingUserQuery}"`)).toBeVisible();
    await expect(editButtons).toHaveCount(0);

    await screen.getByRole('button', 'Clear search').tap();
    await expect(search).toHaveValue('');
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    await expect(footer).toHaveText(footerBefore);

    await search.fill(missingUserQuery);
    await expect(screen.getByRole('heading', 'No matching users')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Reset Filters').tap();
    await expect(search).toHaveValue('');
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    await expect(footer).toHaveText(footerBefore);
  });

  test('search finds a user by email and by name', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const table = screen.getByRole('table');
    const editButtons = table.getByRole('button', editButtonName);
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    const userName = ((await editButtons.first().getAttribute('aria-label')) ?? '').replace(/^Edit /, '');
    const userEmail = (await table.getByRole('row').nth(1).getByText(/@/).textContent()) ?? '';

    const search = screen.getByPlaceholder(userSearchPlaceholder);
    await search.fill(missingUserQuery);
    await expect(screen.getByRole('heading', 'No matching users')).toBeVisible({ timeout: 30_000 });

    await search.fill(userEmail);
    await expect(editButtons).toHaveCount(1, { timeout: 30_000 });
    await expect(editButtons.first()).toHaveAttribute('aria-label', `Edit ${userName}`);
    await expect(table.getByText(userEmail)).toBeVisible();

    await search.fill(missingUserQuery);
    await expect(screen.getByRole('heading', 'No matching users')).toBeVisible({ timeout: 30_000 });
    await search.fill(userName);
    await expect(table.getByRole('button', `Edit ${userName}`).first()).toBeVisible({ timeout: 30_000 });
  });

  test('search finds a student by LRN', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const table = screen.getByRole('table');
    await expect(table.getByRole('button', editButtonName).first()).toBeVisible({ timeout: 30_000 });
    const lrnLabel = table.getByText(/^LRN: \d{12}$/).first();
    test.skip((await lrnLabel.count()) === 0, 'no listed student has a 12-digit LRN');
    const lrn = ((await lrnLabel.textContent()) ?? '').replace('LRN: ', '');

    const search = screen.getByPlaceholder(userSearchPlaceholder);
    await search.fill(missingUserQuery);
    await expect(screen.getByRole('heading', 'No matching users')).toBeVisible({ timeout: 30_000 });
    await search.fill(lrn);
    await expect(table.getByText(`LRN: ${lrn}`).first()).toBeVisible({ timeout: 30_000 });
  });

  test('All Roles filter narrows the table to educators and Clear all restores every role', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const table = screen.getByRole('table');
    const editButtons = table.getByRole('button', editButtonName);
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    const footer = screen.getByText(userRecordsFooter);
    const footerBefore = (await footer.textContent()) ?? '';

    const roleFilter = screen.getByRole('combobox').filter({ hasText: 'All Roles' });
    await roleFilter.tap();
    await screen.getByRole('option', 'Educator').tap();
    await expect(screen.getByText('Role: Educator')).toBeVisible();
    await expect(table.getByText('Student')).toHaveCount(0, { timeout: 30_000 });
    await expect(table.getByText('Administrator')).toHaveCount(0);
    await expect(table.getByText('Teacher').first()).toBeVisible();

    await screen.getByRole('button', 'Clear all').tap();
    await expect(roleFilter).toBeVisible();
    await expect(screen.getByText('Role: Educator')).toBeHidden();
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });
    await expect(footer).toHaveText(footerBefore, { timeout: 30_000 });
  });

  test('Refresh users reloads the list and the pager steps through 10-per-page results', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const editButtons = screen.getByRole('table').getByRole('button', editButtonName);
    await expect(editButtons.first()).toBeVisible({ timeout: 30_000 });

    const refresh = screen.getByRole('button', 'Refresh users');
    await refresh.tap();
    await expect(refresh).toBeEnabled({ timeout: 30_000 });
    await expect(editButtons.first()).toBeVisible();

    const footer = screen.getByText(userRecordsFooter);
    const totalAt25 = Number((await footer.textContent())?.match(/of (\d+) user records$/)?.[1] ?? Number.NaN);
    await screen.getByRole('combobox').filter({ hasText: '25/page' }).tap();
    await screen.getByRole('option', '10/page').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: '10/page' })).toBeVisible();
    await expect(editButtons).toHaveCount(Math.min(totalAt25, 10), { timeout: 30_000 });
    const total = Number((await footer.textContent())?.match(/of (\d+) user records$/)?.[1] ?? Number.NaN);
    await expect(screen.getByText(/^Page 1 of \d+$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Previous page')).toBeDisabled();
    test.skip(total <= 10, 'ten or fewer users exist, so there is no second page');

    await screen.getByRole('button', 'Next page').tap();
    await expect(screen.getByText(/^Page 2 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await expect(footer).toHaveText(`Showing 11–${Math.min(total, 20)} of ${total} user records`);
    await expect(editButtons).toHaveCount(Math.min(total - 10, 10), { timeout: 30_000 });

    await screen.getByRole('button', 'Previous page').tap();
    await expect(screen.getByText(/^Page 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await expect(editButtons).toHaveCount(10, { timeout: 30_000 });
  });

  test('Add User dialog blocks an empty or incomplete submit and Cancel closes it without onboarding', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('table').getByRole('button', editButtonName).first()).toBeVisible({ timeout: 30_000 });
    const footer = screen.getByText(userRecordsFooter);
    const footerBefore = (await footer.textContent()) ?? '';

    await screen.getByRole('button', 'Add User').tap();
    const dialog = screen.getByRole('dialog', 'Onboard New Academic User');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('System Enrollment Pipeline')).toBeVisible();
    const nameInput = dialog.getByPlaceholder('e.g. Maria Santos');
    const emailInput = dialog.getByPlaceholder('name@school.edu.ph');
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');
    await expect(dialog.getByPlaceholder('123456789012')).toBeVisible();
    await expect(dialog.getByPlaceholder('At least 8 characters')).toBeVisible();

    await dialog.getByRole('button', 'Onboard User').tap();
    await expect(screen.getByText('Name and email are required')).toBeVisible();
    await expect(dialog).toBeVisible();

    await nameInput.fill('E2E Validation Probe');
    await emailInput.fill('nobody+admin-onboard@example.test');
    await dialog.getByRole('button', 'Onboard User').tap();
    await expect(dialog.getByText('LRN must be exactly 12 digits.')).toBeVisible();
    await expect(dialog.getByText('Password must be at least 8 characters.')).toBeVisible();
    await expect(dialog.getByText('Confirm password is required.')).toBeVisible();

    await dialog.getByRole('combobox').filter({ hasText: 'Student' }).tap();
    await screen.getByRole('option', 'Teacher').tap();
    await expect(dialog.getByPlaceholder('Mathematics Department')).toBeVisible();
    await expect(dialog.getByPlaceholder('123456789012')).toBeHidden();

    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();
    await expect(footer).toHaveText(footerBefore);
  });

  test('Add Faculty or Student shortcut opens the onboarding dialog preset to Teacher', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'Add Faculty or Student').tap();
    const dialog = screen.getByRole('dialog', 'Onboard New Academic User');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox').filter({ hasText: 'Teacher' })).toBeVisible();
    await expect(dialog.getByPlaceholder('Mathematics Department')).toBeVisible();
    await expect(dialog.getByPlaceholder('123456789012')).toBeHidden();

    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
  });

  test('Edit dialog opens with the user prefilled and a read-only email, and Cancel closes it', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const firstEdit = screen.getByRole('table').getByRole('button', editButtonName).first();
    await expect(firstEdit).toBeVisible({ timeout: 30_000 });
    const userName = ((await firstEdit.getAttribute('aria-label')) ?? '').replace(/^Edit /, '');

    await firstEdit.tap();
    const dialog = screen.getByRole('dialog', 'Edit User Credentials & Access');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByPlaceholder('e.g. Maria Santos')).toHaveValue(userName);
    await expect(dialog.getByPlaceholder('name@school.edu.ph')).toHaveAttribute('readonly');
    await expect(dialog.getByPlaceholder('At least 8 characters')).toBeHidden();
    await expect(dialog.getByRole('button', 'Save Changes')).toBeVisible();

    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();
    await expect(firstEdit).toHaveAttribute('aria-label', `Edit ${userName}`);
  });

  test('ticking one user row opens the bulk action bar and unticking closes it', { session: 'admin', timeout: 180_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'User Management').tap();
    await expect(screen.getByRole('heading', 'User Management', { level: 1 })).toBeVisible();
    const table = screen.getByRole('table');
    await expect(table.getByRole('button', editButtonName).first()).toBeVisible({ timeout: 30_000 });

    const rowCheckbox = table.getByRole('row').nth(1).getByRole('checkbox');
    await rowCheckbox.tap();
    await expect(rowCheckbox).toBeChecked();
    await expect(screen.getByText('1 chosen')).toBeVisible();
    await expect(screen.getByRole('button', 'Apply Role')).toBeVisible();
    await expect(screen.getByRole('button', 'Set Status')).toBeVisible();
    await expect(screen.getByRole('button', 'Reset Pass')).toBeVisible();
    await expect(screen.getByRole('button', 'Export')).toBeVisible();
    await expect(screen.getByRole('button', 'Delete')).toBeVisible();
    await expect(screen.getByRole('button', /^Select All \d+$/)).toBeVisible();

    await rowCheckbox.tap();
    await expect(rowCheckbox).toBeChecked({ checked: false });
    await expect(screen.getByRole('button', 'Apply Role')).toBeHidden();
    await expect(screen.getByText('1 chosen')).toBeHidden();
  });
});
