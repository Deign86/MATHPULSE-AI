// Ambient Jest type declarations (no @jest/globals installed in mobile)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
  toHaveLength(expected: number): void;
};
declare const jest: {
  fn(): jest.Mock;
  clearAllMocks(): void;
  mock(moduleName: string, factory?: () => Record<string, unknown>): void;
};
declare namespace jest {
  interface Mock<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: {
      calls: unknown[][];
    };
  }
}

// ── Mocks ──────────────────────────────────────────────────────

const mockOnSnapshotUnsub = jest.fn();
const mockOnSnapshot = jest.fn();
const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn();
const mockServerTimestamp = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockQueryFn = jest.fn();
const mockDocFn = jest.fn();
const mockCollectionFn = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockWriteBatchFn = jest.fn();

// Mock firebase/firestore (the module notificationService imports from directly)
jest.mock('firebase/firestore', () => ({
  doc: mockDocFn,
  setDoc: mockSetDoc,
  getDocs: mockGetDocs,
  collection: mockCollectionFn,
  query: mockQueryFn,
  where: mockWhere,
  orderBy: mockOrderBy,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  serverTimestamp: mockServerTimestamp,
  onSnapshot: mockOnSnapshot,
  writeBatch: mockWriteBatchFn,
}));

// Mock ../lib/firebase for db
jest.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
}));

// ── Import after mocks (jest.mock auto-hoists) ─────────────────

import {
  subscribeToUserNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  sendCrossRoleNotification,
} from '../services/notificationService';

// ── Tests ──────────────────────────────────────────────────────

describe('subscribeToUserNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a function (the unsubscribe handle)', () => {
    // Wire onSnapshot to return the unsub function
    mockOnSnapshot.mock = { calls: [] } as jest.Mock['mock'];
    const callback = jest.fn();
    const unsub = subscribeToUserNotifications('uid-abc', callback);

    expect(mockCollectionFn).toHaveBeenCalled();
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(typeof unsub).toBe('function');
  });
});

describe('markNotificationRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes {read: true, readAt: serverTimestamp()} to the notification doc', async () => {
    mockServerTimestamp.mock = { calls: [] };
    await markNotificationRead('uid-abc', 'notif-42');

    expect(mockDocFn).toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalled();

    const callArgs = mockUpdateDoc.mock.calls[0];
    expect(callArgs).toHaveLength(2);

    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.read).toBe(true);
    expect(payload.readAt).toBe('ts-sentinel');
  });
});

describe('markAllRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries unread notifications using where clause', async () => {
    await markAllRead('uid-abc');

    expect(mockGetDocs).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith('read', '==', false);
  });
});

describe('deleteNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteDoc on the notifications/{uid}/items/{notifId} doc', async () => {
    await deleteNotification('uid-abc', 'notif-99');

    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockDocFn).toHaveBeenCalled();
  });
});

describe('getUnreadCount', () => {
  it('is a function', () => {
    expect(typeof getUnreadCount).toBe('function');
  });
});

describe('sendCrossRoleNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServerTimestamp.mock = { calls: [] };
  });

  it('writes to recipient items subcollection AND sender sent subcollection with correct payload', async () => {
    const notifId = await sendCrossRoleNotification({
      toUid: 'student-1',
      fromUid: 'teacher-1',
      fromRole: 'teacher',
      type: 'teacher_message',
      title: 'Great work',
      message: 'Keep it up!',
      actionUrl: '/quiz/123',
    });

    // setDoc called twice: once for recipient, once for sender
    expect(mockSetDoc.mock.calls).toHaveLength(2);

    // First call: recipient's items
    const firstCallArgs = mockSetDoc.mock.calls[0];
    const recipientPayload = firstCallArgs[1] as Record<string, unknown>;
    expect(recipientPayload.userId).toBe('student-1');
    expect(recipientPayload.type).toBe('teacher_message');
    expect(recipientPayload.title).toBe('Great work');
    expect(recipientPayload.message).toBe('Keep it up!');
    expect(recipientPayload.read).toBe(false);
    expect(recipientPayload.senderId).toBe('teacher-1');
    expect(recipientPayload.senderRole).toBe('teacher');
    expect(recipientPayload.actionUrl).toBe('/quiz/123');
    expect(recipientPayload.createdAt).toBe('ts-sentinel');

    // Second call: sender's sent subcollection
    const secondCallArgs = mockSetDoc.mock.calls[1];
    const sentPayload = secondCallArgs[1] as Record<string, unknown>;
    expect(sentPayload.userId).toBe('student-1');
    expect(sentPayload.recipientId).toBe('student-1');
    expect(sentPayload.senderId).toBe('teacher-1');

    // Returns a valid notification ID
    expect(notifId).toBe('doc-ref');
  });

  it('writes without actionUrl when not provided', async () => {
    await sendCrossRoleNotification({
      toUid: 'student-2',
      fromUid: 'admin-1',
      fromRole: 'admin',
      type: 'system_announcement',
      title: 'System update',
      message: 'Maintenance tonight',
    });

    const firstCallArgs = mockSetDoc.mock.calls[0];
    const recipientPayload = firstCallArgs[1] as Record<string, unknown>;
    // actionUrl should not be present in payload
    expect(Object.prototype.hasOwnProperty.call(recipientPayload, 'actionUrl')).toBe(false);
  });
});
