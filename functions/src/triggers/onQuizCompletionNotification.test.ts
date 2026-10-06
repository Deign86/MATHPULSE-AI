import assert from "node:assert/strict";
import test from "node:test";
import { assignmentTeacherId, enrollmentTeacherId } from "./onQuizCompletionNotification";

test("assigned quiz recipient comes only from matching server-side assignment", () => {
  assert.equal(assignmentTeacherId({ lrn: "student-1", teacherId: "teacher-1" }, "student-1"), "teacher-1");
  assert.equal(assignmentTeacherId({ lrn: "student-2", teacherId: "forged-teacher" }, "student-1"), null);
  assert.equal(assignmentTeacherId({ lrn: "student-1", teacherId: 42 }, "student-1"), null);
});

test("lesson quiz recipient comes from trusted class-section enrollment", () => {
  assert.equal(enrollmentTeacherId({ ownerTeacherId: "enrolled-teacher", studentUids: ["student-1"] }, "student-1"), "enrolled-teacher");
  assert.equal(enrollmentTeacherId({ ownerTeacherId: "forged-teacher", studentUids: ["student-2"] }, "student-1"), null);
  assert.equal(enrollmentTeacherId({ teacherId: "untrusted-teacher", studentUids: ["student-1"] }, "student-1"), null);
  assert.equal(enrollmentTeacherId(undefined, "student-1"), null);
});
