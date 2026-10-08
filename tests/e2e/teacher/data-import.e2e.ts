import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Selecting a local file only opens the confirmation dialog; nothing reaches the server until 'Proceed & Process'.
const rosterCsv = join(tmpdir(), 'E2E-class-records.csv');
const rosterCsvBody = 'name,lrn,email\nE2E Learner,123456789012,nobody+e2e-import@example.test\n';
const curriculumPdf = 'datasets/curriculum/gen_math_sdo/SHS_GM_Q1_LAS1_LE1.pdf';
const recordRange = /^Showing (0|\d+–\d+ of \d+) records$/;
const recentUploadsSettled = /^(There are no recent uploads for this class yet\.|\d+ student records? · .+|\d+ topics? extracted( · .+)?)$/;
const noClass = 'the e2e teacher has no classes';
const noRecords = 'the e2e teacher manages no student records';

describe('teacher data import', { tags: ['teacher', 'data-import'] }, () => {
  test('Upload Class Spreadsheet opens the confirmation dialog and Cancel or close discards the file', { session: 'teacher' }, async ({ app, browser, screen }) => {
    writeFileSync(rosterCsv, rosterCsvBody);
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    const zone = screen.getByRole('button', /^Upload Class Spreadsheet/);
    await expect(zone.getByRole('heading', 'Upload Class Spreadsheet')).toBeVisible();
    await expect(zone.getByText('Select a spreadsheet or browse files from your computer')).toBeVisible();
    await expect(zone.getByText('.CSV')).toBeVisible();
    await expect(zone.getByText('.XLSX')).toBeVisible();
    await expect(zone.getByText('.XLS')).toBeVisible();
    await zone.focus();
    await expect(zone).toBeFocused();

    const spreadsheetInput = browser.locator('input[type="file"][accept=".csv,.xlsx,.xls"]:not([aria-label])');
    await spreadsheetInput.setInputFiles(rosterCsv);
    const dialog = screen.getByRole('dialog', 'Confirm Class Records Upload');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Review file details before initiating processing')).toBeVisible();
    await expect(dialog.getByText('Selected File')).toBeVisible();
    await expect(dialog.getByText('E2E-class-records.csv')).toBeVisible();
    await expect(dialog.getByText(/^\d+ B$/)).toBeVisible();
    await expect(dialog.getByText('Target Scope:')).toBeVisible();
    await expect(dialog.getByText('All Classes')).toBeVisible();
    await expect(dialog.getByText(/^MathPulse AI will parse student records/)).toBeVisible();
    await expect(dialog.getByRole('button', 'Proceed & Process')).toBeEnabled();
    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();
    await expect(screen.getByRole('heading', 'Upload Class Spreadsheet')).toBeVisible();

    await spreadsheetInput.setInputFiles(rosterCsv);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', 'Close dialog').tap();
    await expect(dialog).toBeHidden();
    await expect(screen.getByRole('heading', 'Upload Class Spreadsheet')).toBeVisible();
  });

  test('Upload Curriculum Documents opens the confirmation dialog and Cancel or close uploads nothing', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    const zone = screen.getByRole('button', /^Upload Curriculum Documents/);
    await expect(zone.getByRole('heading', 'Upload Curriculum Documents')).toBeVisible();
    await expect(zone.getByText('Select curriculum files or browse documents from your computer')).toBeVisible();
    await expect(zone.getByText('.PDF')).toBeVisible();
    await expect(zone.getByText('.DOCX')).toBeVisible();
    await expect(zone.getByText('.TXT')).toBeVisible();

    const documentInput = browser.locator('input[type="file"][accept=".pdf,.docx,.txt"]');
    await documentInput.setInputFiles(curriculumPdf);
    const dialog = screen.getByRole('dialog', 'Confirm Course Material Upload');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('SHS_GM_Q1_LAS1_LE1.pdf')).toBeVisible();
    await expect(dialog.getByText(/^\d+(\.\d)? (B|KB|MB)$/)).toBeVisible();
    await expect(dialog.getByText('All Classes')).toBeVisible();
    await expect(dialog.getByText(/^MathPulse AI will extract topics, competencies, and unit structures/)).toBeVisible();
    await expect(dialog.getByRole('button', 'Proceed & Process')).toBeEnabled();
    await dialog.getByRole('button', 'Cancel').tap();
    await expect(dialog).toBeHidden();

    await documentInput.setInputFiles(curriculumPdf);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', 'Close dialog').tap();
    await expect(dialog).toBeHidden();
    await expect(screen.getByRole('heading', 'Upload Curriculum Documents')).toBeVisible();
  });

  test('Student Account Import enables Preview roster only once a roster file is chosen', { session: 'teacher' }, async ({ app, screen }) => {
    writeFileSync(rosterCsv, rosterCsvBody);
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    const section = screen.getByRole('region', 'Student Account Import');
    await expect(section.getByRole('heading', 'Student Account Import')).toBeVisible();
    await expect(section.getByText('Preview a roster and review any requested section moves before committing.')).toBeVisible();
    const preview = section.getByRole('button', 'Preview roster');
    await expect(preview).toBeDisabled();

    await section.getByRole('button', 'Select student account roster').setInputFiles(rosterCsv);
    await expect(preview).toBeEnabled();
    await expect(section.getByRole('button', 'Confirm moves & import')).toHaveCount(0);
    await expect(section.getByRole('button', 'Import without moves (moves stay blocked)')).toHaveCount(0);
  });

  test('Data Health card shows its sync status, record tools and the AI info cards', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('heading', 'Data Health')).toBeVisible();
    await expect(screen.getByText('Live Status')).toBeVisible();
    await expect(screen.getByRole('heading', 'All Records Synced')).toBeVisible();
    await expect(screen.getByText('AI parsing completed successfully with no anomalies detected.')).toBeVisible();
    await expect(screen.getByRole('button', 'Edit Class Records')).toBeEnabled();
    await expect(screen.getByRole('button', 'View Mapping Logs')).toBeEnabled();
    await expect(screen.getByRole('heading', 'Intelligent Parsing')).toBeVisible();
    await expect(screen.getByRole('heading', 'Risk Trajectory Analysis')).toBeVisible();
    await expect(screen.getByRole('heading', 'Contextual AI Grounding')).toBeVisible();
    await expect(screen.getByRole('heading', 'Manage Curriculum Module Availability')).toBeVisible();
    await expect(screen.getByRole('button', 'Manage Availability')).toBeVisible();
  });

  test('Recent Uploads settles into its list or empty state and Refresh reloads it', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('heading', 'Recent Uploads')).toBeVisible();
    await expect(screen.getByText('Uploaded curriculum documents are saved here as course materials.')).toBeVisible();
    const settled = screen.getByText(recentUploadsSettled).first();
    await expect(settled).toBeVisible({ timeout: 30_000 });

    await screen.getByRole('button', 'Refresh').tap();
    await expect(settled).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Go to Modules')).toBeVisible();
  });

  test('Target Class Context starts at All Classes with the managed classes listed', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const classRows = screen.getByText('Manage Class');
    await classRows.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    const classCount = await classRows.count();
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('heading', 'Target Class Context')).toBeVisible();
    await expect(screen.getByText('Scope')).toBeVisible();
    await expect(screen.getByText('Select the section or classroom where imported records should apply')).toBeVisible();
    const scope = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Classes') });
    await expect(scope).toHaveValue('All Classes');
    await expect(scope.getByRole('option').first()).toHaveText('All Classes');
    await expect(scope.getByRole('option')).toHaveCount(classCount + 1);
  });

  test('choosing a class in Target Class Context switches the import scope', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const hasClass = await screen.getByText('Manage Class').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    const scope = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Classes') });
    const classOptions = scope.getByRole('option');
    test.skip((await classOptions.count()) < 2, 'Target Class Context lists no managed class');
    const chosenValue = (await classOptions.nth(1).getAttribute('value')) ?? '';
    await scope.selectOption({ index: 1 });
    await expect(scope).toHaveValue(chosenValue);
  });

  test('Target Class Context shows the class opened with Manage Class', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const manage = screen.getByText('Manage Class').first();
    const hasClass = await manage.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, noClass);
    const className = ((await screen.getByRole('button', /^Delete .+$/).first().getAttribute('aria-label')) ?? '').replace(/^Delete /, '');
    await manage.tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    const scope = screen.getByRole('combobox').filter({ has: screen.getByRole('option', 'All Classes') });
    const classOption = scope.getByRole('option', className);
    test.skip((await classOption.count()) === 0, 'the class opened from the dashboard is not a managed class');
    await expect(scope).toHaveValue((await classOption.first().getAttribute('value')) ?? '');
  });

  test('Go to Modules leaves Data Import for the modules screen', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Go to Modules').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeHidden();
  });

  test('Edit Class Records shows the record table or its empty state and Back to Uploads returns', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Edit Class Records').tap();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeVisible();
    await expect(screen.getByText('Review and modify student data manually')).toBeVisible();
    await expect(screen.getByText('Click on any field to edit')).toBeVisible();
    await expect(screen.getByRole('button', 'Save Changes')).toBeVisible();
    await expect(screen.getByText('Student Name')).toBeVisible();
    await expect(screen.getByText('Avg Score')).toBeVisible();
    await expect(screen.getByText('Weakest Topic')).toBeVisible();
    const range = screen.getByText(recordRange).first();
    const hasRecords = await screen.getByRole('button', /^Edit record for .+$/).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    if (hasRecords) {
      await expect(range).toHaveText(/^Showing 1–\d+ of \d+ records$/);
    } else {
      await expect(range).toHaveText('Showing 0 records');
      await expect(screen.getByRole('heading', 'No managed classes found')).toBeVisible();
    }

    await screen.getByRole('button', 'Back to Uploads').tap();
    await expect(screen.getByRole('heading', 'Data Health')).toBeVisible();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeHidden();
  });

  test('Edit Class Records pages through records and changes rows per page', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();
    await screen.getByRole('button', 'Edit Class Records').tap();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeVisible();

    const pencils = screen.getByRole('button', /^Edit record for .+$/);
    const hasRecords = await pencils.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasRecords, noRecords);
    const range = screen.getByText(recordRange).first();
    const total = Number((await range.textContent())?.match(/of (\d+) records$/)?.[1] ?? 0);
    const previous = screen.getByRole('button', 'Previous Page');
    const next = screen.getByRole('button', 'Next Page');
    await expect(previous).toBeDisabled();
    await expect(pencils).toHaveCount(Math.min(10, total));
    test.skip(total <= 10, 'ten or fewer records, so Edit Class Records has a single page');

    await next.tap();
    await expect(range).toHaveText(`Showing 11–${Math.min(20, total)} of ${total} records`);
    await expect(previous).toBeEnabled();
    await previous.tap();
    await expect(range).toHaveText(`Showing 1–10 of ${total} records`);

    await screen.getByRole('combobox').filter({ has: screen.getByRole('option', '25 / page') }).selectOption('25 / page');
    await expect(range).toHaveText(`Showing 1–${Math.min(25, total)} of ${total} records`);
    await expect(pencils).toHaveCount(Math.min(25, total));
  });

  test('row pencil toggles edit mode and Cancel leaves without saving', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();
    await screen.getByRole('button', 'Edit Class Records').tap();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeVisible();

    const pencil = screen.getByRole('button', /^Edit record for .+$/).first();
    const hasRecords = await pencil.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasRecords, noRecords);
    await expect(pencil).toHaveAttribute('title', 'Edit student record');
    await pencil.tap();
    await expect(pencil).toHaveAttribute('title', 'Done editing');
    await pencil.tap();
    await expect(pencil).toHaveAttribute('title', 'Edit student record');

    await pencil.tap();
    await expect(pencil).toHaveAttribute('title', 'Done editing');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Data Health')).toBeVisible();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeHidden();
  });

  test('Cancel discards an in-progress row edit', { session: 'teacher', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();
    await screen.getByRole('button', 'Edit Class Records').tap();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeVisible();

    const pencil = screen.getByRole('button', /^Edit record for .+$/).first();
    const hasRecords = await pencil.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasRecords, noRecords);
    await pencil.tap();
    await expect(pencil).toHaveAttribute('title', 'Done editing');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(screen.getByRole('heading', 'Data Health')).toBeVisible();

    await screen.getByRole('button', 'Edit Class Records').tap();
    await expect(screen.getByRole('heading', 'Edit Class Records')).toBeVisible();
    await expect(pencil).toHaveAttribute('title', 'Edit student record');
  });

  test('View Mapping Logs shows the latest import mapping and Back to Uploads returns', { session: 'teacher' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Data Import').tap();
    await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'View Mapping Logs').tap();
    await expect(screen.getByRole('heading', 'Latest Import Mapping')).toBeVisible();
    await expect(screen.getByRole('heading', 'Data Health')).toBeHidden();
    await agent.assert('the Latest Import Mapping card either says there are no recent mapping logs to display or lists spreadsheet column names, each paired with a mapped field or "Unmapped"');

    await screen.getByRole('button', 'Back to Uploads').tap();
    await expect(screen.getByRole('heading', 'Data Health')).toBeVisible();
    await expect(screen.getByRole('heading', 'Latest Import Mapping')).toBeHidden();
  });
});
