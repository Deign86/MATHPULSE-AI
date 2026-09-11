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

vi.spyOn(dateFns, 'startOfDay').mockImplementation((date) => new Date(date));
vi.spyOn(dateFns, 'endOfDay').mockImplementation((date) => new Date(date));

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
vi.spyOn(firestore, 'getDocs').mockImplementation(async () => snapshotWith({ docs: [] }));
vi.spyOn(firestore, 'updateDoc').mockImplementation(async () => undefined);
vi.spyOn(firestore, 'deleteDoc').mockImplementation(async () => undefined);
// SAFETY: mock WriteBatch handle; tests only assert update and commit operations.
const mockWriteBatchWith = (overrides?: {
  update?: ReturnType<typeof vi.fn>;
  commit?: ReturnType<typeof vi.fn>;
}) => {
  const batch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(async () => undefined),
    ...overrides,
  };
  // SAFETY: attaches WriteBatch prototype to avoid chained assertion laundering.
  return Object.assign(
    Object.create(firestore.WriteBatch.prototype),
    batch,
  ) as ReturnType<typeof firestore.writeBatch>;
};

vi.spyOn(firestore, 'writeBatch').mockImplementation(
  // SAFETY: batch handle; tests only assert update/commit calls.
  () => mockWriteBatchWith(),
);

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
      vi.mocked(getDocs).mockResolvedValue(snapshotWith({ docs: mockDocs }));

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
    it('updates notification isRead to true on subcollection', async () => {
      await markAsRead('user-123', 'notif-123');

      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { isRead: true, read: true });
    });

    it('handles errors by throwing', async () => {
      vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed'));

      await expect(markAsRead('user-123', 'notif-123')).rejects.toThrow('Update failed');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      const mockIsReadDocs = [
        { id: 'doc-1', ref: 'ref-1', data: () => ({ isRead: false }) },
        { id: 'doc-2', ref: 'ref-2', data: () => ({ isRead: false }) },
      ];
      const mockLegacyDocs = [
        { id: 'doc-2', ref: 'ref-2', data: () => ({ read: false }) },
        { id: 'doc-3', ref: 'ref-3', data: () => ({ read: false }) },
      ];
      vi.mocked(getDocs)
        .mockResolvedValueOnce(snapshotWith({ docs: mockIsReadDocs }))
        .mockResolvedValueOnce(snapshotWith({ docs: mockLegacyDocs }));
      const batchUpdate = vi.fn();
      const batchCommit = vi.fn(async () => undefined);
      vi.mocked(firestore.writeBatch).mockImplementation(
        // SAFETY: mock WriteBatch handle; tests track batchUpdate and batchCommit calls.
        () => mockWriteBatchWith({ update: batchUpdate, commit: batchCommit }),
      );

      await markAllAsRead('user-123');

      // doc-1, doc-2 (deduped), doc-3 → 3 batched updates, one atomic commit
      expect(batchUpdate).toHaveBeenCalledTimes(3);
      expect(batchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteNotification', () => {
    it('deletes the notification document from subcollection', async () => {
      await deleteNotification('user-123', 'notif-123');

      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeToNotifications', () => {
    it('returns an unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      type SnapshotCallback = (snapshot: QuerySnapshot<DocumentData>) => void;
      const onSnapshotImpl = (
        _query: Parameters<typeof onSnapshot>[0],
        onNext: SnapshotCallback,
      ): (() => void) => {
        // Simulate immediate callback with empty snapshot
        onNext(snapshotWith({ docs: [] }));
        return mockUnsubscribe;
      };
      const onSnapshotSpy = vi.spyOn(firestore, 'onSnapshot');
      onSnapshotSpy.mockImplementation(
        // SAFETY: service exercises only the (query, onNext) overload of onSnapshot.
        onSnapshotImpl as typeof onSnapshot,
      );

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
