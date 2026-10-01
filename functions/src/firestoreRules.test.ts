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

test("Quiz A-then-B recipient grants stay additive and assignment completion is constrained", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  const quizBlock = rules.slice(
    rules.indexOf("match /generatedQuizzes/{docId}"),
    rules.indexOf("match /quizAssignments/{docId}"),
  );
  assert.match(quizBlock, /request\.auth\.uid in resource\.data\.recipientUids/);
  assert.doesNotMatch(quizBlock, /assignedTo/);
  assert.match(quizBlock, /request\.resource\.data\.teacherId == resource\.data\.teacherId/);
  assert.match(quizBlock, /allow create: if isAdmin\(\) \|\| \(isTeacher\(\) && isClaimingOwner\('teacherId'\)\)/);

  const assignments = rules.slice(
    rules.indexOf("match /quizAssignments/{docId}"),
    rules.indexOf("match /attendance/{docId}"),
  );
  assert.match(assignments, /allow create: if isAdmin\(\) \|\| \(isTeacher\(\) && isClaimingOwner\('teacherId'\)\)/);
  assert.match(assignments, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)/);
  assert.match(assignments, /hasOnly\(\['status', 'score', 'completedAt'\]\)/);
  assert.match(assignments, /resource\.data\.status == 'pending'/);
  assert.match(assignments, /request\.resource\.data\.status == 'completed'/);
  assert.match(assignments, /request\.resource\.data\.completedAt == request\.time/);
  assert.match(assignments, /request\.resource\.data\.score >= 0/);
  assert.match(assignments, /request\.resource\.data\.score <= 100/);
  assert.match(assignments, /allow delete: if resource\.data\.status != 'completed'/);
  assert.match(assignments, /resource\.data\.status != 'completed'/);

  const backfill = readFileSync(
    resolve(__dirname, "../../scripts/backfill-quiz-assignment-recipients.ts"),
    "utf8",
  );
  assert.match(backfill, /FieldValue\.arrayUnion\(uid\)/);
  assert.match(backfill, /quizAssignments/);
  assert.match(backfill, /metadata\.assignedTo/);
});

test("Quiz results and submissions require both client-created identities to match the caller", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  const quizResults = rules.slice(
    rules.indexOf("match /quizResults/{docId}"),
    rules.indexOf("match /quizSubmissions/{docId}"),
  );
  const quizSubmissions = rules.slice(
    rules.indexOf("match /quizSubmissions/{docId}"),
    rules.indexOf("match /generatedQuizzes/{docId}"),
  );
  for (const block of [quizResults, quizSubmissions]) {
    assert.match(block, /allow create: if isSignedIn\(\)/);
    assert.match(block, /request\.resource\.data\.studentId == request\.auth\.uid/);
    assert.match(block, /request\.resource\.data\.lrn == request\.auth\.uid/);
  }
});

test("Quiz assignment recipient backfill reports orphans and continues with valid quizzes", () => {
  const backfill = readFileSync(
    resolve(__dirname, "../../scripts/backfill-quiz-assignment-recipients.ts"),
    "utf8",
  );
  assert.match(backfill, /const quizIds = new Set\(quizzes\.docs\.map\(\(quiz\) => quiz\.id\)\)/);
  assert.match(backfill, /if \(!quizIds\.has\(quizId\)\)/);
  assert.match(backfill, /orphans \+= 1/);
  assert.match(backfill, /console\.warn\(.*orphan assignment=/);
  assert.match(backfill, /continue;/);
  assert.match(backfill, /recipient_updates=\$\{writes\} orphans=\$\{orphans\}/);
  assert.ok(backfill.indexOf("if (!quizIds.has(quizId))") < backfill.indexOf("recipients.add(lrn)"));
  assert.match(backfill, /for \(const quiz of quizzes\.docs\)/);
  assert.match(backfill, /FieldValue\.arrayUnion\(uid\)/);
});

test("Client quiz completion payload satisfies the create and pending-to-completed rule conditions", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  const quizSubmissions = rules.slice(
    rules.indexOf("match /quizSubmissions/{docId}"),
    rules.indexOf("match /generatedQuizzes/{docId}"),
  );
  const assignments = rules.slice(
    rules.indexOf("match /quizAssignments/{docId}"),
    rules.indexOf("match /attendance/{docId}"),
  );
  const quizService = readFileSync(resolve(__dirname, "../../src/services/quizService.ts"), "utf8");
  assert.match(quizService, /const submissionPayload = \(submissionId: string\) => \(\{[\s\S]*?studentId: studentUid,[\s\S]*?lrn: studentUid,/);

  const callerUid = "student-uid";
  const clientPayload = {
    submissionId: "submission-1",
    studentId: callerUid,
    lrn: callerUid,
    quizId: "quiz-1",
    generatedQuizId: "quiz-1",
    subject: "Math",
    source: "ai_generated",
    score: 90,
    xpEarned: 20,
    totalTime: 30,
    answers: [],
    correctCount: 0,
    totalQuestions: 0,
    questionBreakdown: [],
    submittedAt: "server timestamp",
  };
  const identityFields = [...quizSubmissions.matchAll(/request\.resource\.data\.(\w+) == request\.auth\.uid/g)]
    .map((match) => match[1]);
  assert.ok(quizSubmissions.includes("allow create: if isSignedIn()"));
  assert.deepEqual(identityFields, ["studentId", "lrn"]);
  assert.equal(clientPayload.studentId, callerUid);
  assert.equal(clientPayload.lrn, callerUid);
  const oldLrnOnlyPayload: { studentId?: string; lrn: string } = { lrn: callerUid };
  assert.equal(identityFields.every((field) => field === "studentId"
    ? oldLrnOnlyPayload.studentId === callerUid
    : oldLrnOnlyPayload.lrn === callerUid), false);

  const assignmentUpdate = assignments.slice(assignments.indexOf("allow update:"), assignments.indexOf("allow delete:"));
  assert.match(assignmentUpdate, /isSelf\(resource\.data\.lrn\)/);
  assert.match(assignmentUpdate, /resource\.data\.status != 'completed'/);
  assert.match(assignmentUpdate, /resource\.data\.status == 'pending'/);
  assert.match(assignmentUpdate, /request\.resource\.data\.status == 'completed'/);
  assert.match(assignmentUpdate, /hasOnly\(\['status', 'score', 'completedAt'\]\)/);
  assert.match(assignmentUpdate, /request\.resource\.data\.completedAt == request\.time/);
  assert.match(assignmentUpdate, /request\.resource\.data\.score >= 0/);
  assert.match(assignmentUpdate, /request\.resource\.data\.score <= 100/);

  const existingAssignment = { lrn: callerUid, status: "pending" };
  const assignmentPatch = { status: "completed", score: clientPayload.score, completedAt: "request.time" };
  const changedKeys = Object.keys(assignmentPatch);
  assert.equal(existingAssignment.lrn, callerUid);
  assert.equal(existingAssignment.status, "pending");
  assert.equal(assignmentPatch.status, "completed");
  assert.ok(assignmentPatch.score >= 0 && assignmentPatch.score <= 100);
  assert.ok(changedKeys.every((key) => ["status", "score", "completedAt"].includes(key)));
  assert.equal(assignmentPatch.completedAt, "request.time");
});
