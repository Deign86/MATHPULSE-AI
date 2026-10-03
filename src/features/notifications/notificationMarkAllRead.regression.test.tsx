import { describe, expect, it } from 'vitest';
import { selectUnreadCount, type Notification } from './types';

describe('mark-all-read notification state regressions', () => {
  it('clears the unread badge when every notification is marked read', () => {
    const inbox: Notification[] = [
      { id: 'a', userId: 'u1', type: 'message', title: 'A', message: '', isRead: false, createdAt: new Date() },
      { id: 'b', userId: 'u1', type: 'message', title: 'B', message: '', isRead: false, createdAt: new Date() },
    ];
    expect(selectUnreadCount(inbox.map((notice) => ({ ...notice, isRead: true })))).toBe(0);
    expect(selectUnreadCount(inbox)).toBe(2);
  });

  it('keeps the badge at zero when the inbox has no records to mark', () => {
    expect(selectUnreadCount([])).toBe(0);
  });
});
