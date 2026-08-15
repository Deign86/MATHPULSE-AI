import test from "node:test";
import assert from "node:assert/strict";
import { canTeacherNotifyStudent } from "./index";

test("assignment authorization only permits managed students or student-role admins", () => {
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", { teacherId: "teacher-1" }, "student"), true);
  assert.equal(canTeacherNotifyStudent("teacher-1", "teacher", { teacherId: "teacher-2" }, "student"), false);
  assert.equal(canTeacherNotifyStudent("admin-1", "admin", null, "student"), true);
  assert.equal(canTeacherNotifyStudent("admin-1", "admin", null, "teacher"), false);
});
