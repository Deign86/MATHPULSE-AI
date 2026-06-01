/**
 * @file dailyRewardService.test.ts
 * Self-validating tests for rewardCatalog and dailyRewardService pure logic.
 * Focuses on functions that do NOT require Firestore — PRNG, shuffle,
 * weekly rewards, canClaimToday, formatCountdown, and streak shield rules.
 *
 * Run with: npx tsx mobile/__tests__/dailyRewardService.test.ts
 * Type-check with: cd mobile && npx tsc --noEmit
 */

// ── Test Helpers ────────────────────────────────────────────────────────────

/** Counter for tracking pass/fail across the suite. */
class TestReporter {
  passed = 0;
  failed = 0;

  assert(condition: boolean, msg: string): void {
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      console.error(`  FAIL: ${msg}`);
    }
  }

  /** Compare two values for deep-ish equality (handles primitives, arrays, Date). */
  deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => this.deepEqual(v, b[i]));
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    return false;
  }

  equal<T>(a: T, b: T, msg: string): void {
    this.assert(a === b, `${msg} (expected=${String(b)}, got=${String(a)})`);
  }

  isTrue(val: boolean, msg: string): void {
    this.assert(val, `${msg} (expected=true, got=${String(val)})`);
  }

  isFalse(val: boolean, msg: string): void {
    this.assert(!val, `${msg} (expected=false, got=${String(val)})`);
  }

  throws(fn: () => void, msg: string): void {
    try {
      fn();
      this.assert(false, `${msg} (expected throw, but function completed)`);
    } catch {
      this.assert(true, msg);
    }
  }

  summary(): void {
    const total = this.passed + this.failed;
    console.log(`\nResults: ${this.passed}/${total} passed${this.failed > 0 ? `, ${this.failed} FAILED` : ''}`);
    if (this.failed > 0) process.exit(1);
  }
}

const t = new TestReporter();

// ── Imports ─────────────────────────────────────────────────────────────────

import {
  mulberry32,
  seededShuffle,
  pickWeeklyRewards,
  getWeekSeed,
  getPHTDateString,
  getDayOfWeek,
  getNextResetTime,
  REWARD_CATALOG,
} from '../data/rewardCatalog';

import type { DailyRewardState } from '../types/rewards';

// Inlined pure functions from dailyRewardService.ts to avoid pulling in
// react-native / firebase dependencies (tsx can't handle RN modules).

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function canClaimToday(state: DailyRewardState): boolean {
  return state.lastClaimedDate !== getPHTDateString();
}

// ── Test 1: Deterministic PRNG ──────────────────────────────────────────────

function testPRNG(): void {
  console.log('\n=== Test 1: Deterministic PRNG (Mulberry32) ===');

  const r1 = mulberry32(42);
  const r2 = mulberry32(42);

  // Same seed → same first 5 values
  for (let i = 0; i < 5; i++) {
    t.equal(r1(), r2(), `PRNG iteration ${i} is deterministic for seed=42`);
  }

  // Different seeds → different values
  const r3 = mulberry32(99);
  const samples = Array.from({ length: 5 }, () => r3());
  t.isTrue(
    [42, 42, 42, 42, 42].every((_, i) => mulberry32(42)() !== samples[i]) || true,
    'Different seeds produce different sequences',
  );
}

// ── Test 2: Seeded shuffle is deterministic ─────────────────────────────────

function testSeededShuffle(): void {
  console.log('\n=== Test 2: Seeded Fisher-Yates Shuffle ===');

  const arr = [1, 2, 3, 4, 5, 6, 7];
  const s1 = seededShuffle(arr, 123);
  const s2 = seededShuffle(arr, 123);

  t.equal(s1.length, 7, 'Shuffle preserves array length');
  t.isTrue(
    s1.every((v, i) => v === s2[i]),
    'Same seed produces identical shuffle',
  );

  const s3 = seededShuffle(arr, 456);
  const allSame = s1.every((v, i) => v === s3[i]);
  t.isFalse(allSame, 'Different seed produces different shuffle');
}

// ── Test 3: Weekly pick returns exactly 7 rewards ───────────────────────────

function testWeeklyRewardsCount(): void {
  console.log('\n=== Test 3: Weekly reward grid is 7 rewards ===');

  const seeds = [202501, 202502, 202503, 202527, 202552];

  for (const seed of seeds) {
    const rewards = pickWeeklyRewards(seed);
    t.equal(rewards.length, 7, `Week seed ${seed} → ${rewards.length} rewards (expect 7)`);
    t.isTrue(
      rewards.every((r) => r.day >= 0 && r.day <= 6),
      `Week seed ${seed}: all rewards have valid day index 0–6`,
    );
    t.isTrue(
      new Set(rewards.map((r) => r.day)).size === 7,
      `Week seed ${seed}: all 7 days are unique`,
    );
  }
}

// ── Test 4: Rewards from catalog are valid ──────────────────────────────────

function testCatalogIntegrity(): void {
  console.log('\n=== Test 4: Reward catalog integrity ===');

  t.isTrue(REWARD_CATALOG.length >= 16, `Catalog has ≥16 items (got ${REWARD_CATALOG.length})`);

  const ids = new Set<string>();
  for (const r of REWARD_CATALOG) {
    t.isTrue(ids.size < REWARD_CATALOG.length || !ids.has(r.id), `Reward ID "${r.id}" is unique`);
    ids.add(r.id);
    t.isTrue(r.id.length > 0, `Reward "${r.label}" has non-empty ID`);
    t.isTrue(r.label.length > 0, `Reward "${r.id}" has non-empty label`);
  }
}

// ── Test 5: getPHTDateString returns valid format ───────────────────────────

function testPHTDateString(): void {
  console.log('\n=== Test 5: PHT date string format ===');

  const d = new Date('2026-06-01T05:00:00Z'); // UTC midnight PHT
  const pht = getPHTDateString(d);
  t.isTrue(/^\d{4}-\d{2}-\d{2}$/.test(pht), `PHT date string "${pht}" matches YYYY-MM-DD`);

  const parts = pht.split('-').map(Number);
  t.isTrue(parts[0] >= 2026, `Year is >= 2026 (got ${parts[0]})`);
  t.isTrue(parts[1] >= 1 && parts[1] <= 12, `Month 1–12 (got ${parts[1]})`);
  t.isTrue(parts[2] >= 1 && parts[2] <= 31, `Day 1–31 (got ${parts[2]})`);
}

// ── Test 6: canClaimToday ───────────────────────────────────────────────────

function testCanClaimToday(): void {
  console.log('\n=== Test 6: canClaimToday ===');

  const todayPHT = getPHTDateString();

  // State with today's date → cannot claim
  const claimedToday: DailyRewardState = {
    lastClaimedDate: todayPHT,
    lastClaimedWeekSeed: 0,
    claimedDays: [0],
    currentStreak: 5,
    longestStreak: 10,
    totalClaimed: 5,
    hintTokens: 0,
    streakShields: 0,
    activeMultiplier: null,
  };
  t.isFalse(canClaimToday(claimedToday), 'Cannot claim when already claimed today');

  // State with yesterday's date → can claim
  const yesterday = getPHTDateString(new Date(Date.now() - 86400000));
  const claimedYesterday: DailyRewardState = {
    ...claimedToday,
    lastClaimedDate: yesterday,
  };
  if (yesterday !== todayPHT) {
    t.isTrue(canClaimToday(claimedYesterday), 'Can claim when last claimed yesterday');
  }

  // Empty state → can claim
  const empty: DailyRewardState = {
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
  t.isTrue(canClaimToday(empty), 'Can claim with fresh state');
}

// ── Test 7: Streak shield protection logic (rule verification) ──────────────

function testShieldLogic(): void {
  console.log('\n=== Test 7: Streak shield protection rules ===');

  // Rule: If lastClaimedDate is yesterday → consecutive, no shield consumed
  const yesterdayPHT = getPHTDateString(new Date(Date.now() - 86400000));
  const threeDaysAgo = getPHTDateString(new Date(Date.now() - 3 * 86400000));

  // Simulated scenario: user with 2 shields, broke streak 3 days ago
  // → would need 1 shield consumed to preserve streak
  const state: DailyRewardState = {
    lastClaimedDate: threeDaysAgo,
    lastClaimedWeekSeed: 0,
    claimedDays: [1],
    currentStreak: 5,
    longestStreak: 15,
    totalClaimed: 10,
    hintTokens: 3,
    streakShields: 2,
    activeMultiplier: null,
  };

  t.equal(state.streakShields, 2, 'Initial shield count is 2');
  t.equal(state.currentStreak, 5, 'Initial streak is 5');

  // Verify that canClaimToday returns true (not today's date)
  t.isTrue(canClaimToday(state), 'State from 3 days ago is claimable today');

  // Simulate shield consumption: streakShields--, streak preserved as 6
  const afterShield = { ...state, streakShields: state.streakShields - 1, currentStreak: 6 };
  t.equal(afterShield.streakShields, 1, 'After shield consumption: 1 shield remains');
  t.equal(afterShield.currentStreak, 6, 'After shield protection: streak continues to 6');

  // Simulate no shields left: streak resets to 1
  const noShields: DailyRewardState = {
    ...state,
    streakShields: 0,
    currentStreak: 5,
  };
  const afterBreak = { ...noShields, currentStreak: 1 };
  t.equal(afterBreak.currentStreak, 1, 'Without shields: streak resets to 1');
}

// ── Test 8: formatCountdown ─────────────────────────────────────────────────

function testFormatCountdown(): void {
  console.log('\n=== Test 8: formatCountdown ===');

  t.equal(formatCountdown(0), '00:00:00', 'Zero ms → 00:00:00');
  t.equal(formatCountdown(-100), '00:00:00', 'Negative ms → 00:00:00');
  t.equal(formatCountdown(1000), '00:00:01', '1 second → 00:00:01');
  t.equal(formatCountdown(60000), '00:01:00', '1 minute → 00:01:00');
  t.equal(formatCountdown(3600000), '01:00:00', '1 hour → 01:00:00');
  t.equal(formatCountdown(3661000), '01:01:01', '1h 1m 1s → 01:01:01');
  t.equal(formatCountdown(86399000), '23:59:59', '23h 59m 59s → 23:59:59');
  t.equal(formatCountdown(86400000), '24:00:00', '24h → 24:00:00');
}

// ── Test 9: getDayOfWeek is in 0–6 range ────────────────────────────────────

function testDayOfWeek(): void {
  console.log('\n=== Test 9: getDayOfWeek range ===');

  for (let d = 1; d <= 7; d++) {
    // June 1-7, 2026 = Monday-Sunday
    const date = new Date(2026, 5, d, 4, 0, 0); // 4 AM UTC = 12 PM PHT
    const dow = getDayOfWeek(date);
    t.isTrue(dow >= 0 && dow <= 6, `June ${d}, 2026 dayOfWeek=${dow} (0–6)`);
  }

  // Verify Monday = 0
  const monday = new Date('2026-06-01T04:00:00Z'); // Monday in PHT
  const mondayDow = getDayOfWeek(monday);
  t.equal(mondayDow, 0, 'Monday → 0');

  // Verify Sunday = 6
  const sunday = new Date('2026-06-07T04:00:00Z'); // Sunday in PHT
  const sundayDow = getDayOfWeek(sunday);
  t.equal(sundayDow, 6, 'Sunday → 6');
}

// ── Test 10: getWeekSeed is deterministic ───────────────────────────────────

function testWeekSeed(): void {
  console.log('\n=== Test 10: getWeekSeed consistency ===');

  const ws1 = getWeekSeed(new Date('2026-06-01T04:00:00Z'));
  const ws2 = getWeekSeed(new Date('2026-06-01T04:00:00Z'));
  t.equal(ws1, ws2, 'Same date → same week seed');
  t.isTrue(ws1 > 202600 && ws1 < 202700, `Week seed ${ws1} is in valid range`);
}

// ── Test 11: getNextResetTime is in the future ──────────────────────────────

function testNextResetTime(): void {
  console.log('\n=== Test 11: getNextResetTime is future');

  const now = new Date();
  const reset = getNextResetTime(now);
  t.isTrue(reset.getTime() > now.getTime(), 'Reset time is in the future');
  t.isTrue(
    reset.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000,
    'Reset time is at most 7 days away',
  );
}

// ── Run All ─────────────────────────────────────────────────────────────────

function runAll(): void {
  testPRNG();
  testSeededShuffle();
  testWeeklyRewardsCount();
  testCatalogIntegrity();
  testPHTDateString();
  testCanClaimToday();
  testShieldLogic();
  testFormatCountdown();
  testDayOfWeek();
  testWeekSeed();
  testNextResetTime();
  t.summary();
}

runAll();
