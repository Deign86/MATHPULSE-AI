import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_PAGE_SIZE,
  dedupeNotifications,
  paginateNotifications,
  selectUnreadCount,
  type Notification,
} from './types';

const row = (overrides: Partial<Notification> & { id: string }): Notification => ({
  userId: 'user-1',
  type: 'message',
  title: 'Title',
  message: 'Message',
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

describe('notification collation (issue #158)', () => {
  it('page size is 20', () => {
    expect(NOTIFICATION_PAGE_SIZE).toBe(20);
  });

  it('drops exact duplicate ids, keeping the newest row', () => {
    const items = [
      row({ id: 'dup', title: 'Newest', createdAt: new Date('2026-09-02') }),
      row({ id: 'dup', title: 'Stale', createdAt: new Date('2026-09-01') }),
      row({ id: 'other', title: 'Other' }),
    ];
    const collated = dedupeNotifications(items);
    expect(collated.map((item) => item.id)).toEqual(['dup', 'other']);
    expect(collated[0].title).toBe('Newest');
  });

  it('collapses recurring check-in reminders with identical titles to the newest', () => {
    const items = [
      row({ id: 'n3', type: 'daily_checkin', title: "Don't forget your daily check-in!", createdAt: new Date('2026-09-03') }),
      row({ id: 'n2', type: 'daily_checkin', title: "Don't forget your daily check-in!", createdAt: new Date('2026-09-02') }),
      row({ id: 'n1', type: 'streak_reminder', title: "Don't forget your daily check-in!", createdAt: new Date('2026-09-01') }),
    ];
    const collated = dedupeNotifications(items);
    expect(collated.map((item) => item.id)).toEqual(['n3', 'n1']);
  });

  it('keeps distinct recurring reminders and non-recurring types untouched', () => {
    const items = [
      row({ id: 'a', type: 'daily_checkin', title: 'Check in A' }),
      row({ id: 'b', type: 'daily_checkin', title: 'Check in B' }),
      row({ id: 'c', type: 'quiz_assigned', title: 'Check in A' }),
    ];
    expect(dedupeNotifications(items).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('badge count equals unread rows of the collated list', () => {
    const items = dedupeNotifications([
      row({ id: 'u1', isRead: false }),
      row({ id: 'u2', isRead: false }),
      row({ id: 'r1', isRead: true }),
      row({ id: 'u1', isRead: false }),
    ]);
    expect(selectUnreadCount(items)).toBe(2);
  });

  it('empty inbox is a zero-state: no rows, zero unread', () => {
    expect(dedupeNotifications([])).toEqual([]);
    expect(selectUnreadCount([])).toBe(0);
  });

  it('paginates 20 per page without mutating the list', () => {
    const items = Array.from({ length: 45 }, (_, index) => row({ id: `n${index}` }));
    expect(paginateNotifications(items, NOTIFICATION_PAGE_SIZE)).toHaveLength(20);
    expect(paginateNotifications(items, 40)).toHaveLength(40);
    expect(paginateNotifications(items, 100)).toHaveLength(45);
    expect(items).toHaveLength(45);
  });
});
