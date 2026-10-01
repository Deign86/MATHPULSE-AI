import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference, Transaction } from 'firebase/firestore';
import { saveQuizResults } from '../quizService';

const assignmentSnapshot = {
  exists: () => true,
  data: () => ({ status: 'completed' }),
};

// SAFETY: Firestore refs are opaque handles here; the test replaces transaction IO before use.
const fakeDocumentReference = { id: 'submission-1' } as DocumentReference;
// SAFETY: collection refs are passed only to the mocked doc() function in these tests.
const fakeCollectionReference = {} as CollectionReference;

describe('saveQuizResults assignment idempotency', () => {
  afterEach(() => vi.restoreAllMocks());

  const stubReferences = () => {
    const collectionReference = vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocumentReference);
    return collectionReference;
  };

  it('retry after completion creates no submission and performs no assignment writes', async () => {
    const collectionReference = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot),
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
    expect(collectionReference).not.toHaveBeenCalled();
  });

  it('does not create a submission when a retake has no new pending assignment', async () => {
    const collectionReference = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot),
      ...transactionWrites,
    };
    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: this focused unit test supplies only the transaction methods exercised by the completed-assignment path.
      return callback(transaction as Transaction);
    });
    const setDoc = vi.spyOn(firestore, 'setDoc');

    await saveQuizResults('student-uid', 'assignment-1', 'quiz-1', 'Math', 'ai_generated', 75, 10, 45, [], []);

    expect(transaction.get).toHaveBeenCalledOnce();
    expect(transactionWrites.set).not.toHaveBeenCalled();
    expect(transactionWrites.update).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(collectionReference).not.toHaveBeenCalled();
  });
});
