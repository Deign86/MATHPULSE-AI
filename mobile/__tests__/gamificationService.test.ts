// @ts-nocheck — vitest types not installed in mobile project

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock references ─────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('../lib/firebase', () => ({
  db: {},
  doc: vi.fn(() => 'mocked-doc-ref'),
  collection: vi.fn(() => 'mocked-collection-ref'),
  firestoreQuery: vi.fn(() => 'mocked-query-ref'),
  where: vi.fn(() => 'mocked-where-ref'),
  orderBy: vi.fn(() => 'mocked-orderBy-ref'),
  limit: vi.fn(() => 'mocked-limit-ref'),
  onSnapshot: vi.fn(() => vi.fn()),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  runTransaction: mockRunTransaction,
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
  increment: (n: number) => ({ __inc: n }),
  arrayUnion: (...items: unknown[]) => items,
}));

import {
  computeLevel,
  awardXP,
  purchaseAvatarItem,
} from '../services/gamificationService';

// ─── computeLevel — pure function tests ────────────────────────────────────

describe('computeLevel', () => {
  it('returns 1 for totalXP = 0', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns 1 for totalXP = 99 (below L2 threshold)', () => {
    expect(computeLevel(99)).toBe(1);
  });

  it('returns 1 for totalXP = 50 (below L2 threshold)', () => {
    expect(computeLevel(50)).toBe(1);
  });

  it('returns 2 for totalXP = 100 (exact L2 threshold)', () => {
    expect(computeLevel(100)).toBe(2);
  });

  it('returns 3 for totalXP = 250 (exact L3 threshold)', () => {
    expect(computeLevel(250)).toBe(3);
  });

  it('returns 4 for totalXP = 475 (exact L4 threshold)', () => {
    expect(computeLevel(475)).toBe(4);
  });

  it('returns 5 for totalXP = 812 (exact L5 threshold)', () => {
    expect(computeLevel(812)).toBe(5);
  });

  it('returns 6 for totalXP = 1318 (exact L6 threshold)', () => {
    expect(computeLevel(1318)).toBe(6);
  });

  it('returns 7 for totalXP = 2077 (exact L7 threshold)', () => {
    expect(computeLevel(2077)).toBe(7);
  });

  it('returns 1 for negative XP', () => {
    expect(computeLevel(-100)).toBe(1);
  });

  it('is monotonic', () => {
    for (let xp = 0; xp < 5000; xp += 100) {
      expect(computeLevel(xp + 100)).toBeGreaterThanOrEqual(
        computeLevel(xp),
      );
    }
  });
});

// ─── awardXP — Firestore integration tests ─────────────────────────────────

describe('awardXP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to users/{uid} and xpActivities with correct values', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 50,
        currentXP: 30,
        level: 1,
      }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);

    const result = await awardXP('test-uid', 50, 'lesson_complete', 'Lesson 1');

    // 50 + 50 = 100 totalXP → computeLevel(100) = 2
    expect(result.newTotal).toBe(100);
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(true);

    // Verify user doc was updated
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1].currentXP).toBe(80);
    expect(updateCall[1].totalXP).toBe(100);
    expect(updateCall[1].level).toBe(2);

    // Verify activity was logged
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('awards XP with multiplier applied', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 100,
        currentXP: 100,
        level: 2,
        xpMultiplier: 2.0,
      }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);

    const result = await awardXP('test-uid', 50, 'streak_bonus', 'Daily streak');

    // 50 * 2.0 = 100 adjusted, 100 + 100 = 200 total
    expect(result.newTotal).toBe(200);
  });

  it('throws for non-existent user', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(
      awardXP('bad-uid', 50, 'lesson_complete', 'N/A'),
    ).rejects.toThrow('User not found');
  });

  it('throws for zero or negative amount', async () => {
    await expect(
      awardXP('test-uid', 0, 'lesson_complete', 'N/A'),
    ).rejects.toThrow('XP amount must be positive');
  });
});

// ─── purchaseAvatarItem — transaction tests ────────────────────────────────

describe('purchaseAvatarItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrements currentXP atomically via runTransaction', async () => {
    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        fn: (tx: Record<string, unknown>) => Promise<void>,
      ) => {
        const tx = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ currentXP: 500, ownedAvatarItems: [] }),
          }),
          update: vi.fn(),
        };
        await fn(tx);
      },
    );

    // After transaction, getDoc is called to read back XP
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ currentXP: 400 }),
    });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await purchaseAvatarItem('test-uid', 'hat_cool', 100);

    expect(result.success).toBe(true);
    expect(result.currentXP).toBe(400);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1); // activity log
  });

  it('fails when user has insufficient XP', async () => {
    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        fn: (tx: Record<string, unknown>) => Promise<void>,
      ) => {
        const tx = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ currentXP: 50, ownedAvatarItems: [] }),
          }),
          update: vi.fn(),
        };
        await fn(tx);
      },
    );

    const result = await purchaseAvatarItem('test-uid', 'hat_premium', 200);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough XP');
  });

  it('fails when user already owns the item', async () => {
    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        fn: (tx: Record<string, unknown>) => Promise<void>,
      ) => {
        const tx = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              currentXP: 500,
              ownedAvatarItems: ['hat_cool'],
            }),
          }),
          update: vi.fn(),
        };
        await fn(tx);
      },
    );

    const result = await purchaseAvatarItem('test-uid', 'hat_cool', 100);

    expect(result.success).toBe(false);
    expect(result.message).toContain('already own');
  });
});
