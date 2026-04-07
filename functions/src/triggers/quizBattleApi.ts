import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const ALLOWED_SUBJECT_IDS = new Set(["gen-math", "stats-prob", "pre-calc", "basic-calc"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard", "adaptive"]);
const ALLOWED_QUEUE_TYPES = new Set(["public_matchmaking", "private_room"]);
const ALLOWED_MODES = new Set(["online", "bot"]);

interface NormalizedBattleSetup {
  mode: "online" | "bot";
  subjectId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  rounds: number;
  timePerQuestionSec: number;
  queueType: "public_matchmaking" | "private_room";
  botDifficulty: "easy" | "medium" | "hard" | "adaptive";
  adaptiveBot: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value.trim() : fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * chars.length);
    code += chars[idx];
  }
  return code;
};

const normalizeSetup = (rawInput: unknown): NormalizedBattleSetup => {
  const input = isRecord(rawInput) ? rawInput : {};

  const modeRaw = asString(input.mode, "online");
  const mode = ALLOWED_MODES.has(modeRaw) ? (modeRaw as "online" | "bot") : "online";

  const subjectIdRaw = asString(input.subjectId, "gen-math");
  const subjectId = ALLOWED_SUBJECT_IDS.has(subjectIdRaw) ? subjectIdRaw : "gen-math";

  const difficultyRaw = asString(input.difficulty, "medium");
  const difficulty = (["easy", "medium", "hard"] as const).includes(difficultyRaw as "easy" | "medium" | "hard")
    ? (difficultyRaw as "easy" | "medium" | "hard")
    : "medium";

  const queueTypeRaw = asString(input.queueType, "public_matchmaking");
  const queueType = ALLOWED_QUEUE_TYPES.has(queueTypeRaw)
    ? (queueTypeRaw as "public_matchmaking" | "private_room")
    : "public_matchmaking";

  const botDifficultyRaw = asString(input.botDifficulty, "medium");
  const botDifficulty = ALLOWED_DIFFICULTIES.has(botDifficultyRaw)
    ? (botDifficultyRaw as "easy" | "medium" | "hard" | "adaptive")
    : "medium";

  const rounds = Math.max(3, Math.min(20, Math.floor(asNumber(input.rounds, 5))));
  const timePerQuestionSec = Math.max(10, Math.min(180, Math.floor(asNumber(input.timePerQuestionSec, 30))));

  const topicId = asString(input.topicId, "");
  const adaptiveBot = asBoolean(input.adaptiveBot, false);

  if (!topicId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "topicId is required for Quiz Battle setup.",
    );
  }

  if (mode === "bot" && queueType !== "public_matchmaking") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Bot battles do not support private_room queue type.",
    );
  }

  return {
    mode,
    subjectId,
    topicId,
    difficulty,
    rounds,
    timePerQuestionSec,
    queueType,
    botDifficulty,
    adaptiveBot,
  };
};

const requireStudentUid = async (
  context: functions.https.CallableContext,
): Promise<string> => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const uid = context.auth.uid;
  const roleClaim = context.auth.token?.role;

  if (typeof roleClaim === "string") {
    if (roleClaim !== "student") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only students can access Quiz Battle endpoints.",
      );
    }
    return uid;
  }

  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "student") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only students can access Quiz Battle endpoints.",
    );
  }

  return uid;
};

export const quizBattleJoinQueue = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const setup = normalizeSetup(data?.setup);
  const db = admin.firestore();

  await db.collection("quizBattleQueue").doc(studentId).set(
    {
      studentId,
      mode: setup.mode,
      queueType: setup.queueType,
      subjectId: setup.subjectId,
      topicId: setup.topicId,
      difficulty: setup.mode === "bot" ? setup.botDifficulty : setup.difficulty,
      rounds: setup.rounds,
      timePerQuestionSec: setup.timePerQuestionSec,
      status: "searching",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    success: true,
    status: "queued",
    queueEntryId: studentId,
  };
});

export const quizBattleLeaveQueue = functions.https.onCall(async (_data, context) => {
  const studentId = await requireStudentUid(context);
  const queueRef = admin.firestore().collection("quizBattleQueue").doc(studentId);

  const queueDoc = await queueRef.get();
  if (!queueDoc.exists) {
    return { success: true, status: "idle" };
  }

  await queueRef.delete();
  return { success: true, status: "idle" };
});

export const quizBattleCreatePrivateRoom = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const setup = normalizeSetup(data?.setup);

  if (setup.mode !== "online") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Private room creation is only available for online mode.",
    );
  }

  const db = admin.firestore();
  const roomRef = db.collection("quizBattleRooms").doc();
  const roomCode = generateRoomCode();

  await roomRef.set({
    roomId: roomRef.id,
    roomCode,
    ownerStudentId: studentId,
    participantIds: [studentId],
    mode: setup.mode,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: setup.difficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    status: "waiting",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 1000 * 60 * 30),
  });

  return {
    success: true,
    roomId: roomRef.id,
    roomCode,
  };
});

export const quizBattleCreateBotMatch = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const setup = normalizeSetup(data?.setup);

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc();
  const selectedDifficulty = setup.adaptiveBot ? "adaptive" : setup.botDifficulty;

  await matchRef.set({
    matchId: matchRef.id,
    mode: "bot",
    playerAId: studentId,
    playerBId: `bot:${selectedDifficulty}`,
    status: "ready",
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: selectedDifficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAt: null,
    endedAt: null,
    scoreA: 0,
    scoreB: 0,
    metadata: {
      botDifficulty: selectedDifficulty,
      adaptiveBot: setup.adaptiveBot,
      seededQuestionSet: false,
      implementationStatus: "bootstrap",
    },
  });

  return {
    success: true,
    matchId: matchRef.id,
    status: "ready",
    botDifficulty: selectedDifficulty,
  };
});
