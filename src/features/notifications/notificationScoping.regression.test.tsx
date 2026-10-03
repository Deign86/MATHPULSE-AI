import { describe, expect, it } from 'vitest';
import { filterNotificationsForRole, type Notification } from './types';

const scopedNotice = (id: string, userId: string, type: Notification['type']): Notification => ({
  id, userId, type, title: 'Notice', message: 'Message', isRead: false, createdAt: new Date(),
});

describe('notification scoping regressions', () => {
  it('shows role-appropriate progress notices to students but not teacher alerts', () => {
    const inbox = [scopedNotice('quiz', 'student-1', 'quiz_result'), scopedNotice('risk', 'student-1', 'risk_alert')];
    expect(filterNotificationsForRole(inbox, 'student').map((notice) => notice.id)).toEqual(['quiz']);
  });

  it('returns no notices from an empty inbox for every role', () => {
    expect(filterNotificationsForRole([], 'student')).toEqual([]);
    expect(filterNotificationsForRole([], 'teacher')).toEqual([]);
  });
});
