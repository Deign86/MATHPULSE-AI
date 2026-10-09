import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const monthHeading = /^[A-Z][a-z]+ \d{4}$/;
const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

describe('teacher dashboard', { tags: ['teacher', 'teacher-dashboard'] }, () => {
  test('home lists My Classes with stat cards and quick-stat pills', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByText(/^Welcome back, .+$/)).toBeVisible();

    await expect(screen.getByRole('button', /^\d+ students$/)).toBeVisible();
    await expect(screen.getByRole('button', /^\d+ at risk$/)).toBeVisible();
    await expect(screen.getByRole('button', /^\d+% avg$/)).toBeVisible();

    await expect(screen.getByText('Total Students')).toBeVisible();
    await expect(screen.getByText('Class Average')).toBeVisible();
    await expect(screen.getByText('Engagement')).toBeVisible();
    await expect(screen.getByText('Needs Attention')).toBeVisible();

    await expect(screen.getByRole('heading', 'My Classes')).toBeVisible();
    const viewAll = screen.getByRole('button', /^View all \(\d+\)$/);
    await expect(viewAll).toBeVisible();
    const classCount = Number((await viewAll.textContent())?.match(/\d+/)?.[0] ?? Number.NaN);
    test.skip(classCount === 0, 'the e2e teacher has no classes, so My Classes shows only the empty state');

    await expect(screen.getByText('Manage Class')).toHaveCount(classCount);
    await expect(screen.getByRole('button', /^Delete .+$/)).toHaveCount(classCount);
  });

  test('Manage Class opens Class Analytics for that class and View all opens Class Analytics', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const manage = screen.getByText('Manage Class').first();
    const hasClass = await manage.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, 'the e2e teacher has no classes to open');

    const deleteLabel = (await screen.getByRole('button', /^Delete .+$/).first().getAttribute('aria-label')) ?? '';
    const className = deleteLabel.replace(/^Delete /, '');
    await manage.tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', className, { level: 1 })).toBeVisible();

    await screen.getByRole('main').getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
    await screen.getByRole('button', /^View all \(\d+\)$/).tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
  });

  test('each class row shows its risk pill', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const rows = screen.getByText('Manage Class');
    const hasClass = await rows.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, 'the e2e teacher has no classes');

    await expect(screen.getByText(/^(High Risk|Attention|On Track)$/, { visible: true })).toHaveCount(await rows.count());
  });

  test('stat cards and quick-stat pills open their views', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const sidebar = screen.getByRole('navigation').filter({ hasText: 'Teaching' });

    await screen.getByText('Total Students').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await sidebar.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByText('Needs Attention').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await sidebar.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByRole('button', /^\d+ students$/).tap();
    await expect(screen.getByRole('heading', 'Student Competency', { level: 1 })).toBeVisible();
    await sidebar.getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();

    await screen.getByRole('button', /^\d+% avg$/).tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
  });

  test('the at-risk pill opens a view of at-risk students', { session: 'teacher' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', /^\d+ at risk$/).tap();
    await expect(screen.getByRole('heading', 'Intervention Center', { level: 1 })).toBeVisible();
    await agent.assert(
      'below the Intervention Center header the main area lists at-risk students or says that no students are at risk; it is not blank',
    );
  });

  test('header AI Insight button opens and closes the Detailed AI Insight panel', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'View AI Insight').tap();
    const title = screen.getByRole('heading', 'Detailed AI Insight');
    await expect(title).toBeVisible();
    await expect(screen.getByRole('button', 'Minimize to Menu')).toBeVisible();
    await screen.getByRole('button', 'Close insight dialog').tap();
    await expect(title).toBeHidden();
    await expect(screen.getByText('MathPulse AI Insight')).toBeHidden();
  });

  test('AI insight banner opens the Detailed AI Insight with generated analysis', { session: 'teacher', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const banner = screen.getByText('MathPulse AI Insight');
    const shown = await banner.waitFor({ timeout: 120_000 }).then(() => true, () => false);
    test.skip(!shown, 'no daily insight banner: the e2e teacher has no students on record');

    await expect(screen.getByText('Students may be at risk of falling behind. Tap to view detailed analysis.')).toBeVisible();
    await banner.tap();
    const title = screen.getByRole('heading', 'Detailed AI Insight');
    await expect(title).toBeVisible();
    await agent.waitFor('the Detailed AI Insight panel shows a written insight about student risk or class performance', {
      timeout: 120_000,
    });
    await screen.getByRole('button', 'Minimize to Menu').tap();
    await expect(title).toBeHidden();
    await expect(banner).toBeHidden();
  });

  test('AI insight banner Review opens Class Analytics and Dismiss hides it', { session: 'teacher', timeout: 240_000 }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const banner = screen.getByText('MathPulse AI Insight');
    const shown = await banner.waitFor({ timeout: 120_000 }).then(() => true, () => false);
    test.skip(!shown, 'no daily insight banner: the e2e teacher has no students on record');

    await screen.getByRole('button', 'Review').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Dashboard').tap();
    await expect(banner).toBeVisible();

    await screen.getByRole('button', 'Dismiss').tap();
    await expect(banner).toBeHidden();
    await expect(screen.getByRole('heading', 'Detailed AI Insight')).toBeHidden();
  });

  test('Schedule & Activity drawer switches tabs, pages the mini calendar and closes', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });

    await screen.getByRole('button', 'Open schedule and activity panel').tap();
    const drawer = screen.getByRole('complementary').filter({ hasText: 'Activity & Calendar' });
    await expect(drawer.getByText('Activity & Calendar')).toBeVisible();
    await expect(drawer.getByRole('button', 'Profile')).toBeVisible();
    await expect(drawer.getByText('Live Activity Stream')).toBeVisible();
    await expect(drawer.getByText('LIVE')).toBeVisible();

    await drawer.getByRole('button', 'Reminders').tap();
    await expect(drawer.getByText('Live Activity Stream')).toBeHidden();
    await drawer.getByRole('button', 'Live pulse').tap();
    await expect(drawer.getByText('Live Activity Stream')).toBeVisible();

    const shownMonth = (await drawer.getByText(monthHeading).textContent()) ?? '';
    await drawer.getByRole('button', 'Next month').tap();
    await expect(drawer.getByText(shownMonth)).toBeHidden();
    await drawer.getByRole('button', 'Previous month').tap();
    await expect(drawer.getByText(shownMonth)).toBeVisible();

    await drawer.getByRole('button', 'Collapse calendar').tap();
    await expect(drawer.getByText('Mo')).toBeHidden();
    await drawer.getByRole('button', 'Expand calendar').tap();
    await expect(drawer.getByText('Mo')).toBeVisible();

    await drawer.getByRole('button', 'Close drawer').tap();
    await expect(screen.getByText('Activity & Calendar')).toBeHidden();

    await screen.getByRole('button', 'Open schedule and activity panel').tap();
    await expect(screen.getByText('Activity & Calendar')).toBeVisible();
    await screen.getByRole('button', 'Close activity and schedule panel').tap();
    await expect(screen.getByText('Activity & Calendar')).toBeHidden();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('Schedule & Activity drawer opens Schedule & Calendar and My Profile', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    const drawer = screen.getByRole('complementary').filter({ hasText: 'Activity & Calendar' });

    await screen.getByRole('button', 'Open schedule and activity panel').tap();
    await drawer.getByText(monthHeading).tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Activity & Calendar')).toBeHidden();

    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
    await screen.getByRole('button', 'Open schedule and activity panel').tap();
    await drawer.getByRole('button', 'Profile').tap();
    await expect(screen.getByText('Activity & Calendar')).toBeHidden();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeHidden();
    await screen.getByRole('button', 'Back to Dashboard').tap();
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible();
  });

  test('drawer mini calendar puts the 1st of the month under its weekday', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Open schedule and activity panel').tap();
    const drawer = screen.getByRole('complementary').filter({ hasText: 'Activity & Calendar' });
    await expect(drawer.getByText('Mo')).toBeVisible();

    const [monthName, year] = ((await drawer.getByText(monthHeading).textContent()) ?? '').split(' ');
    const mondayFirstColumn = (new Date(`${monthName} 1, ${year}`).getDay() + 6) % 7;
    const columnHeader = drawer.getByText(weekdayLabels[mondayFirstColumn] ?? '');
    const firstOfMonth = drawer.getByText('1');

    await expect
      .poll(async () => {
        const headerBefore = await columnHeader.boundingBox();
        const day = await firstOfMonth.boundingBox();
        const headerAfter = await columnHeader.boundingBox();
        if (!headerBefore || !day || !headerAfter || headerBefore.x !== headerAfter.x) return Number.POSITIVE_INFINITY;
        return Math.abs(day.x + day.width / 2 - (headerBefore.x + headerBefore.width / 2));
      }, { timeout: 10_000 })
      .toBeLessThan(4);
  });

  test('Create Class modal validates the section and Cancel creates nothing', { session: 'teacher' }, async ({ app, screen }) => {
    const sectionName = `E2E-cancelled-${Date.now()}`;
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'My Classes').tap();
    await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible();
    const newClass = screen.getByRole('button', 'New Class');
    const hasClass = await newClass.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.skip(!hasClass, 'the e2e teacher has no class, so only the empty-state Create Class card is shown');

    await newClass.tap();
    const title = screen.getByRole('heading', 'Create New Class');
    const sectionInput = screen.getByPlaceholder('e.g. STEM-1, Rizal');
    await expect(title).toBeVisible();
    await expect(sectionInput).toHaveValue('');
    await expect(screen.getByRole('button', 'Create Class')).toBeDisabled();

    await screen.getByRole('button', 'Add Students').tap();
    await expect(screen.getByText('Section is required')).toBeVisible();

    await sectionInput.fill(sectionName);
    await expect(screen.getByRole('button', 'Create Class')).toBeEnabled();
    await screen.getByRole('button', 'Add Students').tap();
    await expect(screen.getByRole('heading', 'Add Students')).toBeVisible();
    await expect(screen.getByText('0 student(s) selected')).toBeVisible();
    await expect(screen.getByRole('button', 'Create with 0 Students')).toBeVisible();
    await screen.getByRole('button', 'Back').tap();
    await expect(title).toBeVisible();
    await expect(sectionInput).toHaveValue(sectionName);

    await screen.getByRole('button', 'Cancel').tap();
    await expect(title).toBeHidden();
    await expect(screen.getByText(sectionName, { exact: false })).toHaveCount(0);

    await newClass.tap();
    await expect(sectionInput).toHaveValue('');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(title).toBeHidden();

    await screen.getByRole('main').getByRole('button', 'Dashboard').tap();
    await expect(screen.getByRole('heading', 'My Classes')).toBeVisible();
    await expect(screen.getByText(sectionName, { exact: false })).toHaveCount(0);
  });
});
