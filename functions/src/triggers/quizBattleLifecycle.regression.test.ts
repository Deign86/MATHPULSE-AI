import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("heartbeat, forfeit, and rematch handlers retain participant and state guards", () => {
  const apiSource = readFileSync(resolve(__dirname, "../../src/triggers/quizBattleApi.ts"), "utf8");
  assert.match(apiSource, /Queue heartbeat resourceId must match the authenticated student\./);
  assert.match(apiSource, /You are not a participant of this match\./);
  assert.match(apiSource, /This match can no longer be forfeited\./);
  assert.match(apiSource, /Only the initiating student can request rematch in this version\./);
  assert.match(apiSource, /Rematch is only available after match completion\./);
});
