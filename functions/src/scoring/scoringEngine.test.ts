import assert from "node:assert/strict";
import test from "node:test";

import {
  computeRoundScoreBreakdown,
  computeMatchXP,
  DAILY_BATTLE_XP_CAP,
  XP_CAP_PER_BATTLE,
} from "./scoringEngine";

// ---------------------------------------------------------------------------
// computeRoundScoreBreakdown
// ---------------------------------------------------------------------------

test("easy difficulty: base points with no streak, no speed bonus", () => {
  const roundStartedAtMs = 0;
  const roundDeadlineAtMs = 30_000;
  // Answer exactly at deadline → 0 speed bonus
  const result = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: 30_000,
    roundStartedAtMs,
    roundDeadlineAtMs,
  });

  assert.equal(result.difficultyMultiplier, 1.0);
  assert.equal(result.streakMultiplier, 1.0); // consecutive 1 → multiplier = 1 + 0.10*(1-1) = 1.0
  assert.equal(result.speedBonus, 0);
  assert.equal(result.totalPointsAwarded, 100); // round(100 * 1.0 * 1.0) + 0
  assert.equal(result.streakAtAnswer, 1);
  assert.equal(result.basePoints, 100);
});

test("medium difficulty multiplier applied correctly", () => {
  const roundStartedAtMs = 0;
  const roundDeadlineAtMs = 30_000;
  const result = computeRoundScoreBreakdown({
    difficulty: "medium",
    consecutiveCorrect: 1,
    responseMs: 30_000,
    roundStartedAtMs,
    roundDeadlineAtMs,
  });

  assert.equal(result.difficultyMultiplier, 1.15);
  assert.equal(result.totalPointsAwarded, 115); // round(100 * 1.15 * 1.0) + 0
});

test("hard difficulty multiplier applied correctly", () => {
  const roundStartedAtMs = 0;
  const roundDeadlineAtMs = 30_000;
  const result = computeRoundScoreBreakdown({
    difficulty: "hard",
    consecutiveCorrect: 1,
    responseMs: 30_000,
    roundStartedAtMs,
    roundDeadlineAtMs,
  });

  assert.equal(result.difficultyMultiplier, 1.3);
  assert.equal(result.totalPointsAwarded, 130); // round(100 * 1.30 * 1.0) + 0
});

test("streak multiplier grows 10% per additional consecutive correct, capped at 1.72", () => {
  const base = { difficulty: "easy" as const, responseMs: 30_000, roundStartedAtMs: 0, roundDeadlineAtMs: 30_000 };
  const approxEqual = (a: number, b: number) => Math.abs(a - b) < 1e-9;

  // streak 1: 1.00 + 0.10*(1-1) = 1.00
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 1 }).streakMultiplier, 1.0));
  // streak 2: 1.00 + 0.10*(2-1) = 1.10
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 2 }).streakMultiplier, 1.1));
  // streak 3: 1.00 + 0.10*(3-1) = 1.20
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 3 }).streakMultiplier, 1.2));
  // streak 8: 1.00 + 0.10*(8-1) ≈ 1.70
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 8 }).streakMultiplier, 1.7));
  // streak 9: 1.00 + 0.10*(9-1) = 1.80, but capped at 1.72
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 9 }).streakMultiplier, 1.72));
  // Very large streak still capped
  assert.ok(approxEqual(computeRoundScoreBreakdown({ ...base, consecutiveCorrect: 100 }).streakMultiplier, 1.72));
});

test("speed bonus is 20 when answered instantly (responseMs = 0)", () => {
  const result = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: 0,
    roundStartedAtMs: 0,
    roundDeadlineAtMs: 30_000,
  });

  assert.equal(result.speedBonus, 20);
});

test("speed bonus is 0 when answered at the deadline", () => {
  const result = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: 30_000,
    roundStartedAtMs: 0,
    roundDeadlineAtMs: 30_000,
  });

  assert.equal(result.speedBonus, 0);
});

test("speed bonus is clamped to [0, 20]", () => {
  // responseMs > roundDeadlineAtMs should still yield 0, not negative
  const result = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: 40_000,
    roundStartedAtMs: 0,
    roundDeadlineAtMs: 30_000,
  });

  assert.equal(result.speedBonus, 0);
  assert.ok(result.speedBonus >= 0);
  assert.ok(result.speedBonus <= 20);
});

test("serverValidatedLatencyMs is clamped to [0, totalTimeMs]", () => {
  const totalTimeMs = 30_000;
  const resultNegative = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: -500,
    roundStartedAtMs: 0,
    roundDeadlineAtMs: totalTimeMs,
  });
  assert.equal(resultNegative.serverValidatedLatencyMs, 0);

  const resultOver = computeRoundScoreBreakdown({
    difficulty: "easy",
    consecutiveCorrect: 1,
    responseMs: 99_999,
    roundStartedAtMs: 0,
    roundDeadlineAtMs: totalTimeMs,
  });
  assert.equal(resultOver.serverValidatedLatencyMs, totalTimeMs);
});

// ---------------------------------------------------------------------------
// computeMatchXP
// ---------------------------------------------------------------------------

test("win outcome awards 60 base XP", () => {
  const { xpBreakdown, actualXPAwarded } = computeMatchXP({
    outcome: "win",
    totalPointsEarned: 0,
    battleXPEarnedToday: 0,
  });

  assert.equal(xpBreakdown.baseMatchXP, 60);
  assert.equal(xpBreakdown.performanceXP, 0);
  assert.equal(actualXPAwarded, 60);
  assert.equal(xpBreakdown.scoringVersion, "v2");
});

test("draw outcome awards 40 base XP", () => {
  const { xpBreakdown } = computeMatchXP({
    outcome: "draw",
    totalPointsEarned: 0,
    battleXPEarnedToday: 0,
  });

  assert.equal(xpBreakdown.baseMatchXP, 40);
});

test("loss outcome awards 20 base XP", () => {
  const { xpBreakdown } = computeMatchXP({
    outcome: "loss",
    totalPointsEarned: 0,
    battleXPEarnedToday: 0,
  });

  assert.equal(xpBreakdown.baseMatchXP, 20);
});

test("performance XP is 8% of totalPointsEarned (floored)", () => {
  const { xpBreakdown } = computeMatchXP({
    outcome: "win",
    totalPointsEarned: 500,
    battleXPEarnedToday: 0,
  });

  assert.equal(xpBreakdown.performanceXP, 40); // floor(500 * 0.08) = 40
});

test("XP capped per match at XP_CAP_PER_BATTLE", () => {
  // win (60) + lots of performance XP should be capped at 140
  const { xpBreakdown, actualXPAwarded } = computeMatchXP({
    outcome: "win",
    totalPointsEarned: 10_000, // performance = 800, uncapped = 860
    battleXPEarnedToday: 0,
  });

  assert.equal(actualXPAwarded, XP_CAP_PER_BATTLE);
  assert.equal(xpBreakdown.totalXPAwarded, XP_CAP_PER_BATTLE);
});

test("daily cap: no XP awarded when daily cap already exhausted", () => {
  const { actualXPAwarded } = computeMatchXP({
    outcome: "win",
    totalPointsEarned: 0,
    battleXPEarnedToday: DAILY_BATTLE_XP_CAP,
  });

  assert.equal(actualXPAwarded, 0);
});

test("daily cap: partial XP when close to daily cap", () => {
  const remainingCap = 30;
  const { actualXPAwarded } = computeMatchXP({
    outcome: "win",
    totalPointsEarned: 0,
    battleXPEarnedToday: DAILY_BATTLE_XP_CAP - remainingCap, // 470 earned today → 30 left
  });

  // win is 60 base XP, but only 30 remain for the day
  assert.equal(actualXPAwarded, remainingCap);
});

test("totalPointsEarned is reflected in breakdown", () => {
  const { xpBreakdown } = computeMatchXP({
    outcome: "loss",
    totalPointsEarned: 250,
    battleXPEarnedToday: 0,
  });

  assert.equal(xpBreakdown.totalPointsEarned, 250);
});
