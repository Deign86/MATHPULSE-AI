/**
 * useGamificationStore.ts — Zustand store for gamification state.
 *
 * All mutations flow through `mobile/services/gamificationService.ts`
 * to keep Firestore as the source of truth. The store holds a cached
 * copy for reactive UI rendering and calls service functions that
 * return the latest values after each write.
 */

import { create } from 'zustand';
import type { Achievement, LeaderboardEntry } from '../types/models';
import type { DailyRewardState, ActiveMultiplier } from '../types/rewards';
import { getDoc, doc } from '../lib/firebase';
import { db } from '../lib/firebase';
import {
  awardXP,
  getLeaderboard,
  computeLevel,
  getUserAchievements,
} from '../services/gamificationService';

// ─── State & Actions ────────────────────────────────────────────────────────

interface GamificationState {
  /** Lifetime total XP (never decreases; determines level). */
  xp: number;
  /** Current level derived from totalXP via computeLevel(). */
  level: number;
  /** XP within the current level (spendable in avatar shop). */
  currentXP: number;
  /** Current login streak in days. */
  dailyStreak: number;
  /** Longest streak ever recorded. */
  longestStreak: number;
  /** Number of streak shields available. */
  streakShields: number;
  /** ID of the last topic the student interacted with (for Continue Learning). */
  lastTopicId: string | null;
  /** Daily rewards state (populated by dailyRewardService). */
  dailyRewards: DailyRewardState | null;
  /** Unlocked achievements. */
  achievements: Achievement[];
  /** Active XP multipliers. */
  activeMultipliers: ActiveMultiplier[];
  /** Leaderboard entries. */
  leaderboard: LeaderboardEntry[];
  /** Whether a load / refresh is in progress. */
  isLoading: boolean;
  /** Last error message, or null. */
  error: string | null;
}

interface GamificationActions {
  /**
   * Award XP for an activity.
   *
   * Backward-compat form (1 arg): `addXP(amount)` — local-only update,
   *      increments xp, recomputes level via computeLevel. Used by legacy
   *      check-in / rewards screens that don't pass uid.
   *
   * Full form (4 args): `addXP(uid, amount, source, reason)` — calls the
   *      Firestore-backed `awardXP` service, updates store from the result.
   */
  addXP(...args:
    | [amount: number]
    | [uid: string, amount: number, source: string, reason: string]
  ): Promise<void>;

  /**
   * Claim a daily reward for the given day index (0-6).
   *
   * TODO: dailyRewardService has not been ported to mobile yet.
   * Once ported, this action will call it and update state accordingly.
   */
  claimDailyReward: (uid: string, dayIndex: number) => Promise<void>;

  /** Refresh the leaderboard from Firestore. */
  refreshLeaderboard: (period?: 'weekly' | 'monthly' | 'all') => Promise<void>;

  /** Load all gamification data for a user from Firestore. */
  loadUserData: (uid: string) => Promise<void>;

  /** Load unlocked achievements for a user from Firestore. */
  loadUserAchievements: (uid: string) => Promise<void>;

  /** Clear the error field. */
  resetError: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useGamificationStore = create<
  GamificationState & GamificationActions
>()((set) => ({
  // ── initial state ─────────────────────────────────────────────────────────
  xp: 0,
  level: 1,
  currentXP: 0,
  dailyStreak: 0,
  longestStreak: 0,
  streakShields: 0,
  lastTopicId: null,
  dailyRewards: null,
  achievements: [],
  activeMultipliers: [],
  leaderboard: [],
  isLoading: false,
  error: null,

  // ── actions ───────────────────────────────────────────────────────────────

  addXP: async (...args: unknown[]) => {
    // Backward-compat: addXP(amount)
    if (typeof args[0] === 'number') {
      const amount = args[0] as number;
      set((state) => ({
        xp: state.xp + amount,
        level: computeLevel(state.xp + amount),
      }));
      return;
    }

    // Full form: addXP(uid, amount, source, reason)
    const [uid, amount, source, reason] = args as [
      string,
      number,
      string,
      string,
    ];

    set({ isLoading: true, error: null });
    try {
      const result = await awardXP(uid, amount, source, reason);
      set({
        xp: result.newTotal,
        level: result.newLevel,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to award XP';
      set({ error: message, isLoading: false });
    }
  },

  claimDailyReward: async (_uid: string, _dayIndex: number) => {
    // TODO: Replace with dailyRewardService call once ported to mobile.
    // The dailyRewardService handles:
    //   - checking if today was already claimed
    //   - determining the reward for dayIndex
    //   - writing reward state to Firestore
    //   - returning ClaimResult for store update
    set({ error: 'Daily reward service not yet ported to mobile' });
  },

  refreshLeaderboard: async (
    period: 'weekly' | 'monthly' | 'all' = 'all',
  ) => {
    set({ isLoading: true, error: null });
    try {
      const leaderboard = await getLeaderboard(period);
      set({ leaderboard, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load leaderboard';
      set({ error: message, isLoading: false });
    }
  },

  loadUserData: async (uid: string) => {
    set({ isLoading: true, error: null });
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        set({ error: 'User not found', isLoading: false });
        return;
      }

      const data = userSnap.data();
      const totalXP: number = data.totalXP || 0;

      set({
        xp: totalXP,
        level: computeLevel(totalXP),
        currentXP: data.currentXP || 0,
        dailyStreak: data.dailyStreak || 0,
        longestStreak: data.longestStreak || 0,
        streakShields: data.streakShields || 0,
        lastTopicId: data.lastTopicId || null,
        // dailyRewards is hydrated by dailyRewardService when available
        // activeMultipliers is hydrated by dailyRewardService when available
        // achievements are loaded by loadUserAchievements action when available
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load user data';
      set({ error: message, isLoading: false });
    }
  },

  loadUserAchievements: async (uid: string) => {
    set({ isLoading: true, error: null });
    try {
      const achievements = await getUserAchievements(uid);
      set({ achievements, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load achievements';
      set({ error: message, isLoading: false });
    }
  },

  resetError: () => set({ error: null }),
}));
