/**
 * @file loginStreakCatalog.ts
 * Fixed 7-day reward catalog + scaling logic for the Login Streak Reward System.
 * Runs in parallel with the weekly shuffled reward system.
 * All date math uses PHT (Asia/Manila, UTC+8).
 */

import { LoginStreakReward } from '../types/loginStreakRewards';

// ── Scale factor per cycle ────────────────────────────────────────────────────
const CYCLE_SCALE_FACTOR = 0.15; // 15% increase per cycle

// ── Fixed 7-day catalog (base values at cycle 1) ──────────────────────────────
export const STREAK_CATALOG: LoginStreakReward[] = [
  {
    id: 'streak_xp_d1',
    streakDay: 1,
    category: 'xp',
    baseValue: 100,
    rarity: 'common',
    icon: '⚡',
    label: '+100 XP',
    description: 'Daily login bonus',
    color: '#4ade80',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_xp_d2',
    streakDay: 2,
    category: 'xp',
    baseValue: 250,
    rarity: 'common',
    icon: '🌟',
    label: '+250 XP',
    description: 'Keep the streak going!',
    color: '#facc15',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_hintkeys_d3',
    streakDay: 3,
    category: 'hint_token',
    baseValue: 3,
    rarity: 'uncommon',
    icon: '💡',
    label: '3 Hint Keys',
    description: 'Use these in quizzes',
    color: '#a78bfa',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_xp_d4',
    streakDay: 4,
    category: 'xp',
    baseValue: 400,
    rarity: 'common',
    icon: '💪',
    label: '+400 XP',
    description: "You're on fire!",
    color: '#34d399',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_combo_d5',
    streakDay: 5,
    category: 'hint_token', // primary category for combo
    baseValue: 5,
    rarity: 'uncommon',
    icon: '🎁',
    label: '5 Hint Keys + 5 Lives',
    description: 'Combo reward: hints + extra lives',
    color: '#fb923c',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_xp_d6',
    streakDay: 6,
    category: 'xp',
    baseValue: 500,
    rarity: 'common',
    icon: '🚀',
    label: '+500 XP',
    description: 'Almost there!',
    color: '#60a5fa',
    isEpicPlaceholder: false,
    reward_asset_id: null,
  },
  {
    id: 'streak_epic_d7',
    streakDay: 7,
    category: 'epic_placeholder',
    baseValue: 0,
    rarity: 'epic',
    icon: '🔒',
    label: 'Exclusive Item',
    description: 'Coming soon! Exclusive reward for completing the cycle.',
    color: '#f97316',
    isEpicPlaceholder: true,
    reward_asset_id: null, // populate when asset is ready
  },
];

// ── Scaling helpers ────────────────────────────────────────────────────────────

/** Scale XP: round to nearest integer */
function scaleXP(baseValue: number, cycle: number): number {
  return Math.round(baseValue * (1 + (cycle - 1) * CYCLE_SCALE_FACTOR));
}

/** Scale hint tokens: ceil */
function scaleHintTokens(baseValue: number, cycle: number): number {
  return Math.ceil(baseValue * (1 + (cycle - 1) * CYCLE_SCALE_FACTOR));
}

/** Scale lives: base + 2 per cycle beyond first */
function scaleLives(baseValue: number, cycle: number): number {
  return baseValue + (cycle - 1) * 2;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the reward for a given streak day and cycle, with scaled values.
 * @param streakDay 1–7
 * @param cycle 1, 2, 3, ... (1 = Week 1 base values)
 */
export function getStreakReward(streakDay: number, cycle: number): LoginStreakReward {
  const entry = STREAK_CATALOG.find((r) => r.streakDay === streakDay);
  if (!entry) {
    throw new Error(`Invalid streakDay ${streakDay} — must be 1–7`);
  }

  const scaled = { ...entry };

  switch (entry.category) {
    case 'xp':
      scaled.baseValue = scaleXP(entry.baseValue, cycle);
      break;
    case 'hint_token':
      scaled.baseValue = scaleHintTokens(entry.baseValue, cycle);
      break;
    case 'epic_placeholder':
      // No scaling — placeholder stays at 0
      break;
  }

  return scaled;
}

/**
 * Same as getStreakReward but also computes scaled lives for Day 5 combo.
 * Returns { reward, livesAwarded }
 */
export function getStreakRewardWithLives(
  streakDay: number,
  cycle: number,
): { reward: LoginStreakReward; livesAwarded: number } {
  const reward = getStreakReward(streakDay, cycle);
  let livesAwarded = 0;

  if (streakDay === 5) {
    livesAwarded = scaleLives(5, cycle);
  }

  return { reward, livesAwarded };
}

/**
 * Compute what streak day the user should be on given their last claim date.
 * Uses PHT dates.
 *
 * @param lastClaimedDate — "YYYY-MM-DD" in PHT, or "" if never claimed
 * @param todayPHT — "YYYY-MM-DD" in PHT
 * @param currentStreakDay — the user's current streak day (from Firestore state)
 * @returns { nextStreakDay, isReset }
 *   - If lastClaimedDate === todayPHT → return currentStreakDay (already claimed today)
 *   - If lastClaimedDate === yesterdayPHT → return currentStreakDay + 1 (consecutive)
 *   - If lastClaimedDate is older → return 1 (streak broken, reset)
 */
export function getStreakDayFromDate(
  lastClaimedDate: string,
  todayPHT: string,
  currentStreakDay: number,
): { nextStreakDay: number; isReset: boolean } {
  if (!lastClaimedDate) {
    return { nextStreakDay: 1, isReset: false };
  }

  if (lastClaimedDate === todayPHT) {
    // Already claimed today — stay on same day
    return { nextStreakDay: currentStreakDay, isReset: false };
  }

  // Compute yesterday
  const yesterday = getYesterdayPHT(todayPHT);

  if (lastClaimedDate === yesterday) {
    // Consecutive day — advance streak day (wraps to 1 after completing day 7)
    const next = currentStreakDay + 1;
    return { nextStreakDay: next > 7 ? 1 : next, isReset: false };
  }

  // Gap — streak broken
  return { nextStreakDay: 1, isReset: true };
}

function getYesterdayPHT(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}