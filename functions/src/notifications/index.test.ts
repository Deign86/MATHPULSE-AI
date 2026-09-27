import test from "node:test";
import assert from "node:assert/strict";
import { canTeacherNotifyStudent } from "./index";

test("assignment authorization requires trusted class-section ownership", () => {
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", { ownerTeacherId: "teacher-1", studentUids: ["student-1"] }, "student", "student-1"), true);
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", { ownerTeacherId: "teacher-2", studentUids: ["student-1"] }, "student", "student-1"), false);
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", { ownerTeacherId: "teacher-1", studentUids: ["student-2"] }, "student", "student-1"), false);
  assert.equal(canTeacherNotifyStudent("admin-1", "admin", null, "student"), true);
  assert.equal(canTeacherNotifyStudent("admin-1", "admin", null, "teacher"), false);
});
