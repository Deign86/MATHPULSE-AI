import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const studentCard = '[title="Click to view student diagnostic & intervention plan"]';
const removeLabel = /^Remove (.+) from class$/;
const noStudent = 'the first class in My Classes shows no student card to open (or the e2e teacher has no class)';
const outsideDialog = { x: 1265, y: 360 };

describe('teacher intervention center', { tags: ['teacher', 'intervention'] }, () => {
  test('a student card opens Overview & Diagnosis with the profile panel, and Back to Classes returns', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    const studentName = ((await card.getByRole('button', removeLabel).getAttribute('aria-label')) ?? '').replace(removeLabel, '$1');

    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Identify and support at-risk students.')).toBeVisible();
    await expect(screen.getByRole('button', 'Overview & Diagnosis')).toBeVisible();
    await expect(screen.getByRole('button', 'Learning Path')).toBeVisible();
    await expect(screen.getByRole('button', 'AI Lesson Plan')).toBeVisible();

    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();
    await expect(screen.getByText('Insights Active')).toBeVisible();
    await expect(screen.getByRole('heading', 'Learning Strengths')).toBeVisible();
    await expect(screen.getByRole('heading', 'Next Steps')).toBeVisible();

    await expect(screen.getByRole('heading', studentName, { level: 2 })).toBeVisible();
    await expect(screen.getByText(/^ID: \S+$/, { visible: true })).toBeVisible();
    await expect(screen.getByText('Avg Score')).toBeVisible();
    await expect(screen.getByText('Engagement')).toBeVisible();
    await expect(screen.getByText('Last Active')).toBeVisible();
    await expect(screen.getByText('Weakest Topic')).toBeVisible();
    await expect(screen.getByRole('button', 'Export materials for student')).toBeVisible();
    await expect(screen.getByRole('heading', 'Section Assignment')).toBeVisible();

    await screen.getByRole('button', 'Back to Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Back to Classes')).toBeHidden();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeHidden();
    await expect(browser.locator(studentCard).first()).toBeVisible();
  });

  test('Learning Path tab shows the generated path and switches back to Overview, without assigning it', { session: 'teacher', timeout: 240_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Learning Path').tap();
    await expect(screen.getByRole('heading', 'Generated Learning Path')).toBeVisible();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeHidden();
    await expect(screen.getByText('Methodology:')).toBeVisible();

    await expect(screen.getByRole('button', 'Regenerate')).toBeEnabled({ timeout: 120_000 });
    await expect(screen.getByRole('button', /^(Assign to Student|Revoke)$/)).toBeVisible();
    await expect(screen.getByText(/^Step 1 • (Video Lesson|Practice|Assessment)$/)).toBeVisible();
    await agent.assert(
      'the Generated Learning Path shows a numbered sequence of steps, each labeled as a video lesson, practice or assessment with a title and a duration or question count',
    );

    await screen.getByRole('button', 'Overview & Diagnosis').tap();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();
    await expect(screen.getByRole('heading', 'Generated Learning Path')).toBeHidden();
    await expect(screen.getByRole('button', /^(Assign to Student|Revoke)$/)).toBeHidden();
  });

  test('a learning path step opens its guide, the AI Guide answers, and the guide closes without assigning', { session: 'teacher', timeout: 240_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Learning Path').tap();
    await expect(screen.getByRole('button', 'Regenerate')).toBeEnabled({ timeout: 120_000 });
    await screen.getByText(/^Step 1 • (Video Lesson|Practice|Assessment)$/).tap();
    const guideTitle = screen.getByText(/^Step \d+ of \d+$/);
    const opened = await guideTitle.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!opened, 'no intervention plan came back from the backend, so the steps are local placeholders that open no guide');

    await expect(screen.getByText('AI Guide')).toBeVisible();
    await expect(screen.getByRole('button', /^(Assign|Assigned ✓)$/)).toBeVisible();
    const question = 'Give me one tip to start this step.';
    const guideInput = screen.getByPlaceholder('Ask for help...');
    await guideInput.fill(question);
    await guideInput.press('Enter');
    await expect(screen.getByText(question)).toBeVisible();
    await expect(guideInput).toHaveValue('');
    await agent.waitFor(`the AI Guide chat shows an assistant reply below the message "${question}"`, { timeout: 120_000 });
    await expect(screen.getByText("I'm having trouble connecting right now. Try asking again in a moment!")).toHaveCount(0);

    await screen.tapAt(outsideDialog);
    await expect(guideTitle).toBeHidden();
    await expect(screen.getByText('AI Guide')).toBeHidden();
    await expect(screen.getByRole('heading', 'Generated Learning Path')).toBeVisible();
  });

  test('AI Lesson Plan tab generates a targeted lesson plan and its source toggles flip back, without saving or publishing', { session: 'teacher', timeout: 240_000 }, async ({ app, agent, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'AI Lesson Plan').tap();
    await expect(screen.getByRole('heading', 'Targeted Lesson Generation')).toBeVisible();
    test.skip(await screen.getByText('Coming Soon').isVisible(), 'the AI Lesson Plan is locked (VITE_ENABLE_IMPORT_GROUNDED_LESSON=false)');
    await expect(screen.getByText('Configure inputs and requirements for AI lesson generation.')).toBeVisible();

    const reviewSources = screen.getByRole('checkbox', 'Allow sources requiring manual review');
    const unverifiedDraft = screen.getByRole('checkbox', 'Allow unverified lesson draft');
    await expect(reviewSources).not.toBeChecked();
    await expect(unverifiedDraft).not.toBeChecked();
    await screen.getByText('Allow sources requiring manual review').tap();
    await expect(reviewSources).toBeChecked();
    await screen.getByText('Allow sources requiring manual review').tap();
    await expect(reviewSources).not.toBeChecked();
    await screen.getByText('Allow unverified lesson draft').tap();
    await expect(unverifiedDraft).toBeChecked();
    await screen.getByText('Allow unverified lesson draft').tap();
    await expect(unverifiedDraft).not.toBeChecked();

    await expect(screen.getByRole('button', 'Regenerate')).toBeEnabled({ timeout: 120_000 });
    await agent.waitFor(
      'the Targeted Lesson Generation card shows either a generated lesson plan (a lesson title, Imported topics, Publish readiness and lesson blocks) or an error message explaining why the lesson could not be generated',
      { timeout: 120_000 },
    );
    const readiness = screen.getByText(/^Publish readiness: (Ready|Blocked)$/);
    const publish = screen.getByRole('button', 'Publish Lesson Plan');
    if (await readiness.isVisible()) {
      await expect(screen.getByText(/^Imported topics: (Yes|No) \(\d+\)$/)).toBeVisible();
      await expect(screen.getByRole('button', 'Save Draft')).toBeEnabled();
      await expect(publish).toBeVisible();
      // The lesson is generated twice on mount, so a late second plan can replace the first between two reads.
      await expect
        .poll(async () => (await publish.isEnabled()) === ((await readiness.textContent())?.endsWith('Ready') === true), { timeout: 15_000 })
        .toBe(true);
    } else {
      await expect(publish).toHaveCount(0);
      await expect(screen.getByRole('button', 'Save Draft')).toHaveCount(0);
    }
  });

  test('Export Materials dialog offers three choices and closes with X, Escape and the backdrop', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    const studentName = ((await card.getByRole('button', removeLabel).getAttribute('aria-label')) ?? '').replace(removeLabel, '$1');
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    const exportButton = screen.getByRole('button', 'Export materials for student');
    const title = screen.getByRole('heading', 'Export Materials', { level: 2 });
    await exportButton.tap();
    await expect(title).toBeVisible();
    await expect(screen.getByText(`For ${studentName}`)).toBeVisible();
    await expect(screen.getByText('How would you like to proceed?')).toBeVisible();
    await expect(screen.getByRole('button', /^Download PDF Report/)).toBeVisible();
    await expect(screen.getByRole('button', /^Choose from existing quizzes/)).toBeVisible();
    await expect(screen.getByRole('button', /^Create a new quiz/)).toBeVisible();

    await screen.getByRole('button', 'Close export dialog').tap();
    await expect(title).toBeHidden();

    await exportButton.tap();
    await expect(title).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(title).toBeHidden();

    await exportButton.tap();
    await expect(title).toBeVisible();
    await screen.tapAt(outsideDialog);
    await expect(title).toBeHidden();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();
  });

  test('Export Materials quiz picker shows the quiz bank and goes back without assigning', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Export materials for student').tap();
    await screen.getByRole('button', /^Choose from existing quizzes/).tap();
    const pickerTitle = screen.getByRole('heading', 'Choose a Quiz', { level: 2 });
    await expect(pickerTitle).toBeVisible();
    await expect(screen.getByText('Select a quiz from your bank')).toBeVisible();

    const assignButtons = screen.getByRole('button', 'Assign');
    const emptyBank = screen.getByText('No quizzes yet');
    await expect
      .poll(async () => (await assignButtons.count()) + (await emptyBank.count()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    if (await emptyBank.isVisible()) {
      await expect(screen.getByText('Create your first quiz using the AI Quiz Maker.')).toBeVisible();
    } else {
      await expect(assignButtons.first()).toBeEnabled();
      await expect(screen.getByText(/^\d+ questions/).first()).toBeVisible();
    }

    await screen.getByRole('button', 'Back to material choices').tap();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeVisible();
    await expect(pickerTitle).toBeHidden();
    await expect(assignButtons).toHaveCount(0);
    await screen.getByRole('button', 'Close export dialog').tap();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeHidden();
  });

  test('Download PDF Report saves an intervention report PDF', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Export materials for student').tap();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeVisible();
    const report = await browser.waitForDownload(() => screen.getByRole('button', /^Download PDF Report/).tap(), { timeout: 120_000 });
    expect(report.suggestedFilename).toMatch(/^intervention-report-.+-\d{4}-\d{2}-\d{2}\.pdf$/);
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeHidden();
    await expect(screen.getByText('Failed to generate PDF report.')).toHaveCount(0);
  });

  test('Create a new quiz opens the AI Quiz Maker drawer, and Back or Escape returns to the student', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    const studentName = ((await card.getByRole('button', removeLabel).getAttribute('aria-label')) ?? '').replace(removeLabel, '$1');
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    const exportButton = screen.getByRole('button', 'Export materials for student');
    const backToStudent = screen.getByRole('button', `Back to ${studentName}`);
    await exportButton.tap();
    await screen.getByRole('button', /^Create a new quiz/).tap();
    await expect(backToStudent).toBeVisible();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeHidden();
    await expect(screen.getByRole('button', 'Create Quiz')).toBeVisible();
    await expect(screen.getByRole('button', 'Quiz Bank')).toBeVisible();
    await expect(screen.getByText('Quiz in progress')).toBeHidden();

    await backToStudent.tap();
    await expect(backToStudent).toBeHidden();
    await expect(screen.getByRole('button', 'Create Quiz')).toBeHidden();

    await exportButton.tap();
    await screen.getByRole('button', /^Create a new quiz/).tap();
    await expect(backToStudent).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(backToStudent).toBeHidden();
    await expect(screen.getByText('Discard quiz progress?')).toBeHidden();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();
  });

  test('Section Assignment shows the fixed grade and disables Update Assignment for a blank section, without saving', { session: 'teacher', timeout: 240_000 }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    await card.tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();

    await expect(screen.getByRole('heading', 'Section Assignment')).toBeVisible();
    const grade = screen.getByPlaceholder('Grade');
    const section = screen.getByPlaceholder('Section');
    const update = screen.getByRole('button', 'Update Assignment');
    await expect(grade).toBeDisabled();
    await expect(grade).toHaveValue('Grade 11');
    await expect(section).toHaveValue(/\S/);
    await expect(update).toBeEnabled();
    const originalSection = await section.inputValue();

    await section.clear();
    await expect(update).toBeDisabled();
    await section.fill('   ');
    await expect(update).toBeDisabled();
    await section.fill(originalSection);
    await expect(section).toHaveValue(originalSection);
    await expect(update).toBeEnabled();
    await expect(screen.getByRole('button', 'Updating...')).toHaveCount(0);
  });

  test('on a phone the student card expands Details and the Overview, Path and AI Lesson tabs switch', { session: 'teacher', tags: ['phone'], timeout: 240_000 }, async ({ app, browser, screen }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const bottomNav = screen.getByRole('navigation', 'Bottom Navigation');
    await bottomNav.getByRole('button', 'Teaching Options: My Classes and Calendar').tap();
    await bottomNav.getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const card = browser.locator(studentCard).first();
    const hasStudent = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
    test.skip(!hasStudent, noStudent);
    const studentName = ((await card.getByRole('button', removeLabel).getAttribute('aria-label')) ?? '').replace(removeLabel, '$1');
    await card.tap();
    await expect(screen.getByRole('button', 'Back to Classes')).toBeVisible();

    await expect(screen.getByRole('button', 'Overview & Diagnosis')).toBeHidden();
    await expect(screen.getByRole('heading', studentName, { level: 2 })).toBeVisible();
    await expect(screen.getByText(/^Score: [\d.]+%$/, { visible: true })).toBeVisible();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();
    await screen.getByRole('button', 'Path').tap();
    await expect(screen.getByRole('heading', 'Generated Learning Path')).toBeVisible();
    await screen.getByRole('button', 'AI Lesson').tap();
    await expect(screen.getByRole('heading', 'Targeted Lesson Generation')).toBeVisible();
    await screen.getByRole('button', 'Overview').tap();
    await expect(screen.getByRole('heading', 'AI Analysis')).toBeVisible();

    await screen.getByRole('button', 'Details', { expanded: false }).tap();
    const closeDetails = screen.getByRole('button', 'Close', { expanded: true });
    await expect(closeDetails).toBeVisible();
    await expect(screen.getByText('Avg Score', { visible: true })).toBeVisible();
    await expect(screen.getByRole('heading', 'Section Assignment')).toBeVisible();
    await expect(screen.getByRole('button', 'Update Assignment')).toBeVisible();
    await expect(screen.getByRole('button', `Export Materials for ${studentName}`)).toBeVisible();

    await screen.getByRole('button', 'Export materials').tap();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeVisible();
    await screen.getByRole('button', 'Close export dialog').tap();
    await expect(screen.getByRole('heading', 'Export Materials', { level: 2 })).toBeHidden();

    await closeDetails.tap();
    await expect(screen.getByRole('button', 'Details', { expanded: false })).toBeVisible();
    await expect(screen.getByText('Avg Score', { visible: true })).toBeHidden();
    await expect(screen.getByRole('button', 'Update Assignment')).toBeHidden();
  });
});
