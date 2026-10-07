import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference, Query, Transaction } from 'firebase/firestore';
import type { GeneratedQuiz } from '../../types/models';
import { assignQuizToStudent, fetchPendingQuizzesForStudent, saveQuizResults } from '../quizService';

// SAFETY: this opaque reference is returned by the Firestore boundary spy and consumed only by mocked transaction IO.
const fakeDocumentReference = { id: 'submission-1' } as DocumentReference;
// SAFETY: this collection reference is passed only to the mocked doc() boundary.
const fakeCollectionReference = {} as CollectionReference;
// SAFETY: opaque query/document values are used only by the Firestore boundary spies.
const fakeQuery = {} as Query;
// SAFETY: this fixture is returned only from the mocked doc() boundary for the generated-quiz lookup.
const fakeQuizDocument = { id: 'quiz-1' } as DocumentReference;

const assignmentSnapshot = (status: 'pending' | 'completed', assessmentType = 'graded') => ({
  exists: () => true,
  data: () => ({ status, assessmentType }),
});

describe('assignQuizToStudent ownership contract', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes the student Auth UID to both the assignment owner field and generated-quiz recipients', async () => {
    // SAFETY: these opaque references are consumed only by mocked Firestore batch calls in this test.
    const generatedQuizReference = { id: 'quiz-1' } as DocumentReference;
    // SAFETY: this opaque assignment reference is consumed only by the mocked batch.set boundary.
    const assignmentReference = { id: 'assignment-1' } as DocumentReference;
    const batch = {
      update: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    vi.spyOn(firestore, 'doc')
      .mockReturnValueOnce(generatedQuizReference)
      .mockReturnValueOnce(assignmentReference);
    // SAFETY: the mock implements exactly the update, set, and commit methods exercised by assignQuizToStudent.
    vi.spyOn(firestore, 'writeBatch').mockReturnValue(batch as never);
    // SAFETY: these sentinel values are compared only at the mocked Firestore boundary and are never executed as SDK values.
    const arrayUnion = vi.spyOn(firestore, 'arrayUnion').mockReturnValue('recipient-union' as never);
    // SAFETY: this sentinel timestamp is compared only at the mocked Firestore boundary.
    const serverTimestamp = vi.spyOn(firestore, 'serverTimestamp').mockReturnValue('server-time' as never);

    await assignQuizToStudent('quiz-1', 'student-auth-uid', 'teacher-uid');

    expect(arrayUnion).toHaveBeenCalledWith('student-auth-uid');
    expect(batch.update).toHaveBeenCalledWith(generatedQuizReference, expect.objectContaining({
      'metadata.assignedTo': 'student-auth-uid',
      recipientUids: 'recipient-union',
      assignedBy: 'teacher-uid',
    }));
    expect(batch.set).toHaveBeenCalledWith(assignmentReference, expect.objectContaining({
      quizId: 'quiz-1',
      lrn: 'student-auth-uid',
      teacherId: 'teacher-uid',
      status: 'pending',
    }));
    expect(serverTimestamp).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledOnce();
  });
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
      get: vi.fn().mockResolvedValue(assignmentSnapshot('completed', 'graded')),
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
    expect(transactionWrites.update).not.toHaveBeenCalled();
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

  it('blocks a completed diagnostic assignment from creating another submission', async () => {
    const { collectionReference, documentReference } = stubReferences();
    const transactionWrites = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const transaction = {
      get: vi.fn().mockResolvedValue(assignmentSnapshot('completed', 'diagnostic')),
      ...transactionWrites,
    };
    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_database, callback) => {
      // SAFETY: the diagnostic fixture supplies only the transaction calls under test.
      return callback(transaction as Transaction);
    });

    await saveQuizResults('student-uid', 'assignment-1', 'quiz-1', 'Math', 'diagnostic', 90, 20, 30, [], []);

    expect(transaction.get).toHaveBeenCalledOnce();
    expect(transactionWrites.set).not.toHaveBeenCalled();
    expect(collectionReference).not.toHaveBeenCalled();
    expect(documentReference).toHaveBeenCalledWith(expect.anything(), 'quizAssignments', 'assignment-1');
  });
});

describe('fetchPendingQuizzesForStudent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads only assignments addressed to the authenticated student UID', async () => {
    const quiz: GeneratedQuiz = {
      id: 'quiz-1',
      title: 'Algebra review',
      gradeLevel: 'Grade 11',
      questions: [],
      totalPoints: 0,
      metadata: {
        topicsCovered: [],
        difficultyBreakdown: { easy: 1, medium: 0, hard: 0 },
        bloomDistribution: {},
        questionTypeBreakdown: {},
        supplementalPurpose: '',
        recommendedTeacherActions: [],
        generatedAt: '',
        generatedBy: 'teacher_generated',
      },
      status: 'assigned',
      source: 'teacher_generated',
    };
    // SAFETY: the synthetic query row supplies only id and data(), which are the fields used by the loader.
    const assignment = {
      id: 'assignment-1',
      data: () => ({ quizId: 'quiz-1' }),
    } as never;
    vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    // SAFETY: the query spies are consumed only by the fake Firestore query constructor.
    vi.spyOn(firestore, 'where').mockReturnValue(fakeQuery as never);
    // SAFETY: the query mock is consumed only by the Firestore query constructor in this test.
    vi.spyOn(firestore, 'orderBy').mockReturnValue(fakeQuery as never);
    vi.spyOn(firestore, 'query').mockReturnValue(fakeQuery);
    // SAFETY: the minimal snapshot contains the docs list consumed by the pending-assignment loader.
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({ docs: [assignment] } as never);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeQuizDocument);
    // SAFETY: this snapshot fixture implements exactly the methods called by fetchGeneratedQuiz.
    vi.spyOn(firestore, 'getDoc').mockResolvedValue({
      id: 'quiz-1',
      exists: () => true,
      data: () => quiz,
    } as never);

    const quizzes = await fetchPendingQuizzesForStudent('student-uid');

    expect(firestore.where).toHaveBeenCalledWith('lrn', '==', 'student-uid');
    expect(firestore.where).not.toHaveBeenCalledWith('lrn', 'in', expect.anything());
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].title).toBe('Algebra review');
    expect(quizzes[0].assignmentId).toBe('assignment-1');
  });

  it('keeps readable assigned quizzes when another pending quiz cannot be read', async () => {
    const readableQuiz: GeneratedQuiz = {
      id: 'quiz-readable',
      title: 'Readable review',
      gradeLevel: 'Grade 11',
      questions: [],
      totalPoints: 0,
      metadata: {
        topicsCovered: [],
        difficultyBreakdown: { easy: 1, medium: 0, hard: 0 },
        bloomDistribution: {},
        questionTypeBreakdown: {},
        supplementalPurpose: '',
        recommendedTeacherActions: [],
        generatedAt: '',
        generatedBy: 'teacher_generated',
      },
      status: 'assigned',
      source: 'teacher_generated',
    };
    // SAFETY: this assignment fixture contains exactly the fields read by fetchPendingQuizzesForStudent.
    const unreadableAssignment = {
      id: 'assignment-stale',
      data: () => ({ quizId: 'quiz-stale' }),
    } as never;
    // SAFETY: this assignment fixture contains exactly the fields read by fetchPendingQuizzesForStudent.
    const readableAssignment = {
      id: 'assignment-readable',
      data: () => ({ quizId: 'quiz-readable' }),
    } as never;
    // SAFETY: this snapshot fixture implements exactly the methods called by fetchGeneratedQuiz.
    const readableQuizSnapshot = {
      id: 'quiz-readable',
      exists: () => true,
      data: () => readableQuiz,
    } as never;

    vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    // SAFETY: the query spies are consumed only by the fake Firestore query constructor.
    vi.spyOn(firestore, 'where').mockReturnValue(fakeQuery as never);
    // SAFETY: the query mock is consumed only by the Firestore query constructor in this test.
    vi.spyOn(firestore, 'orderBy').mockReturnValue(fakeQuery as never);
    vi.spyOn(firestore, 'query').mockReturnValue(fakeQuery);
    // SAFETY: the minimal snapshot contains the docs list consumed by the pending-assignment loader.
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({ docs: [unreadableAssignment, readableAssignment] } as never);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeQuizDocument);
    vi.spyOn(firestore, 'getDoc')
      .mockRejectedValueOnce(new Error('permission-denied'))
      .mockResolvedValueOnce(readableQuizSnapshot);

    const quizzes = await fetchPendingQuizzesForStudent('student-uid');

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].title).toBe('Readable review');
    expect(quizzes[0].assignmentId).toBe('assignment-readable');
  });
});

describe('pending quiz load failures and index fallback', () => {
  afterEach(() => vi.restoreAllMocks());

  const stubPendingAssignments = (assignments: { id: string; quizId: string; assignedAt: number }[]) => {
    vi.spyOn(firestore, 'collection').mockReturnValue(fakeCollectionReference);
    // SAFETY: query constraints are opaque sentinels consumed only by the query boundary spy.
    vi.spyOn(firestore, 'where').mockReturnValue(fakeQuery as never);
    // SAFETY: the sort constraint is consumed only by the query boundary spy.
    vi.spyOn(firestore, 'orderBy').mockReturnValue(fakeQuery as never);
    vi.spyOn(firestore, 'query').mockReturnValue(fakeQuery);
    vi.spyOn(firestore, 'doc').mockReturnValue(fakeQuizDocument);
    // SAFETY: the snapshot supplies the assignment fields consumed by the service, without real Firestore IO.
    const snapshot = { docs: assignments.map((assignment) => ({ id: assignment.id, data: () => assignment })) } as never;
    const getDocs = vi.spyOn(firestore, 'getDocs').mockResolvedValue(snapshot);
    const getDoc = vi.spyOn(firestore, 'getDoc');
    return { snapshot, getDocs, getDoc };
  };

  it('rejects when every pending quiz read is denied so the caller can retry', async () => {
    const { getDoc } = stubPendingAssignments([{ id: 'assignment-1', quizId: 'quiz-1', assignedAt: 1 }]);
    const denied = new Error('permission-denied');
    getDoc.mockRejectedValue(denied);

    await expect(fetchPendingQuizzesForStudent('student-uid')).rejects.toBe(denied);
  });

  it('omits a deleted quiz rather than reporting a load failure', async () => {
    const { getDoc } = stubPendingAssignments([{ id: 'assignment-orphan', quizId: 'deleted', assignedAt: 1 }]);
    // SAFETY: deleted documents expose exists(), and the loader never consumes other snapshot fields.
    getDoc.mockResolvedValue({ exists: () => false } as never);

    await expect(fetchPendingQuizzesForStudent('student-uid')).resolves.toEqual([]);
  });

  it('does not hide a denied read when the only other assignment points to a deleted quiz', async () => {
    const { getDoc } = stubPendingAssignments([
      { id: 'assignment-1', quizId: 'quiz-1', assignedAt: 2 },
      { id: 'assignment-orphan', quizId: 'deleted', assignedAt: 1 },
    ]);
    const denied = new Error('permission-denied');
    getDoc.mockRejectedValueOnce(denied);
    // SAFETY: deleted documents expose exists(), and the loader never consumes other snapshot fields.
    getDoc.mockResolvedValueOnce({ exists: () => false } as never);

    await expect(fetchPendingQuizzesForStudent('student-uid')).rejects.toBe(denied);
  });

  it('keeps newest-first ordering when the assignment index is unavailable', async () => {
    const { snapshot, getDocs, getDoc } = stubPendingAssignments([
      { id: 'older-assignment', quizId: 'older', assignedAt: 1 },
      { id: 'newer-assignment', quizId: 'newer', assignedAt: 2 },
    ]);
    getDocs.mockRejectedValueOnce(Object.assign(new Error('The query requires an index.'), { code: 'failed-precondition' }))
      .mockResolvedValueOnce(snapshot);
    // SAFETY: these generated quiz snapshots supply all fields consumed by toPlayableQuiz.
    getDoc.mockImplementation(async () => ({
      id: 'quiz-1', exists: () => true,
      data: () => ({ title: 'Review', questions: [], totalPoints: 0, status: 'assigned',
        metadata: { topicsCovered: [], difficultyBreakdown: { easy: 1, medium: 0, hard: 0 } } }),
    } as never));

    const quizzes = await fetchPendingQuizzesForStudent('student-uid');

    expect(quizzes.map((quiz) => quiz.assignmentId)).toEqual(['newer-assignment', 'older-assignment']);
    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(firestore.where).toHaveBeenCalledWith('lrn', '==', 'student-uid');
    expect(firestore.where).toHaveBeenCalledWith('status', '==', 'pending');
  });

  it('propagates assignment permission errors without issuing a broader fallback query', async () => {
    const { getDocs } = stubPendingAssignments([]);
    const denied = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    getDocs.mockRejectedValue(denied);

    await expect(fetchPendingQuizzesForStudent('student-uid')).rejects.toBe(denied);
    expect(getDocs).toHaveBeenCalledOnce();
  });
});
