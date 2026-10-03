import assert from "node:assert/strict";
import test from "node:test";
import { handleDiagnosticCompleteCreate } from "./onDiagnosticComplete";

type DiagnosticTriggerInput = Parameters<typeof handleDiagnosticCompleteCreate>[0];
type UpdatePayload = Parameters<DiagnosticTriggerInput["updateSnapshot"]>[0];
type ProcessPayload = Parameters<DiagnosticTriggerInput["processDiagnostic"]>[0];

test("diagnostic completion normalizes keyed scores and is idempotent", async () => {
  const updates: UpdatePayload[] = [];
  const processed: ProcessPayload[] = [];
  const updateSnapshot: DiagnosticTriggerInput["updateSnapshot"] = async (payload) => { updates.push(payload); };
  const processDiagnostic: DiagnosticTriggerInput["processDiagnostic"] = async (payload) => { processed.push(payload); };

  await handleDiagnosticCompleteCreate({
    lrn: "student-1",
    diagnosticData: { results: { algebra: "82", geometry: 73 } },
    updateSnapshot,
    processDiagnostic,
  });
  await handleDiagnosticCompleteCreate({
    lrn: "student-1",
    diagnosticData: { processed: true, results: { algebra: 0 } },
    updateSnapshot,
    processDiagnostic,
  });

  assert.deepEqual(processed, [{
    lrn: "student-1",
    results: [{ subject: "algebra", score: 82 }, { subject: "geometry", score: 73 }],
    gradeLevel: "Grade 11",
    questionBreakdown: undefined,
    topicBreakdown: undefined,
    workflowMode: undefined,
    assessmentType: undefined,
  }]);
  assert.equal(updates.length, 2);
  assert.equal(updates[1]?.processed, true);
});
