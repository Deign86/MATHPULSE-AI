import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const studentsHeadingName = /^Students \(\d+\)$/;
const noClass = 'the e2e teacher has no class, so Class Analytics shows only the empty-state card';

describe('teacher class analytics', { tags: ['teacher', 'class-analytics'] }, () => {
  test('My Classes shows the class header, stat cards, charts and student lists', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const studentsHeading = screen.getByRole('heading', studentsHeadingName);
    const hasClass = await studentsHeading.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);

    await expect(screen.getByText(/^Manager: .+$/)).toBeVisible();
    await expect(screen.getByText('Class Average')).toBeVisible();
    await expect(screen.getByText('Module Completion')).toBeVisible();
    await expect(screen.getByText('Active Engagement')).toBeVisible();
    await expect(screen.getByText('At-Risk Rate')).toBeVisible();
    await expect(screen.getByRole('heading', 'Risk Distribution')).toBeVisible();
    await expect(screen.getByRole('heading', 'Topic Performance')).toBeVisible();
    await expect(screen.getByRole('heading', 'Top Performers')).toBeVisible();
    await expect(screen.getByRole('heading', 'Needs Attention')).toBeVisible();
    await expect(screen.getByRole('button', 'AI Class Insights')).toBeVisible();
    await expect(screen.getByRole('button', /^(Generate|Refresh) AI Analysis$/)).toBeVisible();
    await expect(screen.getByRole('button', /^Section Management/)).toBeVisible();

    await screen.getByRole('main').getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('filter chips and search narrow the student cards and restore them', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const studentsHeading = screen.getByRole('heading', studentsHeadingName);
    const hasClass = await studentsHeading.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);

    const studentCount = async () => Number((await studentsHeading.textContent())?.match(/\((\d+)\)/)?.[1] ?? Number.NaN);
    const total = await studentCount();
    test.skip(total === 0, 'the first class has no students');
    const removeButtons = screen.getByRole('button', /^Remove .+ from class$/);
    await expect(removeButtons.first()).toBeVisible();

    const allChip = screen.getByRole('button', 'Filter all students');
    const selectedChipClass = /bg-\[#a855f7\]/;
    await expect(browser).toHaveClass(allChip, selectedChipClass);
    await screen.getByRole('button', 'Filter top performers').tap();
    await expect(browser).not.toHaveClass(allChip, selectedChipClass);
    await expect.poll(studentCount).toBeLessThanOrEqual(total);
    await screen.getByRole('button', 'Filter students needing attention').tap();
    await expect(browser).not.toHaveClass(allChip, selectedChipClass);
    await expect.poll(studentCount).toBeLessThanOrEqual(total);
    await allChip.tap();
    await expect(browser).toHaveClass(allChip, selectedChipClass);
    await expect.poll(studentCount).toBe(total);

    const search = screen.getByPlaceholder('Search students...');
    const firstName = ((await removeButtons.first().getAttribute('aria-label')) ?? '').replace(/^Remove (.+) from class$/, '$1');
    await search.fill(firstName);
    await expect(screen.getByRole('button', `Remove ${firstName} from class`).first()).toBeVisible();
    await expect.poll(studentCount).toBeGreaterThan(0);
    await search.fill('zz-no-such-student-e2e');
    await expect(studentsHeading).toHaveAccessibleName('Students (0)');
    await expect(removeButtons).toHaveCount(0);
    await search.clear();
    await expect.poll(studentCount).toBe(total);
    await expect(removeButtons.first()).toBeVisible();
  });

  test('class switcher changes the analyzed class', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const switcher = screen.getByRole('combobox', 'Select class to view analytics');
    const multiClass = await switcher.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!multiClass, 'the e2e teacher manages one class, so the class switcher is not rendered');

    const options = switcher.getByRole('option');
    const classNames = (await options.allTextContents()).map((label) => label.replace(/ \(\d+ students\)$/, ''));
    const optionValues = await Promise.all((await options.all()).map((option) => option.getAttribute('value')));
    const currentIndex = optionValues.indexOf(await switcher.inputValue());
    const otherIndex = currentIndex === 0 ? 1 : 0;

    await switcher.selectOption({ index: otherIndex });
    await expect(screen.getByRole('heading', classNames[otherIndex] ?? '', { level: 1 })).toBeVisible();
    await switcher.selectOption({ index: currentIndex });
    await expect(screen.getByRole('heading', classNames[currentIndex] ?? '', { level: 1 })).toBeVisible();
  });

  test('Add students modal opens and closes without adding anyone', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const studentsHeading = screen.getByRole('heading', studentsHeadingName);
    const hasClass = await studentsHeading.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    const rosterBefore = (await studentsHeading.textContent()) ?? '';

    await screen.getByRole('button', 'Add students to class').tap();
    const title = screen.getByRole('heading', /^Add Students to .+$/);
    await expect(title).toBeVisible();
    await expect(screen.getByText(/^0 of \d+ selected$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Select All')).toBeVisible();
    await expect(screen.getByRole('button', 'Add 0 Students')).toBeDisabled();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(title).toBeHidden();

    await screen.getByRole('button', 'Add students to class').tap();
    await expect(title).toBeVisible();
    await screen.getByRole('button', 'Close dialog').tap();
    await expect(title).toBeHidden();
    await expect(studentsHeading).toHaveText(rosterBefore);
  });

  test('Create system account modal opens for a roster-only student and Cancel closes it', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const studentsHeading = screen.getByRole('heading', studentsHeadingName);
    const hasClass = await studentsHeading.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);

    const removeButton = screen.getByRole('button', /^Remove .+ from class$/).first();
    const hasStudents = await removeButton.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasStudents, 'the first class has no students');

    const createAccount = screen.getByRole('button', /^Create system account for .+$/).first();
    let rosterOnly = await createAccount.waitFor({ timeout: 5_000 }).then(() => true, () => false);
    const firstCard = rosterOnly ? null : await removeButton.boundingBox();
    if (firstCard) {
      await browser.mouse.move(firstCard.x - 40, firstCard.y + firstCard.height / 2);
      for (let wheelStep = 0; wheelStep < 25 && !rosterOnly; wheelStep += 1) {
        await browser.mouse.wheel(0, 300);
        rosterOnly = await createAccount.waitFor({ timeout: 1_000 }).then(() => true, () => false);
      }
    }
    test.skip(!rosterOnly, 'the class has no roster-only student, so no + Create button is shown');

    const studentName = ((await createAccount.getAttribute('aria-label')) ?? '').replace(/^Create system account for /, '');
    const rosterOnlyButton = screen.getByRole('button', `Create system account for ${studentName}`).first();
    await rosterOnlyButton.tap();
    const dialog = screen.getByRole('dialog', 'Create Student Account');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Provision a system account for ${studentName}.`)).toBeVisible();
    await expect(dialog.getByPlaceholder('student@school.example')).toBeVisible();
    await expect(dialog.getByRole('button', 'Regenerate temporary password')).toBeVisible();
    await expect(dialog.getByRole('button', 'Create account')).toBeEnabled();

    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();
    await expect(rosterOnlyButton).toBeVisible();
  });

  test('Section Management expands and collapses', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const sectionPanel = screen.getByRole('button', /^Section Management/);
    const hasClass = await sectionPanel.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);

    const sectionSummaries = screen.getByText(/^(\d+ students?|No students yet\. Add students to this teacher to manage section assignments\.)$/);
    const summariesCollapsed = await sectionSummaries.count();
    await expect(sectionPanel).not.toBeExpanded();
    await expect(sectionPanel).toHaveAccessibleName(/Reassign Students$/);
    await sectionPanel.tap();
    await expect(sectionPanel).toBeExpanded();
    await expect(sectionPanel).toHaveAccessibleName(/Hide Sections$/);
    await expect.poll(() => sectionSummaries.count()).toBeGreaterThan(summariesCollapsed);

    await sectionPanel.tap();
    await expect(sectionPanel).not.toBeExpanded();
    await expect(sectionPanel).toHaveAccessibleName(/Reassign Students$/);
    await expect.poll(() => sectionSummaries.count()).toBe(summariesCollapsed);
  });

  test('staging a section move shows Move, and reverting the section hides it without saving', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const sectionPanel = screen.getByRole('button', /^Section Management/);
    const hasClass = await sectionPanel.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);

    await sectionPanel.tap();
    await expect(sectionPanel).toBeExpanded();
    const sectionSelect = screen.getByRole('combobox', /^Reassign section for .+$/).first();
    const movable = await sectionSelect.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!movable, 'the e2e teacher has one class section, so there is no other section to move a student to');

    const originalSection = await sectionSelect.inputValue();
    const sectionOptions = sectionSelect.getByRole('option');
    const currentOption = sectionOptions.filter({ hasText: /\(Current\)$/ });
    test.skip((await currentOption.count()) === 0, 'the first student has no section on record, so no option is marked (Current)');
    await expect(currentOption).toHaveCount(1);
    const optionValues = await Promise.all((await sectionOptions.all()).map((option) => option.getAttribute('value')));
    const move = screen.getByRole('button', 'Move');
    await expect(move).toBeHidden();

    await sectionSelect.selectOption({ index: optionValues.indexOf(originalSection) === 0 ? 1 : 0 });
    await expect(move).toBeVisible();
    await sectionSelect.selectOption({ value: originalSection });
    await expect(move).toBeHidden();
    await expect(sectionSelect).toHaveValue(originalSection);
  });
});
