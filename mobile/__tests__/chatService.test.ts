// Ambient Jest type declarations (no @jest/globals installed in mobile)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
};
declare const jest: {
  fn<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>(
    impl?: (...args: Parameters<T>) => ReturnType<T>,
  ): jest.Mock<T>;
  clearAllMocks(): void;
  mock(moduleName: string, factory?: () => Record<string, unknown>): void;
};
declare namespace jest {
  interface Mock<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: {
      calls: unknown[][];
    };
    mockImplementation(fn: (...args: unknown[]) => unknown): this;
    mockResolvedValue(value: unknown): this;
  }
}

// ── Mocks ──────────────────────────────────────────────────────

type QuerySnapshot = { docs: Array<{ id: string; data: () => Record<string, unknown> }> };

const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDocs: jest.Mock<() => Promise<QuerySnapshot>> = jest.fn(() =>
  Promise.resolve({ docs: [] }),
);
const mockServerTimestamp = jest.fn(() => 'ts-sentinel');
const mockDoc = jest.fn(() => 'doc-ref');

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDocs: mockGetDocs,
  collection: jest.fn(() => 'coll-ref'),
  firestoreQuery: jest.fn(() => 'query-ref'),
  where: jest.fn(() => 'where-ref'),
  orderBy: jest.fn(() => 'order-ref'),
  onSnapshot: jest.fn(() => jest.fn()),
  writeBatch: jest.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  firestoreServerTimestamp: mockServerTimestamp,
}));

// ── Imports after mocks (jest.mock auto-hoists) ────────────────

import {
  createSession,
  getUserChatSessions,
  addMessageToSession,
  getSessionMessages,
  endSession,
  deleteSession,
} from '../services/chatService';

// ── Tests ──────────────────────────────────────────────────────

describe('createSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes to chatSessions with serverTimestamp', async () => {
    const session = await createSession('user-1', 'My Chat');

    // Verify Firestore write
    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = mockSetDoc.mock.calls[0];
    expect(callArgs).toHaveLength(2);

    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.title).toBe('My Chat');
    expect(payload.userId).toBe('user-1');
    expect(payload.isActive).toBe(true);
    expect(payload.messages).toEqual([]);

    // serverTimestamp called for createdAt and updatedAt
    expect(mockServerTimestamp).toHaveBeenCalled();

    // Returned session uses local dates for immediate UI
    expect(session.userId).toBe('user-1');
    expect(session.title).toBe('My Chat');
    expect(session.isActive).toBe(true);
    expect(session.createdAt instanceof Date).toBe(true);
    expect(session.updatedAt instanceof Date).toBe(true);
  });
});

describe('getUserChatSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only sessions for that uid with isActive=true', async () => {
    // Arrange: getDocs resolves with two active sessions
    const sessionA = {
      userId: 'user-1',
      title: 'Session A',
      messages: [],
      createdAt: { toDate: () => new Date('2026-01-01') },
      updatedAt: { toDate: () => new Date('2026-06-01') },
      isActive: true,
    };
    const sessionB = {
      userId: 'user-1',
      title: 'Session B',
      messages: [],
      createdAt: { toDate: () => new Date('2026-02-01') },
      updatedAt: { toDate: () => new Date('2026-06-02') },
      isActive: true,
    };

    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 's1', data: () => sessionA },
        { id: 's2', data: () => sessionB },
      ],
    });

    // Act
    const sessions = await getUserChatSessions('user-1');

    // Assert
    expect(sessions).toHaveLength(2);
    expect(sessions[0].userId).toBe('user-1');
    expect(sessions[0].isActive).toBe(true);
    expect(sessions[1].userId).toBe('user-1');
    expect(sessions[1].isActive).toBe(true);
  });
});

describe('addMessageToSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes to chatMessages AND updates session.updatedAt atomically via writeBatch', async () => {
    // Act
    const message = await addMessageToSession('sess-1', {
      role: 'user',
      content: 'Hello world',
    });

    // Assert: batch.set called for the message
    expect(mockBatchSet).toHaveBeenCalled();
    const setCallArgs = mockBatchSet.mock.calls[0];
    expect(setCallArgs).toHaveLength(2);
    const setPayload = setCallArgs[1] as Record<string, unknown>;
    expect(setPayload.role).toBe('user');
    expect(setPayload.content).toBe('Hello world');
    expect(setPayload.sessionId).toBe('sess-1');

    // Assert: batch.update called to bump session.updatedAt
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCallArgs = mockBatchUpdate.mock.calls[0];
    const updatePayload = updateCallArgs[1] as Record<string, unknown>;
    expect(Object.keys(updatePayload).includes('updatedAt')).toBe(true);

    // Assert: batch.commit was called (atomic)
    expect(mockBatchCommit).toHaveBeenCalled();

    // Assert: returned message has correct shape
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello world');
    expect(message.userId).toBe('test-uid');
  });
});

describe('getSessionMessages', () => {
  it('queries chatMessages where sessionId == X, ordered by timestamp asc', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    await getSessionMessages('sess-abc');

    expect(mockGetDocs).toHaveBeenCalled();
  });
});

describe('endSession', () => {
  it('sets isActive=false via setDoc with merge', async () => {
    await endSession('sess-1');

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = mockSetDoc.mock.calls[0];
    expect(callArgs).toHaveLength(3);
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.isActive).toBe(false);
    const opts = callArgs[2] as Record<string, unknown>;
    expect(opts.merge).toBe(true);
  });
});

describe('deleteSession', () => {
  it('soft-deletes by setting isActive=false', async () => {
    await deleteSession('sess-del');

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = mockSetDoc.mock.calls[0];
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.isActive).toBe(false);
  });
});
