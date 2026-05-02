/**
 * @file dailyCheckInService.ts
 * Firestore-backed daily check-in service.
 * Persists claim state, tracks 7-day cycle, prevents double-claiming.
 */
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateStreak, awardXP } from './gamificationService';

export interface DailyCheckInState {
  currentDay: number;        // 1-7, which day in the cycle
  claimedDays: number[];     // [1, 2, 3] - days claimed this cycle
  lastClaimDate: string;     // ISO date string of last claim
  cycleStartDate: string;    // ISO date when current cycle started
}

export interface CheckInResult {
  day: number;
  xpAmount: number;
  rewardType: string;
  isLastDay: boolean;         // true if this was day 7
}

const REWARDS: Record<number, { type: string; amount: number; label: string }> = {
  1: { type: 'xp', amount: 20, label: '20' },
  2: { type: 'xp', amount: 30, label: '30' },
  3: { type: 'chest', amount: 40, label: '40' },
  4: { type: 'xp', amount: 50, label: '50' },
  5: { type: 'xp', amount: 60, label: '60' },
  6: { type: 'xp', amount: 70, label: '70' },
  7: { type: 'epic_chest', amount: 100, label: '100' },
};

const getTodayISO = (): string => new Date().toISOString().split('T')[0];

const getDocRef = (userId: string) => doc(db, 'users', userId, 'settings', 'dailyCheckIn');

export const getDailyCheckInState = async (userId: string): Promise<DailyCheckInState> => {
  try {
    const ref = getDocRef(userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const initialState: DailyCheckInState = {
        currentDay: 1,
        claimedDays: [],
        lastClaimDate: '',
        cycleStartDate: getTodayISO(),
      };
      await setDoc(ref, initialState);
      return initialState;
    }

    const state = snap.data() as DailyCheckInState;
    const today = getTodayISO();

    const cycleStart = new Date(state.cycleStartDate);
    const now = new Date(today);
    const daysSinceCycleStart = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCycleStart > 7 || !state.lastClaimDate) {
      const newState: DailyCheckInState = {
        currentDay: 1,
        claimedDays: [],
        lastClaimDate: state.lastClaimDate || '',
        cycleStartDate: getTodayISO(),
      };
      await updateDoc(ref, { ...newState });
      return newState;
    }

    if (state.lastClaimDate !== today && state.claimedDays.length > 0) {
      const nextDay = state.claimedDays.length + 1;
      if (nextDay <= 7 && nextDay > state.currentDay) {
        await updateDoc(ref, { currentDay: nextDay });
        return { ...state, currentDay: nextDay };
      }
    }

    return state;
  } catch (error) {
    console.error('[dailyCheckInService] Error getting state:', error);
    return { currentDay: 1, claimedDays: [], lastClaimDate: '', cycleStartDate: getTodayISO() };
  }
};

export const claimDailyCheckIn = async (userId: string): Promise<CheckInResult> => {
  const state = await getDailyCheckInState(userId);
  const today = getTodayISO();

  if (state.lastClaimDate === today) {
    throw new Error('Already claimed today');
  }

  if (state.claimedDays.includes(state.currentDay)) {
    throw new Error('Current day already claimed');
  }

  const reward = REWARDS[state.currentDay];
  if (!reward) {
    throw new Error(`No reward defined for day ${state.currentDay}`);
  }

  // Award XP through gamification service
  if (reward.type === 'xp') {
    await awardXP(userId, reward.amount, 'daily_checkin', `Daily Check-In Day ${state.currentDay}! +${reward.amount} XP`);
  }

  // Update streak
  await updateStreak(userId);

  // Update Firestore
  const ref = getDocRef(userId);
  const newClaimedDays = [...state.claimedDays, state.currentDay];
  const isLastDay = state.currentDay >= 7;

  await updateDoc(ref, {
    claimedDays: newClaimedDays,
    lastClaimDate: today,
    currentDay: isLastDay ? 1 : state.currentDay + 1,
    ...(isLastDay ? { cycleStartDate: today } : {}),
  });

  return {
    day: state.currentDay,
    xpAmount: reward.type === 'xp' ? reward.amount : 0,
    rewardType: reward.type,
    isLastDay,
  };
};
