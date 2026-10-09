import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const calendarMonth = /^[A-Z][a-z]+ \d{4}$/;
const titlePlaceholder = 'e.g., Mathematics Quiz - Grade 11';

describe('teacher schedule and calendar', { tags: ['teacher', 'schedule-calendar'], timeout: 120_000 }, () => {
  test('Previous month and Next month page the Academic Calendar, a day can be selected, and Hide Sidebar folds the day panel', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Schedule & Calendar').tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Schedules, deadlines, and events.')).toBeVisible();
    await expect(screen.getByText(/^\d+ events$/)).toBeVisible();

    const month = screen.getByRole('heading', calendarMonth, { level: 2 });
    await expect(month).toBeVisible();
    const shownMonth = (await month.textContent()) ?? '';

    await screen.getByRole('button', 'Next month').tap();
    await expect(month).not.toHaveText(shownMonth);
    const nextMonth = (await month.textContent()) ?? '';
    await screen.getByRole('button', 'Previous month').tap();
    await expect(month).toHaveText(shownMonth);
    await screen.getByRole('button', 'Previous month').tap();
    await expect(month).not.toHaveText(shownMonth);
    await expect(month).not.toHaveText(nextMonth);
    await screen.getByRole('button', 'Next month').tap();
    await expect(month).toHaveText(shownMonth);

    const [monthName, year] = shownMonth.split(' ');
    await screen.getByRole('main').getByText('15').tap();
    await expect(screen.getByText(new RegExp(`^(${monthName} 15, ${year}|15 ${monthName} ${year})$`))).toBeVisible();

    const addEvent = screen.getByRole('button', 'Add Event');
    await expect(addEvent).toBeVisible();
    await screen.getByRole('button', 'Hide Sidebar').tap();
    await expect(addEvent).toBeHidden();
    await screen.getByRole('button', 'Show Sidebar').tap();
    await expect(addEvent).toBeVisible();
    await expect(screen.getByRole('button', 'Hide Sidebar')).toBeVisible();
  });

  test('Add Event opens a blank form for the selected day and Cancel adds nothing', { session: 'teacher' }, async ({ app, screen }) => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const draftTitle = `E2E-calendar-cancelled-${Date.now()}`;
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Schedule & Calendar').tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Add Event').tap();
    const editorTitle = screen.getByRole('heading', 'Add New Event');
    const titleInput = screen.getByPlaceholder(titlePlaceholder);
    await expect(editorTitle).toBeVisible();
    await expect(screen.getByText('Schedule a classroom activity or reminder.')).toBeVisible();
    await expect(titleInput).toHaveValue('');
    await expect(screen.getByDisplayValue(todayKey)).toBeVisible();
    await expect(screen.getByDisplayValue('09:00')).toBeVisible();
    await expect(screen.getByLabel('End Time (Optional)')).toHaveValue('');
    await expect(screen.getByLabel('Class')).toBeVisible();
    await expect(screen.getByPlaceholder('Additional details about this event...')).toHaveValue('');
    for (const color of ['purple', 'blue', 'emerald', 'amber', 'rose']) {
      await expect(screen.getByRole('button', color)).toBeVisible();
    }
    await expect(screen.getByRole('button', 'Save Event')).toBeEnabled();

    await titleInput.fill(draftTitle);
    await screen.getByRole('button', 'Cancel').tap();
    await expect(editorTitle).toBeHidden();
    await expect(screen.getByText(draftTitle)).toHaveCount(0);

    await screen.getByRole('button', 'Add Event').tap();
    await expect(editorTitle).toBeVisible();
    await expect(titleInput).toHaveValue('');
    await screen.getByRole('button', 'Cancel').tap();
    await expect(editorTitle).toBeHidden();
  });

  test('Save Event without a title is refused, and reopening Add Event starts without the old error', { session: 'teacher' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Schedule & Calendar').tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();

    await screen.getByRole('button', 'Add Event').tap();
    const editorTitle = screen.getByRole('heading', 'Add New Event');
    const titleError = screen.getByText('Event title is required.');
    await expect(editorTitle).toBeVisible();
    await screen.getByRole('button', 'Save Event').tap();
    await expect(titleError).toBeVisible();
    await expect(editorTitle).toBeVisible();

    await screen.getByRole('button', 'Cancel').tap();
    await expect(editorTitle).toBeHidden();
    await screen.getByRole('button', 'Add Event').tap();
    await expect(editorTitle).toBeVisible();
    await expect(screen.getByPlaceholder(titlePlaceholder)).toHaveValue('');
    await expect(titleError).toBeHidden();
  });

  test('an E2E event saved on the 15th opens its details and Edit Event form, and Delete removes it', { session: 'teacher' }, async ({ app, browser, screen }) => {
    const eventTitle = `E2E-calendar-${Date.now()}`;
    const eventNote = 'E2E-calendar note, removed by this test';
    const dayCard = screen.getByRole('heading', eventTitle);
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Teaching' }).getByRole('button', 'Schedule & Calendar').tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();

    await screen.getByRole('main').getByText('15').tap();
    await screen.getByRole('button', 'Add Event').tap();
    const editorTitle = screen.getByRole('heading', 'Add New Event');
    await expect(editorTitle).toBeVisible();
    await expect(screen.getByDisplayValue(/^\d{4}-\d{2}-15$/)).toBeVisible();
    await screen.getByLabel('Class').selectOption('No class');
    await screen.getByPlaceholder(titlePlaceholder).fill(eventTitle);
    await screen.getByLabel('End Time (Optional)').fill('10:00');
    await screen.getByPlaceholder('Additional details about this event...').fill(eventNote);
    await screen.getByRole('button', 'blue').tap();
    await screen.getByRole('button', 'Save Event').tap();
    try {
      await expect(editorTitle).toBeHidden({ timeout: 30_000 });

      await expect(dayCard).toBeVisible();
      await dayCard.tap();
      const details = screen.getByRole('dialog');
      await expect(details.getByRole('heading', eventTitle)).toBeVisible();
      await expect(details.getByText('Details')).toBeVisible();
      await expect(details.getByText(eventNote)).toBeVisible();
      await expect(details.getByRole('button', 'Close event details')).toBeVisible();

      await details.getByRole('button', 'Edit Event').tap();
      const editHeading = screen.getByRole('heading', 'Edit Event');
      await expect(editHeading).toBeVisible();
      await expect(screen.getByPlaceholder(titlePlaceholder)).toHaveValue(eventTitle);
      await expect(screen.getByLabel('End Time (Optional)')).toHaveValue('10:00');
      await expect(screen.getByLabel('Class')).toHaveValue('');
      await screen.getByRole('button', 'Cancel').tap();
      await expect(editHeading).toBeHidden();
      await expect(dayCard).toBeVisible();

      await dayCard.tap();
      await expect(screen.getByRole('dialog').getByRole('heading', eventTitle)).toBeVisible();
      await screen.getByRole('dialog').getByRole('button', 'Delete').tap();
      await expect(screen.getByRole('dialog')).toBeHidden();
      await expect(screen.getByText(eventTitle)).toHaveCount(0);
      await expect(dayCard).not.toBeVisible({ timeout: 10_000 });
    } finally {
      // An assertion above may fail with the E2E event still saved; remove it so no test data stays in the live calendar.
      await browser.keyboard.press('Escape');
      await expect(screen.getByRole('dialog')).toBeHidden();
      if (await dayCard.isVisible()) {
        await dayCard.tap();
        await screen.getByRole('dialog').getByRole('button', 'Delete').tap();
        await expect(dayCard).toBeHidden();
      }
    }
  });

  test('on a phone, Teaching > Schedule & Calendar shows the day agenda and its Add Event form', { session: 'teacher' }, async ({ app, browser, screen }) => {
    await browser.setViewport({ width: 390, height: 844 });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('button', 'Teaching Options: My Classes and Calendar').tap();
    await screen.getByRole('button', 'Schedule & Calendar').tap();
    await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Hide Sidebar')).toBeHidden();

    await screen.getByRole('main').getByText('15').tap();
    await expect(screen.getByText(/^\d+ events? scheduled$/)).toBeVisible();

    await screen.getByRole('button', 'Add Event').tap();
    const editorTitle = screen.getByRole('heading', 'Add New Event');
    await expect(editorTitle).toBeVisible();
    await expect(screen.getByDisplayValue(/^\d{4}-\d{2}-15$/)).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(editorTitle).toBeHidden();
  });
});
