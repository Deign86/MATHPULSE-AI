import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
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
} from 'firebase/firestore';
import type { DocumentReference, QuerySnapshot, DocumentData } from 'firebase/firestore';
import * as dateFns from 'date-fns';
import * as firebaseAuth from 'firebase/auth';

// The authenticated-user stub must be installed before the service module pulls
// in @/lib/firebase, so the service-under-test is imported dynamically below.
// SAFETY: stub Auth; exercised paths only read currentUser.uid.
vi.spyOn(firebaseAuth, 'initializeAuth').mockImplementation(
  () =>
    // SAFETY: stub Auth; exercised paths only read currentUser.uid.
    ({ currentUser: { uid: 'test-user-id' } }) as ReturnType<typeof firebaseAuth.initializeAuth>,
);

vi.spyOn(dateFns, 'startOfDay').mockImplementation((date) => date);
vi.spyOn(dateFns, 'endOfDay').mockImplementation((date) => date);

const mockCollectionRef = { type: 'collection-ref' };
const mockDocRef = { id: 'mock-id' };

// SAFETY: production code treats Firestore handles as opaque values, so plain
// objects stand in for the members exercised by these tests.
const docRefWith = (id: string) => ({ id }) as DocumentReference<DocumentData>;
// SAFETY: same opaque-handle rationale as docRefWith.
const snapshotWith = ({ docs, ...rest }: { docs: object[]; empty?: boolean }) =>
  // SAFETY: opaque snapshot handle; only docs/empty are read.
  ({ docs, ...rest }) as QuerySnapshot<DocumentData>;

vi.spyOn(firestore, 'collection').mockImplementation(
  // SAFETY: opaque collection handle.
  () => mockCollectionRef as ReturnType<typeof collection>,
);
vi.spyOn(firestore, 'doc').mockImplementation(() => docRefWith('mock-id'));
vi.spyOn(firestore, 'setDoc').mockImplementation(async () => undefined);
vi.spyOn(firestore, 'getDocs').mockImplementation(async () => snapshotWith([]));
vi.spyOn(firestore, 'updateDoc').mockImplementation(async () => undefined);
vi.spyOn(firestore, 'deleteDoc').mockImplementation(async () => undefined);

const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  hasCheckedInToday,
} = await import('./notificationFirestoreService');
import type { NotificationPayload } from './types';

describe('notificationFirestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('creates a notification with correct data', async () => {
      const mockDocRef = docRefWith('notif-123');
      vi.mocked(doc).mockReturnValue(mockDocRef);

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
        }),
      );
      expect(result).toBe('notif-123');
    });

    it('creates notification without optional fields', async () => {
      const mockDocRef = docRefWith('notif-456');
      vi.mocked(doc).mockReturnValue(mockDocRef);

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
        }),
      );
    });

    it('handles errors gracefully', async () => {
      vi.mocked(setDoc).mockRejectedValue(new Error('Firestore error'));

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
      vi.mocked(getDocs).mockResolvedValue(snapshotWith(mockDocs));

      const result = await getUserNotifications('user-123', 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1'); // Newest first
      expect(result[1].id).toBe('notif-2');
      expect(getDocs).toHaveBeenCalled();
    });

    it('returns empty array on error', async () => {
      vi.mocked(getDocs).mockRejectedValue(new Error('Query failed'));

      const result = await getUserNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('updates notification isRead to true on both paths', async () => {
      await markAsRead('user-123', 'notif-123');

      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(updateDoc).mockRejectedValue(new Error('Update failed'));

      // Dual-path: individual .catch() handlers swallow per-path errors
      await expect(markAsRead('user-123', 'notif-123')).resolves.toBeUndefined();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      const mockSubcollectionDocs = [
        { ref: 'ref-1', data: () => ({ isRead: false }) },
        { ref: 'ref-2', data: () => ({ isRead: false }) },
      ];
      const mockTopLevelDocs = [{ ref: 'ref-3', data: () => ({ isRead: false, read: false }) }];
      vi.mocked(getDocs)
        .mockResolvedValueOnce(snapshotWith(mockSubcollectionDocs))
        .mockResolvedValueOnce(snapshotWith(mockTopLevelDocs));

      await markAllAsRead('user-123');

      expect(updateDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('deleteNotification', () => {
    it('deletes the notification document from both paths', async () => {
      await deleteNotification('user-123', 'notif-123');

      expect(deleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeToNotifications', () => {
    it('returns an unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(onSnapshot).mockImplementation((_query, callback) => {
        // Simulate immediate callback with empty snapshot
        callback(snapshotWith([]));
        return mockUnsubscribe;
      });

      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications('user-123', callback);

      expect(unsubscribe).toBeTypeOf('function');
      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('hasCheckedInToday', () => {
    it('returns true if check-in exists for today', async () => {
      vi.mocked(getDocs).mockResolvedValue(snapshotWith({ empty: false, docs: [{ id: 'notif-1' }] }));

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(true);
      expect(where).toHaveBeenCalledWith('type', '==', 'daily_checkin');
    });

    it('returns false if no check-in exists for today', async () => {
      vi.mocked(getDocs).mockResolvedValue(snapshotWith({ empty: true, docs: [] }));

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      vi.mocked(getDocs).mockRejectedValue(new Error('Query failed'));

      const result = await hasCheckedInToday('user-123');

      expect(result).toBe(false);
    });
  });
});
