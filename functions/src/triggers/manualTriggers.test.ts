import assert from "node:assert/strict";
import test from "node:test";
import type { QuizSubmissionData } from "../automations/quizProcessor";
import { reprocessManualQuizSubmission } from "./manualTriggers";

test("authorized manual quiz path invokes the processor with a trusted staff flag", async () => {
  let processedSubmission: QuizSubmissionData | undefined;
  await reprocessManualQuizSubmission("result-1", {
    lrn: "student-1",
    subject: "General Mathematics",
    score: 72,
  }, async (submission) => { processedSubmission = submission; });

  assert.ok(processedSubmission);
  assert.equal(processedSubmission.authorizedStaffOperation, true);
  assert.equal(processedSubmission.lrn, "student-1");
  assert.equal(processedSubmission.quizId, "result-1");
  assert.equal(processedSubmission.subject, "General Mathematics");
  assert.equal(processedSubmission.score, 72);
  assert.equal(processedSubmission.totalQuestions, 0);
});
