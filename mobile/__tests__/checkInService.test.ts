// @ts-nocheck — vitest types not installed in mobile project

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock references ─────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('../lib/firebase', () => ({
  db: {},
  doc: vi.fn(() => 'mocked-doc-ref'),
  collection: vi.fn(() => 'mocked-collection-ref'),
  firestoreQuery: vi.fn(() => 'mocked-query-ref'),
  where: vi.fn(() => 'mocked-where-ref'),
  orderBy: vi.fn(() => 'mocked-orderBy-ref'),
  limit: vi.fn(() => 'mocked-limit-ref'),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
  increment: (n: number) => ({ __inc: n }),
  arrayUnion: (...items: unknown[]) => items,
}));

import { submitCheckIn, getTodayCheckIn, CHECK_IN_XP } from '../services/checkInService';

// ─── Smoke Tests ────────────────────────────────────────────────────────────

describe('checkInService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: user exists, no last check-in
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        dailyStreak: 0,
        lastCheckInDate: null,
        name: 'Test User',
      }),
    });

    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  describe('submitCheckIn', () => {
    it('returns a CheckInRecord with streakDay=1 on first submission', async () => {
      const result = await submitCheckIn('uid-1', 'great', 'Feeling confident');

      expect(mockGetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

      expect(result.uid).toBe('uid-1');
      expect(result.mood).toBe('great');
      expect(result.note).toBe('Feeling confident');
      expect(result.streakDay).toBe(1);
      expect(CHECK_IN_XP).toBe(10);
    });

    it('starts a new streak after a gap', async () => {
      // Last check-in was 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          dailyStreak: 5,
          lastCheckInDate: { toDate: () => threeDaysAgo },
          name: 'Test User',
        }),
      });

      const result = await submitCheckIn('uid-1', 'okay');
      expect(result.streakDay).toBe(1);
    });

    it('throws if user already checked in today', async () => {
      const today = new Date();
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          dailyStreak: 3,
          lastCheckInDate: { toDate: () => today },
          name: 'Test User',
        }),
      });

      await expect(submitCheckIn('uid-1', 'good')).rejects.toThrow(
        'Already checked in today',
      );
    });

    it('throws if user document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(submitCheckIn('uid-nonexistent', 'good')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getTodayCheckIn', () => {
    it('returns null when no check-in exists for today', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await getTodayCheckIn('uid-1');
      expect(result).toBeNull();
    });

    it('returns the check-in record when one exists', async () => {
      const today = new Date();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'checkin-abc',
            data: () => ({
              uid: 'uid-1',
              timestamp: { toDate: () => today },
              mood: 'great',
              note: 'Having a good day',
              streakDay: 3,
            }),
          },
        ],
      });

      const result = await getTodayCheckIn('uid-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('checkin-abc');
      expect(result!.mood).toBe('great');
      expect(result!.note).toBe('Having a good day');
      expect(result!.streakDay).toBe(3);
    });
  });
});
