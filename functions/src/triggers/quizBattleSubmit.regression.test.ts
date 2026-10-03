import assert from "node:assert/strict";
import test from "node:test";
import { __quizBattleTestUtils } from "./quizBattleApi";

test("answer choice shuffling preserves the correct answer through a full submit payload", () => {
  const shuffle = __quizBattleTestUtils.shuffleChoicesPreservingCorrect;
  const originalChoices = ["10", "20", "30", "40"];
  for (let seed = 0; seed < 12; seed += 1) {
    const shuffled = shuffle(originalChoices, 2, (_min, max) => (seed * 3) % (max + 1));
    assert.equal(shuffled.choices.length, originalChoices.length);
    assert.equal(shuffled.choices[shuffled.correctOptionIndex], "30");
  }
});
