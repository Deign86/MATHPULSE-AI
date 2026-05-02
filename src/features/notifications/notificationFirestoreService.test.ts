import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';

vi.mock('firebase/firestore', () => {
  const mockCollectionRef = { type: 'collection-ref' };
  const mockDocRef = { id: 'mock-id' };
  
  // Create a proper Timestamp mock that supports instanceof checks
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;
    
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    
    toDate() {
      return new Date(this.seconds * 1000);
    }
    
    static fromDate(date: Date) {
      return new MockTimestamp(Math.floor(date.getTime() / 1000), 0);
    }
  }

  return {
    collection: vi.fn(() => mockCollectionRef),
    doc: vi.fn(() => mockDocRef),
    setDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn((...args) => args),
    where: vi.fn((...args) => ({ type: 'where', args })),
    orderBy: vi.fn((...args) => ({ type: 'orderBy', args })),
    limit: vi.fn((n: number) => ({ type: 'limit', count: n })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
    onSnapshot: vi.fn(),
    Timestamp: MockTimestamp as any,
  };
});

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('date-fns', () => ({
  startOfDay: vi.fn((date: Date) => date),
  endOfDay: vi.fn((date: Date) => date),
}));

import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  hasCheckedInToday,
} from './notificationFirestoreService';
import type { NotificationPayload } from './types';

describe('notificationFirestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('creates a notification with correct data', async () => {
      const mockDocRef = { id: 'notif-123' } as any;
      const docMock = vi.mocked(doc);
      docMock.mockReturnValue(mockDocRef);
      const setDocMock = vi.mocked(setDoc);
      setDocMock.mockResolvedValue(undefined);

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'daily_checkin',
        title: 'Daily Check-In Complete!',
        message: 'You earned 20 XP!',
        metadata: { xpEarned: 20 },
        actionUrl: '/dashboard',
      };

      const result = await createNotification(payload);

      expect(collection).toHaveBeenCalledWith(expect.anything(), 'notifications', 'user-123', 'items');
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          userId: 'user-123',
          type: 'daily_checkin',
          title: 'Daily Check-In Complete!',
          message: 'You earned 20 XP!',
          isRead: false,
          metadata: { xpEarned: 20 },
          actionUrl: '/dashboard',
        })
      );
      expect(result).toBe('notif-123');
    });

    it('creates notification without optional fields', async () => {
      const mockDocRef = { id: 'notif-456' } as any;
      (doc as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDocRef);
      (setDoc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const payload: NotificationPayload = {
        userId: 'user-456',
        type: 'streak_reminder',
        title: 'Streak Reminder',
        message: 'Check in today!',
      };

      await createNotification(payload);

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.not.objectContaining({
          metadata: expect.anything(),
          actionUrl: expect.anything(),
        })
      );
    });

    it('handles errors gracefully', async () => {
      (setDoc as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Firestore error'));

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'daily_checkin',
        title: 'Test',
        message: 'Test message',
      };

      await expect(createNotification(payload)).rejects.toThrow('Firestore error');
    });
  });

  describe('getUserNotifications', () => {
    it('returns notifications ordered by createdAt desc', async () => {
      const mockDocs = [
        { id: 'notif-1', data: () => ({ userId: 'user-123', type: 'daily_checkin', title: 'Test 1', message: 'Msg 1', isRead: false, createdAt: new Date(2000, 0, 1) }) },
        { id: 'notif-2', data: () => ({ userId: 'user-123', type: 'streak_reminder', title: 'Test 2', message: 'Msg 2', isRead: true, createdAt: new Date(1000, 0, 1) }) },
      ];
      const mockSnapshot = { docs: mockDocs } as any;
      const getDocsMock = vi.mocked(getDocs);
      getDocsMock.mockResolvedValue(mockSnapshot);

      const result = await getUserNotifications('user-123', 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1'); // Newest first
      expect(result[1].id).toBe('notif-2');
      expect(getDocsMock).toHaveBeenCalled();
    });

    it('returns empty array on error', async () => {
      const getDocsMock2 = vi.mocked(getDocs);
      getDocsMock2.mockRejectedValue(new Error('Query failed') as any);

      const result = await getUserNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('updates notification isRead to true', async () => {
      await markAsRead('user-123', 'notif-123');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { isRead: true }
      );
    });

    it('handles errors gracefully', async () => {
      (updateDoc as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Update failed'));

      await expect(markAsRead('user-123', 'notif-123')).rejects.toThrow('Update failed');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      const mockDocs = [
        { ref: 'ref-1', data: () => ({ isRead: false }) },
        { ref: 'ref-2', data: () => ({ isRead: false }) },
      ];
      const mockSnapshot = { docs: mockDocs } as any;
      (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSnapshot);
      (updateDoc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await markAllAsRead('user-123');

      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteNotification', () => {
    it('deletes the notification document', async () => {
      await deleteNotification('user-123', 'notif-123');

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('subscribeToNotifications', () => {
    it('returns an unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      (onSnapshot as unknown as ReturnType<typeof vi.fn>).mockImplementation((query, callback) => {
        // Simulate immediate callback with empty snapshot
        callback({ docs: [] });
        return mockUnsubscribe;
      });

      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications('user-123', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('hasCheckedInToday', () => {
    it('returns true if check-in exists for today', async () => {
      const mockSnapshot = { empty: false, docs: [{ id: 'notif-1' }] } as any;
      (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSnapshot);

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(true);
      expect(where).toHaveBeenCalledWith('type', '==', 'daily_checkin');
    });

    it('returns false if no check-in exists for today', async () => {
      const mockSnapshot = { empty: true, docs: [] } as any;
      (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSnapshot);

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (getDocs as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Query failed'));

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(false);
    });
  });
});
