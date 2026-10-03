import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference, Query, QueryDocumentSnapshot, QuerySnapshot, Transaction } from 'firebase/firestore';
import { saveQuizResults } from '../quizService';

const assignmentSnapshot = (status: 'pending' | 'completed') => ({
  exists: () => true,
  data: () => ({ status }),
});

// SAFETY: Firestore refs are opaque handles here; the test replaces transaction IO before use.
const fakeDocumentReference = { id: 'submission-1' } as DocumentReference;
// SAFETY: collection refs are passed only to the mocked doc() function in these tests.
const fakeCollectionReference = {} as CollectionReference;
// SAFETY: query refs are consumed only by the mocked transaction callback in these tests.
const fakeQuery = {} as Query;
// SAFETY: constraints are consumed only by the mocked query function in these tests.
const fakeWhereConstraint = {} as ReturnType<typeof firestore.where>;
let assignmentStatus: 'pending' | 'completed' = 'completed';
const fakeAssignmentDocument: QueryDocumentSnapshot = {
  id: 'assignment-1',
  ref: fakeDocumentReference,
  metadata: { fromCache: false, hasPendingWrites: false, isEqual: () => false },
  exists(): this is QueryDocumentSnapshot { return true; },
  get: () => undefined,
  data: () => ({ status: assignmentStatus }),
  toJSON: () => ({ status: 'completed' }),
};
// SAFETY: the test reads only the docs array from this mocked query result.
const completedAssignments = { docs: [fakeAssignmentDocument] } as QuerySnapshot;

describe('saveQuizResults assignment idempotency', () => {
  afterEach(() => vi.restoreAllMocks());

  const stubReferences = () => {
    assignmentStatus = 'completed';
    const collectionReference = vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocumentReference);
    vi.spyOn(firestore, 'where').mockReturnValue(fakeWhereConstraint);
    vi.spyOn(firestore, 'query').mockReturnValue(fakeQuery);
    vi.spyOn(firestore, 'getDocs').mockResolvedValue(completedAssignments);
    return collectionReference;
  };

  it('retry after completion creates no submission and performs no assignment writes', async () => {
    const collectionReference = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot('completed')),
      ...transactionWrites,
    };
    const transactionRunner = vi.spyOn(firestore, 'runTransaction').mockImplementation(
      async (_database, callback) => {
        // SAFETY: this focused unit test supplies only the transaction methods exercised by the completed-assignment path.
        return callback(transaction as Transaction);
      },
    );
    const setDoc = vi.spyOn(firestore, 'setDoc');

    await saveQuizResults('student-uid', 'assignment-1', 'quiz-1', 'Math', 'ai_generated', 90, 20, 30, [], []);

    expect(transactionRunner).toHaveBeenCalledOnce();
    expect(transaction.get).toHaveBeenCalledOnce();
    expect(transactionWrites.set).not.toHaveBeenCalled();
    expect(transactionWrites.update).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(collectionReference).toHaveBeenCalledOnce();
  });

  it('persists a pending assignment submission without attempting assignment or generated quiz writes', async () => {
    const collectionReference = stubReferences();
    assignmentStatus = 'pending';
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot('pending')),
      ...transactionWrites,
    };
    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: this focused unit test supplies only the transaction methods exercised by the completed-assignment path.
      return callback(transaction as Transaction);
    });
    const documentReference = vi.mocked(firestore.doc);

    await saveQuizResults('student-uid', 'assignment-1', 'quiz-1', 'Math', 'ai_generated', 75, 10, 45, [], []);

    expect(transaction.get).toHaveBeenCalledOnce();
    expect(transactionWrites.set).toHaveBeenCalledOnce();
    expect(transactionWrites.update).not.toHaveBeenCalled();
    expect(documentReference).toHaveBeenCalledOnce();
    expect(collectionReference).toHaveBeenCalledTimes(2);
  });

  it('persists practice submissions without looking up assignments or requiring a generated quiz document', async () => {
    const collectionReference = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = { get: vi.fn(), ...transactionWrites };
    const transactionRunner = vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: this boundary mock implements only transaction.set, used for an unassigned practice submission.
      return callback(transaction as Transaction);
    });

    await saveQuizResults('student-uid', 'practice-session-1', undefined, 'Math', 'adaptive', 75, 10, 45, [], []);

    expect(transactionRunner).toHaveBeenCalledOnce();
    expect(transaction.get).not.toHaveBeenCalled();
    expect(transactionWrites.set).toHaveBeenCalledOnce();
    expect(transactionWrites.update).not.toHaveBeenCalled();
    expect(collectionReference).toHaveBeenCalledOnce();
  });
});
