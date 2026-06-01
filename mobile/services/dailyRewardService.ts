/**
 * @file dailyRewardService.ts
 * Firestore-backed daily rewards service for mobile.
 * PHT timezone (Asia/Manila, UTC+8). Transaction-safe claims.
 * Ported from src/services/dailyRewardService.ts.
 *
 * Public API:
 *   getWeeklyRewards(uid)     → reward grid + claimed status
 *   claimDailyReward(uid, dayIndex) → transaction-safe claim
 *   useStreakShield(uid)      → consume 1 shield to protect streak
 *   getStreakInfo(uid)        → full streak/state info
 *   getActiveMultipliers(uid) → currently active XP multipliers
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  RewardDefinition,
  DailyRewardState,
  ClaimResult,
  ActiveMultiplier,
} from '../types/rewards';
import {
  getPHTDateString,
  getPHTDate,
  getWeekSeed,
  getThisWeeksRewards,
  getTodaysReward,
  pickWeeklyRewards,
  getDayOfWeek,
  getNextResetTime,
} from '../data/rewardCatalog';

// ── Constants ───────────────────────────────────────────────────────────────

const MILESTONE_STREAKS: ReadonlySet<number> = new Set([7, 14, 30, 60, 100]);

const INITIAL_STATE: DailyRewardState = {
  lastClaimedDate: '',
  lastClaimedWeekSeed: 0,
  claimedDays: [],
  currentStreak: 0,
  longestStreak: 0,
  totalClaimed: 0,
  hintTokens: 0,
  streakShields: 0,
  activeMultiplier: null,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getYesterdayPHTString(): string {
  const pht = getPHTDate();
  pht.setDate(pht.getDate() - 1);
  return getPHTDateString(pht);
}

function isMultiplierActive(multiplier: ActiveMultiplier | null): boolean {
  if (!multiplier) return false;
  return new Date(multiplier.expiresAt).getTime() > Date.now();
}

function getRewardDocRef(userId: string) {
  return doc(db, 'users', userId, 'dailyRewards', userId);
}

function getUserDocRef(userId: string) {
  return doc(db, 'users', userId);
}

// ── State Reading ───────────────────────────────────────────────────────────

export async function getDailyRewardState(userId: string): Promise<DailyRewardState> {
  try {
    const ref = getRewardDocRef(userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ...INITIAL_STATE };
    }

    const data = snap.data() as Partial<DailyRewardState>;
    const currentWeekSeed = getWeekSeed();

    // If week changed, reset claimedDays but preserve streak/shields/tokens
    if (data.lastClaimedWeekSeed != null && data.lastClaimedWeekSeed !== currentWeekSeed) {
      return {
        ...(data as DailyRewardState),
        claimedDays: [],
        lastClaimedWeekSeed: currentWeekSeed,
      };
    }

    return {
      ...INITIAL_STATE,
      ...data,
      activeMultiplier:
        data.activeMultiplier != null && isMultiplierActive(data.activeMultiplier)
          ? data.activeMultiplier
          : null,
    } as DailyRewardState;
  } catch (error) {
    console.error('[dailyRewardService] Error getting state:', error);
    return { ...INITIAL_STATE };
  }
}

export async function initializeDailyRewardState(userId: string): Promise<DailyRewardState> {
  const state: DailyRewardState = {
    ...INITIAL_STATE,
    lastClaimedWeekSeed: getWeekSeed(),
  };
  await setDoc(getRewardDocRef(userId), state);
  return state;
}

// ── Convenience Exports (mobile-specific API surface) ───────────────────────

/**
 * Get this week's reward grid with claimed-days annotation.
 * Returns the 7 rewards for the current week + which days are already claimed.
 */
export async function getWeeklyRewards(userId: string): Promise<{
  weekSeed: number;
  rewards: RewardDefinition[];
  claimedDays: number[];
  todayIndex: number;
}> {
  const state = await getDailyRewardState(userId);
  const weekSeed = getWeekSeed();
  const rewards = pickWeeklyRewards(weekSeed);
  const todayIndex = getDayOfWeek();

  return {
    weekSeed,
    rewards,
    claimedDays: state.claimedDays,
    todayIndex,
  };
}

/**
 * Full streak + state info for the given user.
 * Alias for `getDailyRewardState`.
 */
export const getStreakInfo = getDailyRewardState;

/**
 * Return all currently-active XP multipliers for the user.
 */
export async function getActiveMultipliers(userId: string): Promise<ActiveMultiplier[]> {
  const state = await getDailyRewardState(userId);
  if (state.activeMultiplier != null && isMultiplierActive(state.activeMultiplier)) {
    return [state.activeMultiplier];
  }
  return [];
}

// ── Claim Logic ─────────────────────────────────────────────────────────────

export function canClaimToday(state: DailyRewardState): boolean {
  const todayPHT = getPHTDateString();
  return state.lastClaimedDate !== todayPHT;
}

/**
 * Consume a streak shield proactively to protect the current streak from
 * a missed day.  Decrements streakShields by 1 and records that a shield
 * was used on this PHT date so the next claim preserves the streak.
 */
export async function useStreakShield(userId: string): Promise<{
  success: boolean;
  streakShieldsRemaining: number;
  error?: string;
}> {
  try {
    const result = await runTransaction(db, async (tx) => {
      const rewardRef = getRewardDocRef(userId);
      const rewardSnap = await tx.get(rewardRef);

      if (!rewardSnap.exists()) {
        return { success: false as const, streakShieldsRemaining: 0, error: 'No daily reward state found' };
      }

      const state = { ...INITIAL_STATE, ...rewardSnap.data() } as DailyRewardState;

      if (state.streakShields <= 0) {
        return { success: false as const, streakShieldsRemaining: 0, error: 'No streak shields available' };
      }

      const todayPHT = getPHTDateString();

      // Don't allow double-use on the same day
      if (state.shieldPendingDate === todayPHT) {
        return { success: false as const, streakShieldsRemaining: state.streakShields, error: 'Shield already used today' };
      }

      state.streakShields -= 1;
      state.shieldPendingDate = todayPHT;

      tx.set(rewardRef, state, { merge: true });

      // Denormalise to user profile
      const userRef = getUserDocRef(userId);
      tx.update(userRef, {
        streakShields: state.streakShields,
        updatedAt: serverTimestamp(),
      });

      return { success: true as const, streakShieldsRemaining: state.streakShields };
    });

    return result;
  } catch (error) {
    console.error('[dailyRewardService] Error using streak shield:', error);
    throw error;
  }
}

/**
 * Claim the daily reward for the given day index (0–6).
 * Returns a ClaimResult with reward details and updated streak info.
 */
export async function claimDailyReward(userId: string, dayIndex: number): Promise<ClaimResult> {
  const todayPHT = getPHTDateString();
  const currentWeekSeed = getWeekSeed();
  const weekRewards = getThisWeeksRewards();
  const reward = weekRewards[dayIndex];

  if (!reward) {
    throw new Error(`No reward found for day index ${dayIndex}`);
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const rewardRef = getRewardDocRef(userId);
      const userRef = getUserDocRef(userId);

      const rewardSnap = await tx.get(rewardRef);
      const userSnap = await tx.get(userRef);

      // Initialise if missing
      let state: DailyRewardState;
      if (!rewardSnap.exists()) {
        state = {
          ...INITIAL_STATE,
          lastClaimedWeekSeed: currentWeekSeed,
        };
        tx.set(rewardRef, state);
      } else {
        state = { ...INITIAL_STATE, ...rewardSnap.data() } as DailyRewardState;
      }

      // New week detection → reset claimedDays
      if (state.lastClaimedWeekSeed !== currentWeekSeed) {
        state.claimedDays = [];
        state.lastClaimedWeekSeed = currentWeekSeed;
      }

      // Double-claim guard
      if (state.lastClaimedDate === todayPHT) {
        return { code: 'ALREADY_CLAIMED' as const, state };
      }

      // ── Streak calculation ───────────────────────────────────────────────
      let newStreak = state.currentStreak;
      let streakPreserved = false;

      if (!state.lastClaimedDate || state.currentStreak === 0) {
        // First ever claim
        newStreak = 1;
      } else {
        const yesterdayPHT = getYesterdayPHTString();

        if (state.lastClaimedDate === yesterdayPHT) {
          // Consecutive day
          newStreak = state.currentStreak + 1;
        } else if (state.shieldPendingDate === yesterdayPHT) {
          // Shield was proactively used yesterday — streak preserved
          state.shieldPendingDate = undefined;
          newStreak = state.currentStreak + 1;
          streakPreserved = true;
        } else if (state.streakShields > 0) {
          // Gap detected — consume shield reactively
          state.streakShields -= 1;
          newStreak = state.currentStreak + 1;
          streakPreserved = true;
        } else {
          // Streak broken
          newStreak = 1;
        }
      }

      const newLongestStreak = Math.max(state.longestStreak, newStreak);

      // ── Apply reward ─────────────────────────────────────────────────────
      let xpAwarded = 0;
      let multiplierApplied = 1;

      switch (reward.type) {
        case 'xp': {
          const baseXP = typeof reward.value === 'number' ? reward.value : parseInt(reward.value, 10) || 0;
          multiplierApplied = isMultiplierActive(state.activeMultiplier)
            ? (state.activeMultiplier?.multiplier ?? 1)
            : 1;
          xpAwarded = Math.floor(baseXP * multiplierApplied);
          break;
        }
        case 'hint_token': {
          const hintAmount = typeof reward.value === 'number' ? reward.value : parseInt(reward.value, 10) || 0;
          state.hintTokens += hintAmount;
          break;
        }
        case 'streak_shield': {
          const shieldAmount = typeof reward.value === 'number' ? reward.value : parseInt(reward.value, 10) || 0;
          state.streakShields += shieldAmount;
          break;
        }
        case 'xp_multiplier': {
          const durationMinutes = typeof reward.value === 'number' ? reward.value : parseInt(reward.value, 10) || 60;
          const multiplierValue = reward.id.includes('2') ? 2.0 : 1.5;
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
          state.activeMultiplier = {
            multiplier: multiplierValue,
            expiresAt: expiresAt.toISOString(),
          };
          break;
        }
        case 'badge_unlock': {
          // Handled outside transaction (see below)
          break;
        }
      }

      // ── Update claimed tracking ──────────────────────────────────────────
      const newClaimedDays = [...state.claimedDays, dayIndex];
      state.lastClaimedDate = todayPHT;
      state.currentStreak = newStreak;
      state.longestStreak = newLongestStreak;
      state.totalClaimed += 1;

      tx.set(rewardRef, state, { merge: true });

      // ── Denormalise to user profile (same transaction) ───────────────────
      if (userSnap.exists()) {
        tx.update(userRef, {
          hintTokens: state.hintTokens,
          streakShields: state.streakShields,
          activeMultiplier: state.activeMultiplier,
          lastClaimedDate: state.lastClaimedDate,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        code: 'SUCCESS' as const,
        state,
        newClaimedDays,
        newStreak,
        newLongestStreak,
        xpAwarded,
        multiplierApplied,
        streakPreserved,
      };
    });

    if (result.code === 'ALREADY_CLAIMED') {
      return {
        success: false,
        reward,
        dayIndex,
        streakAfter: result.state.currentStreak,
        longestStreakAfter: result.state.longestStreak,
        hintTokensAfter: result.state.hintTokens,
        streakShieldsAfter: result.state.streakShields,
        streakPreserved: false,
        xpAwarded: 0,
        multiplierApplied: 1,
        isMilestone: false,
        error: 'Already claimed today',
      };
    }

    // ── Post-transaction: award XP to user profile ─────────────────────────
    if (result.xpAwarded > 0) {
      try {
        const userRef = getUserDocRef(userId);
        await setDoc(
          userRef,
          {
            totalXp: increment(result.xpAwarded),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (xpError) {
        console.error('[dailyRewardService] Error awarding XP:', xpError);
        // Continue — don't fail the whole claim if XP award fails
      }
    }

    // ── Post-transaction: handle badge unlock ──────────────────────────────
    if (reward.type === 'badge_unlock' && typeof reward.value === 'string') {
      try {
        const userRef = getUserDocRef(userId);
        await setDoc(
          userRef,
          {
            avatarUnlocks: arrayUnion(reward.value),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (badgeError) {
        console.error('[dailyRewardService] Error unlocking badge:', badgeError);
      }
    }

    const isMilestone = MILESTONE_STREAKS.has(result.newStreak);

    return {
      success: true,
      reward,
      dayIndex,
      streakAfter: result.newStreak,
      longestStreakAfter: result.newLongestStreak,
      hintTokensAfter: result.state.hintTokens,
      streakShieldsAfter: result.state.streakShields,
      streakPreserved: result.streakPreserved,
      xpAwarded: result.xpAwarded,
      multiplierApplied: result.multiplierApplied,
      isMilestone,
    };
  } catch (error) {
    console.error('[dailyRewardService] Error claiming daily reward:', error);
    throw error;
  }
}

// ── Re-exports for convenience ──────────────────────────────────────────────

export { getThisWeeksRewards, getTodaysReward, getNextResetTime };
