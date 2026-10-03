import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { quizBattleGetMatchState, quizBattleSubmitAnswer } from "./quizBattleApi";

const PROJECT_ID = "demo-mathpulse";
const MATCH_ID = "phase3-battle-regression";
const STUDENT_ID = "phase3-student";
const EMULATOR_LOCK_PATH = join(tmpdir(), "mathpulse-demo-emulator-tests.lock");
const EMULATOR_LOCK_TIMEOUT_MS = 30_000;

const withEmulatorLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const deadline = Date.now() + EMULATOR_LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await mkdir(EMULATOR_LOCK_PATH);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("EEXIST")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }
    try {
      return await operation();
    } finally {
      await rmdir(EMULATOR_LOCK_PATH);
    }
  }
  throw new Error(`Timed out acquiring shared Firebase emulator lock after ${EMULATOR_LOCK_TIMEOUT_MS}ms`);
};

const requireFirestoreEmulator = (): FirebaseFirestore.Firestore => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Firestore emulator is required; tests must not be skipped");
  const app = admin.apps[0] ?? admin.initializeApp({ projectId: PROJECT_ID });
  return app.firestore();
};

test("production submit callable persists one answer, replays duplicates, and rejects stale rounds", async (t: TestContext) => {
  if ((process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT) !== PROJECT_ID) {
    t.skip("Quiz Battle emulator tests require the demo-mathpulse project identity");
    return;
  }
  await withEmulatorLock(async () => {
  const db = requireFirestoreEmulator();
  const matchRef = db.collection("quizBattleMatches").doc(MATCH_ID);
  const keysRef = matchRef.collection("server").doc("roundKeys");
  await Promise.all([
    matchRef.delete(),
    keysRef.delete(),
    db.collection("studentBattleStats").doc(STUDENT_ID).delete(),
    db.collection("users").doc(STUDENT_ID).delete(),
  ]);
  await db.collection("users").doc(STUDENT_ID).set({ role: "student", totalXP: 0, currentXP: 0 });
  const now = Date.now();
  await matchRef.set({
    status: "in_progress",
    mode: "bot",
    playerAId: STUDENT_ID,
    playerBId: "bot",
    subjectId: "gen-math",
    topicId: "functions",
    difficulty: "easy",
    rounds: 2,
    currentRound: 1,
    timePerQuestionSec: 30,
    roundStartedAtMs: now,
    roundDeadlineAtMs: now + 30_000,
    questions: [{ roundNumber: 1, questionId: "phase3-q1", choices: ["A", "B", "C", "D"] }],
    roundResults: [],
    scoreA: 0,
    scoreB: 0,
  });
  await keysRef.set({ keys: [1], difficulties: ["easy"] });

  const call = (roundNumber: number) => quizBattleSubmitAnswer.run(
    { matchId: MATCH_ID, roundNumber, selectedOptionIndex: 1, responseMs: 500 },
    {
      auth: { uid: STUDENT_ID, token: { role: "student" } },
      // SAFETY: callable.run reads auth claims only; this test invokes it in-process, not through HTTP.
      rawRequest: {} as functions.https.Request,
    },
  );

  const accepted = await call(1);
  assert.equal(accepted.success, true);
  assert.equal(accepted.duplicate, false);
  const replay = await call(1);
  assert.equal(replay.duplicate, true);
  assert.equal((await matchRef.get()).data()?.roundResults.length, 1);
  await assert.rejects(call(3), (error: Error) => /Expected round 2, received 3/.test(error.message));

  const expiredId = "phase3-battle-expired-round";
  const expiredRef = db.collection("quizBattleMatches").doc(expiredId);
  await expiredRef.set({
    status: "in_progress",
    mode: "bot",
    playerAId: STUDENT_ID,
    playerBId: "bot",
    subjectId: "gen-math",
    topicId: "functions",
    difficulty: "easy",
    rounds: 1,
    currentRound: 1,
    timePerQuestionSec: 30,
    roundStartedAtMs: Date.now() - 31_000,
    roundDeadlineAtMs: Date.now() - 1_000,
    questions: [{ roundNumber: 1, questionId: "phase3-expired-q1", choices: ["A", "B", "C", "D"] }],
    roundResults: [],
    scoreA: 0,
    scoreB: 0,
  });
  await expiredRef.collection("server").doc("roundKeys").set({ keys: [1], difficulties: ["easy"] });
  const getExpiredState = () => quizBattleGetMatchState.run(
    { matchId: expiredId },
    {
      auth: { uid: STUDENT_ID, token: { role: "student" } },
      // SAFETY: callable.run reads auth claims only; this test invokes it in-process, not through HTTP.
      rawRequest: {} as functions.https.Request,
    },
  );
  const expiredState = await getExpiredState();
  assert.equal(expiredState.match.status, "completed");
  assert.equal(expiredState.match.roundResults.length, 1);

  const today = new Date().toISOString().slice(0, 10);
  const finalization = async (id: string, battleXPEarnedToday: number, battleXPEarnedDate: string, expected: number) => {
    const completedRef = db.collection("quizBattleMatches").doc(id);
    await db.collection("studentBattleStats").doc(STUDENT_ID).set({
      battleXPEarnedToday,
      battleXPEarnedDate,
      matchesPlayed: 0,
    });
    await completedRef.set({
      status: "completed",
      mode: "bot",
      playerAId: STUDENT_ID,
      playerBId: "bot",
      subjectId: "gen-math",
      topicId: "functions",
      difficulty: "easy",
      rounds: 1,
      currentRound: 1,
      timePerQuestionSec: 30,
      scoreA: 1,
      scoreB: 0,
      roundResults: [],
    });
    await assert.rejects(
      quizBattleSubmitAnswer.run(
        { matchId: id, roundNumber: 1, selectedOptionIndex: 0 },
        {
          auth: { uid: STUDENT_ID, token: { role: "student" } },
          // SAFETY: callable.run reads auth claims only; this test invokes it in-process, not through HTTP.
          rawRequest: {} as functions.https.Request,
        },
      ),
    );
    const persistedStats = (await db.collection("studentBattleStats").doc(STUDENT_ID).get()).data();
    assert.equal(persistedStats?.battleXPEarnedToday, expected);
    assert.equal(persistedStats?.battleXPEarnedDate, today);

    const persistedMatch = (await completedRef.get()).data();
    const userRef = db.collection("users").doc(STUDENT_ID);
    const historyRef = db.collection("quizBattleHistory").doc(`${id}_${STUDENT_ID}`);
    const activityRef = db.collection("xpActivities").doc(`quizbattle_${id}_${STUDENT_ID}`);
    const beforeReplay = {
      user: (await userRef.get()).data(),
      stats: persistedStats,
      match: persistedMatch,
      history: (await historyRef.get()).data(),
      activity: (await activityRef.get()).data(),
    };
    assert.ok(beforeReplay.history, "finalization should persist battle history");
    assert.ok(beforeReplay.activity, "finalization should persist XP activity");
    await assert.rejects(
      quizBattleSubmitAnswer.run(
        { matchId: id, roundNumber: 1, selectedOptionIndex: 0 },
        {
          auth: { uid: STUDENT_ID, token: { role: "student" } },
          // SAFETY: callable.run reads auth claims only; this test invokes it in-process, not through HTTP.
          rawRequest: {} as functions.https.Request,
        },
      ),
    );
    assert.deepEqual({
      user: (await userRef.get()).data(),
      stats: (await db.collection("studentBattleStats").doc(STUDENT_ID).get()).data(),
      match: (await completedRef.get()).data(),
      history: (await historyRef.get()).data(),
      activity: (await activityRef.get()).data(),
    }, beforeReplay);
  };
  await finalization("phase3-xp-cap", 490, today, 500);
  await finalization("phase3-xp-rollover", 500, "2000-01-01", 60);
  });
});
