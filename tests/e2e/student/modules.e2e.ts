import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const dismissDialogs =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
const moduleCard = /Grade 11 · (General|Finite) Mathematics Q[1-4]/;
const ragLessonRoute = '**/api/rag/lesson';

describe('student modules', { tags: ['student', 'modules'] }, () => {
  test('sidebar Modules opens the Curriculum Modules library', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('navigation').getByRole('button', 'Modules').tap();
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible();
    await expect(browser).toHaveURL('/modules');
    // The Daily Rewards modal opens on a timer after the claim state loads, so give it a moment before dismissing.
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    await expect(screen.getByRole('main').getByText('DepEd Strengthened SHS Modules')).toBeVisible();
  });

  test('library shows the Grade 11 context pill and every Grade 11 module unlocked', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');

    await expect(content.getByText('Grade 11 · All Subjects · All Quarters')).toBeVisible();
    await expect(content.getByRole('combobox', 'Subject').getByRole('option')).toHaveText([
      'All Subjects',
      'General Mathematics',
      'Finite Mathematics',
    ]);
    await expect(content.getByRole('button', /^Business and Finance/)).toBeVisible();
    await expect(content.getByRole('button', /^Functions and Their Graphs/)).toBeVisible();
    await expect(content.getByRole('button', /^Basic Trigonometry/)).toBeVisible();
    await expect(content.getByRole('button', /^Logical Propositions, Syllogisms, and Fallacies/)).toBeVisible();
    await expect(content.getByRole('button', /^Systems and Matrices/)).toBeVisible();
    await expect(content.getByRole('button', /^Linear Optimization/)).toBeVisible();
    await expect(content.getByText('Coming Soon')).toHaveCount(0);
    await expect(content.getByText('Not Yet Available')).toHaveCount(0);
    await expect(content.getByText('Locked')).toHaveCount(0);
    await expect(content.getByRole('button', 'Notify Me')).toHaveCount(0);
  });

  test('search narrows modules by title and competency code and Reset clears it', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    const search = content.getByRole('textbox', 'Search modules');

    await search.fill('Trigonometry');
    await expect(content.getByRole('button', /^Basic Trigonometry/)).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(1);

    await search.fill('GM11-FASS');
    await expect(content.getByRole('button', /^Financial Application of Sequences and Series/)).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(1);

    await search.fill('zzqx-no-such-module');
    await expect(content.getByText('No matching modules found.')).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(0);

    await content.getByRole('button', 'Reset').tap();
    await expect(search).toHaveValue('');
    await expect(content.getByText('No matching modules found.')).toBeHidden();
    await expect(content.getByRole('button', /^Business and Finance/)).toBeVisible();
  });

  test('Subject, Quarter and Competency Group filters narrow the library and update the context pill', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    const subject = content.getByRole('combobox', 'Subject');
    const quarter = content.getByRole('combobox', 'Quarter');
    const competencyGroup = content.getByRole('combobox', 'Competency Group');

    await subject.selectOption({ label: 'Finite Mathematics' });
    await expect(content.getByText('Grade 11 · Finite Mathematics · All Quarters')).toBeVisible();
    await expect(content.getByRole('button', /^Systems and Matrices/)).toBeVisible();
    await expect(content.getByRole('button', /^Linear Optimization/)).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(2);

    // Finite Mathematics is year-long, so a quarter filter keeps both of its modules.
    await quarter.selectOption({ label: 'Q2' });
    await expect(content.getByText('Grade 11 · Finite Mathematics · Q2')).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(2);

    await subject.selectOption({ label: 'General Mathematics' });
    await quarter.selectOption({ label: 'Q4' });
    await expect(content.getByText('Grade 11 · General Mathematics · Q4')).toBeVisible();
    await expect(content.getByRole('button', /^Compound Interest, Annuities, and Loans/)).toBeVisible();
    await expect(content.getByRole('button', /^Hypothesis Testing and Regression/)).toBeVisible();
    await expect(content.getByRole('button', /^Logical Propositions, Syllogisms, and Fallacies/)).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(3);

    await content.getByRole('button', 'Reset').tap();
    await expect(subject).toHaveValue('all');
    await expect(quarter).toHaveValue('all');
    await expect(content.getByText('Grade 11 · All Subjects · All Quarters')).toBeVisible();

    await competencyGroup.selectOption({ label: 'Annuities' });
    await expect(competencyGroup).toHaveValue('GM-Q2-ANN');
    await expect(content.getByRole('button', /^Annuities/)).toBeVisible();
    await expect(content.getByRole('button', moduleCard)).toHaveCount(1);

    await content.getByRole('button', 'Reset').tap();
    await expect(competencyGroup).toHaveValue('all');
    await expect(content.getByRole('button', /^Business and Finance/)).toBeVisible();
  });

  test('tabs switch between Modules, Recommended, Practice and Teacher Uploaded', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    await expect(content.getByText('DepEd Strengthened SHS Modules')).toBeVisible();

    await content.getByRole('button', 'Recommended').tap();
    await expect(content.getByText('Suggested Next')).toBeVisible();
    await expect(content.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await agent.waitFor(
      'The Recommended tab lists suggested module cards marked "Start" (and possibly "In Progress" cards under "Continue This Module"), or it says "You are all caught up. Practice more quizzes to unlock additional recommendations."',
    );

    await content.getByRole('button', 'Practice').tap();
    await expect(content.getByText('Practice Center')).toBeVisible();
    await expect(content.getByRole('heading', 'Assigned by your teacher')).toBeVisible();
    await expect(content.getByText('Quizzes Completed')).toBeVisible();
    await expect(content.getByText('Total XP Earned')).toBeVisible();
    await expect(content.getByText('Average Score')).toBeVisible();

    await content.getByRole('button', 'Teacher Uploaded').tap();
    await expect(content.getByText('Teacher Uploaded Modules')).toBeVisible();
    await expect(content.getByRole('heading', 'Teacher-Assigned Modules & Interventions')).toBeVisible();
    await expect(content.getByText(/^\d+ Modules? Available$/)).toBeVisible();
    await agent.waitFor(
      'The Teacher Uploaded tab has finished loading and shows either "No Teacher-Uploaded Modules Yet" or module cards tagged "Teacher Upload"',
    );

    await content.getByRole('button', 'Modules').tap();
    await expect(content.getByText('DepEd Strengthened SHS Modules')).toBeVisible();
    await expect(content.getByRole('heading', 'Assigned by your teacher')).toBeHidden();
    await expect(content.getByRole('button', /^Business and Finance/)).toBeVisible();
  });

  test('Assessment Focus Areas banner opens the personalized Recommended path', { session: 'student', timeout: 240_000, tags: ['ai'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    const focusBanner = content.getByText('Assessment Focus Areas');
    // The focus topics arrive from the diagnostic record after the page mounts, so give the banner a moment before skipping.
    await focusBanner.waitFor({ timeout: 8_000 }).catch(() => undefined);
    test.skip(
      !(await focusBanner.isVisible()),
      'the e2e student has no diagnostic focus topics, so the banner and the RAG learning path are not rendered',
    );

    await expect(content.getByText('Modules are currently prioritized by your latest diagnostic needs.')).toBeVisible();
    await content.getByRole('button', 'View Recommended').tap();
    await expect(content.getByText('Suggested Next')).toBeVisible();
    await agent.waitFor('a "Your Personalized Learning Path" panel with curriculum guidance text is shown', { timeout: 120_000 });
    await expect(content.getByText('Your Personalized Learning Path')).toBeVisible();
  });

  test('SOURCE chip opens the Curriculum Preview with competencies and PDF sources', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');

    await content.getByRole('button', /^Business and Finance/).getByRole('button', 'SOURCE').tap();
    await expect(screen.getByText('Curriculum Preview')).toBeVisible();
    await expect(screen.getByText('Grade 11 · General Mathematics · Q1')).toBeVisible();
    await expect(screen.getByText('Competency Group')).toBeVisible();
    await expect(screen.getByText('GM-Q1-BF')).toBeVisible();
    await expect(screen.getByText('Performance Standard')).toBeVisible();
    await expect(
      screen.getByText('Produces a finance decision brief that explains and defends a chosen option using quantitative evidence.'),
    ).toBeVisible();
    await expect(screen.getByText('GM11-BF-1')).toBeVisible();
    await expect(screen.getByText('Represent business transactions and financial goals using variables and equations.')).toBeVisible();
    await expect(screen.getByText('DepEd SSHS Curriculum Sources')).toBeVisible();

    const openPdf = screen.getByRole('link', 'Open PDF').first();
    await expect(openPdf).toHaveAttribute(
      'href',
      /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/mathpulse-ai-2026\.firebasestorage\.app\/o\/.+\.pdf\?alt=media$/,
    );
    await expect(openPdf).toHaveAttribute('target', '_blank');
    await expect(screen.getByText('Sources & Attribution')).toBeVisible();
    await expect(
      screen.getByRole('link', 'DepEd SSHS General Mathematics Q1 Lesson Exemplar 1 (Business & Finance)'),
    ).toHaveAttribute('href', /SHS_GM_Q1_LE1\.pdf\?alt=media$/);
    await expect(content.getByRole('heading', 'Study Journey')).toBeHidden();

    // The panel's X button has no accessible name, so it is reached through the panel's own aside.
    await browser.locator('aside:has-text("Curriculum Preview") button').tap();
    await expect(screen.getByText('Curriculum Preview')).toBeHidden();
    await expect(content.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible();
  });

  test('Coming Soon module cards offer Notify Me', {
    session: 'student',
    skip: 'No Grade 11 module can be coming_soon: getCurriculumModulesForLearner forces moduleStatus "available", and Notify Me writes module_watch_requests in the live project',
  }, async ({ app, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole('main').getByText('Coming Soon').first()).toBeVisible();
    await expect(screen.getByRole('main').getByRole('button', 'Notify Me').first()).toBeVisible();
  });

  test('phone About button opens the curriculum info modal', { session: 'student', tags: ['phone'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    await browser.setViewport({ width: 390, height: 844 });
    const content = screen.getByRole('main');
    const infoHeading = screen.getByRole('heading', 'Curriculum Modules', { level: 3 });

    await content.getByRole('button', 'About').tap();
    await expect(infoHeading).toBeVisible();
    await expect(screen.getByText('DepEd Strengthened SHS')).toBeVisible();
    await expect(screen.getByText('Available Now')).toBeVisible();
    await expect(
      screen.getByText('Pre-Calculus and Basic Calculus modules are coming soon once teaching module PDFs are sourced.'),
    ).toBeVisible();
    await screen.getByRole('button', 'Got It').tap();
    await expect(infoHeading).toBeHidden();

    await content.getByRole('button', 'About').tap();
    await expect(infoHeading).toBeVisible();
    await screen.getByRole('button', 'Close curriculum info').tap();
    await expect(infoHeading).toBeHidden();
  });

  test('curriculum info modal lists the subjects the library actually offers', { session: 'student', tags: ['phone', 'known-bug'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');
    const offered = (await content.getByRole('combobox', 'Subject').getByRole('option').allTextContents()).slice(1);
    expect(offered.length, 'the Subject filter lists at least one subject').toBeGreaterThan(0);

    await browser.setViewport({ width: 390, height: 844 });
    await content.getByRole('button', 'About').tap();
    await expect(screen.getByText('Available Now')).toBeVisible();
    await expect(
      screen.getByRole('list').filter({ hasText: 'General Mathematics' }).getByRole('listitem'),
    ).toHaveText(offered);
  });

  test('phone Filters drawer and Reset all filters update the library', { session: 'student', tags: ['phone'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    await browser.setViewport({ width: 390, height: 844 });
    const content = screen.getByRole('main');
    const drawerHeading = screen.getByRole('heading', 'Filter Modules');
    const quarterPill = content.getByRole('combobox', 'Select Quarter');

    await quarterPill.selectOption({ label: 'Q4' });
    await expect(content.getByText('Grade 11 · All Subjects · Q4')).toBeVisible();
    await content.getByRole('button', 'Reset all filters').tap();
    await expect(quarterPill).toHaveValue('all');
    await expect(content.getByText('Grade 11 · All Subjects · All Quarters')).toBeVisible();

    await content.getByRole('textbox', 'Search modules').fill('Trigonometry');
    await expect(content.getByRole('button', moduleCard)).toHaveCount(1);
    await content.getByRole('button', 'Reset all filters').tap();
    await expect(content.getByRole('textbox', 'Search modules')).toHaveValue('');
    await expect(content.getByRole('button', 'Reset all filters')).toBeHidden();

    await content.getByRole('button', 'Filters').tap();
    await expect(drawerHeading).toBeVisible();
    await screen.getByRole('combobox', 'Subject').selectOption({ label: 'Finite Mathematics' });
    await screen.getByRole('button', 'Q2').tap();
    await screen.getByRole('button', 'Apply Filters').tap();
    await expect(drawerHeading).toBeHidden();
    await expect(content.getByText('Grade 11 · Finite Mathematics · Q2')).toBeVisible();
    await expect(content.getByRole('button', /^Systems and Matrices/)).toBeVisible();
    await expect(content.getByRole('button', /^Business and Finance/)).toHaveCount(0);
    await expect(quarterPill).toHaveValue('Q2');

    await content.getByRole('button', /^Filters/).tap();
    await expect(drawerHeading).toBeVisible();
    await screen.getByRole('button', 'Reset All').tap();
    await expect(screen.getByRole('combobox', 'Subject')).toHaveValue('all');
    await screen.getByRole('button', 'Close filter drawer').tap();
    await expect(drawerHeading).toBeHidden();
    await expect(content.getByText('Grade 11 · All Subjects · All Quarters')).toBeVisible();
  });

  test('module card opens the Study Journey with lessons and the competency check', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');

    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Patterns, Sequences, and Series', { level: 1 })).toBeVisible();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(content.getByText('Module Mastery')).toBeVisible();
    await expect(content.getByText(/^Lessons \d+\/3$/)).toBeVisible();
    await expect(content.getByText(/^Quizzes \d+\/2$/)).toBeVisible();
    await expect(content.getByText('Lesson 1')).toBeVisible();
    await expect(content.getByText('Lesson 2')).toBeVisible();
    await expect(content.getByText('Lesson 3')).toBeVisible();
    await expect(content.getByRole('button', /^Lesson 1\s*Identify and describe arithmetic and geometric patterns in data\./)).toBeVisible();
    await expect(content.getByRole('button', /^(Study Materials|Review)$/)).toHaveCount(3);
    await expect(content.getByRole('button', /^(Quiz|Retry)$/)).toHaveCount(3);

    await expect(content.getByText('mid-module checkpoint')).toBeVisible();
    await expect(content.getByText('COMPETENCY CHECK · General Quiz')).toBeVisible();
    const checkpoint = content.getByRole('button', /^(START|Retake)$/);
    await expect(checkpoint).toBeVisible();
    // Retake replaces START only once the checkpoint quiz is recorded as completed, and only then is a last score shown.
    if ((await checkpoint.textContent()) === 'Retake') {
      await expect(content.getByText(/^Quizzes [1-9]\d*\/2$/)).toBeVisible();
    } else {
      await expect(content.getByText(/^Last: /)).toBeHidden();
    }

    await content.getByRole('button', 'Back').tap();
    await expect(content.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible();
    await expect(content.getByRole('heading', 'Study Journey')).toBeHidden();
  });

  test('module hero shows a numeric chapter badge', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');

    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(content.getByText(/^Chapter \d+$/)).toBeVisible();
  });

  test('Study Materials turns into Review once the lesson has been opened', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen, browser }) => {
    // Only the label is under test, so the lesson's AI request is cut instead of generating a lesson nobody reads.
    await browser.route(ragLessonRoute, async (route) => {
      await route.abort();
    });
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('heading', 'Daily Rewards').waitFor({ timeout: 4_000 }).catch(() => undefined);
    await agent.act(dismissDialogs);
    await expect(screen.getByRole('heading', 'Daily Rewards')).toBeHidden();
    const content = screen.getByRole('main');

    await content.getByRole('button', /^Patterns, Sequences, and Series/).tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();
    // Lesson 3 is the one lesson no other e2e test opens, so it is the one whose label can still change.
    const lastLessonMaterials = content.getByRole('button', /^(Study Materials|Review)$/).last();
    await expect(lastLessonMaterials).toBeVisible();
    test.skip(
      (await lastLessonMaterials.textContent()) === 'Review',
      'the last lesson already shows Review, so the Study Materials to Review change cannot be observed',
    );
    await lastLessonMaterials.tap();
    await expect(content.getByRole('heading', 'Study Journey')).toBeHidden();
    await browser.back();
    await expect(content.getByRole('heading', 'Study Journey')).toBeVisible();
    await expect(lastLessonMaterials).toHaveText('Review', { timeout: 15_000 });
  });
});
