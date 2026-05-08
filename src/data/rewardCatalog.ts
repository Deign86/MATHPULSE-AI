/**
 * @file rewardCatalog.ts
 * Master reward catalog (21+ rewards) + deterministic weekly shuffle logic.
 * Uses PHT (Asia/Manila, UTC+8) for all date calculations.
 */

import { RewardDefinition } from '../types/rewards';

// ── Deterministic PRNG (Mulberry32) ──────────────────────────────────────────
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Seeded Fisher-Yates Shuffle ─────────────────────────────────────────────
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── PHT Date Helpers ────────────────────────────────────────────────────────

/** Current date string "YYYY-MM-DD" in Asia/Manila (PHT). */
export function getPHTDateString(date?: Date): string {
  const d = date ?? new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Current Date object representing PHT local time (values shifted from UTC). */
export function getPHTDate(date?: Date): Date {
  const d = date ?? new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/** ISO week number for a given PHT date. Monday = first day of week. */
export function getWeekSeed(date?: Date): number {
  const pht = getPHTDate(date);
  const year = pht.getFullYear();

  // Find Thursday of the current week (ISO week date system)
  const dayOfWeek = (pht.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  const thursday = new Date(pht);
  thursday.setDate(pht.getDate() - dayOfWeek + 3);

  // Find January 1st of the Thursday's year
  const jan1 = new Date(thursday.getFullYear(), 0, 1);

  // Calculate days between Jan 1 and Thursday, then derive week number
  const daysSinceJan1 = Math.floor((thursday.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(daysSinceJan1 / 7) + 1;

  return year * 100 + weekNum;
}

/** Day of week in PHT: 0 = Monday, 6 = Sunday. */
export function getDayOfWeek(date?: Date): number {
  const pht = getPHTDate(date);
  return (pht.getDay() + 6) % 7;
}

/** Next Monday 00:00 PHT as a JS Date. Timezone-safe via epoch arithmetic. */
export function getNextResetTime(date?: Date): Date {
  const now = date ?? new Date();

  // Work entirely in epoch milliseconds to avoid local-timezone effects.
  // PHT = UTC+8, so we add 8 h to convert UTC epoch → PHT epoch.
  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const phtEpoch = now.getTime() + PHT_OFFSET_MS;

  // Day of week in PHT (JavaScript UTC day: 0 = Sunday)
  const phtDay = new Date(phtEpoch).getUTCDay();
  const dayIndex = (phtDay + 6) % 7; // 0 = Monday … 6 = Sunday

  const daysUntilMonday = dayIndex === 0 ? 7 : 7 - dayIndex;

  // Midnight PHT today (truncate to start of PHT day)
  const todayMidnightPHT = phtEpoch - (phtEpoch % (24 * 60 * 60 * 1000));

  // Next Monday 00:00 PHT in epoch ms, then convert back to UTC
  const nextMondayPHT = todayMidnightPHT + daysUntilMonday * 24 * 60 * 60 * 1000;
  return new Date(nextMondayPHT - PHT_OFFSET_MS);
}

// ── Master Reward Catalog (19 items) ────────────────────────────────────────

export const REWARD_CATALOG: Omit<RewardDefinition, 'day'>[] = [
  { id: 'xp_50',         label: '+50 XP Boost',        description: 'Bonus XP on your next quiz',         icon: '⚡', type: 'xp',           value: 50,    rarity: 'common', color: '#4ade80' },
  { id: 'xp_100',        label: '+100 XP Boost',        description: 'Double bonus XP reward',             icon: '🌟', type: 'xp',           value: 100,   rarity: 'rare',   color: '#facc15' },
  { id: 'xp_200',        label: '+200 XP Epic Boost',   description: 'Massive XP surge',                   icon: '💥', type: 'xp',           value: 200,   rarity: 'epic',   color: '#f97316' },
  { id: 'streak_shield', label: 'Streak Shield',        description: 'Protects streak if you miss a day', icon: '🛡️', type: 'streak_shield',  value: 1,     rarity: 'rare',   color: '#60a5fa' },
  { id: 'hint_x3',       label: '3 Hint Tokens',        description: 'Use in-quiz hints',                  icon: '💡', type: 'hint_token',   value: 3,     rarity: 'common', color: '#a78bfa' },
  { id: 'hint_x5',       label: '5 Hint Tokens',        description: 'More hints to use',                  icon: '🔦', type: 'hint_token',   value: 5,     rarity: 'rare',   color: '#8b5cf6' },
  { id: 'xp_mult_1h',   label: '1-Hour XP ×1.5',       description: '1.5× XP for all quizzes for 1 hour',icon: '⏰', type: 'xp_multiplier', value: 60,    rarity: 'epic',   color: '#ec4899' },
  { id: 'xp_mult_30m',  label: '30-Min XP ×2',         description: '2× XP for 30 minutes',              icon: '🚀', type: 'xp_multiplier', value: 30,    rarity: 'epic',   color: '#e11d48' },
  { id: 'xp_75',        label: '+75 XP Boost',          description: 'Solid XP reward',                   icon: '✨', type: 'xp',           value: 75,    rarity: 'common', color: '#34d399' },
  { id: 'hint_x2',      label: '2 Hint Tokens',         description: 'Quick hint pack',                   icon: '🕯️', type: 'hint_token',   value: 2,     rarity: 'common', color: '#7c3aed' },
  { id: 'xp_streak_150',label: '+150 XP + Streak Save', description: 'XP boost + streak protection combo',icon: '🔥', type: 'xp',           value: 150,   rarity: 'epic',   color: '#dc2626' },
  { id: 'xp_25',        label: '+25 XP Starter',        description: 'Small but reliable XP',             icon: '🌱', type: 'xp',           value: 25,    rarity: 'common', color: '#86efac' },
  { id: 'hint_x1',      label: '1 Hint Token',          description: 'A single lifeline',                 icon: '🔍', type: 'hint_token',   value: 1,     rarity: 'common', color: '#c4b5fd' },
  { id: 'streak_shield2',label: '2 Streak Shields',     description: 'Double streak protection',          icon: '🏰', type: 'streak_shield', value: 2,     rarity: 'epic',   color: '#3b82f6' },
  { id: 'xp_120',       label: '+120 XP Power Surge',   description: 'Strong XP reward for the day',      icon: '⚡', type: 'xp',           value: 120,   rarity: 'rare',   color: '#16a34a' },
  { id: 'hint_x4',      label: '4 Hint Tokens',         description: 'Generous hint pack',                icon: '📚', type: 'hint_token',   value: 4,     rarity: 'rare',   color: '#9333ea' },
];

// ── Weekly Reward Selection ─────────────────────────────────────────────────

/** Pick exactly 7 rewards for the given week seed, assigning day indices 0–6. */
export function pickWeeklyRewards(weekSeed: number): RewardDefinition[] {
  const shuffled = seededShuffle(REWARD_CATALOG, weekSeed);
  const picked = shuffled.slice(0, 7);
  return picked.map((reward, index) => ({
    ...reward,
    day: index,
  }));
}

/** Convenience: get this week's 7 rewards using current PHT date. */
export function getThisWeeksRewards(): RewardDefinition[] {
  return pickWeeklyRewards(getWeekSeed());
}

/** Convenience: get today's specific reward based on current PHT day of week. */
export function getTodaysReward(): RewardDefinition {
  const weekRewards = getThisWeeksRewards();
  const dayIndex = getDayOfWeek();
  return weekRewards[dayIndex];
}
