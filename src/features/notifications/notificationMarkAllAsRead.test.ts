import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import type { DocumentReference, QuerySnapshot, DocumentData } from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';

vi.spyOn(firebaseAuth, 'initializeAuth').mockImplementation(
  () =>
    // SAFETY: stub Auth; exercised paths only read currentUser.uid.
    ({ currentUser: { uid: 'test-user-id' } }) as ReturnType<typeof firebaseAuth.initializeAuth>,
);

const mockCollectionRef = { type: 'collection-ref' };

const docRefWith = (id: string) =>
  // SAFETY: production code reads only the opaque Firestore reference id in this test.
  ({ id }) as DocumentReference<DocumentData>;

const snapshotWith = ({ docs, ...rest }: { docs: object[]; empty?: boolean }) =>
  // SAFETY: production code reads only docs and empty from this opaque snapshot.
  ({ docs, ...rest }) as QuerySnapshot<DocumentData>;

const notificationDocWith = (id: string, fields: DocumentData) => ({
  id,
  ref: docRefWith(id),
  data: () => fields,
});

vi.spyOn(firestore, 'collection').mockImplementation(
  // SAFETY: opaque collection handle.
  () => mockCollectionRef as ReturnType<typeof collection>,
);
vi.spyOn(firestore, 'getDocs').mockImplementation(async () => snapshotWith({ docs: [] }));

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
  // SAFETY: batch handle; tests only assert update and commit calls.
  () => mockWriteBatchWith(),
);

const { markAllAsRead } = await import('./notificationFirestoreService');

describe('markAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocs).mockReset();
    vi.mocked(getDocs).mockResolvedValue(snapshotWith({ docs: [] }));
  });

  it('marks all unread notifications as read', async () => {
    const notificationDocs = [
      notificationDocWith('doc-1', { isRead: false }),
      notificationDocWith('doc-2', { isRead: false }),
      notificationDocWith('doc-3', { read: false }),
    ];
    vi.mocked(getDocs).mockResolvedValue(snapshotWith({ docs: notificationDocs }));
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn(async () => undefined);
    vi.mocked(firestore.writeBatch).mockImplementation(
      // SAFETY: mock WriteBatch handle; tests track batchUpdate and batchCommit calls.
      () => mockWriteBatchWith({ update: batchUpdate, commit: batchCommit }),
    );

    await markAllAsRead('user-123');

    expect(batchUpdate).toHaveBeenCalledTimes(3);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('treats field-less documents as unread without updating already-read documents', async () => {
    const notificationDocs = [
      notificationDocWith('explicit-unread', { isRead: false }),
      notificationDocWith('legacy-unread', { read: false }),
      notificationDocWith('field-less', {}),
      notificationDocWith('explicit-read', { isRead: true }),
      notificationDocWith('legacy-read', { read: true }),
    ];
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn(async () => undefined);
    vi.mocked(getDocs).mockResolvedValue(snapshotWith({ docs: notificationDocs }));
    vi.mocked(firestore.writeBatch).mockImplementation(
      // SAFETY: mock WriteBatch handle; tests track batchUpdate and batchCommit calls.
      () => mockWriteBatchWith({ update: batchUpdate, commit: batchCommit }),
    );

    await markAllAsRead('user-123');

    expect(batchUpdate).toHaveBeenCalledTimes(3);
    expect(batchUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'field-less' }), { isRead: true });
    expect(batchUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'explicit-read' }), { isRead: true });
    expect(batchUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'legacy-read' }), { isRead: true });
  });

  it('reads back three seeded unread documents as read', async () => {
    const records = new Map<string, DocumentData>([
      ['explicit-unread', { isRead: false }],
      ['legacy-unread', { read: false }],
      ['field-less', {}],
    ]);
    vi.mocked(getDocs).mockImplementation(async () => snapshotWith({
      docs: Array.from(records, ([id, fields]) => notificationDocWith(id, fields)),
    }));
    vi.mocked(firestore.writeBatch).mockImplementation(() => {
      const queuedIds: string[] = [];
      const batchUpdate = vi.fn((reference: DocumentReference<DocumentData>) => {
        queuedIds.push(reference.id);
      });
      const batchCommit = vi.fn(async () => {
        for (const id of queuedIds) {
          const fields = records.get(id);
          if (fields) fields.isRead = true;
        }
      });
      return mockWriteBatchWith({ update: batchUpdate, commit: batchCommit });
    });

    await markAllAsRead('user-123');

    // SAFETY: the collection reference is an opaque handle accepted by the mocked getDocs seam.
    const readback = await getDocs(mockCollectionRef as ReturnType<typeof collection>);
    expect(readback.docs.map((docSnap) => docSnap.data().isRead)).toEqual([true, true, true]);
  });

  it('commits 600 unread documents in two chunks', async () => {
    const notificationDocs = Array.from({ length: 600 }, (_, index) =>
      notificationDocWith(`doc-${index}`, { isRead: false }),
    );
    const batches: Array<{ update: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }> = [];
    vi.mocked(getDocs).mockResolvedValue(snapshotWith({ docs: notificationDocs }));
    vi.mocked(firestore.writeBatch).mockImplementation(() => {
      const batchUpdate = vi.fn();
      const batchCommit = vi.fn(async () => undefined);
      batches.push({ update: batchUpdate, commit: batchCommit });
      return mockWriteBatchWith({ update: batchUpdate, commit: batchCommit });
    });

    await markAllAsRead('user-123');

    expect(batches).toHaveLength(2);
    expect(batches[0]?.update).toHaveBeenCalledTimes(450);
    expect(batches[1]?.update).toHaveBeenCalledTimes(150);
    expect(batches[0]?.commit).toHaveBeenCalledTimes(1);
    expect(batches[1]?.commit).toHaveBeenCalledTimes(1);
  });
});
