import { describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';

vi.spyOn(firebaseAuth, 'initializeAuth').mockImplementation(
  // SAFETY: the service guard reads only currentUser.uid from this auth seam.
  () => ({ currentUser: { uid: 'user-1' } }) as ReturnType<typeof firebaseAuth.initializeAuth>,
);

describe('mark all notifications read regression', () => {
  it('updates legacy and missing read flags but leaves already-read records untouched', async () => {
    const updates = vi.fn();
    const commit = vi.fn(async () => undefined);
    const docs = [
      { id: 'legacy-unread', ref: { id: 'legacy-unread' }, data: () => ({ read: false }) },
      { id: 'missing-flag', ref: { id: 'missing-flag' }, data: () => ({}) },
      { id: 'already-read', ref: { id: 'already-read' }, data: () => ({ isRead: true }) },
    ];
    // SAFETY: the production method reads only docs, refs, and data from this snapshot.
    const snapshot = { docs } as firestore.QuerySnapshot<firestore.DocumentData>;
    // SAFETY: the tested path only calls update and commit on the batch instance.
    const batch = Object.assign(Object.create(firestore.WriteBatch.prototype), {
      set: vi.fn(),
      update: updates,
      delete: vi.fn(),
      commit,
    }) as ReturnType<typeof firestore.writeBatch>;
    const getDocsSpy = vi.spyOn(firestore, 'getDocs').mockResolvedValue(snapshot);
    // SAFETY: mocked getDocs accepts an opaque collection reference.
    const collectionSpy = vi.spyOn(firestore, 'collection').mockReturnValue({} as ReturnType<typeof firestore.collection>);
    const batchSpy = vi.spyOn(firestore, 'writeBatch').mockReturnValue(batch);
    const { markAllAsRead } = await import('./notificationFirestoreService');

    await markAllAsRead('user-1');

    expect(updates).toHaveBeenCalledTimes(2);
    expect(updates).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'already-read' }), { isRead: true });
    expect(commit).toHaveBeenCalledTimes(1);
    getDocsSpy.mockRestore();
    collectionSpy.mockRestore();
    batchSpy.mockRestore();
  });
});
