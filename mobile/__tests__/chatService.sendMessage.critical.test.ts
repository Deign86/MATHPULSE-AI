/**
 * @file chatService.sendMessage.critical.test.ts
 * Critical test for addMessageToSession: verifies message persistence to
 * Firestore chatMessages and session updatedAt bump via writeBatch.
 */

// Shared mock refs for asserting calls across all writeBatch() invocations
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());

jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
  doc: jest.fn(() => 'doc-ref'),
  collection: jest.fn(() => 'coll-ref'),
  writeBatch: jest.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  firestoreServerTimestamp: jest.fn(() => 'ts-sentinel'),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  firestoreQuery: jest.fn(() => 'query-ref'),
  where: jest.fn(() => 'where-ref'),
  orderBy: jest.fn(() => 'order-ref'),
  onSnapshot: jest.fn(() => jest.fn()),
}));

const firebase = require('../lib/firebase');
import { addMessageToSession } from '../services/chatService';

describe('addMessageToSession - critical: persists to Firestore via writeBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes message to chatMessages and bumps session.updatedAt', async () => {
    const message = await addMessageToSession('sess-abc', {
      role: 'user',
      content: 'What is the derivative of x^2?',
    });

    // Verify batch.set called for the message
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    const setPayload = mockBatchSet.mock.calls[0][1];
    expect(setPayload.role).toBe('user');
    expect(setPayload.content).toBe('What is the derivative of x^2?');
    expect(setPayload.sessionId).toBe('sess-abc');
    expect(setPayload.userId).toBe('test-uid');
    expect(setPayload.timestamp).toBe('ts-sentinel');

    // Verify batch.update called on sessions doc
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mockBatchUpdate.mock.calls[0][1];
    expect(updatePayload.updatedAt).toBe('ts-sentinel');

    // Verify batch.commit was called (atomicity)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    // Verify returned message shape
    expect(message.role).toBe('user');
    expect(message.content).toBe('What is the derivative of x^2?');
    expect(message.userId).toBe('test-uid');
  });

  it('throws when user is not authenticated', async () => {
    const originalUser = firebase.auth.currentUser;
    firebase.auth.currentUser = null;

    await expect(
      addMessageToSession('sess-xyz', {
        role: 'user',
        content: 'Hello',
      }),
    ).rejects.toThrow('Not authenticated');

    firebase.auth.currentUser = originalUser;
  });

  it('includes context field when provided', async () => {
    await addMessageToSession('sess-def', {
      role: 'assistant',
      content: 'The answer is 2x',
      context: { topic: 'derivatives', confidence: 0.95 },
    });

    const setPayload = mockBatchSet.mock.calls[0][1];
    expect(setPayload.context).toEqual({
      topic: 'derivatives',
      confidence: 0.95,
    });
  });

  it('omits context field when not provided', async () => {
    await addMessageToSession('sess-ghi', {
      role: 'user',
      content: 'Plain message',
    });

    const setPayload = mockBatchSet.mock.calls[0][1];
    expect(setPayload.context).toBeUndefined();
  });
});
