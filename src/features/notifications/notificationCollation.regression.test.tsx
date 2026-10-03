import { describe, expect, it } from 'vitest';
import { dedupeNotifications, paginateNotifications, selectUnreadCount, type Notification } from './types';

const makeNotice = (id: string, overrides: Partial<Notification> = {}): Notification => ({
  id, userId: 'learner-1', type: 'message', title: 'Notice', message: 'Body', isRead: false,
  createdAt: new Date('2026-10-01T00:00:00Z'), ...overrides,
});

describe('notification collation regressions', () => {
  it('removes duplicate ids before selecting the unread badge count', () => {
    const notices = dedupeNotifications([makeNotice('dup'), makeNotice('dup'), makeNotice('read', { isRead: true })]);
    expect(notices).toHaveLength(2);
    expect(selectUnreadCount(notices)).toBe(1);
  });

  it('keeps empty inbox pagination empty and does not mutate source rows', () => {
    const notices: Notification[] = [];
    expect(paginateNotifications(notices, 20)).toEqual([]);
    expect(notices).toEqual([]);
    expect(selectUnreadCount(notices)).toBe(0);
  });
});
