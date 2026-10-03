import assert from "node:assert/strict";
import test from "node:test";
import { matchesQuizSubmissionIdentity } from "./onQuizSubmitted";

test("quiz mastery and XP input is accepted only for caller-owned student identity", () => {
  assert.equal(matchesQuizSubmissionIdentity("student-1", "student-1", "student-1"), true);
  assert.equal(matchesQuizSubmissionIdentity("student-1", "student-1", "student-2"), false);
  assert.equal(matchesQuizSubmissionIdentity("student-1", "student-2", "student-1"), false);
  assert.equal(matchesQuizSubmissionIdentity(undefined, "student-1", "student-1"), false);
});
