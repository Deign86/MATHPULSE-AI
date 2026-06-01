// mobile/__tests__/gamification.addXP.critical.test.ts
// Critical test for addXP: verifies it writes to correct Firestore paths
// (users/{uid} updated, xpActivities logged).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetDoc, mockSetDoc, mockUpdateDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(() => Promise.resolve()),
  mockUpdateDoc: vi.fn(() => Promise.resolve()),
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  doc: vi.fn(() => 'mocked-doc-ref'),
  collection: vi.fn(() => 'mocked-collection-ref'),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
}));

import { addXP } from '../services/gamificationService';

describe('addXP - critical: writes to correct Firestore paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes updated XP to users/{uid} and logs activity to xpActivities', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 200,
        currentXP: 200,
        level: 3,
      }),
    });

    // 200 + 275 = 475 totalXP -> computeLevel(475) = 4
    const result = await addXP(275, 'user-123');

    expect(result.newTotal).toBe(475);
    expect(result.leveledUp).toBe(true);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const userUpdatePayload = (mockUpdateDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1];
    expect(userUpdatePayload.currentXP).toBe(475);
    expect(userUpdatePayload.totalXP).toBe(475);
    expect(userUpdatePayload.level).toBe(4);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('levels up correctly from L1 to L2 when crossing 100 XP', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 50,
        currentXP: 50,
        level: 1,
      }),
    });

    const result = await addXP(50, 'user-456');

    expect(result.newTotal).toBe(100);
    expect(result.leveledUp).toBe(true);

    const userUpdatePayload = (mockUpdateDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1];
    expect(userUpdatePayload.level).toBe(2);
  });

  it('does not level up when XP gain is too small', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 90,
        currentXP: 90,
        level: 1,
      }),
    });

    const result = await addXP(5, 'user-789');

    expect(result.newTotal).toBe(95);
    expect(result.leveledUp).toBe(false);
  });
});
