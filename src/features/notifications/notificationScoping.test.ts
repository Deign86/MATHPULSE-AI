/**
 * @file notificationScoping.test.ts
 * Characterization tests for issue #156 (cross-role notification leak).
 *
 * A student inbox must NEVER surface teacher-only alerts (e.g. risk_alert
 * carrying another student's mastery data), even if such a document is
 * present in the student's subcollection (misaddressed backend fan-out,
 * stale seed data, or a compromised writer).
 */
import { describe, it, expect } from 'vitest';
import {
  filterNotificationsForRole,
  TEACHER_ONLY_NOTIFICATION_TYPES,
  type Notification,
} from './types';

const baseNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'student-uid',
  type: 'quiz_result',
  title: 'Quiz graded',
  message: 'You scored 9/10.',
  isRead: false,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

describe('notification role scoping (issue #156)', () => {
  it('marks risk_alert as teacher-only', () => {
    expect(TEACHER_ONLY_NOTIFICATION_TYPES).toContain('risk_alert');
  });

  it('strips teacher-only alerts from a student inbox', () => {
    const inbox = [
      baseNotification({ id: 'a', type: 'quiz_result' }),
      baseNotification({
        id: 'b',
        type: 'risk_alert',
        title: 'At-Risk Student Alert: Maria Santos (Grade 11 - STEM A)',
        message: 'Mastery data leak — must never reach a student.',
      }),
    ];
    const visible = filterNotificationsForRole(inbox, 'student');
    expect(visible.map((item) => item.id)).toEqual(['a']);
  });

  it('keeps teacher-only alerts for teacher and admin roles', () => {
    const inbox = [
      baseNotification({ id: 'a', type: 'quiz_result' }),
      baseNotification({ id: 'b', type: 'risk_alert', title: 'At-risk' }),
    ];
    expect(filterNotificationsForRole(inbox, 'teacher').map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterNotificationsForRole(inbox, 'admin').map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('keeps student-appropriate types for students', () => {
    const inbox = [
      baseNotification({ id: 'a', type: 'new_assignment' }),
      baseNotification({ id: 'b', type: 'teacher_announcement' }),
      baseNotification({ id: 'c', type: 'daily_checkin' }),
    ];
    expect(filterNotificationsForRole(inbox, 'student')).toHaveLength(3);
  });
});
