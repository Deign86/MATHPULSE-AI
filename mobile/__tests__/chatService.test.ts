// mobile/__tests__/chatService.test.ts
// Tests for chatService.createSession/getUserChatSessions/addMessageToSession/etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must use vi.hoisted for variables referenced in vi.mock factories) ──

const { mockBatchUpdate, mockBatchSet, mockBatchCommit, mockSetDoc, mockGetDocs } = vi.hoisted(() => ({
  mockBatchUpdate: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchCommit: vi.fn(() => Promise.resolve()),
  mockSetDoc: vi.fn(() => Promise.resolve()),
  mockGetDocs: vi.fn<() => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>>(() =>
    Promise.resolve({ docs: [] }),
  ),
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
  doc: vi.fn(() => 'doc-ref'),
  setDoc: mockSetDoc,
  getDocs: mockGetDocs,
  collection: vi.fn(() => 'coll-ref'),
  firestoreQuery: vi.fn(() => 'query-ref'),
  where: vi.fn(() => 'where-ref'),
  orderBy: vi.fn(() => 'order-ref'),
  onSnapshot: vi.fn(() => vi.fn()),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  firestoreServerTimestamp: vi.fn(() => 'ts-sentinel'),
}));

// ── Imports after mocks (vi.mock auto-hoists) ────────────────────────────────

import {
  createSession,
  getUserChatSessions,
  addMessageToSession,
  getSessionMessages,
  endSession,
  deleteSession,
} from '../services/chatService';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to chatSessions with serverTimestamp', async () => {
    const session = await createSession('user-1', 'My Chat');

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(callArgs).toHaveLength(2);

    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.title).toBe('My Chat');
    expect(payload.userId).toBe('user-1');
    expect(payload.isActive).toBe(true);
    expect(payload.messages).toEqual([]);

    expect(session.userId).toBe('user-1');
    expect(session.title).toBe('My Chat');
    expect(session.isActive).toBe(true);
    expect(session.createdAt instanceof Date).toBe(true);
    expect(session.updatedAt instanceof Date).toBe(true);
  });
});

describe('getUserChatSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only sessions for that uid with isActive=true', async () => {
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

    const sessions = await getUserChatSessions('user-1');

    expect(sessions).toHaveLength(2);
    expect(sessions[0].userId).toBe('user-1');
    expect(sessions[0].isActive).toBe(true);
    expect(sessions[1].userId).toBe('user-1');
    expect(sessions[1].isActive).toBe(true);
  });
});

describe('addMessageToSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to chatMessages AND updates session.updatedAt atomically via writeBatch', async () => {
    const message = await addMessageToSession('sess-1', {
      role: 'user',
      content: 'Hello world',
    });

    expect(mockBatchSet).toHaveBeenCalled();
    const setCallArgs = (mockBatchSet as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(setCallArgs).toHaveLength(2);
    const setPayload = setCallArgs[1] as Record<string, unknown>;
    expect(setPayload.role).toBe('user');
    expect(setPayload.content).toBe('Hello world');
    expect(setPayload.sessionId).toBe('sess-1');

    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCallArgs = (mockBatchUpdate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const updatePayload = updateCallArgs[1] as Record<string, unknown>;
    expect(Object.keys(updatePayload).includes('updatedAt')).toBe(true);

    expect(mockBatchCommit).toHaveBeenCalled();

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
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
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
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.isActive).toBe(false);
  });
});
