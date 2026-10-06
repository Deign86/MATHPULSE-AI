import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../types/models';
import { rollbackCalendarSave } from './TeacherCalendarView';

const event: CalendarEvent = {
  id: 'event-1',
  userId: 'teacher-1',
  title: 'Original title',
  startTime: new Date('2026-10-05T09:00:00'),
  createdAt: new Date('2026-10-01T10:00:00'),
};

describe('calendar save rollback', () => {
  it('removes a failed optimistic create', () => {
    const optimisticEvent = { ...event, id: 'temp-1', title: 'Draft title' };

    expect(rollbackCalendarSave([event, optimisticEvent], 'temp-1')).toEqual([event]);
  });

  it('restores the previous event after a failed update', () => {
    const optimisticEvent = { ...event, title: 'Changed title' };

    expect(rollbackCalendarSave([optimisticEvent], null, event)).toEqual([event]);
  });
});
