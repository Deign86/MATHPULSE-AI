import assert from "node:assert/strict";
import test from "node:test";
import { matchesQuizSubmissionIdentity } from "./onQuizSubmitted";

test("quiz submission identity requires studentId and lrn to match caller UID", () => {
  assert.equal(matchesQuizSubmissionIdentity("student-1", "student-1", "student-1"), true);
  assert.equal(matchesQuizSubmissionIdentity("student-1", "victim", "student-1"), false);
  assert.equal(matchesQuizSubmissionIdentity("student-1", "student-1", "victim"), false);
  assert.equal(matchesQuizSubmissionIdentity(undefined, "student-1", "student-1"), false);
});
