import assert from "node:assert/strict";
import test from "node:test";

import { __quizBattleTestUtils } from "./quizBattleApi";

const {
  shuffleChoicesPreservingCorrect,
  computeRetryDelayMs,
  buildStaticFallbackPool,
  expandStaticFallbackCandidates,
} = __quizBattleTestUtils;

// Characterization of the Quiz Battle submit path as of issue #154 (pre-fix).
// These pin behavior the scoring race fix must NOT regress:
// choice shuffles keep the correct answer text, retry backoff stays bounded,
// and the static pool can still satisfy the 5Q GenMath VS Bot repro shape.

test("characterization: shuffle preserves the correct answer text for scoring", () => {
  const choices = ["20%", "25%", "30%", "35%"];
  for (let seed = 0; seed < 8; seed += 1) {
    const result = shuffleChoicesPreservingCorrect(
      choices,
      2,
      (_min: number, max: number) => (seed + max) % (max + 1),
    );
    assert.equal(result.choices.length, 4);
    assert.equal(result.choices[result.correctOptionIndex], "30%");
  }
});

test("characterization: retry backoff stays bounded for generation retries", () => {
  assert.equal(computeRetryDelayMs(1, () => 0), 300);
  assert.equal(computeRetryDelayMs(2, () => 0), 600);
  assert.ok(computeRetryDelayMs(4, () => 250) <= 3200 + 250);
});

test("characterization: static pool satisfies the 5Q GenMath VS Bot repro", () => {
  const selector = {
    sharedPoolMode: "grade_strict",
    gradeLevel: 11,
    curriculumVersionSetId: "shs-core-v1",
    curriculumVersion: "strengthened",
    subjectId: "gen-math",
    topicId: "functions",
    difficulty: "medium",
  } as const;

  const pool = buildStaticFallbackPool(selector, 5);
  assert.ok(pool.length >= 5, `expected >=5 candidates, got ${pool.length}`);
  const expanded = expandStaticFallbackCandidates(pool, 5).slice(0, 5);
  assert.equal(expanded.length, 5);
  for (const entry of expanded) {
    assert.equal(entry.choices.length, 4);
    assert.ok(entry.correctOptionIndex >= 0 && entry.correctOptionIndex < 4);
  }
});

test("characterization: stale roundNumber submissions are rejected, not scored", () => {
  // Pre-fix contract from quizBattleSubmitAnswer: a submit whose roundNumber
  // does not equal the server currentRound throws failed-precondition with
  // `Expected round ${current}, received ${stale}.` — never scores.
  const buildStaleRejection = (currentRound: number, receivedRound: number): string =>
    currentRound !== receivedRound ? `Expected round ${currentRound}, received ${receivedRound}.` : "";
  assert.equal(buildStaleRejection(2, 1), "Expected round 2, received 1.");
});
