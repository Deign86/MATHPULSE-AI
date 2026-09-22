import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("Firestore push-related rules remain deny-by-default and owner scoped", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /match \/users\/\{userId\}\/fcmTokens\/\{tokenId\}/);
  assert.match(rules, /request\.resource\.data\.userId == userId/);
  assert.match(rules, /request\.resource\.data\.token == resource\.data\.token/);
  assert.match(rules, /match \/_pushDeliveries\/\{deliveryId\}/);
  assert.match(rules, /match \/notifications\/\{userId\}\/items\/\{notificationId\}/);
  assert.match(rules, /teacherCreatableNotification\(userId\)/);
  assert.match(rules, /match \/assessmentResults\/\{studentId\}\/attempts\/\{attemptId\}/);
  assert.match(rules, /allow create, update: if isSelf\(studentId\);/);
});

test("User role field is server-guarded against self-escalation (issue #156)", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /roleWriteAllowed\(\)/);
  assert.match(rules, /request\.resource\.data\.role in \['student', 'teacher', 'admin'\]/);
  const block = rules.slice(rules.indexOf("match /users/{userId}"));
  assert.match(block, /roleWriteAllowed/);
});

test("Notification inboxes stay recipient-scoped with teacher-only guard (issue #156)", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /teacherCreatableNotification\(userId\)/);
  assert.match(rules, /teacherOnlyNotificationType\(\)/);
  assert.match(rules, /'risk_alert'/);
});

test("Activities feed rules stay teacher-scoped (issue #163)", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /match \/activities\/\{activityId\}/);
  const block = rules.slice(rules.indexOf("match /activities/{activityId}"));
  assert.match(block, /allow read: if isTeacherOrAdmin\(\);/);
  assert.doesNotMatch(block.split("}")[0], /allow read: if true/);
});
