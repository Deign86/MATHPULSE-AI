/**
 * @file gamification.addXP.critical.test.ts
 * Critical test for addXP: verifies it writes to correct Firestore paths
 * (users/{uid} updated, xpActivities logged).
 */

jest.mock('../lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => 'mocked-doc-ref'),
  collection: jest.fn(() => 'mocked-collection-ref'),
  getDoc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  firestoreServerTimestamp: jest.fn(() => new Date('2026-06-01T00:00:00Z')),
}));

const firebase = require('../lib/firebase');
import { addXP } from '../services/gamificationService';

describe('addXP - critical: writes to correct Firestore paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes updated XP to users/{uid} and logs activity to xpActivities', async () => {
    firebase.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 200,
        currentXP: 200,
        level: 3,
      }),
    });

    // 200 + 275 = 475 totalXP -> computeLevel(475) = 4 (L4 threshold)
    const result = await addXP(275, 'user-123');

    expect(result.newTotal).toBe(475);
    expect(result.leveledUp).toBe(true); // 475 >= 475 -> L4

    // Verify users/{uid} was updated with correct fields
    expect(firebase.updateDoc).toHaveBeenCalledTimes(1);
    const userUpdatePayload = firebase.updateDoc.mock.calls[0][1];
    expect(userUpdatePayload.currentXP).toBe(475);
    expect(userUpdatePayload.totalXP).toBe(475);
    expect(userUpdatePayload.level).toBe(4);

    // Verify xpActivities log was written
    expect(firebase.setDoc).toHaveBeenCalledTimes(1);
  });

  it('levels up correctly from L1 to L2 when crossing 100 XP', async () => {
    firebase.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 50,
        currentXP: 50,
        level: 1,
      }),
    });

    const result = await addXP(50, 'user-456');

    expect(result.newTotal).toBe(100);
    expect(result.leveledUp).toBe(true); // 100 >= 100 -> L2

    const userUpdatePayload = firebase.updateDoc.mock.calls[0][1];
    expect(userUpdatePayload.level).toBe(2);
  });

  it('does not level up when XP gain is too small', async () => {
    firebase.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        totalXP: 90,
        currentXP: 90,
        level: 1,
      }),
    });

    const result = await addXP(5, 'user-789');

    expect(result.newTotal).toBe(95);
    expect(result.leveledUp).toBe(false); // 95 < 100 -> still L1
  });
});
