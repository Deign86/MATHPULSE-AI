import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference, Transaction } from 'firebase/firestore';
import { saveQuizResults } from '../quizService';

// SAFETY: this opaque reference is returned by the Firestore boundary spy and consumed only by mocked transaction IO.
const fakeDocumentReference = { id: 'submission-1' } as DocumentReference;
// SAFETY: this collection reference is passed only to the mocked doc() boundary.
const fakeCollectionReference = {} as CollectionReference;

const assignmentSnapshot = (status: 'pending' | 'completed') => ({
  exists: () => true,
  data: () => ({ status }),
});

describe('saveQuizResults assignment idempotency', () => {
  afterEach(() => vi.restoreAllMocks());

  const stubReferences = () => {
    const collectionReference = vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    const documentReference = vi.spyOn(firestore, 'doc').mockReturnValue(fakeDocumentReference);
    return { collectionReference, documentReference };
  };

  it('does not create another submission for a completed assignment', async () => {
    const { collectionReference, documentReference } = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot('completed')),
      ...transactionWrites,
    };
    const transactionRunner = vi.spyOn(firestore, 'runTransaction').mockImplementation(
      async (_database, callback) => {
        // SAFETY: the boundary mock implements only transaction.get, used for the existing assignment.
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
    expect(documentReference).toHaveBeenCalledWith(expect.anything(), 'quizAssignments', 'assignment-1');
  });

  it('persists a pending assignment submission without assignment or generated quiz writes', async () => {
    const { collectionReference, documentReference } = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot('pending')),
      ...transactionWrites,
    };
    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: this boundary mock implements only the get and set calls exercised by a pending assignment.
      return callback(transaction as Transaction);
    });

    await saveQuizResults('student-uid', 'assignment-1', 'quiz-1', 'Math', 'ai_generated', 75, 10, 45, [], []);

    expect(transaction.get).toHaveBeenCalledOnce();
    expect(transactionWrites.set).toHaveBeenCalledOnce();
    expect(transactionWrites.update).toHaveBeenCalledOnce();
    expect(transactionWrites.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'completed', score: 75 }),
    );
    expect(collectionReference).toHaveBeenCalledOnce();
    expect(documentReference).toHaveBeenCalledTimes(2);
    expect(documentReference).not.toHaveBeenCalledWith(expect.anything(), 'generatedQuizzes', 'quiz-1');
  });

  it('persists practice submissions without looking up assignment or generated quiz documents', async () => {
    const { collectionReference, documentReference } = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = { get: vi.fn(), ...transactionWrites };
    const transactionRunner = vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: this boundary mock implements only transaction.set for an unassigned practice submission.
      return callback(transaction as Transaction);
    });

    await saveQuizResults('student-uid', 'practice-session-1', undefined, 'Math', 'adaptive', 75, 10, 45, [], []);

    expect(transactionRunner).toHaveBeenCalledOnce();
    expect(transaction.get).not.toHaveBeenCalled();
    expect(transactionWrites.set).toHaveBeenCalledOnce();
    expect(transactionWrites.update).not.toHaveBeenCalled();
    expect(collectionReference).toHaveBeenCalledOnce();
    expect(documentReference).toHaveBeenCalledOnce();
    expect(documentReference).not.toHaveBeenCalledWith(expect.anything(), 'generatedQuizzes', 'practice-session-1');
  });
});

describe('fetchCompletedSubmissionForQuiz (STU-014)', () => {
  afterEach(() => vi.restoreAllMocks());

  interface StubSubmission {
    lrn?: string;
    studentId?: string;
    quizId?: string;
    score?: number;
  }

  const submissionDoc = (overrides: StubSubmission) => ({
    data: (): StubSubmission => ({ lrn: 'student-uid', quizId: 'quiz-9', score: 0, ...overrides }),
  });

  function mockSubmissionQuery(docs: Array<{ data: () => StubSubmission }>) {
    // SAFETY: boundary spies return only the docs array consumed by the lookup.
    vi.spyOn(firestore, 'collection').mockReturnValue({} as never);
    // SAFETY: where-clause values are ignored by the docs-array stub.
    vi.spyOn(firestore, 'where').mockReturnValue({} as never);
    // SAFETY: query object is opaque to the stubbed getDocs below.
    vi.spyOn(firestore, 'query').mockReturnValue({} as never);
    // SAFETY: boundary mock returns only the docs array consumed by the lookup.
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({ docs } as never);
  }

  it('returns the best score among the student’s submissions', async () => {
    const { fetchCompletedSubmissionForQuiz } = await import('../quizService');
    mockSubmissionQuery([
      submissionDoc({ score: 70 }),
      submissionDoc({ lrn: 'other-student', score: 100 }),
      submissionDoc({ score: 88 }),
    ]);
    await expect(fetchCompletedSubmissionForQuiz('student-uid', 'quiz-9')).resolves.toEqual({ score: 88 });
  });

  it('returns null when the student never submitted the quiz', async () => {
    const { fetchCompletedSubmissionForQuiz } = await import('../quizService');
    mockSubmissionQuery([submissionDoc({ lrn: 'other-student', score: 100 })]);
    await expect(fetchCompletedSubmissionForQuiz('student-uid', 'quiz-9')).resolves.toBeNull();
  });

  it('returns null without querying for empty inputs', async () => {
    const { fetchCompletedSubmissionForQuiz } = await import('../quizService');
    const getDocs = vi.spyOn(firestore, 'getDocs');
    await expect(fetchCompletedSubmissionForQuiz('', 'quiz-9')).resolves.toBeNull();
    await expect(fetchCompletedSubmissionForQuiz('student-uid', '')).resolves.toBeNull();
    expect(getDocs).not.toHaveBeenCalled();
  });
});
