/**
 * @file dailyRewardService.ts
 * Firestore-backed daily rewards service.
 * PHT timezone (Asia/Manila, UTC+8). Transaction-safe claims.
 * Replaces the legacy dailyCheckInService.
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
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
  getDayOfWeek,
  getNextResetTime,
} from '../data/rewardCatalog';
import { awardXP, unlockAvatarItem } from './gamificationService';

// ── Constants ───────────────────────────────────────────────────────────────

const MILESTONE_STREAKS = new Set([7, 14, 30, 60, 100]);

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
    if (data.lastClaimedWeekSeed && data.lastClaimedWeekSeed !== currentWeekSeed) {
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
        data.activeMultiplier && isMultiplierActive(data.activeMultiplier)
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

// ── Claim Logic ─────────────────────────────────────────────────────────────

export function canClaimToday(state: DailyRewardState): boolean {
  const todayPHT = getPHTDateString();
  return state.lastClaimedDate !== todayPHT;
}

export async function claimDailyReward(userId: string): Promise<ClaimResult> {
  const todayPHT = getPHTDateString();
  const currentWeekSeed = getWeekSeed();
  const dayIndex = getDayOfWeek();
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
        } else {
          // Gap — check shield
          if (state.streakShields > 0) {
            state.streakShields -= 1;
            newStreak = state.currentStreak + 1;
            streakPreserved = true;
          } else {
            newStreak = 1;
          }
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
          // Badge unlock handled outside transaction (function call)
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

    // Award XP outside transaction (awardXP does its own Firestore write)
    if (result.xpAwarded > 0) {
      try {
        await awardXP(userId, result.xpAwarded, 'daily_reward', `Daily Reward Day ${dayIndex + 1}! +${result.xpAwarded} XP`);
      } catch (xpError) {
        console.error('[dailyRewardService] Error awarding XP:', xpError);
        // Continue — don't fail the whole claim if XP award fails
      }
    }

    // Handle badge unlock outside transaction
    if (reward.type === 'badge_unlock' && typeof reward.value === 'string') {
      try {
        await unlockAvatarItem(userId, reward.value);
      } catch (badgeError) {
        console.error('[dailyRewardService] Error unlocking avatar item:', badgeError);
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
