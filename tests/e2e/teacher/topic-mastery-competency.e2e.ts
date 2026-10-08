import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const topicSelection = /^SELECT \(\d+–\d+ OF \d+\)$/;
const moduleRange = /^Showing \d+–\d+ of \d+ modules$/;
const studentRange = /^Showing \d+ to \d+ of \d+ students$/;
const noClass = 'the e2e teacher has no classes';
const noTopics = 'the e2e teacher has no topic mastery data';
const noStudents = 'the competency table has no students';

describe('teacher topic mastery and competency matrix', { tags: ['teacher', 'topic-mastery'] }, () => {
  test('Student Mastery Matrix shows the filters, stat cards and topic grid', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await expect(screen.getByRole('heading', 'Topic Mastery', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Student Mastery Matrix')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Module Availability & Materials')).toBeVisible();

    await expect(screen.getByPlaceholder('Search topics...')).toBeVisible();
    await expect(screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Subjects') })).toHaveValue('all');
    await expect(screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Grades') })).toHaveValue('all');
    await expect(screen.getByText('Total Topics')).toBeVisible();
    await expect(screen.getByText('Tracked in System')).toBeVisible();
    await expect(screen.getByText('Mastered by Class')).toBeVisible();
    await expect(screen.getByText('Requires Intervention')).toBeVisible();
    await expect(screen.getByText('Excluded from Quizzes')).toBeVisible();
    await expect(screen.getByText('TOPIC NAME')).toBeVisible();
    await expect(screen.getByText('UNIT')).toBeVisible();
    await expect(screen.getByText('CLASS AVG %')).toBeVisible();
    await expect(screen.getByText('STUDENTS')).toBeVisible();
    await expect(screen.getByText('STATUS')).toBeVisible();
    await expect(screen.getByText('EXCLUDE')).toBeVisible();
    await expect(screen.getByRole('checkbox', topicSelection)).toBeVisible();
  });

  test('topic search empties the grid and clearing it restores the topics', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    const selection = screen.getByText(topicSelection);
    await expect(selection).toBeVisible({ timeout: 30_000 });
    const before = (await selection.textContent()) ?? '';

    const search = screen.getByPlaceholder('Search topics...');
    await search.fill('zz-no-such-topic-e2e');
    await expect(selection).toHaveText('SELECT (0–0 OF 0)');
    await expect(screen.getByText(/^(No topics match the current filters\.|No topic data available yet)$/)).toBeVisible();
    await search.clear();
    await expect(selection).toHaveText(before);
  });

  test('selecting the page opens the bulk bar and Clear Selection closes it without excluding', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    const selection = screen.getByText(topicSelection);
    await expect(selection).toBeVisible({ timeout: 30_000 });
    const label = (await selection.textContent()) ?? '';
    test.skip(label.endsWith('OF 0)'), noTopics);
    const pageCount = Number(label.match(/–(\d+) OF/)?.[1] ?? Number.NaN);

    const selectPage = screen.getByRole('checkbox', topicSelection);
    await selectPage.check();
    await expect(screen.getByText(`${pageCount} topics selected`)).toBeVisible();
    await expect(screen.getByRole('button', 'Exclude Selected')).toBeVisible();
    await expect(screen.getByRole('button', 'Include Selected')).toBeVisible();
    await screen.getByRole('button', 'Clear Selection').tap();
    await expect(screen.getByText(/^\d+ topics selected$/)).toBeHidden();
    await expect(selectPage).toBeChecked({ checked: false });
  });

  test('topic name header sorts the grid A to Z and back', { session: 'teacher' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    const selection = screen.getByText(topicSelection);
    await expect(selection).toBeVisible({ timeout: 30_000 });
    test.skip(/OF [01]\)$/.test((await selection.textContent()) ?? ''), 'fewer than two topics to sort');

    await screen.getByText('TOPIC NAME').tap();
    await agent.assert('the topic rows in the topic mastery table are ordered alphabetically by topic name from A to Z');
    await screen.getByText('TOPIC NAME').tap();
    await agent.assert('the topic rows in the topic mastery table are ordered by topic name from Z to A');
  });

  test('topic grid pages forward and back and changes rows per page', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    const selection = screen.getByText(topicSelection);
    await expect(selection).toBeVisible({ timeout: 30_000 });
    const total = Number(((await selection.textContent()) ?? '').match(/OF (\d+)\)$/)?.[1] ?? 0);
    test.skip(total <= 10, 'ten or fewer topics, so the grid has a single page');

    await expect(screen.getByRole('button', 'Previous page')).toBeDisabled();
    await screen.getByRole('button', 'Next page').tap();
    await expect(selection).toHaveText(`SELECT (11–${Math.min(20, total)} OF ${total})`);
    await expect(screen.getByText(`Showing 11 to ${Math.min(20, total)} of ${total} topics`)).toBeVisible();
    await screen.getByRole('button', 'Previous page').tap();
    await expect(selection).toHaveText(`SELECT (1–10 OF ${total})`);

    await screen.getByRole('combobox', 'Rows per page').selectOption('20');
    await expect(selection).toHaveText(`SELECT (1–${Math.min(20, total)} OF ${total})`);
  });

  test('subject and grade filters narrow the grid and the All options restore it', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    const selection = screen.getByText(topicSelection);
    await expect(selection).toBeVisible({ timeout: 30_000 });
    const before = (await selection.textContent()) ?? '';
    const totalBefore = Number(before.match(/OF (\d+)\)$/)?.[1] ?? 0);
    test.skip(totalBefore === 0, noTopics);
    const filteredTotal = async () => Number(((await selection.textContent()) ?? '').match(/OF (\d+)\)$/)?.[1] ?? Number.NaN);

    const subjectFilter = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Subjects') });
    await subjectFilter.selectOption({ index: 1 });
    await expect(subjectFilter).not.toHaveValue('all');
    await expect.poll(filteredTotal).toBeLessThanOrEqual(totalBefore);
    await subjectFilter.selectOption('All Subjects');
    await expect(subjectFilter).toHaveValue('all');
    await expect(selection).toHaveText(before);

    const gradeFilter = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Grades') });
    await gradeFilter.selectOption({ index: 1 });
    await expect(gradeFilter).not.toHaveValue('all');
    await expect.poll(filteredTotal).toBeLessThanOrEqual(totalBefore);
    await gradeFilter.selectOption('All Grades');
    await expect(gradeFilter).toHaveValue('all');
    await expect(selection).toHaveText(before);
  });

  test('Class section scopes the matrix to one class and All Classes restores it', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await expect(screen.getByText(topicSelection)).toBeVisible({ timeout: 30_000 });

    const classSection = screen.getByRole('combobox', 'Class section');
    test.skip((await classSection.count()) === 0, 'no class has a section id, so the Class section filter is not rendered');
    await expect(classSection).toHaveValue('');
    const sectionValue = (await classSection.getByRole('option').nth(1).getAttribute('value')) ?? '';
    await classSection.selectOption({ index: 1 });
    await expect(classSection).toHaveValue(sectionValue, { timeout: 30_000 });
    await expect(screen.getByText(topicSelection)).toBeVisible({ timeout: 30_000 });

    await classSection.selectOption('All Classes');
    await expect(classSection).toHaveValue('', { timeout: 30_000 });
    await expect(screen.getByText(topicSelection)).toBeVisible({ timeout: 30_000 });
  });

  test('Module Availability & Materials lists modules with status cards, filters and paging', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await screen.getByRole('button', 'Module Availability & Materials').tap({ timeout: 30_000 });
    await expect(screen.getByRole('heading', 'Curriculum Module Availability')).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh Statuses');
    await expect(refresh).toBeEnabled({ timeout: 30_000 });

    await expect(screen.getByText('DepEd Active')).toBeVisible();
    await expect(screen.getByText('Custom PDFs')).toBeVisible();
    await expect(screen.getByText('In Pipeline')).toBeVisible();
    await expect(screen.getByText('Disabled')).toBeVisible();
    await expect(screen.getByPlaceholder('Search module title, code, or domain...')).toBeVisible();
    await expect(screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Subjects') })).toHaveValue('all');
    await expect(screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Quarters') })).toHaveValue('all');
    await expect(screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Statuses') })).toHaveValue('all');
    const table = screen.getByRole('table').filter({ has: screen.getByRole('columnheader', 'Availability Status') });
    await expect(table.getByRole('columnheader', 'Module')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Subject & Quarter')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Material')).toBeVisible();
    await expect(table.getByRole('columnheader', 'Action')).toBeVisible();

    const range = screen.getByText(moduleRange);
    await expect(range).toBeVisible();
    const total = Number(((await range.textContent()) ?? '').match(/of (\d+) modules$/)?.[1] ?? 0);
    await expect(screen.getByText(/^Page 1 of \d+$/)).toBeVisible();
    if (total > 10) {
      await screen.getByRole('button', 'Next Page').tap();
      await expect(range).toHaveText(`Showing 11–${Math.min(20, total)} of ${total} modules`);
      await expect(screen.getByText(/^Page 2 of \d+$/)).toBeVisible();
      await screen.getByRole('button', 'Previous Page').tap();
      await expect(range).toHaveText(`Showing 1–10 of ${total} modules`);
    }

    await refresh.tap();
    await expect(refresh).toBeEnabled({ timeout: 30_000 });
    await expect(range).toBeVisible();
  });

  test('status cards and the quarter filter narrow the module table', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await screen.getByRole('button', 'Module Availability & Materials').tap({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Refresh Statuses')).toBeEnabled({ timeout: 30_000 });
    const table = screen.getByRole('table').filter({ has: screen.getByRole('columnheader', 'Availability Status') });
    const range = screen.getByText(moduleRange);
    await expect(range).toBeVisible();
    const before = (await range.textContent()) ?? '';

    const statusFilter = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Statuses') });
    await screen.getByText('DepEd Active').tap();
    await expect(statusFilter).toHaveValue('available');
    await expect(screen.getByText('Filtered')).toBeVisible();
    await expect(table.getByRole('cell', 'Available').first()).toBeVisible();
    await expect(table.getByRole('cell', /^(Teacher Material|Coming Soon|Unavailable)$/)).toHaveCount(0);
    await screen.getByText('DepEd Active').tap();
    await expect(statusFilter).toHaveValue('all');
    await expect(screen.getByText('Filtered')).toHaveCount(0);
    await expect(range).toHaveText(before);

    const quarterFilter = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Quarters') });
    await quarterFilter.selectOption('Quarter 2');
    await expect(table.getByRole('cell', /Q2$/).first()).toBeVisible();
    await expect(table.getByRole('cell', /Q[134]$/)).toHaveCount(0);
    await quarterFilter.selectOption('All Quarters');
    await expect(range).toHaveText(before);
  });

  test('module search shows the empty message and clearing restores the table', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await screen.getByRole('button', 'Module Availability & Materials').tap({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Refresh Statuses')).toBeEnabled({ timeout: 30_000 });
    const range = screen.getByText(moduleRange);
    await expect(range).toBeVisible();
    const before = (await range.textContent()) ?? '';

    const search = screen.getByPlaceholder('Search module title, code, or domain...');
    await search.fill('zz-no-such-module-e2e');
    await expect(screen.getByRole('cell', 'No curriculum modules match your selected filters.')).toBeVisible();
    await expect(range).toBeHidden();
    await search.clear();
    await expect(range).toHaveText(before);
  });

  test('Configure opens the availability dialog and Cancel leaves the module unchanged', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Topic Mastery').tap();
    await screen.getByRole('button', 'Module Availability & Materials').tap({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Refresh Statuses')).toBeEnabled({ timeout: 30_000 });
    const table = screen.getByRole('table').filter({ has: screen.getByRole('columnheader', 'Availability Status') });
    const firstModule = table.getByRole('row').nth(1);
    await expect(firstModule).toBeVisible();
    const before = (await firstModule.textContent()) ?? '';

    await firstModule.getByRole('button', 'Configure').tap();
    const title = screen.getByRole('heading', 'Configure Module Availability');
    await expect(title).toBeVisible();
    await expect(screen.getByText(/^.+ \(Q[1-4]\)$/)).toBeVisible();
    await expect(screen.getByText('Select Availability Status')).toBeVisible();
    await expect(screen.getByRole('button', /^Available\s*DepEd curriculum content is active/)).toBeVisible();
    await expect(screen.getByRole('button', /^Coming Soon\s*Module is queued/)).toBeVisible();
    await expect(screen.getByRole('button', /^Unavailable\s*Module is hidden/)).toBeVisible();
    await screen.getByRole('button', /^Teacher Material\s*Custom teacher PDF/).tap();
    await expect(screen.getByText('Upload Alternative PDF Material')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Changes')).toBeEnabled();

    await screen.getByRole('button', 'Cancel').tap();
    await expect(title).toBeHidden();
    await expect(screen.getByText('Upload Alternative PDF Material')).toBeHidden();
    await expect(firstModule).toHaveText(before);
  });

  test('Data Import Manage Availability opens the Module Availability tab', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Manage Availability').tap();
    await expect(screen.getByRole('heading', 'Topic Mastery', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', 'Curriculum Module Availability')).toBeVisible({ timeout: 30_000 });
    await screen.getByRole('button', 'Student Mastery Matrix').tap();
    await expect(screen.getByPlaceholder('Search topics...')).toBeVisible();
    await expect(screen.getByRole('heading', 'Curriculum Module Availability')).toBeHidden();
  });

  test('Competency Matrix without classes explains that class records are needed', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(hasClass, 'the e2e teacher has classes, so Competency Matrix shows the table instead');
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    await expect(screen.getByRole('heading', 'Student Competency', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', 'Student Competency', { level: 2 })).toBeVisible();
    await expect(screen.getByText('No classes available yet. Import class records to view competency breakdowns.')).toBeVisible();
  });

  test('Competency Matrix shows the student competency table, stat cards and filters', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    await expect(screen.getByRole('heading', 'Student Competency', { level: 1 })).toBeVisible();
    const back = screen.getByRole('button', 'Back to Classes');
    await expect(back).toBeVisible({ timeout: 45_000 });

    await expect(screen.getByPlaceholder('Search students...')).toBeVisible();
    await expect(screen.getByRole('button', 'All')).toBeVisible();
    await expect(screen.getByRole('button', 'High Risk')).toBeVisible();
    await expect(screen.getByRole('button', 'Medium Risk')).toBeVisible();
    await expect(screen.getByRole('button', 'Low Risk')).toBeVisible();
    await expect(screen.getByText('Enrolled in Class')).toBeVisible();
    await expect(screen.getByText('At-Risk Students')).toBeVisible();
    await expect(screen.getByText('Cohort Score')).toBeVisible();
    await expect(screen.getByText('Activity Completion')).toBeVisible();
    await expect(screen.getByText(/^Imported Topic Context( for .+)?:$/)).toBeVisible();
    await expect(screen.getByText('Risk Level')).toBeVisible();
    await expect(screen.getByText('Avg. Score')).toBeVisible();
    await expect(screen.getByText('Weakest Topic')).toBeVisible();
    await expect(screen.getByText('Applications')).toBeVisible();
    await expect(screen.getByText('Consistency')).toBeVisible();
    await expect(screen.getByText(/^(Showing \d+ to \d+ of \d+ students|No students match the current filters)$/)).toBeVisible();

    await screen.getByRole('button', 'Refresh').tap();
    await expect(back).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByPlaceholder('Search students...')).toBeVisible();
  });

  test('competency search and risk chips filter the table and All restores it', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    const footer = screen.getByText(studentRange);
    const hasStudents = await footer.waitFor({ timeout: 45_000 }).then(() => true, () => false);
    test.skip(!hasStudents, noStudents);
    const before = (await footer.textContent()) ?? '';

    const search = screen.getByPlaceholder('Search students...');
    await search.fill('zz-no-such-student-e2e');
    await expect(screen.getByText('No students match the current filters')).toBeVisible();
    await search.clear();
    await expect(footer).toHaveText(before);

    await screen.getByRole('button', 'High Risk').tap();
    await expect(screen.getByText(/^(Medium|Low)$/, { visible: true })).toHaveCount(0);
    await screen.getByRole('button', 'Low Risk').tap();
    await expect(screen.getByText(/^(High|Medium)$/, { visible: true })).toHaveCount(0);
    await screen.getByRole('button', 'All').tap();
    await expect(footer).toHaveText(before);
  });

  test('competency table pages forward and back and changes rows per page', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    const footer = screen.getByText(studentRange);
    const hasStudents = await footer.waitFor({ timeout: 45_000 }).then(() => true, () => false);
    test.skip(!hasStudents, noStudents);
    const total = Number(((await footer.textContent()) ?? '').match(/of (\d+) students$/)?.[1] ?? 0);
    test.skip(total <= 10, 'ten or fewer students, so the competency table has a single page');

    await expect(screen.getByRole('button', 'Previous page')).toBeDisabled();
    await screen.getByRole('button', 'Next page').tap();
    await expect(footer).toHaveText(`Showing 11 to ${Math.min(20, total)} of ${total} students`);
    await screen.getByRole('button', 'Previous page').tap();
    await expect(footer).toHaveText(`Showing 1 to 10 of ${total} students`);
    await screen.getByRole('combobox', 'Rows per page').selectOption('20');
    await expect(footer).toHaveText(`Showing 1 to ${Math.min(20, total)} of ${total} students`);
  });

  test('View expands a student competency breakdown and Close collapses it', { session: 'teacher', timeout: 240_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    const hasStudents = await screen.getByText(studentRange).waitFor({ timeout: 45_000 }).then(() => true, () => false);
    test.skip(!hasStudents, noStudents);

    await screen.getByRole('button', 'View').first().tap();
    const close = screen.getByRole('button', 'Close');
    await expect(close).toBeVisible();
    await expect(screen.getByText('Analyzing competency data...')).toBeHidden({ timeout: 120_000 });
    const breakdown = screen.getByText(/^(Efficiency|Recommended Focus Areas)$/);
    await expect(breakdown.first()).toBeVisible();
    await close.tap();
    await expect(close).toBeHidden();
    await expect(breakdown).toHaveCount(0);
  });

  test('Manage Class then Competency Matrix scopes the table to that class', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const manage = screen.getByText('Manage Class').first();
    const hasClass = await manage.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    const className = ((await screen.getByRole('button', /^Delete .+$/).first().getAttribute('aria-label')) ?? '').replace(/^Delete /, '');
    await manage.tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();

    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    await expect(screen.getByRole('heading', 'Student Competency', { level: 1 })).toBeVisible();
    await expect(screen.getByText(`Imported Topic Context for ${className}:`)).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('button', 'Back to Classes')).toBeVisible();
  });

  test('Back to Classes opens the class picker and choosing a class reopens its table', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    const className = ((await screen.getByRole('button', /^Delete .+$/).first().getAttribute('aria-label')) ?? '').replace(/^Delete /, '');
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Competency Matrix').tap();
    const back = screen.getByRole('button', 'Back to Classes');
    await expect(back).toBeVisible({ timeout: 45_000 });

    await back.tap();
    await expect(screen.getByRole('heading', 'Select a Class')).toBeVisible();
    await screen.getByRole('heading', className, { level: 4 }).tap();
    await expect(screen.getByText(`Imported Topic Context for ${className}:`)).toBeVisible({ timeout: 45_000 });
  });
});
