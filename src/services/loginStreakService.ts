/**
 * @file loginStreakService.ts
 * Firestore-backed login streak reward service.
 * Fixed 7-day cycle that runs in parallel with the weekly shuffled rewards.
 * PHT timezone (Asia/Manila, UTC+8). Transaction-safe claims.
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  LoginStreakState,
  LoginStreakClaimResult,
  LoginStreakReward,
} from '../types/loginStreakRewards';
import {
  getStreakReward,
  getStreakRewardWithLives,
  getStreakDayFromDate,
} from '../data/loginStreakCatalog';
import { getPHTDateString } from '../data/rewardCatalog';
import { awardXP } from './gamificationService';

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: LoginStreakState = {
  lastClaimedDate: '',
  currentStreakDay: 1,
  currentCycle: 1,
  longestStreakCycle: 0,
  longestStreakDay: 0,
  totalClaims: 0,
  lives: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStreakDocRef(userId: string) {
  return doc(db, 'users', userId, 'loginStreakRewards', userId);
}

function getUserDocRef(userId: string) {
  return doc(db, 'users', userId);
}

// ── State reading ─────────────────────────────────────────────────────────────

export async function getLoginStreakState(userId: string): Promise<LoginStreakState> {
  try {
    const ref = getStreakDocRef(userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ...INITIAL_STATE };
    }

    return { ...INITIAL_STATE, ...(snap.data() as LoginStreakState) } as LoginStreakState;
  } catch (error) {
    console.error('[loginStreakService] Error getting state:', error);
    return { ...INITIAL_STATE };
  }
}

export async function initializeLoginStreakState(userId: string): Promise<LoginStreakState> {
  const state: LoginStreakState = { ...INITIAL_STATE };
  await setDoc(getStreakDocRef(userId), state);
  return state;
}

// ── Pure helper ───────────────────────────────────────────────────────────────

/** Check if user can claim today (not already claimed today in PHT) */
export function canClaimTodayStreak(state: LoginStreakState, todayPHT: string): boolean {
  return state.lastClaimedDate !== todayPHT;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ── Claim logic ───────────────────────────────────────────────────────────────

export async function claimLoginStreakReward(userId: string): Promise<LoginStreakClaimResult> {
  const todayPHT = getPHTDateString();

  try {
    const result = await runTransaction(db, async (tx) => {
      const streakRef = getStreakDocRef(userId);
      const userRef = getUserDocRef(userId);

      const streakSnap = await tx.get(streakRef);
      const userSnap = await tx.get(userRef);

      // Initialize if missing
      let state: LoginStreakState;
      if (!streakSnap.exists()) {
        state = { ...INITIAL_STATE };
        tx.set(streakRef, state);
      } else {
        state = { ...INITIAL_STATE, ...(streakSnap.data() as LoginStreakState) } as LoginStreakState;
      }

      // Double-claim guard
      if (state.lastClaimedDate === todayPHT) {
        return {
          code: 'ALREADY_CLAIMED' as const,
          state,
          xpAwarded: 0,
          hintTokensAwarded: 0,
          livesAwarded: 0,
          isCycleComplete: false,
          isNewCycle: false,
          streakDayAfter: state.currentStreakDay,
          cycleAfter: state.currentCycle,
        };
      }

      // ── Determine what's being claimed — BEFORE any state mutation ─────────
      // Track what day we're claiming so we look up the RIGHT reward
      const claimedStreakDay = state.currentStreakDay;
      const claimedCycle = state.currentCycle;

      // Determine next streak position
      const { nextStreakDay, isReset } = getStreakDayFromDate(
        state.lastClaimedDate,
        todayPHT,
        state.currentStreakDay,
      );

      let newStreakDay: number;
      let newCycle: number;
      let isCycleComplete = false;
      let isNewCycle = false;

      if (isReset) {
        // Streak broken — reset to day 1, cycle 1
        newStreakDay = 1;
        newCycle = 1;
      } else if (nextStreakDay === 1 && state.currentStreakDay === 7) {
        // Completing a full 7-day cycle: day 7 was claimed, now wrap to day 1 of next cycle
        newStreakDay = 1;
        newCycle = state.currentCycle + 1;
        isCycleComplete = true;
        isNewCycle = true;
      } else {
        newStreakDay = nextStreakDay;
        newCycle = state.currentCycle;
      }

      // ── Get reward being claimed ───────────────────────────────────────────
      const { livesAwarded: comboLives } = getStreakRewardWithLives(claimedStreakDay, claimedCycle);

      // ── Apply rewards ─────────────────────────────────────────────────────
      const claimedReward = getStreakReward(claimedStreakDay, claimedCycle);
      let xpAwarded = 0;
      let hintTokensAwarded = 0;
      const totalLivesAwarded = claimedStreakDay === 5 ? comboLives : 0;

      switch (claimedReward.category) {
        case 'xp':
          xpAwarded = claimedReward.baseValue;
          break;
        case 'hint_token':
          hintTokensAwarded = claimedReward.baseValue;
          break;
        case 'epic_placeholder':
          // Placeholder — no actual reward, but the milestone matters
          break;
      }

      // ── Update state ──────────────────────────────────────────────────────
      const newLongestStreakCycle = Math.max(state.longestStreakCycle, newCycle);
      const newLongestStreakDay = Math.max(state.longestStreakDay, newStreakDay);

      const newState: LoginStreakState = {
        ...state,
        lastClaimedDate: todayPHT,
        currentStreakDay: newStreakDay,
        currentCycle: newCycle,
        longestStreakCycle: newLongestStreakCycle,
        longestStreakDay: newLongestStreakDay,
        totalClaims: state.totalClaims + 1,
        lives: state.lives + totalLivesAwarded,
      };

      tx.set(streakRef, newState, { merge: true });

      // ── Denormalize to user profile ───────────────────────────────────────
      if (userSnap.exists()) {
        const userData = userSnap.data() as Record<string, any>;
        tx.update(userRef, {
          hintTokens: (userData.hintTokens ?? 0) + hintTokensAwarded,
          lives: newState.lives,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        code: 'SUCCESS' as const,
        state: newState,
        xpAwarded,
        hintTokensAwarded,
        livesAwarded: totalLivesAwarded,
        isCycleComplete,
        isNewCycle,
        streakDayAfter: newStreakDay,
        cycleAfter: newCycle,
        claimedStreakDay,      // the day that was claimed (before wrap)
        claimedReward,           // the reward for that day
      };
    });

    if (result.code === 'ALREADY_CLAIMED') {
      return {
        success: false,
        reward: {} as LoginStreakReward,
        streakDayAfter: result.state.currentStreakDay,
        cycleAfter: result.state.currentCycle,
        xpAwarded: 0,
        hintTokensAwarded: 0,
        livesAwarded: 0,
        isCycleComplete: false,
        isNewCycle: false,
        error: 'Already claimed today',
      };
    }

    // ── Award XP outside transaction ────────────────────────────────────────
    if (result.xpAwarded > 0) {
      try {
        await awardXP(
          userId,
          result.xpAwarded,
          'login_streak',
          `Login Streak Day ${(result as any).claimedStreakDay}! +${result.xpAwarded} XP`,
        );
      } catch (xpError) {
        console.error('[loginStreakService] Error awarding XP:', xpError);
      }
    }

    return {
      success: true,
      reward: (result as any).claimedReward as LoginStreakReward,
      streakDayAfter: result.streakDayAfter,
      cycleAfter: result.cycleAfter,
      xpAwarded: result.xpAwarded,
      hintTokensAwarded: result.hintTokensAwarded,
      livesAwarded: result.livesAwarded,
      isCycleComplete: result.isCycleComplete,
      isNewCycle: result.isNewCycle,
    };
  } catch (error) {
    console.error('[loginStreakService] Error claiming login streak reward:', error);
    throw error;
  }
}

// ── Re-exports ────────────────────────────────────────────────────────────────

export { getStreakReward };