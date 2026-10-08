import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const sectionCountBadge = /^\d+ Sections?$/;
const sectionTableHeading = 'Class Sections & Teacher Assignments';
const subjectNames = ['General Mathematics', 'Statistics and Probability', 'Business Mathematics', 'Finite Mathematics'];
const availabilitySwitchName = /^Toggle .+ availability$/;
const subjectSearchPlaceholder = 'Search by subject name or code (e.g. Pre-Calculus, GMATH)...';

describe('admin class and curriculum management', { tags: ['admin', 'class-curriculum'] }, () => {
  test('Class Sections shortcut opens Class Management with stats and one table row per section', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'Class Sections').tap();
    await expect(screen.getByRole('heading', 'Class Management', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', sectionTableHeading)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByText('Total Sections')).toBeVisible();
    await expect(screen.getByText('With Teacher')).toBeVisible();
    await expect(screen.getByText('No Teacher')).toBeVisible();

    const sectionCount = Number((await screen.getByText(sectionCountBadge).textContent())?.match(/^\d+/)?.[0] ?? Number.NaN);
    test.skip(sectionCount === 0, 'no class sections exist yet, so only the empty state renders');
    const table = screen.getByRole('table');
    await expect(table.getByRole('columnheader', 'Class Section')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Enrolled Learners')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Assigned Teacher')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Assign / Reassign Teacher')).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(sectionCount + 1);
    await expect(table.getByRole('combobox')).toHaveCount(sectionCount);
  });

  test('section filter shows the empty state for no match and Clear filter restores the list', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Class Management').tap();
    await expect(screen.getByRole('heading', sectionTableHeading)).toBeVisible({ timeout: 30_000 });
    const badge = screen.getByText(sectionCountBadge);
    const badgeBefore = (await badge.textContent()) ?? '';

    const filter = screen.getByPlaceholder('Filter sections, teachers, or grades...');
    await filter.fill('zz-no-such-section-e2e');
    await expect(screen.getByText('No class sections found')).toBeVisible();
    await expect(badge).toHaveText('0 Sections');
    await expect(screen.getByRole('table')).toBeHidden();

    await screen.getByRole('button', 'Clear filter').tap();
    await expect(filter).toHaveValue('');
    await expect(badge).toHaveText(badgeBefore);
  });

  test('Reassign and Unassign confirmations open from a managed section and Cancel keeps its teacher', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Class Management').tap();
    await expect(screen.getByRole('heading', sectionTableHeading)).toBeVisible({ timeout: 30_000 });

    const managedRow = screen.getByRole('table').getByRole('row').filter({ has: screen.getByRole('button', 'Unassign') }).first();
    test.skip((await managedRow.count()) === 0, 'no class section has a teacher yet, so Reassign and Unassign never render');
    const teacherSelect = managedRow.getByRole('combobox');
    const currentTeacher = await teacherSelect.inputValue();
    const optionValues = await Promise.all((await teacherSelect.getByRole('option').all()).map((option) => option.getAttribute('value')));
    const otherTeacherIndex = optionValues.findIndex((value) => value !== null && value !== '' && value !== currentTeacher);
    test.skip(otherTeacherIndex < 0, 'the section manager is the only teacher, so no different teacher can be picked');
    const managerCell = managedRow.getByRole('cell').nth(2);
    const managerBefore = (await managerCell.textContent()) ?? '';

    await teacherSelect.selectOption({ index: otherTeacherIndex });
    await managedRow.getByRole('button', 'Reassign').tap();
    await expect(screen.getByRole('heading', 'Reassign teacher?')).toBeVisible();
    await expect(screen.getByText('This will replace the current teacher assigned to this class section.')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Reassign teacher?')).toBeHidden();
    await expect(managerCell).toHaveText(managerBefore);
    await teacherSelect.selectOption({ value: currentTeacher });
    await expect(teacherSelect).toHaveValue(currentTeacher);

    await managedRow.getByRole('button', 'Unassign').tap();
    await expect(screen.getByRole('heading', 'Unassign teacher?')).toBeVisible();
    await expect(screen.getByText('This will remove the current teacher assignment from this class section.')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Unassign teacher?')).toBeHidden();
    await expect(managerCell).toHaveText(managerBefore);
  });

  test('Curriculum Control lists every subject with its availability switch', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Curriculum Control').tap();
    await expect(screen.getByRole('heading', 'Curriculum Control', { level: 1 })).toBeVisible();

    await expect(screen.getByText('Total Subjects')).toBeVisible();
    await expect(screen.getByText('Linked Materials')).toBeVisible();
    const table = screen.getByRole('table');
    await expect(table.getByRole('columnheader', 'Subject')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Grade / Term')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Status')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Access')).toBeVisible();
    for (const subjectName of subjectNames) {
      await expect(screen.getByRole('switch', `Toggle ${subjectName} availability`)).toBeVisible();
    }
    await expect(screen.getByRole('switch', availabilitySwitchName)).toHaveCount(subjectNames.length);
  });

  test('How It Works modal opens from the header and closes with Got It and with the X', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Curriculum Control').tap();
    await expect(screen.getByRole('heading', 'Curriculum Control', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'How it works').tap();
    const help = screen.getByRole('dialog', 'How It Works: Curriculum Control');
    await expect(help).toBeVisible();
    await expect(help.getByText('4-Stage Curriculum Governance & RAG Knowledge Pipeline')).toBeVisible();
    await help.getByRole('button', 'Got It').tap();
    await expect(help).toBeHidden();

    await screen.getByRole('button', 'How it works').tap();
    await expect(help).toBeVisible();
    await help.getByRole('button', 'Close modal').tap();
    await expect(help).toBeHidden();
  });

  test('subject search narrows by name and code, and Clear subject search and Reset restore it', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Curriculum Control').tap();
    await expect(screen.getByRole('heading', 'Curriculum Control', { level: 1 })).toBeVisible();
    const switches = screen.getByRole('switch', availabilitySwitchName);
    await expect(switches).toHaveCount(subjectNames.length);

    const search = screen.getByPlaceholder(subjectSearchPlaceholder);
    await search.fill('Finite');
    await expect(switches).toHaveCount(1);
    await expect(screen.getByRole('switch', 'Toggle Finite Mathematics availability')).toBeVisible();
    await screen.getByRole('button', 'Clear subject search').tap();
    await expect(search).toHaveValue('');
    await expect(switches).toHaveCount(subjectNames.length);

    await search.fill('BUS MATH');
    await expect(switches).toHaveCount(1);
    await expect(screen.getByRole('switch', 'Toggle Business Mathematics availability')).toBeVisible();

    await search.fill('zz-no-such-subject-e2e');
    await expect(screen.getByText('No subjects found')).toBeVisible();
    await expect(switches).toHaveCount(0);
    await screen.getByRole('button', 'Reset').tap();
    await expect(search).toHaveValue('');
    await expect(switches).toHaveCount(subjectNames.length);
  });

  test('grade and status filters narrow the subjects and Reset clears them', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Curriculum Control').tap();
    await expect(screen.getByRole('heading', 'Curriculum Control', { level: 1 })).toBeVisible();
    const switches = screen.getByRole('switch', availabilitySwitchName);
    await expect(switches).toHaveCount(subjectNames.length);

    const table = screen.getByRole('table');
    await expect(table.getByText('Grade 11').first()).toBeVisible();
    const gradeFilter = screen.getByRole('combobox').filter({ hasText: 'All Grades' });
    await gradeFilter.tap();
    await screen.getByRole('option', 'Grade 12').tap();
    await expect(table.getByText('Grade 11')).toHaveCount(0);
    await screen.getByRole('button', 'Reset').tap();
    await expect(gradeFilter).toBeVisible();
    await expect(switches).toHaveCount(subjectNames.length);

    const statusFilter = screen.getByRole('combobox').filter({ hasText: 'All Statuses' });
    await statusFilter.tap();
    await screen.getByRole('option', 'Available').tap();
    await expect(screen.getByRole('button', 'Reset')).toBeVisible();
    await expect(table.getByText('Locked')).toHaveCount(0);
    await screen.getByRole('button', 'Reset').tap();
    await expect(statusFilter).toBeVisible();
    await expect(switches).toHaveCount(subjectNames.length);
  });
});
