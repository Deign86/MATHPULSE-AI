import assert from "node:assert/strict";
import test from "node:test";

import { __quizBattleTestUtils } from "./quizBattleApi";

const {
  buildBattleRoundId,
  parseBattleRoundId,
  isTimeoutSubmit,
  resolveStaleRoundRecovery,
} = __quizBattleTestUtils;

// Issue #154: server-authoritative roundId + idempotent timeout submits.
// RED before the fix (helpers unexported), GREEN after.

test("buildBattleRoundId binds match + round + start time", () => {
  assert.equal(
    buildBattleRoundId("match-1", 2, 1700000000000),
    "match-1#r2#1700000000000",
  );
  assert.equal(buildBattleRoundId("", 2, 1700000000000), "");
  assert.equal(buildBattleRoundId("match-1", 0, 1700000000000), "");
  assert.equal(buildBattleRoundId("match-1", 2, 0), "");
});

test("parseBattleRoundId round-trips buildBattleRoundId", () => {
  const roundId = buildBattleRoundId("match-1", 2, 1700000000000);
  assert.deepEqual(parseBattleRoundId(roundId), {
    matchId: "match-1",
    roundNumber: 2,
    roundStartedAtMs: 1700000000000,
  });
  assert.equal(parseBattleRoundId(""), null);
  assert.equal(parseBattleRoundId("not-a-round-id"), null);
  assert.equal(parseBattleRoundId("match-1#r2#not-a-time"), null);
});

test("isTimeoutSubmit flags null selections as timer expiries", () => {
  assert.equal(isTimeoutSubmit(null), true);
  assert.equal(isTimeoutSubmit(0), false);
  assert.equal(isTimeoutSubmit(2), false);
});

test("resolveStaleRoundRecovery replays resolved rounds, resyncs live ones", () => {
  assert.equal(
    resolveStaleRoundRecovery({
      expectedRoundId: "match-1#r3#1700000000000",
      receivedRoundId: "match-1#r2#1699999990000",
      roundAlreadyResolved: true,
    }),
    "idempotent-replay",
  );
  assert.equal(
    resolveStaleRoundRecovery({
      expectedRoundId: "match-1#r3#1700000000000",
      receivedRoundId: "match-1#r2#1699999990000",
      roundAlreadyResolved: false,
    }),
    "resync-required",
  );
});
