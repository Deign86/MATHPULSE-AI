import assert from "node:assert/strict";
import test from "node:test";
import { canTeacherNotifyStudent } from "./index";

test("teacher notification authorization fails closed for stale class membership", () => {
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", {
    ownerTeacherId: "teacher-1",
    studentUids: ["student-2"],
  }, "student", "student-1"), false);
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", {
    ownerTeacherId: "teacher-1",
    studentUids: ["student-1"],
  }, "student", "student-1"), true);
});
