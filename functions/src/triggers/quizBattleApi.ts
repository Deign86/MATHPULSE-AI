import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const ALLOWED_SUBJECT_IDS = new Set(["gen-math", "stats-prob", "pre-calc", "basic-calc"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard", "adaptive"]);
const ALLOWED_QUEUE_TYPES = new Set(["public_matchmaking", "private_room"]);
const ALLOWED_MODES = new Set(["online", "bot"]);
const HEARTBEAT_SCOPES = new Set(["queue", "room", "match"]);

const QUEUE_HEARTBEAT_STALE_MS = 90000;
const QUEUE_MATCHED_TTL_MS = 5 * 60 * 1000;
const ROOM_EXPIRY_MS = 30 * 60 * 1000;
const MAX_MATCHMAKING_PAIRS_PER_PASS = 20;

type QueueStatus = "searching" | "matched" | "cancelled";
type MatchStatus = "ready" | "in_progress" | "completed" | "cancelled";
type RoomStatus = "waiting" | "ready" | "cancelled" | "expired";
type RoundWinner = "playerA" | "playerB" | "draw";
type MatchOutcome = "win" | "loss" | "draw";
type HeartbeatScope = "queue" | "room" | "match";
type LifecycleEventType = "round_started" | "answer_locked" | "round_result" | "match_completed";

interface MatchLifecycleStateResponse {
  eventType: LifecycleEventType;
  sequence: number;
  roundNumber: number;
  occurredAtMs: number;
  deadlineAtMs?: number;
  answeredCount?: number;
  lockedByStudentId?: string;
  winner?: RoundWinner;
  scoreA?: number;
  scoreB?: number;
  resolvedBy?: "submission" | "timer";
}

interface LifecycleEventInput {
  eventType: LifecycleEventType;
  roundNumber: number;
  deadlineAtMs?: number;
  answeredCount?: number;
  lockedByStudentId?: string;
  winner?: RoundWinner;
  scoreA?: number;
  scoreB?: number;
  resolvedBy?: "submission" | "timer";
}

interface BattleQuestionTemplate {
  questionId: string;
  subjectId: string;
  topicId: string;
  prompt: string;
  choices: string[];
  correctOptionIndex: number;
  difficulty: "easy" | "medium" | "hard";
}

interface BattleQuestionPublic {
  roundNumber: number;
  questionId: string;
  prompt: string;
  choices: string[];
}

interface StoredRoundResultRecord {
  roundNumber: number;
  questionId: string;
  correctOptionIndex: number;
  playerASelectedIndex: number | null;
  playerBSelectedIndex: number | null;
  playerACorrect: boolean;
  playerBCorrect: boolean;
  winner: RoundWinner;
  playerAResponseMs: number;
  playerBResponseMs: number;
  resolvedAtMs: number;
}

interface RoundResultRecord {
  roundNumber: number;
  questionId: string;
  correctOptionIndex: number;
  studentSelectedIndex: number | null;
  studentCorrect: boolean;
  botSelectedIndex: number;
  botCorrect: boolean;
  winner: RoundWinner;
  playerAResponseMs: number;
  botResponseMs: number;
  resolvedAtMs: number;
}

interface QuizBattleMatchStateResponse {
  matchId: string;
  mode: "online" | "bot";
  status: MatchStatus;
  subjectId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard" | "adaptive";
  currentRound: number;
  totalRounds: number;
  timePerQuestionSec: number;
  scoreFor: number;
  scoreAgainst: number;
  opponentName: string;
  roundDeadlineAtMs?: number;
  lifecycle?: MatchLifecycleStateResponse;
  currentQuestion: BattleQuestionPublic | null;
  roundResults: RoundResultRecord[];
  outcome?: MatchOutcome;
  xpEarned?: number;
}

interface PrivateRoomStateResponse {
  roomId: string;
  roomCode: string;
  ownerStudentId: string;
  participantIds: string[];
  participantCount: number;
  status: RoomStatus;
  subjectId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  rounds: number;
  timePerQuestionSec: number;
  matchId?: string;
  isOwner: boolean;
}

interface ResumeSessionResponse {
  success: boolean;
  sessionType: "idle" | "queue" | "room" | "match";
  queue?: {
    status: QueueStatus;
    queueType: "public_matchmaking" | "private_room";
    matchId?: string;
  };
  room?: PrivateRoomStateResponse;
  match?: QuizBattleMatchStateResponse;
}

interface BotRoundOutcome {
  selectedIndex: number;
  responseMs: number;
  correct: boolean;
}

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

const BOT_PROFILES: Record<
  "easy" | "medium" | "hard" | "adaptive",
  { accuracy: number; minResponseRatio: number; maxResponseRatio: number }
> = {
  easy: { accuracy: 0.45, minResponseRatio: 0.62, maxResponseRatio: 0.95 },
  medium: { accuracy: 0.63, minResponseRatio: 0.45, maxResponseRatio: 0.82 },
  hard: { accuracy: 0.82, minResponseRatio: 0.28, maxResponseRatio: 0.65 },
  adaptive: { accuracy: 0.72, minResponseRatio: 0.34, maxResponseRatio: 0.72 },
};

const QUESTION_BANK: BattleQuestionTemplate[] = [
  {
    questionId: "qb-gm-01",
    subjectId: "gen-math",
    topicId: "functions",
    prompt: "Solve for x: 3x - 5 = 16",
    choices: ["6", "7", "8", "9"],
    correctOptionIndex: 1,
    difficulty: "easy",
  },
  {
    questionId: "qb-gm-02",
    subjectId: "gen-math",
    topicId: "functions",
    prompt: "If f(x) = x^2 - 4, what is f(3)?",
    choices: ["3", "5", "7", "9"],
    correctOptionIndex: 1,
    difficulty: "easy",
  },
  {
    questionId: "qb-gm-03",
    subjectId: "gen-math",
    topicId: "business-math",
    prompt: "A value grows from 200 to 260. What is the percent increase?",
    choices: ["20%", "25%", "30%", "35%"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-gm-04",
    subjectId: "gen-math",
    topicId: "logic",
    prompt: "If p -> q is true and p is true, then q is:",
    choices: ["True", "False", "Unknown", "Contradiction"],
    correctOptionIndex: 0,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-01",
    subjectId: "stats-prob",
    topicId: "probability",
    prompt: "A fair coin is tossed twice. P(exactly one head) is:",
    choices: ["1/4", "1/2", "3/4", "1"],
    correctOptionIndex: 1,
    difficulty: "easy",
  },
  {
    questionId: "qb-sp-02",
    subjectId: "stats-prob",
    topicId: "statistics",
    prompt: "What is the mean of 4, 6, 8, 10?",
    choices: ["6", "7", "8", "9"],
    correctOptionIndex: 1,
    difficulty: "easy",
  },
  {
    questionId: "qb-sp-03",
    subjectId: "stats-prob",
    topicId: "normal-distribution",
    prompt: "In a normal distribution, approximately what percent lies within 1 SD?",
    choices: ["50%", "68%", "75%", "95%"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-04",
    subjectId: "stats-prob",
    topicId: "sampling",
    prompt: "A larger sample size generally makes the margin of error:",
    choices: ["Larger", "Smaller", "Unchanged", "Undefined"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-01",
    subjectId: "pre-calc",
    topicId: "sequences",
    prompt: "What is the next term in 2, 6, 18, 54, ...?",
    choices: ["72", "108", "126", "162"],
    correctOptionIndex: 3,
    difficulty: "easy",
  },
  {
    questionId: "qb-pc-02",
    subjectId: "pre-calc",
    topicId: "trigonometry",
    prompt: "sin(30°) equals:",
    choices: ["0", "1/2", "sqrt(2)/2", "1"],
    correctOptionIndex: 1,
    difficulty: "easy",
  },
  {
    questionId: "qb-pc-03",
    subjectId: "pre-calc",
    topicId: "conics",
    prompt: "The graph of x^2 + y^2 = 25 is a:",
    choices: ["Parabola", "Circle", "Ellipse", "Hyperbola"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-04",
    subjectId: "pre-calc",
    topicId: "functions",
    prompt: "If g(x)=2x+1, what is g^{-1}(9)?",
    choices: ["3", "4", "5", "6"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-01",
    subjectId: "basic-calc",
    topicId: "limits",
    prompt: "lim (x->2) (x^2 - 4)/(x - 2) is:",
    choices: ["0", "2", "4", "Undefined"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-02",
    subjectId: "basic-calc",
    topicId: "derivatives",
    prompt: "The derivative of x^3 is:",
    choices: ["x^2", "2x", "3x^2", "3x"],
    correctOptionIndex: 2,
    difficulty: "easy",
  },
  {
    questionId: "qb-bc-03",
    subjectId: "basic-calc",
    topicId: "integration",
    prompt: "Integral of 2x dx is:",
    choices: ["x^2 + C", "2x + C", "x + C", "x^2/2 + C"],
    correctOptionIndex: 0,
    difficulty: "easy",
  },
  {
    questionId: "qb-bc-04",
    subjectId: "basic-calc",
    topicId: "applications",
    prompt: "Velocity is the derivative of:",
    choices: ["Acceleration", "Position", "Jerk", "Time"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
];

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const randomInRange = (min: number, max: number): number => {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

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

const asNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
};

const asTimestampMillis = (value: unknown, fallback = 0): number => {
  if (!value) return fallback;
  if (value instanceof admin.firestore.Timestamp) return value.toMillis();
  if (isRecord(value) && typeof value.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};

const normalizeRoundWinner = (raw: unknown): RoundWinner => {
  const candidate = asString(raw);
  if (candidate === "playerA" || candidate === "playerB" || candidate === "draw") {
    return candidate;
  }
  return "draw";
};

const normalizeRoomStatus = (raw: unknown): RoomStatus => {
  const candidate = asString(raw);
  if (candidate === "waiting" || candidate === "ready" || candidate === "cancelled" || candidate === "expired") {
    return candidate;
  }
  return "waiting";
};

const normalizeLifecycleEventType = (raw: unknown): LifecycleEventType => {
  const candidate = asString(raw);
  if (
    candidate === "round_started" ||
    candidate === "answer_locked" ||
    candidate === "round_result" ||
    candidate === "match_completed"
  ) {
    return candidate;
  }
  return "round_started";
};

const getRoundTimeLimitMs = (timePerQuestionSec: number): number => {
  return clamp(Math.floor(timePerQuestionSec), 10, 180) * 1000;
};

const createRoundTimingWindow = (timePerQuestionSec: number): { roundStartedAtMs: number; roundDeadlineAtMs: number } => {
  const roundStartedAtMs = Date.now();
  return {
    roundStartedAtMs,
    roundDeadlineAtMs: roundStartedAtMs + getRoundTimeLimitMs(timePerQuestionSec),
  };
};

const getRoundDeadlineAtMs = (data: Record<string, unknown>): number => {
  const explicitDeadline = Math.floor(asNumber(data.roundDeadlineAtMs, 0));
  if (explicitDeadline > 0) return explicitDeadline;

  const roundStartedAtMs = Math.floor(asNumber(data.roundStartedAtMs, 0));
  if (roundStartedAtMs <= 0) return 0;

  return roundStartedAtMs + getRoundTimeLimitMs(asNumber(data.timePerQuestionSec, 30));
};

const mapLifecycleState = (raw: unknown): MatchLifecycleStateResponse | undefined => {
  if (!isRecord(raw)) return undefined;

  const lifecycle: MatchLifecycleStateResponse = {
    eventType: normalizeLifecycleEventType(raw.eventType),
    sequence: Math.max(1, Math.floor(asNumber(raw.sequence, 1))),
    roundNumber: Math.max(1, Math.floor(asNumber(raw.roundNumber, 1))),
    occurredAtMs: Math.max(0, Math.floor(asNumber(raw.occurredAtMs, Date.now()))),
  };

  const deadlineAtMs = Math.floor(asNumber(raw.deadlineAtMs, 0));
  if (deadlineAtMs > 0) lifecycle.deadlineAtMs = deadlineAtMs;

  if (typeof raw.answeredCount === "number") {
    lifecycle.answeredCount = clamp(Math.floor(raw.answeredCount), 0, 2);
  }

  const lockedByStudentId = asString(raw.lockedByStudentId);
  if (lockedByStudentId) lifecycle.lockedByStudentId = lockedByStudentId;

  const winner = normalizeRoundWinner(raw.winner);
  if (raw.winner !== undefined) lifecycle.winner = winner;

  if (typeof raw.scoreA === "number") lifecycle.scoreA = Math.floor(raw.scoreA);
  if (typeof raw.scoreB === "number") lifecycle.scoreB = Math.floor(raw.scoreB);

  const resolvedBy = asString(raw.resolvedBy);
  if (resolvedBy === "submission" || resolvedBy === "timer") {
    lifecycle.resolvedBy = resolvedBy;
  }

  return lifecycle;
};

const applyLifecycleEventsToUpdate = (
  matchData: Record<string, unknown>,
  updatePayload: Record<string, unknown>,
  events: LifecycleEventInput[],
): void => {
  if (events.length === 0) return;

  const lifecycleRaw = isRecord(matchData.lifecycle) ? matchData.lifecycle : {};
  const baseSequence = Math.max(0, Math.floor(asNumber(lifecycleRaw.sequence, 0)));

  const enrichedEvents = events.map((event, index) => {
    const payload: Record<string, unknown> = {
      eventType: event.eventType,
      sequence: baseSequence + index + 1,
      roundNumber: Math.max(1, Math.floor(event.roundNumber)),
      occurredAtMs: Date.now(),
    };

    if (typeof event.deadlineAtMs === "number" && event.deadlineAtMs > 0) {
      payload.deadlineAtMs = Math.floor(event.deadlineAtMs);
    }
    if (typeof event.answeredCount === "number") {
      payload.answeredCount = clamp(Math.floor(event.answeredCount), 0, 2);
    }
    if (event.lockedByStudentId) payload.lockedByStudentId = event.lockedByStudentId;
    if (event.winner) payload.winner = event.winner;
    if (typeof event.scoreA === "number") payload.scoreA = Math.floor(event.scoreA);
    if (typeof event.scoreB === "number") payload.scoreB = Math.floor(event.scoreB);
    if (event.resolvedBy) payload.resolvedBy = event.resolvedBy;

    return payload;
  });

  updatePayload.lifecycle = enrichedEvents[enrichedEvents.length - 1];
  updatePayload.lifecycleHistory = admin.firestore.FieldValue.arrayUnion(...enrichedEvents);
  updatePayload["metadata.lifecycleContractVersion"] = 1;
};

const pickRoundWinner = (
  playerACorrect: boolean,
  playerBCorrect: boolean,
  playerAResponseMs: number,
  playerBResponseMs: number,
): RoundWinner => {
  if (playerACorrect && !playerBCorrect) return "playerA";
  if (!playerACorrect && playerBCorrect) return "playerB";
  if (playerACorrect && playerBCorrect) {
    if (playerAResponseMs < playerBResponseMs) return "playerA";
    if (playerBResponseMs < playerAResponseMs) return "playerB";
  }
  return "draw";
};

const outcomeFromScores = (scoreFor: number, scoreAgainst: number): MatchOutcome => {
  if (scoreFor > scoreAgainst) return "win";
  if (scoreFor < scoreAgainst) return "loss";
  return "draw";
};

const xpForOutcome = (outcome: MatchOutcome): number => {
  if (outcome === "win") return 80;
  if (outcome === "draw") return 55;
  return 35;
};

const selectQuestionSet = (
  setup: NormalizedBattleSetup,
): { questions: BattleQuestionPublic[]; answerKeys: number[] } => {
  const targetDifficulty = setup.mode === "bot" ? setup.botDifficulty : setup.difficulty;
  const normalizedDifficulty = targetDifficulty === "adaptive" ? "medium" : targetDifficulty;

  const subjectPool = QUESTION_BANK.filter((question) => question.subjectId === setup.subjectId);
  const difficultyPool = subjectPool.filter((question) => question.difficulty === normalizedDifficulty);
  const pool = difficultyPool.length > 0 ? difficultyPool : subjectPool;

  const fallbackPool = pool.length > 0 ? pool : QUESTION_BANK;
  const selected: BattleQuestionTemplate[] = [];

  for (let i = 0; i < setup.rounds; i += 1) {
    const idx = randomInRange(0, fallbackPool.length - 1);
    selected.push(fallbackPool[idx]);
  }

  return {
    questions: selected.map((entry, index) => ({
      roundNumber: index + 1,
      questionId: entry.questionId,
      prompt: entry.prompt,
      choices: entry.choices,
    })),
    answerKeys: selected.map((entry) => entry.correctOptionIndex),
  };
};

const simulateBotRoundOutcome = (
  correctOptionIndex: number,
  optionsCount: number,
  difficulty: "easy" | "medium" | "hard" | "adaptive",
  timePerQuestionSec: number,
): BotRoundOutcome => {
  const profile = BOT_PROFILES[difficulty];
  const shouldAnswerCorrectly = Math.random() < profile.accuracy;

  let selectedIndex = correctOptionIndex;
  if (!shouldAnswerCorrectly) {
    const candidates = [...Array(Math.max(optionsCount, 1)).keys()].filter((value) => value !== correctOptionIndex);
    selectedIndex = candidates.length > 0 ? candidates[randomInRange(0, candidates.length - 1)] : correctOptionIndex;
  }

  const minMs = Math.round(timePerQuestionSec * 1000 * profile.minResponseRatio);
  const maxMs = Math.round(timePerQuestionSec * 1000 * profile.maxResponseRatio);

  return {
    selectedIndex,
    responseMs: randomInRange(minMs, Math.max(minMs, maxMs)),
    correct: selectedIndex === correctOptionIndex,
  };
};

const getRoundKeys = (raw: unknown): number[] => {
  if (!isRecord(raw)) return [];
  const keys = raw.keys;
  if (!Array.isArray(keys)) return [];
  return keys.map((entry) => asNumber(entry, -1));
};

const mapStoredRoundResultForStudent = (
  entry: Record<string, unknown>,
  isPlayerA: boolean,
  rounds: number,
): RoundResultRecord => {
  const playerASelectedIndex = asNullableNumber(entry.playerASelectedIndex);
  const playerBSelectedIndex = asNullableNumber(entry.playerBSelectedIndex);

  const legacyStudentSelected = asNullableNumber(entry.studentSelectedIndex);
  const legacyOpponentSelected = asNullableNumber(entry.botSelectedIndex);

  const canonicalPlayerASelected = playerASelectedIndex !== null ? playerASelectedIndex : legacyStudentSelected;
  const canonicalPlayerBSelected = playerBSelectedIndex !== null ? playerBSelectedIndex : legacyOpponentSelected;

  const canonicalPlayerACorrect = asBoolean(entry.playerACorrect, asBoolean(entry.studentCorrect, false));
  const canonicalPlayerBCorrect = asBoolean(entry.playerBCorrect, asBoolean(entry.botCorrect, false));

  const canonicalPlayerAResponseMs = clamp(
    Math.floor(asNumber(entry.playerAResponseMs, 0)),
    0,
    180000,
  );
  const canonicalPlayerBResponseMs = clamp(
    Math.floor(asNumber(entry.playerBResponseMs, asNumber(entry.botResponseMs, 0))),
    0,
    180000,
  );

  const studentSelectedIndex = isPlayerA ? canonicalPlayerASelected : canonicalPlayerBSelected;
  const opponentSelectedIndex = isPlayerA ? canonicalPlayerBSelected : canonicalPlayerASelected;
  const studentCorrect = isPlayerA ? canonicalPlayerACorrect : canonicalPlayerBCorrect;
  const opponentCorrect = isPlayerA ? canonicalPlayerBCorrect : canonicalPlayerACorrect;
  const studentResponseMs = isPlayerA ? canonicalPlayerAResponseMs : canonicalPlayerBResponseMs;
  const opponentResponseMs = isPlayerA ? canonicalPlayerBResponseMs : canonicalPlayerAResponseMs;

  return {
    roundNumber: clamp(Math.floor(asNumber(entry.roundNumber, 1)), 1, rounds),
    questionId: asString(entry.questionId),
    correctOptionIndex: clamp(Math.floor(asNumber(entry.correctOptionIndex, 0)), 0, 12),
    studentSelectedIndex,
    studentCorrect,
    botSelectedIndex: opponentSelectedIndex !== null ? opponentSelectedIndex : -1,
    botCorrect: opponentCorrect,
    winner: normalizeRoundWinner(entry.winner),
    playerAResponseMs: studentResponseMs,
    botResponseMs: opponentResponseMs,
    resolvedAtMs: Math.floor(asNumber(entry.resolvedAtMs, Date.now())),
  };
};

const getOutcomeFromMetadata = (
  metadata: Record<string, unknown>,
  studentId: string,
  scoreFor: number,
  scoreAgainst: number,
): MatchOutcome => {
  const outcomeByPlayer = isRecord(metadata.outcomeByPlayer) ? metadata.outcomeByPlayer : {};
  const raw = asString(outcomeByPlayer[studentId], "");
  if (raw === "win" || raw === "loss" || raw === "draw") {
    return raw;
  }
  return outcomeFromScores(scoreFor, scoreAgainst);
};

const getXpFromMetadata = (
  metadata: Record<string, unknown>,
  studentId: string,
  fallbackOutcome: MatchOutcome,
): number => {
  const xpByPlayer = isRecord(metadata.xpByPlayer) ? metadata.xpByPlayer : {};
  return clamp(Math.floor(asNumber(xpByPlayer[studentId], asNumber(metadata.xpEarned, xpForOutcome(fallbackOutcome)))), 0, 500);
};

const mapMatchStateForStudent = (
  matchId: string,
  studentId: string,
  data: Record<string, unknown>,
): QuizBattleMatchStateResponse => {
  const playerAId = asString(data.playerAId);
  const isPlayerA = playerAId === studentId;

  const statusRaw = asString(data.status, "ready");
  const status: MatchStatus = ["ready", "in_progress", "completed", "cancelled"].includes(statusRaw)
    ? (statusRaw as MatchStatus)
    : "ready";

  const rounds = clamp(Math.floor(asNumber(data.rounds, 1)), 1, 20);
  const rawCurrentRound = Math.floor(asNumber(data.currentRound, status === "completed" ? rounds : 1));
  const currentRound = clamp(rawCurrentRound, 1, rounds);
  const scoreA = asNumber(data.scoreA, 0);
  const scoreB = asNumber(data.scoreB, 0);

  const scoreFor = isPlayerA ? scoreA : scoreB;
  const scoreAgainst = isPlayerA ? scoreB : scoreA;

  const questionsRaw = Array.isArray(data.questions) ? data.questions : [];
  const questions = questionsRaw
    .filter((entry) => isRecord(entry))
    .map((entry) => ({
      roundNumber: clamp(Math.floor(asNumber(entry.roundNumber, 1)), 1, rounds),
      questionId: asString(entry.questionId),
      prompt: asString(entry.prompt),
      choices: Array.isArray(entry.choices)
        ? entry.choices.map((choice) => asString(choice)).filter((choice) => choice.length > 0)
        : [],
    }));

  const currentQuestion = status === "in_progress"
    ? (questions.find((question) => question.roundNumber === currentRound) || null)
    : null;

  const opponentName = isPlayerA
    ? asString(data.playerBDisplayName, "Opponent")
    : asString(data.playerADisplayName, "Opponent");

  const roundResults = (Array.isArray(data.roundResults) ? data.roundResults : [])
    .filter((entry) => isRecord(entry))
    .map((entry) => mapStoredRoundResultForStudent(entry, isPlayerA, rounds));

  const lifecycle = mapLifecycleState(data.lifecycle);
  const roundDeadlineAtMs = status === "in_progress" ? getRoundDeadlineAtMs(data) : 0;

  const baseState: QuizBattleMatchStateResponse = {
    matchId,
    mode: asString(data.mode, "bot") === "online" ? "online" : "bot",
    status,
    subjectId: asString(data.subjectId, "gen-math"),
    topicId: asString(data.topicId, "unknown-topic"),
    difficulty: ALLOWED_DIFFICULTIES.has(asString(data.difficulty, "medium"))
      ? (asString(data.difficulty) as "easy" | "medium" | "hard" | "adaptive")
      : "medium",
    currentRound,
    totalRounds: rounds,
    timePerQuestionSec: clamp(Math.floor(asNumber(data.timePerQuestionSec, 30)), 10, 180),
    scoreFor,
    scoreAgainst,
    opponentName,
    roundDeadlineAtMs: roundDeadlineAtMs > 0 ? roundDeadlineAtMs : undefined,
    lifecycle,
    currentQuestion,
    roundResults,
  };

  if (status === "completed") {
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const outcome = getOutcomeFromMetadata(metadata, studentId, scoreFor, scoreAgainst);
    baseState.outcome = outcome;
    baseState.xpEarned = getXpFromMetadata(metadata, studentId, outcome);
  }

  return baseState;
};

const mapRoomStateForStudent = (
  roomId: string,
  studentId: string,
  data: Record<string, unknown>,
): PrivateRoomStateResponse => {
  const participantIds = Array.isArray(data.participantIds)
    ? data.participantIds.map((entry) => asString(entry)).filter((entry) => entry.length > 0)
    : [];
  return {
    roomId,
    roomCode: asString(data.roomCode),
    ownerStudentId: asString(data.ownerStudentId),
    participantIds,
    participantCount: participantIds.length,
    status: normalizeRoomStatus(data.status),
    subjectId: asString(data.subjectId, "gen-math"),
    topicId: asString(data.topicId, "unknown-topic"),
    difficulty: (["easy", "medium", "hard"] as const).includes(asString(data.difficulty) as "easy" | "medium" | "hard")
      ? (asString(data.difficulty) as "easy" | "medium" | "hard")
      : "medium",
    rounds: clamp(Math.floor(asNumber(data.rounds, 5)), 3, 20),
    timePerQuestionSec: clamp(Math.floor(asNumber(data.timePerQuestionSec, 30)), 10, 180),
    matchId: asString(data.matchId, "") || undefined,
    isOwner: asString(data.ownerStudentId) === studentId,
  };
};

const loadUserDisplayInfoFromTx = async (
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<{ displayName: string; photo: string }> => {
  const userSnap = await tx.get(db.collection("users").doc(uid));
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
  return {
    displayName: asString(userData.displayName, asString(userData.name, "Student")),
    photo: asString(userData.photo),
  };
};

const createOnlineMatchInTransaction = async (
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  setup: NormalizedBattleSetup,
  playerAId: string,
  playerBId: string,
  source: "private_room" | "public_matchmaking",
): Promise<string> => {
  const matchRef = db.collection("quizBattleMatches").doc();
  const [playerAProfile, playerBProfile] = await Promise.all([
    loadUserDisplayInfoFromTx(tx, db, playerAId),
    loadUserDisplayInfoFromTx(tx, db, playerBId),
  ]);
  const { questions, answerKeys } = selectQuestionSet(setup);

  tx.set(matchRef, {
    matchId: matchRef.id,
    mode: "online",
    playerAId,
    playerADisplayName: playerAProfile.displayName,
    playerBId,
    playerBDisplayName: playerBProfile.displayName,
    status: "ready" as MatchStatus,
    playerAReady: false,
    playerBReady: false,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: setup.difficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    currentRound: 1,
    questions,
    roundResults: [],
    scoreA: 0,
    scoreB: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAt: null,
    endedAt: null,
    metadata: {
      source,
      seededQuestionSet: true,
      implementationStatus: "live_online_v1",
      playerAPhoto: playerAProfile.photo,
      playerBPhoto: playerBProfile.photo,
    },
  });

  tx.set(matchRef.collection("server").doc("roundKeys"), {
    keys: answerKeys,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return matchRef.id;
};

const createBotMatchRecord = async (
  db: FirebaseFirestore.Firestore,
  studentId: string,
  setup: NormalizedBattleSetup,
): Promise<{ matchId: string; botDifficulty: "easy" | "medium" | "hard" | "adaptive" }> => {
  const matchRef = db.collection("quizBattleMatches").doc();
  const selectedDifficulty = setup.adaptiveBot ? "adaptive" : setup.botDifficulty;
  const userSnap = await db.collection("users").doc(studentId).get();
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
  const playerADisplayName = asString(userData.displayName, asString(userData.name, "Student"));

  const { questions, answerKeys } = selectQuestionSet(setup);
  const roundKeysRef = matchRef.collection("server").doc("roundKeys");
  const batch = db.batch();

  batch.set(matchRef, {
    matchId: matchRef.id,
    mode: "bot",
    playerAId: studentId,
    playerADisplayName,
    playerBId: `bot:${selectedDifficulty}`,
    playerBDisplayName: `Practice Bot (${selectedDifficulty.toUpperCase()})`,
    status: "ready" as MatchStatus,
    playerAReady: true,
    playerBReady: true,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: selectedDifficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    currentRound: 1,
    questions,
    roundResults: [],
    scoreA: 0,
    scoreB: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAt: null,
    endedAt: null,
    metadata: {
      botDifficulty: selectedDifficulty,
      adaptiveBot: setup.adaptiveBot,
      seededQuestionSet: true,
      implementationStatus: "live_bot_v2",
    },
  });

  batch.set(roundKeysRef, {
    keys: answerKeys,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    matchId: matchRef.id,
    botDifficulty: selectedDifficulty,
  };
};

const computeParticipantRoundMetrics = (
  roundResults: Record<string, unknown>[],
  isPlayerA: boolean,
  rounds: number,
  fallbackResponseMs: number,
): { accuracy: number; averageResponseMs: number } => {
  if (roundResults.length === 0) {
    return {
      accuracy: 0,
      averageResponseMs: fallbackResponseMs,
    };
  }

  let correctCount = 0;
  let totalResponseMs = 0;

  roundResults.forEach((entry) => {
    const correct = isPlayerA
      ? asBoolean(entry.playerACorrect, asBoolean(entry.studentCorrect, false))
      : asBoolean(entry.playerBCorrect, asBoolean(entry.botCorrect, false));
    if (correct) correctCount += 1;

    const responseMs = isPlayerA
      ? clamp(Math.floor(asNumber(entry.playerAResponseMs, 0)), 0, 180000)
      : clamp(Math.floor(asNumber(entry.playerBResponseMs, asNumber(entry.botResponseMs, 0))), 0, 180000);
    totalResponseMs += responseMs;
  });

  const accuracy = clamp((correctCount / Math.max(rounds, 1)) * 100, 0, 100);
  const averageResponseMs = Math.round(totalResponseMs / roundResults.length);

  return {
    accuracy,
    averageResponseMs,
  };
};

const finalizeCompletedMatch = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
  requestingStudentId: string,
): Promise<{ outcome: MatchOutcome; xpEarned: number }> => {
  let result: { outcome: MatchOutcome; xpEarned: number } = {
    outcome: "draw",
    xpEarned: xpForOutcome("draw"),
  };

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Match not found while finalizing.");
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const status = asString(matchData.status, "ready");

    if (status !== "completed") {
      throw new functions.https.HttpsError("failed-precondition", "Match must be completed before finalization.");
    }

    const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
    const existingOutcomeByPlayer = isRecord(metadata.outcomeByPlayer) ? metadata.outcomeByPlayer : {};
    const existingXpByPlayer = isRecord(metadata.xpByPlayer) ? metadata.xpByPlayer : {};

    if (metadata.finalizedAt && existingOutcomeByPlayer[requestingStudentId] !== undefined) {
      const outcome = asString(existingOutcomeByPlayer[requestingStudentId], "draw");
      result = {
        outcome: (outcome === "win" || outcome === "loss" || outcome === "draw") ? outcome : "draw",
        xpEarned: clamp(Math.floor(asNumber(existingXpByPlayer[requestingStudentId], xpForOutcome("draw"))), 0, 500),
      };
      return;
    }

    const playerAId = asString(matchData.playerAId);
    const playerBId = asString(matchData.playerBId);
    if (!playerAId) {
      throw new functions.https.HttpsError("internal", "Match missing playerAId.");
    }

    const scoreA = asNumber(matchData.scoreA, 0);
    const scoreB = asNumber(matchData.scoreB, 0);
    const mode = asString(matchData.mode, "bot") === "online" ? "online" : "bot";

    const participants = [playerAId];
    if (mode === "online" && playerBId) {
      participants.push(playerBId);
    }

    const rounds = clamp(Math.floor(asNumber(matchData.rounds, 1)), 1, 20);
    const timePerQuestionSec = clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180);
    const roundResultsRaw = Array.isArray(matchData.roundResults) ? matchData.roundResults : [];
    const roundResults = roundResultsRaw.filter((entry) => isRecord(entry)) as Record<string, unknown>[];
    const fallbackResponseMs = timePerQuestionSec * 1000;

    const participantProfiles: Record<string, { displayName: string; photo: string }> = {};
    const participantStats: Record<string, Record<string, unknown>> = {};
    const participantUsers: Record<string, Record<string, unknown>> = {};

    for (const participantId of participants) {
      const statsRef = db.collection("studentBattleStats").doc(participantId);
      const userRef = db.collection("users").doc(participantId);
      const [statsSnap, userSnap] = await Promise.all([tx.get(statsRef), tx.get(userRef)]);

      participantStats[participantId] = statsSnap.exists ? (statsSnap.data() as Record<string, unknown>) : {};
      participantUsers[participantId] = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
      participantProfiles[participantId] = {
        displayName: asString(participantUsers[participantId].displayName, asString(participantUsers[participantId].name, "Student")),
        photo: asString(participantUsers[participantId].photo),
      };
    }

    const outcomeByPlayer: Record<string, MatchOutcome> = {};
    const xpByPlayer: Record<string, number> = {};

    for (const participantId of participants) {
      const isPlayerA = participantId === playerAId;
      const scoreFor = isPlayerA ? scoreA : scoreB;
      const scoreAgainst = isPlayerA ? scoreB : scoreA;
      const outcome = outcomeFromScores(scoreFor, scoreAgainst);
      const xpEarned = xpForOutcome(outcome);
      const metrics = computeParticipantRoundMetrics(roundResults, isPlayerA, rounds, fallbackResponseMs);

      const existingStats = participantStats[participantId];
      const matchesPlayed = asNumber(existingStats.matchesPlayed, 0) + 1;
      const wins = asNumber(existingStats.wins, 0) + (outcome === "win" ? 1 : 0);
      const losses = asNumber(existingStats.losses, 0) + (outcome === "loss" ? 1 : 0);
      const draws = asNumber(existingStats.draws, 0) + (outcome === "draw" ? 1 : 0);
      const currentStreak = outcome === "win" ? asNumber(existingStats.currentStreak, 0) + 1 : 0;
      const bestStreak = Math.max(asNumber(existingStats.bestStreak, 0), currentStreak);

      const weightedAccuracy = matchesPlayed > 0
        ? ((asNumber(existingStats.averageAccuracy, 0) * asNumber(existingStats.matchesPlayed, 0)) + metrics.accuracy) / matchesPlayed
        : metrics.accuracy;
      const weightedResponse = matchesPlayed > 0
        ? Math.round(
          ((asNumber(existingStats.averageResponseMs, 0) * asNumber(existingStats.matchesPlayed, 0)) + metrics.averageResponseMs) /
          matchesPlayed,
        )
        : metrics.averageResponseMs;

      const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0;
      const leaderboardScore = asNumber(existingStats.leaderboardScore, 0) + xpEarned;

      const userData = participantUsers[participantId];
      const totalXP = asNumber(userData.totalXP, 0) + xpEarned;
      const currentXP = asNumber(userData.currentXP, 0) + xpEarned;
      const opponentId = isPlayerA ? playerBId : playerAId;
      const opponentName = opponentId
        ? (participantProfiles[opponentId]?.displayName || asString(matchData.playerBDisplayName, "Opponent"))
        : asString(matchData.playerBDisplayName, "Practice Bot");

      const statsRef = db.collection("studentBattleStats").doc(participantId);
      const historyRef = db.collection("quizBattleHistory").doc(`${matchRef.id}_${participantId}`);
      const leaderboardRef = db.collection("studentBattleLeaderboard").doc(participantId);
      const userRef = db.collection("users").doc(participantId);
      const xpActivityRef = db.collection("xpActivities").doc(`quizbattle_${matchRef.id}_${participantId}`);

      tx.set(historyRef, {
        studentId: participantId,
        matchId: matchRef.id,
        mode,
        status: "completed",
        subjectId: asString(matchData.subjectId, "gen-math"),
        topicId: asString(matchData.topicId, "unknown-topic"),
        difficulty: asString(matchData.difficulty, "medium"),
        rounds,
        timePerQuestionSec,
        scoreFor,
        scoreAgainst,
        outcome,
        accuracy: metrics.accuracy,
        averageResponseMs: metrics.averageResponseMs,
        bestStreak,
        xpEarned,
        opponentName,
        opponentType: mode === "bot" ? "bot" : "student",
        createdAt: matchData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(statsRef, {
        userId: participantId,
        matchesPlayed,
        wins,
        losses,
        draws,
        winRate,
        averageAccuracy: weightedAccuracy,
        averageResponseMs: weightedResponse,
        bestStreak,
        currentStreak,
        favoriteTopicId: asString(existingStats.favoriteTopicId, asString(matchData.topicId)),
        leaderboardScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(leaderboardRef, {
        userId: participantId,
        displayName: participantProfiles[participantId].displayName,
        photo: participantProfiles[participantId].photo,
        rank: 0,
        leaderboardScore,
        winRate,
        bestStreak,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(userRef, {
        currentXP,
        totalXP,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(xpActivityRef, {
        activityId: xpActivityRef.id,
        userId: participantId,
        type: "quiz_battle",
        xpEarned,
        description: `Quiz Battle ${outcome} (${matchRef.id})`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      outcomeByPlayer[participantId] = outcome;
      xpByPlayer[participantId] = xpEarned;
    }

    tx.update(matchRef, {
      "metadata.finalizedAt": admin.firestore.FieldValue.serverTimestamp(),
      "metadata.outcomeByPlayer": outcomeByPlayer,
      "metadata.xpByPlayer": xpByPlayer,
      "metadata.outcome": outcomeByPlayer[playerAId] || "draw",
      "metadata.xpEarned": xpByPlayer[playerAId] || xpForOutcome("draw"),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    result = {
      outcome: outcomeByPlayer[requestingStudentId] || "draw",
      xpEarned: xpByPlayer[requestingStudentId] || xpForOutcome("draw"),
    };
  });

  return result;
};

const generateRoomCode = async (): Promise<string> => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const maxAttempts = 10;
  const db = admin.firestore();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      code += chars[idx];
    }

    const existingRoomSnapshot = await db
      .collection("quizBattleRooms")
      .where("roomCode", "==", code)
      .limit(1)
      .get();

    if (existingRoomSnapshot.empty) {
      return code;
    }
  }

  throw new functions.https.HttpsError(
    "internal",
    "Unable to generate a unique room code. Please try again.",
  );
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

const setupFromRoomData = (roomData: Record<string, unknown>): NormalizedBattleSetup => {
  return {
    mode: "online",
    subjectId: ALLOWED_SUBJECT_IDS.has(asString(roomData.subjectId)) ? asString(roomData.subjectId) : "gen-math",
    topicId: asString(roomData.topicId, "unknown-topic"),
    difficulty: (["easy", "medium", "hard"] as const).includes(asString(roomData.difficulty) as "easy" | "medium" | "hard")
      ? (asString(roomData.difficulty) as "easy" | "medium" | "hard")
      : "medium",
    rounds: clamp(Math.floor(asNumber(roomData.rounds, 5)), 3, 20),
    timePerQuestionSec: clamp(Math.floor(asNumber(roomData.timePerQuestionSec, 30)), 10, 180),
    queueType: "private_room",
    botDifficulty: "medium",
    adaptiveBot: false,
  };
};

const setupFromQueueData = (queueData: Record<string, unknown>): NormalizedBattleSetup => {
  return {
    mode: "online",
    subjectId: ALLOWED_SUBJECT_IDS.has(asString(queueData.subjectId)) ? asString(queueData.subjectId) : "gen-math",
    topicId: asString(queueData.topicId, "unknown-topic"),
    difficulty: (["easy", "medium", "hard"] as const).includes(asString(queueData.difficulty) as "easy" | "medium" | "hard")
      ? (asString(queueData.difficulty) as "easy" | "medium" | "hard")
      : "medium",
    rounds: clamp(Math.floor(asNumber(queueData.rounds, 5)), 3, 20),
    timePerQuestionSec: clamp(Math.floor(asNumber(queueData.timePerQuestionSec, 30)), 10, 180),
    queueType: "public_matchmaking",
    botDifficulty: "medium",
    adaptiveBot: false,
  };
};

const queueCompatibilityKey = (queueData: Record<string, unknown>): string => {
  return [
    asString(queueData.mode, "online"),
    asString(queueData.queueType, "public_matchmaking"),
    asString(queueData.subjectId, "gen-math"),
    asString(queueData.topicId, "unknown-topic"),
    asString(queueData.difficulty, "medium"),
    clamp(Math.floor(asNumber(queueData.rounds, 5)), 3, 20),
    clamp(Math.floor(asNumber(queueData.timePerQuestionSec, 30)), 10, 180),
  ].join("|");
};

const writePresenceHeartbeat = async (
  studentId: string,
  scope: HeartbeatScope,
  resourceId: string,
): Promise<void> => {
  const path = `quizBattlePresence/${scope}/${resourceId}/${studentId}`;
  await admin.database().ref(path).set({
    studentId,
    scope,
    resourceId,
    online: true,
    heartbeatAt: admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  });
};

const resolvePublicMatchmakingPass = async (
  db: FirebaseFirestore.Firestore,
  maxPairs = MAX_MATCHMAKING_PAIRS_PER_PASS,
): Promise<{ paired: number; staleRemoved: number }> => {
  const queueSnap = await db.collection("quizBattleQueue").limit(300).get();
  const now = Date.now();
  const staleRefs: FirebaseFirestore.DocumentReference[] = [];
  const candidatesByKey = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();

  queueSnap.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    const status = asString(data.status, "searching");
    const mode = asString(data.mode, "online");
    const queueType = asString(data.queueType, "public_matchmaking");
    const heartbeatMs = asTimestampMillis(data.heartbeatAt, 0);
    const updatedMs = asTimestampMillis(data.updatedAt, 0);

    if (status === "searching") {
      if (heartbeatMs > 0 && now - heartbeatMs > QUEUE_HEARTBEAT_STALE_MS) {
        staleRefs.push(entry.ref);
        return;
      }

      if (mode !== "online" || queueType !== "public_matchmaking") {
        return;
      }

      const key = queueCompatibilityKey(data);
      const existing = candidatesByKey.get(key) || [];
      existing.push(entry);
      candidatesByKey.set(key, existing);
      return;
    }

    if (status === "matched" && updatedMs > 0 && now - updatedMs > QUEUE_MATCHED_TTL_MS) {
      staleRefs.push(entry.ref);
    }
  });

  let staleRemoved = 0;
  if (staleRefs.length > 0) {
    const deduped = new Map<string, FirebaseFirestore.DocumentReference>();
    staleRefs.forEach((ref) => {
      deduped.set(ref.path, ref);
    });

    const batch = db.batch();
    deduped.forEach((ref) => batch.delete(ref));
    await batch.commit();
    staleRemoved = deduped.size;
  }

  let paired = 0;

  for (const [key, entries] of candidatesByKey.entries()) {
    if (paired >= maxPairs) break;

    const sorted = [...entries].sort((a, b) => {
      const joinedA = asTimestampMillis((a.data() as Record<string, unknown>).joinedAt, 0);
      const joinedB = asTimestampMillis((b.data() as Record<string, unknown>).joinedAt, 0);
      return joinedA - joinedB;
    });

    for (let idx = 0; idx + 1 < sorted.length; idx += 2) {
      if (paired >= maxPairs) break;

      const first = sorted[idx];
      const second = sorted[idx + 1];

      const matched = await db.runTransaction(async (tx) => {
        const [firstSnap, secondSnap] = await Promise.all([tx.get(first.ref), tx.get(second.ref)]);
        if (!firstSnap.exists || !secondSnap.exists) return false;

        const firstData = firstSnap.data() as Record<string, unknown>;
        const secondData = secondSnap.data() as Record<string, unknown>;

        if (asString(firstData.status, "searching") !== "searching") return false;
        if (asString(secondData.status, "searching") !== "searching") return false;
        if (queueCompatibilityKey(firstData) !== key || queueCompatibilityKey(secondData) !== key) return false;

        const firstHeartbeatMs = asTimestampMillis(firstData.heartbeatAt, 0);
        const secondHeartbeatMs = asTimestampMillis(secondData.heartbeatAt, 0);
        if (firstHeartbeatMs > 0 && now - firstHeartbeatMs > QUEUE_HEARTBEAT_STALE_MS) return false;
        if (secondHeartbeatMs > 0 && now - secondHeartbeatMs > QUEUE_HEARTBEAT_STALE_MS) return false;

        const firstStudent = asString(firstData.studentId);
        const secondStudent = asString(secondData.studentId);
        if (!firstStudent || !secondStudent || firstStudent === secondStudent) return false;

        const setup = setupFromQueueData(firstData);
        const matchId = await createOnlineMatchInTransaction(
          tx,
          db,
          setup,
          firstStudent,
          secondStudent,
          "public_matchmaking",
        );

        const matchedPayload = {
          status: "matched" as QueueStatus,
          matchId,
          matchedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        tx.update(first.ref, matchedPayload);
        tx.update(second.ref, matchedPayload);

        return true;
      });

      if (matched) {
        paired += 1;
      }
    }
  }

  return { paired, staleRemoved };
};

const getParticipantIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => asString(entry)).filter((entry) => entry.length > 0);
};

const normalizeSelection = (
  selectedOptionIndex: number | null,
  optionsCount: number,
): number | null => {
  if (selectedOptionIndex === null) return null;
  const bounded = clamp(Math.floor(selectedOptionIndex), -1, optionsCount - 1);
  return bounded >= 0 ? bounded : null;
};

const progressMatchTimerIfExpired = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
): Promise<{ progressed: boolean; completed: boolean }> => {
  const result = { progressed: false, completed: false };

  await db.runTransaction(async (tx) => {
    const [matchSnap, keysSnap] = await Promise.all([
      tx.get(matchRef),
      tx.get(matchRef.collection("server").doc("roundKeys")),
    ]);

    if (!matchSnap.exists) return;

    const matchData = matchSnap.data() as Record<string, unknown>;
    const status = asString(matchData.status, "ready");
    if (status !== "in_progress") return;

    const totalRounds = clamp(Math.floor(asNumber(matchData.rounds, 1)), 1, 20);
    const currentRound = clamp(Math.floor(asNumber(matchData.currentRound, 1)), 1, totalRounds);
    const timePerQuestionSec = clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180);
    const timeLimitMs = getRoundTimeLimitMs(timePerQuestionSec);

    const existingRoundResult = (Array.isArray(matchData.roundResults) ? matchData.roundResults : [])
      .filter((entry) => isRecord(entry))
      .find((entry) => Math.floor(asNumber(entry.roundNumber, 0)) === currentRound);

    if (existingRoundResult) {
      return;
    }

    let roundDeadlineAtMs = getRoundDeadlineAtMs(matchData);
    if (roundDeadlineAtMs <= 0) {
      const timing = createRoundTimingWindow(timePerQuestionSec);
      const seedPayload: Record<string, unknown> = {
        roundStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        roundStartedAtMs: timing.roundStartedAtMs,
        roundDeadlineAtMs: timing.roundDeadlineAtMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      applyLifecycleEventsToUpdate(matchData, seedPayload, [
        {
          eventType: "round_started",
          roundNumber: currentRound,
          deadlineAtMs: timing.roundDeadlineAtMs,
          scoreA: asNumber(matchData.scoreA, 0),
          scoreB: asNumber(matchData.scoreB, 0),
        },
      ]);
      tx.update(matchRef, seedPayload);
      result.progressed = true;
      return;
    }

    if (Date.now() < roundDeadlineAtMs) {
      return;
    }

    const questionsRaw = Array.isArray(matchData.questions) ? matchData.questions : [];
    const currentQuestion = questionsRaw
      .filter((entry) => isRecord(entry))
      .find((entry) => Math.floor(asNumber(entry.roundNumber, 0)) === currentRound);

    if (!currentQuestion) {
      return;
    }

    const roundKeys = keysSnap.exists ? getRoundKeys(keysSnap.data()) : [];
    const correctOptionIndex = roundKeys[currentRound - 1];
    if (typeof correctOptionIndex !== "number" || correctOptionIndex < 0) {
      return;
    }

    const options = Array.isArray(currentQuestion.choices) ? currentQuestion.choices : [];
    const optionsCount = Math.max(options.length, 1);
    const mode = asString(matchData.mode, "bot") === "online" ? "online" : "bot";

    const playerASubRef = matchRef.collection("roundSubmissions").doc(`r${currentRound}_a`);
    const playerBSubRef = matchRef.collection("roundSubmissions").doc(`r${currentRound}_b`);
    const [playerASubSnap, playerBSubSnap] = await Promise.all([
      tx.get(playerASubRef),
      tx.get(playerBSubRef),
    ]);

    const playerASubData = playerASubSnap.exists ? (playerASubSnap.data() as Record<string, unknown>) : null;
    const playerBSubData = playerBSubSnap.exists ? (playerBSubSnap.data() as Record<string, unknown>) : null;

    const playerASelection = playerASubData
      ? normalizeSelection(asNullableNumber(playerASubData.selectedOptionIndex), optionsCount)
      : null;

    let playerBSelection: number | null = null;
    let playerBResponseMs = timeLimitMs;

    if (mode === "bot") {
      const difficultyRaw = asString(matchData.difficulty, "medium");
      const botDifficulty = ALLOWED_DIFFICULTIES.has(difficultyRaw)
        ? (difficultyRaw as "easy" | "medium" | "hard" | "adaptive")
        : "medium";
      const botOutcome = simulateBotRoundOutcome(correctOptionIndex, optionsCount, botDifficulty, timePerQuestionSec);
      playerBSelection = botOutcome.selectedIndex;
      playerBResponseMs = clamp(Math.floor(botOutcome.responseMs), 0, timeLimitMs);
    } else {
      playerBSelection = playerBSubData
        ? normalizeSelection(asNullableNumber(playerBSubData.selectedOptionIndex), optionsCount)
        : null;
      playerBResponseMs = playerBSubData
        ? clamp(Math.floor(asNumber(playerBSubData.responseMs, timeLimitMs)), 0, timeLimitMs)
        : timeLimitMs;
    }

    const playerAResponseMs = playerASubData
      ? clamp(Math.floor(asNumber(playerASubData.responseMs, timeLimitMs)), 0, timeLimitMs)
      : timeLimitMs;

    const playerACorrect = playerASelection !== null && playerASelection === correctOptionIndex;
    const playerBCorrect = playerBSelection !== null && playerBSelection === correctOptionIndex;
    const winner = pickRoundWinner(playerACorrect, playerBCorrect, playerAResponseMs, playerBResponseMs);

    const scoreA = asNumber(matchData.scoreA, 0) + (winner === "playerA" ? 1 : 0);
    const scoreB = asNumber(matchData.scoreB, 0) + (winner === "playerB" ? 1 : 0);

    const roundResult: StoredRoundResultRecord = {
      roundNumber: currentRound,
      questionId: asString(currentQuestion.questionId),
      correctOptionIndex,
      playerASelectedIndex: playerASelection,
      playerBSelectedIndex: playerBSelection,
      playerACorrect,
      playerBCorrect,
      winner,
      playerAResponseMs,
      playerBResponseMs,
      resolvedAtMs: Date.now(),
    };

    const isFinalRound = currentRound >= totalRounds;
    const updatePayload: Record<string, unknown> = {
      scoreA,
      scoreB,
      roundResults: admin.firestore.FieldValue.arrayUnion(roundResult),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const lifecycleEvents: LifecycleEventInput[] = [
      {
        eventType: "round_result",
        roundNumber: currentRound,
        winner,
        scoreA,
        scoreB,
        resolvedBy: "timer",
      },
    ];

    if (isFinalRound) {
      updatePayload.status = "completed";
      updatePayload.currentRound = totalRounds;
      updatePayload.endedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundDeadlineAtMs = 0;
      lifecycleEvents.push({
        eventType: "match_completed",
        roundNumber: currentRound,
        winner,
        scoreA,
        scoreB,
        resolvedBy: "timer",
      });
      result.completed = true;
    } else {
      const nextTiming = createRoundTimingWindow(timePerQuestionSec);
      updatePayload.currentRound = currentRound + 1;
      updatePayload.roundStartedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundStartedAtMs = nextTiming.roundStartedAtMs;
      updatePayload.roundDeadlineAtMs = nextTiming.roundDeadlineAtMs;
      lifecycleEvents.push({
        eventType: "round_started",
        roundNumber: currentRound + 1,
        deadlineAtMs: nextTiming.roundDeadlineAtMs,
        scoreA,
        scoreB,
      });
    }

    applyLifecycleEventsToUpdate(matchData, updatePayload, lifecycleEvents);
    tx.update(matchRef, updatePayload);

    if (playerASubSnap.exists) {
      tx.set(playerASubRef, {
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        winner,
      }, { merge: true });
    }

    if (playerBSubSnap.exists) {
      tx.set(playerBSubRef, {
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        winner,
      }, { merge: true });
    }

    result.progressed = true;
  });

  return result;
};

const progressAndFinalizeMatchIfNeeded = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
  requestingStudentId: string,
): Promise<void> => {
  await progressMatchTimerIfExpired(db, matchRef);
  const latestMatchSnap = await matchRef.get();
  if (!latestMatchSnap.exists) return;

  const latestData = latestMatchSnap.data() as Record<string, unknown>;
  if (asString(latestData.status) === "completed") {
    await finalizeCompletedMatch(db, matchRef, requestingStudentId);
  }
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

const findPrivateRoomByCode = async (
  db: FirebaseFirestore.Firestore,
  roomCode: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> => {
  const normalizedCode = roomCode.trim().toUpperCase();
  if (!normalizedCode) return null;
  const roomSnap = await db.collection("quizBattleRooms").where("roomCode", "==", normalizedCode).limit(1).get();
  if (roomSnap.empty) return null;
  return roomSnap.docs[0];
};

const assertRoomParticipant = (studentId: string, roomData: Record<string, unknown>): void => {
  const participantIds = getParticipantIds(roomData.participantIds);
  if (!participantIds.includes(studentId)) {
    throw new functions.https.HttpsError("permission-denied", "You are not a participant in this room.");
  }
};

export const quizBattleJoinQueue = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const setup = normalizeSetup(data?.setup);

  if (setup.mode !== "online" || setup.queueType !== "public_matchmaking") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Queue join is only available for online public matchmaking.",
    );
  }

  const db = admin.firestore();
  const queueRef = db.collection("quizBattleQueue").doc(studentId);

  await queueRef.set(
    {
      studentId,
      mode: "online",
      queueType: "public_matchmaking",
      subjectId: setup.subjectId,
      topicId: setup.topicId,
      difficulty: setup.difficulty,
      rounds: setup.rounds,
      timePerQuestionSec: setup.timePerQuestionSec,
      status: "searching" as QueueStatus,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await resolvePublicMatchmakingPass(db, 2);

  const refreshed = await queueRef.get();
  const refreshedData = refreshed.exists ? (refreshed.data() as Record<string, unknown>) : {};
  const status = asString(refreshedData.status, "searching");

  return {
    success: true,
    status: status === "matched" ? "matched" : "queued",
    queueEntryId: studentId,
    matchId: asString(refreshedData.matchId, "") || undefined,
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
  const roomCode = await generateRoomCode();

  await roomRef.set({
    roomId: roomRef.id,
    roomCode,
    ownerStudentId: studentId,
    participantIds: [studentId],
    participantHeartbeat: {
      [studentId]: admin.firestore.FieldValue.serverTimestamp(),
    },
    mode: setup.mode,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: setup.difficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    status: "waiting" as RoomStatus,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_EXPIRY_MS),
  });

  const roomSnap = await roomRef.get();
  const roomData = roomSnap.data() as Record<string, unknown>;

  return {
    success: true,
    room: mapRoomStateForStudent(roomRef.id, studentId, roomData),
  };
});

export const quizBattleJoinPrivateRoom = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const roomCode = asString(data?.roomCode).toUpperCase();

  if (!roomCode) {
    throw new functions.https.HttpsError("invalid-argument", "roomCode is required.");
  }

  const db = admin.firestore();
  const roomDoc = await findPrivateRoomByCode(db, roomCode);
  if (!roomDoc) {
    throw new functions.https.HttpsError("not-found", "Private room code not found.");
  }

  const roomRef = roomDoc.ref;
  let joinedRoom: Record<string, unknown> | null = null;

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Private room no longer exists.");
    }

    const roomData = roomSnap.data() as Record<string, unknown>;
    const currentStatus = normalizeRoomStatus(roomData.status);
    const expiresAtMs = asTimestampMillis(roomData.expiresAt, 0);

    if (expiresAtMs > 0 && Date.now() > expiresAtMs) {
      tx.update(roomRef, {
        status: "expired" as RoomStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new functions.https.HttpsError("deadline-exceeded", "Private room has expired.");
    }

    if (currentStatus === "cancelled" || currentStatus === "expired") {
      throw new functions.https.HttpsError("failed-precondition", "Private room is not joinable.");
    }

    const participantIds = getParticipantIds(roomData.participantIds);
    const alreadyJoined = participantIds.includes(studentId);
    const nextParticipants = alreadyJoined ? participantIds : [...participantIds, studentId];

    if (!alreadyJoined && participantIds.length >= 2) {
      throw new functions.https.HttpsError("already-exists", "Private room is full.");
    }

    const roomUpdates: Record<string, unknown> = {
      participantIds: nextParticipants,
      [`participantHeartbeat.${studentId}`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_EXPIRY_MS),
    };

    const existingMatchId = asString(roomData.matchId, "");
    if (nextParticipants.length === 2 && !existingMatchId) {
      const setup = setupFromRoomData(roomData);
      const playerAId = nextParticipants[0];
      const playerBId = nextParticipants[1];
      const matchId = await createOnlineMatchInTransaction(
        tx,
        db,
        setup,
        playerAId,
        playerBId,
        "private_room",
      );

      roomUpdates.status = "ready";
      roomUpdates.matchId = matchId;
      roomUpdates.readyAt = admin.firestore.FieldValue.serverTimestamp();
    }

    tx.update(roomRef, roomUpdates);

    joinedRoom = {
      ...roomData,
      ...roomUpdates,
      participantIds: nextParticipants,
    };
  });

  const latestRoomSnap = await roomRef.get();
  const roomData = latestRoomSnap.data() as Record<string, unknown>;
  const matchId = asString(roomData.matchId, "");

  let match: QuizBattleMatchStateResponse | undefined;
  if (matchId) {
    const matchRef = db.collection("quizBattleMatches").doc(matchId);
    await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
    const matchSnap = await matchRef.get();
    if (matchSnap.exists) {
      match = mapMatchStateForStudent(matchId, studentId, matchSnap.data() as Record<string, unknown>);
    }
  }

  return {
    success: true,
    room: mapRoomStateForStudent(roomRef.id, studentId, roomData || joinedRoom || {}),
    match,
  };
});

export const quizBattleGetPrivateRoomState = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const roomId = asString(data?.roomId);
  const roomCode = asString(data?.roomCode).toUpperCase();

  const db = admin.firestore();
  let roomRef: FirebaseFirestore.DocumentReference | null = null;

  if (roomId) {
    roomRef = db.collection("quizBattleRooms").doc(roomId);
  } else if (roomCode) {
    const roomDoc = await findPrivateRoomByCode(db, roomCode);
    roomRef = roomDoc ? roomDoc.ref : null;
  }

  if (!roomRef) {
    throw new functions.https.HttpsError("invalid-argument", "roomId or roomCode is required.");
  }

  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Private room was not found.");
  }

  const roomData = roomSnap.data() as Record<string, unknown>;
  assertRoomParticipant(studentId, roomData);

  const roomState = mapRoomStateForStudent(roomRef.id, studentId, roomData);
  let match: QuizBattleMatchStateResponse | undefined;
  if (roomState.matchId) {
    const matchRef = db.collection("quizBattleMatches").doc(roomState.matchId);
    await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
    const matchSnap = await matchRef.get();
    if (matchSnap.exists) {
      match = mapMatchStateForStudent(roomState.matchId, studentId, matchSnap.data() as Record<string, unknown>);
    }
  }

  return {
    success: true,
    room: roomState,
    match,
  };
});

export const quizBattleCreateBotMatch = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const setup = normalizeSetup(data?.setup);

  if (setup.mode !== "bot") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Bot matches require mode='bot'.",
    );
  }

  const db = admin.firestore();
  const created = await createBotMatchRecord(db, studentId, setup);

  return {
    success: true,
    matchId: created.matchId,
    status: "ready",
    botDifficulty: created.botDifficulty,
  };
});

export const quizBattleStartMatch = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const matchId = asString(data?.matchId);

  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument", "matchId is required.");
  }

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Match not found.");
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const participantA = asString(matchData.playerAId);
    const participantB = asString(matchData.playerBId);
    const mode = asString(matchData.mode, "bot") === "online" ? "online" : "bot";

    if (studentId !== participantA && studentId !== participantB) {
      throw new functions.https.HttpsError("permission-denied", "You are not a participant of this match.");
    }

    const status = asString(matchData.status, "ready");
    if (status === "completed") {
      return;
    }

    if (status === "in_progress") {
      return;
    }

    if (status !== "ready") {
      throw new functions.https.HttpsError("failed-precondition", "Match is not in a startable state.");
    }

    if (mode === "bot") {
      const timePerQuestionSec = clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180);
      const timing = createRoundTimingWindow(timePerQuestionSec);
      const updatePayload: Record<string, unknown> = {
        status: "in_progress" as MatchStatus,
        currentRound: 1,
        playerAReady: true,
        playerBReady: true,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        roundStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        roundStartedAtMs: timing.roundStartedAtMs,
        roundDeadlineAtMs: timing.roundDeadlineAtMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      applyLifecycleEventsToUpdate(matchData, updatePayload, [
        {
          eventType: "round_started",
          roundNumber: 1,
          deadlineAtMs: timing.roundDeadlineAtMs,
          scoreA: asNumber(matchData.scoreA, 0),
          scoreB: asNumber(matchData.scoreB, 0),
        },
      ]);
      tx.update(matchRef, updatePayload);
      return;
    }

    const currentAReady = asBoolean(matchData.playerAReady, false);
    const currentBReady = asBoolean(matchData.playerBReady, false);
    const nextAReady = participantA === studentId ? true : currentAReady;
    const nextBReady = participantB === studentId ? true : currentBReady;

    const updatePayload: Record<string, unknown> = {
      playerAReady: nextAReady,
      playerBReady: nextBReady,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (nextAReady && nextBReady) {
      const timePerQuestionSec = clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180);
      const timing = createRoundTimingWindow(timePerQuestionSec);
      updatePayload.status = "in_progress";
      updatePayload.currentRound = 1;
      updatePayload.startedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundStartedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundStartedAtMs = timing.roundStartedAtMs;
      updatePayload.roundDeadlineAtMs = timing.roundDeadlineAtMs;
      applyLifecycleEventsToUpdate(matchData, updatePayload, [
        {
          eventType: "round_started",
          roundNumber: 1,
          deadlineAtMs: timing.roundDeadlineAtMs,
          scoreA: asNumber(matchData.scoreA, 0),
          scoreB: asNumber(matchData.scoreB, 0),
        },
      ]);
    }

    tx.update(matchRef, updatePayload);
  });

  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Match missing after start operation.");
  }

  return {
    success: true,
    match: mapMatchStateForStudent(matchRef.id, studentId, matchSnap.data() as Record<string, unknown>),
  };
});

export const quizBattleGetMatchState = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const matchId = asString(data?.matchId);

  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument", "matchId is required.");
  }

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc(matchId);
  await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Match not found.");
  }

  const matchData = matchSnap.data() as Record<string, unknown>;
  const participantA = asString(matchData.playerAId);
  const participantB = asString(matchData.playerBId);

  if (studentId !== participantA && studentId !== participantB) {
    throw new functions.https.HttpsError("permission-denied", "You are not a participant of this match.");
  }

  return {
    success: true,
    match: mapMatchStateForStudent(matchRef.id, studentId, matchData),
  };
});

export const quizBattleSubmitAnswer = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const matchId = asString(data?.matchId);
  const roundNumber = Math.floor(asNumber(data?.roundNumber, 0));
  const selectedOptionIndex = asNullableNumber(data?.selectedOptionIndex);
  const clientResponseMs = clamp(Math.floor(asNumber(data?.responseMs, 0)), 0, 180000);
  const idempotencyKey = asString(data?.idempotencyKey, "");

  if (!matchId || roundNumber <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId and roundNumber are required.",
    );
  }

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc(matchId);
  const roundKeysRef = matchRef.collection("server").doc("roundKeys");

  await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);

  let duplicateSubmission = false;
  let completedInThisCall = false;

  await db.runTransaction(async (tx) => {
    const [matchSnap, keysSnap] = await Promise.all([
      tx.get(matchRef),
      tx.get(roundKeysRef),
    ]);

    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Match not found.");
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const participantA = asString(matchData.playerAId);
    const participantB = asString(matchData.playerBId);
    const mode = asString(matchData.mode, "bot") === "online" ? "online" : "bot";

    if (studentId !== participantA && studentId !== participantB) {
      throw new functions.https.HttpsError("permission-denied", "You are not a participant of this match.");
    }

    const isPlayerA = studentId === participantA;
    const status = asString(matchData.status, "ready");
    if (status !== "in_progress") {
      throw new functions.https.HttpsError("failed-precondition", "Match is not currently active.");
    }

    const totalRounds = clamp(Math.floor(asNumber(matchData.rounds, 1)), 1, 20);
    const currentRound = clamp(Math.floor(asNumber(matchData.currentRound, 1)), 1, totalRounds);
    const timePerQuestionSec = clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180);
    const timeLimitMs = getRoundTimeLimitMs(timePerQuestionSec);
    const boundedResponseMs = clamp(clientResponseMs, 0, timeLimitMs);

    const roundDeadlineAtMs = getRoundDeadlineAtMs(matchData);
    if (roundDeadlineAtMs > 0 && Date.now() > roundDeadlineAtMs) {
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "Round timer elapsed. Fetching latest state.",
      );
    }

    if (currentRound !== roundNumber) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Expected round ${currentRound}, received ${roundNumber}.`,
      );
    }

    const roundKeys = keysSnap.exists ? getRoundKeys(keysSnap.data()) : [];
    const correctOptionIndex = roundKeys[roundNumber - 1];
    if (typeof correctOptionIndex !== "number" || correctOptionIndex < 0) {
      throw new functions.https.HttpsError("internal", "Round answer key missing.");
    }

    const questionsRaw = Array.isArray(matchData.questions) ? matchData.questions : [];
    const currentQuestion = questionsRaw
      .filter((entry) => isRecord(entry))
      .find((entry) => Math.floor(asNumber(entry.roundNumber, 0)) === roundNumber);

    if (!currentQuestion) {
      throw new functions.https.HttpsError("internal", "Round question payload missing.");
    }

    const options = Array.isArray(currentQuestion.choices) ? currentQuestion.choices : [];
    const optionsCount = Math.max(options.length, 1);
    const normalizedSelection = normalizeSelection(selectedOptionIndex, optionsCount);

    const existingRoundResult = (Array.isArray(matchData.roundResults) ? matchData.roundResults : [])
      .filter((entry) => isRecord(entry))
      .find((entry) => Math.floor(asNumber(entry.roundNumber, 0)) === roundNumber);

    if (existingRoundResult) {
      duplicateSubmission = true;
      return;
    }

    if (mode === "bot") {
      if (!isPlayerA) {
        throw new functions.https.HttpsError("permission-denied", "Bot matches only accept answers from player A.");
      }

      const submissionRef = matchRef.collection("roundSubmissions").doc(`r${roundNumber}_a`);
      const submissionSnap = await tx.get(submissionRef);
      if (submissionSnap.exists) {
        duplicateSubmission = true;
        return;
      }

      const difficultyRaw = asString(matchData.difficulty, "medium");
      const botDifficulty = ALLOWED_DIFFICULTIES.has(difficultyRaw)
        ? (difficultyRaw as "easy" | "medium" | "hard" | "adaptive")
        : "medium";

      const playerACorrect = normalizedSelection !== null && normalizedSelection === correctOptionIndex;
      const botOutcome = simulateBotRoundOutcome(
        correctOptionIndex,
        optionsCount,
        botDifficulty,
        timePerQuestionSec,
      );
      const botResponseMs = clamp(Math.floor(botOutcome.responseMs), 0, timeLimitMs);

      const winner = pickRoundWinner(
        playerACorrect,
        botOutcome.correct,
        boundedResponseMs,
        botResponseMs,
      );

      const scoreA = asNumber(matchData.scoreA, 0) + (winner === "playerA" ? 1 : 0);
      const scoreB = asNumber(matchData.scoreB, 0) + (winner === "playerB" ? 1 : 0);

      const roundResult: StoredRoundResultRecord = {
        roundNumber,
        questionId: asString(currentQuestion.questionId),
        correctOptionIndex,
        playerASelectedIndex: normalizedSelection,
        playerBSelectedIndex: botOutcome.selectedIndex,
        playerACorrect,
        playerBCorrect: botOutcome.correct,
        winner,
        playerAResponseMs: boundedResponseMs,
        playerBResponseMs: botResponseMs,
        resolvedAtMs: Date.now(),
      };

      const isFinalRound = roundNumber >= totalRounds;
      const updatePayload: Record<string, unknown> = {
        scoreA,
        scoreB,
        roundResults: admin.firestore.FieldValue.arrayUnion(roundResult),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const lifecycleEvents: LifecycleEventInput[] = [
        {
          eventType: "round_result",
          roundNumber,
          winner,
          scoreA,
          scoreB,
          resolvedBy: "submission",
        },
      ];

      if (isFinalRound) {
        updatePayload.status = "completed";
        updatePayload.currentRound = totalRounds;
        updatePayload.endedAt = admin.firestore.FieldValue.serverTimestamp();
        updatePayload.roundDeadlineAtMs = 0;
        lifecycleEvents.push({
          eventType: "match_completed",
          roundNumber,
          winner,
          scoreA,
          scoreB,
          resolvedBy: "submission",
        });
        completedInThisCall = true;
      } else {
        const nextTiming = createRoundTimingWindow(timePerQuestionSec);
        updatePayload.currentRound = roundNumber + 1;
        updatePayload.roundStartedAt = admin.firestore.FieldValue.serverTimestamp();
        updatePayload.roundStartedAtMs = nextTiming.roundStartedAtMs;
        updatePayload.roundDeadlineAtMs = nextTiming.roundDeadlineAtMs;
        lifecycleEvents.push({
          eventType: "round_started",
          roundNumber: roundNumber + 1,
          deadlineAtMs: nextTiming.roundDeadlineAtMs,
          scoreA,
          scoreB,
        });
      }

      applyLifecycleEventsToUpdate(matchData, updatePayload, lifecycleEvents);
      tx.update(matchRef, updatePayload);
      tx.set(submissionRef, {
        studentId,
        roundNumber,
        selectedOptionIndex: normalizedSelection,
        responseMs: boundedResponseMs,
        idempotencyKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    const playerASubRef = matchRef.collection("roundSubmissions").doc(`r${roundNumber}_a`);
    const playerBSubRef = matchRef.collection("roundSubmissions").doc(`r${roundNumber}_b`);
    const ownRef = isPlayerA ? playerASubRef : playerBSubRef;
    const opponentRef = isPlayerA ? playerBSubRef : playerASubRef;

    const [ownSnap, opponentSnap] = await Promise.all([
      tx.get(ownRef),
      tx.get(opponentRef),
    ]);

    if (ownSnap.exists) {
      duplicateSubmission = true;
      return;
    }

    tx.set(ownRef, {
      studentId,
      roundNumber,
      selectedOptionIndex: normalizedSelection,
      responseMs: boundedResponseMs,
      idempotencyKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (!opponentSnap.exists) {
      const existingRoundStartedAtMs = Math.floor(asNumber(matchData.roundStartedAtMs, 0));
      const seededRoundStartMs = existingRoundStartedAtMs > 0 ? existingRoundStartedAtMs : Date.now();
      const effectiveDeadlineAtMs = roundDeadlineAtMs > 0 ? roundDeadlineAtMs : seededRoundStartMs + timeLimitMs;

      const waitingPayload: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (roundDeadlineAtMs <= 0) {
        waitingPayload.roundStartedAt = admin.firestore.FieldValue.serverTimestamp();
        waitingPayload.roundStartedAtMs = seededRoundStartMs;
        waitingPayload.roundDeadlineAtMs = effectiveDeadlineAtMs;
      }

      applyLifecycleEventsToUpdate(matchData, waitingPayload, [
        {
          eventType: "answer_locked",
          roundNumber,
          answeredCount: 1,
          lockedByStudentId: studentId,
          deadlineAtMs: effectiveDeadlineAtMs,
          scoreA: asNumber(matchData.scoreA, 0),
          scoreB: asNumber(matchData.scoreB, 0),
        },
      ]);
      tx.update(matchRef, waitingPayload);
      return;
    }

    const opponentData = opponentSnap.data() as Record<string, unknown>;
    const playerASelection = isPlayerA
      ? normalizedSelection
      : normalizeSelection(asNullableNumber(opponentData.selectedOptionIndex), optionsCount);
    const playerBSelection = isPlayerA
      ? normalizeSelection(asNullableNumber(opponentData.selectedOptionIndex), optionsCount)
      : normalizedSelection;

    const playerAResponseMs = isPlayerA
      ? boundedResponseMs
      : clamp(Math.floor(asNumber(opponentData.responseMs, timeLimitMs)), 0, timeLimitMs);
    const playerBResponseMs = isPlayerA
      ? clamp(Math.floor(asNumber(opponentData.responseMs, timeLimitMs)), 0, timeLimitMs)
      : boundedResponseMs;

    const playerACorrect = playerASelection !== null && playerASelection === correctOptionIndex;
    const playerBCorrect = playerBSelection !== null && playerBSelection === correctOptionIndex;
    const winner = pickRoundWinner(playerACorrect, playerBCorrect, playerAResponseMs, playerBResponseMs);

    const scoreA = asNumber(matchData.scoreA, 0) + (winner === "playerA" ? 1 : 0);
    const scoreB = asNumber(matchData.scoreB, 0) + (winner === "playerB" ? 1 : 0);

    const roundResult: StoredRoundResultRecord = {
      roundNumber,
      questionId: asString(currentQuestion.questionId),
      correctOptionIndex,
      playerASelectedIndex: playerASelection,
      playerBSelectedIndex: playerBSelection,
      playerACorrect,
      playerBCorrect,
      winner,
      playerAResponseMs,
      playerBResponseMs,
      resolvedAtMs: Date.now(),
    };

    const isFinalRound = roundNumber >= totalRounds;
    const updatePayload: Record<string, unknown> = {
      scoreA,
      scoreB,
      roundResults: admin.firestore.FieldValue.arrayUnion(roundResult),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const lifecycleEvents: LifecycleEventInput[] = [
      {
        eventType: "round_result",
        roundNumber,
        winner,
        scoreA,
        scoreB,
        resolvedBy: "submission",
      },
    ];

    if (isFinalRound) {
      updatePayload.status = "completed";
      updatePayload.currentRound = totalRounds;
      updatePayload.endedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundDeadlineAtMs = 0;
      lifecycleEvents.push({
        eventType: "match_completed",
        roundNumber,
        winner,
        scoreA,
        scoreB,
        resolvedBy: "submission",
      });
      completedInThisCall = true;
    } else {
      const nextTiming = createRoundTimingWindow(timePerQuestionSec);
      updatePayload.currentRound = roundNumber + 1;
      updatePayload.roundStartedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.roundStartedAtMs = nextTiming.roundStartedAtMs;
      updatePayload.roundDeadlineAtMs = nextTiming.roundDeadlineAtMs;
      lifecycleEvents.push({
        eventType: "round_started",
        roundNumber: roundNumber + 1,
        deadlineAtMs: nextTiming.roundDeadlineAtMs,
        scoreA,
        scoreB,
      });
    }

    applyLifecycleEventsToUpdate(matchData, updatePayload, lifecycleEvents);
    tx.update(matchRef, updatePayload);
    tx.set(ownRef, {
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      winner,
    }, { merge: true });
    tx.set(opponentRef, {
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      winner,
    }, { merge: true });
  });

  let completion: { outcome: MatchOutcome; xpEarned: number } | undefined;
  if (completedInThisCall) {
    completion = await finalizeCompletedMatch(db, matchRef, studentId);
  }

  await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);

  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Match not found after answer submission.");
  }

  const mappedMatch = mapMatchStateForStudent(matchRef.id, studentId, matchSnap.data() as Record<string, unknown>);
  const roundResult = mappedMatch.roundResults.find((entry) => entry.roundNumber === roundNumber) || null;

  if (!completion && mappedMatch.status === "completed") {
    const fallbackOutcome = mappedMatch.outcome || "draw";
    completion = {
      outcome: fallbackOutcome,
      xpEarned: mappedMatch.xpEarned ?? xpForOutcome(fallbackOutcome),
    };
  }

  return {
    success: true,
    duplicate: duplicateSubmission,
    roundResult,
    completion,
    match: mappedMatch,
  };
});

export const quizBattleRequestRematch = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const matchId = asString(data?.matchId);

  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument", "matchId is required.");
  }

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Source match was not found.");
  }

  const matchData = matchSnap.data() as Record<string, unknown>;
  const participantA = asString(matchData.playerAId);
  if (participantA !== studentId) {
    throw new functions.https.HttpsError("permission-denied", "Only the initiating student can request rematch in this version.");
  }

  if (asString(matchData.mode, "bot") !== "bot") {
    throw new functions.https.HttpsError("failed-precondition", "Rematch is currently available for bot matches only.");
  }

  if (asString(matchData.status) !== "completed") {
    throw new functions.https.HttpsError("failed-precondition", "Rematch is only available after match completion.");
  }

  const rematchSetup: NormalizedBattleSetup = {
    mode: "bot",
    subjectId: asString(matchData.subjectId, "gen-math"),
    topicId: asString(matchData.topicId, "unknown-topic"),
    difficulty: ["easy", "medium", "hard"].includes(asString(matchData.difficulty))
      ? (asString(matchData.difficulty) as "easy" | "medium" | "hard")
      : "medium",
    rounds: clamp(Math.floor(asNumber(matchData.rounds, 5)), 3, 20),
    timePerQuestionSec: clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180),
    queueType: "public_matchmaking",
    botDifficulty: ALLOWED_DIFFICULTIES.has(asString(matchData.difficulty, "medium"))
      ? (asString(matchData.difficulty) as "easy" | "medium" | "hard" | "adaptive")
      : "medium",
    adaptiveBot: asString(matchData.difficulty) === "adaptive",
  };

  const created = await createBotMatchRecord(db, studentId, rematchSetup);

  return {
    success: true,
    matchId: created.matchId,
    status: "ready",
    botDifficulty: created.botDifficulty,
  };
});

export const quizBattleHeartbeat = functions.https.onCall(async (data, context) => {
  const studentId = await requireStudentUid(context);
  const scopeRaw = asString(data?.scope);
  const scope = HEARTBEAT_SCOPES.has(scopeRaw) ? (scopeRaw as HeartbeatScope) : null;
  const resourceId = asString(data?.resourceId);

  if (!scope || !resourceId) {
    throw new functions.https.HttpsError("invalid-argument", "scope and resourceId are required.");
  }

  const db = admin.firestore();

  let effectiveResourceId = resourceId;
  let queueRef: FirebaseFirestore.DocumentReference | null = null;
  let roomRef: FirebaseFirestore.DocumentReference | null = null;
  let roomData: Record<string, unknown> | null = null;
  let matchRef: FirebaseFirestore.DocumentReference | null = null;

  if (scope === "queue") {
    if (resourceId !== studentId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Queue heartbeat resourceId must match the authenticated student."
      );
    }

    queueRef = db.collection("quizBattleQueue").doc(studentId);
    const queueSnap = await queueRef.get();
    if (!queueSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Queue entry not found.");
    }

    effectiveResourceId = studentId;
  }

  if (scope === "room") {
    roomRef = db.collection("quizBattleRooms").doc(resourceId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Room not found.");
    }

    roomData = roomSnap.data() as Record<string, unknown>;
    assertRoomParticipant(studentId, roomData);
  }

  if (scope === "match") {
    matchRef = db.collection("quizBattleMatches").doc(resourceId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Match not found.");
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const participantA = asString(matchData.playerAId);
    const participantB = asString(matchData.playerBId);
    if (studentId !== participantA && studentId !== participantB) {
      throw new functions.https.HttpsError("permission-denied", "You are not a participant of this match.");
    }
  }

  try {
    await writePresenceHeartbeat(studentId, scope, effectiveResourceId);
  } catch (error) {
    functions.logger.warn("Failed to write quiz battle presence heartbeat.", {
      studentId,
      scope,
      resourceId: effectiveResourceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (scope === "queue" && queueRef) {
    await queueRef.update({
      heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await resolvePublicMatchmakingPass(db, 1);
  }

  if (scope === "room" && roomRef && roomData) {
    await roomRef.update({
      [`participantHeartbeat.${studentId}`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  if (scope === "match" && matchRef) {
    await matchRef.update({
      [`presence.${studentId}.heartbeatAt`]: admin.firestore.FieldValue.serverTimestamp(),
      [`presence.${studentId}.online`]: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
  }

  return {
    success: true,
    scope,
    resourceId: effectiveResourceId,
  };
});

export const quizBattleResumeSession = functions.https.onCall(async (_data, context): Promise<ResumeSessionResponse> => {
  const studentId = await requireStudentUid(context);
  const db = admin.firestore();

  const queueRef = db.collection("quizBattleQueue").doc(studentId);
  const [queueSnap, playerAMatchesSnap, playerBMatchesSnap, roomSnap] = await Promise.all([
    queueRef.get(),
    db.collection("quizBattleMatches").where("playerAId", "==", studentId).limit(10).get(),
    db.collection("quizBattleMatches").where("playerBId", "==", studentId).limit(10).get(),
    db.collection("quizBattleRooms").where("participantIds", "array-contains", studentId).limit(6).get(),
  ]);

  const mergedMatches = [...playerAMatchesSnap.docs, ...playerBMatchesSnap.docs];
  const activeMatches = mergedMatches
    .map((doc) => ({
      doc,
      data: doc.data() as Record<string, unknown>,
      updatedMs: asTimestampMillis((doc.data() as Record<string, unknown>).updatedAt, 0),
    }))
    .filter((entry) => {
      const status = asString(entry.data.status, "ready");
      return status === "ready" || status === "in_progress";
    })
    .sort((a, b) => b.updatedMs - a.updatedMs);

  if (activeMatches.length > 0) {
    const active = activeMatches[0];
    await progressAndFinalizeMatchIfNeeded(db, active.doc.ref, studentId);
    const refreshedMatchSnap = await active.doc.ref.get();
    if (refreshedMatchSnap.exists) {
      const refreshedData = refreshedMatchSnap.data() as Record<string, unknown>;
      return {
        success: true,
        sessionType: "match",
        match: mapMatchStateForStudent(active.doc.id, studentId, refreshedData),
      };
    }

    return {
      success: true,
      sessionType: "match",
      match: mapMatchStateForStudent(active.doc.id, studentId, active.data),
    };
  }

  const queueData = queueSnap.exists ? (queueSnap.data() as Record<string, unknown>) : null;
  const queueStatus = queueData ? asString(queueData.status, "searching") : "";
  const queueMatchId = queueData ? asString(queueData.matchId, "") : "";

  if (queueData && queueStatus === "matched" && queueMatchId) {
    const matchRef = db.collection("quizBattleMatches").doc(queueMatchId);
    await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
    const matchSnap = await matchRef.get();
    if (matchSnap.exists) {
      return {
        success: true,
        sessionType: "match",
        queue: {
          status: "matched",
          queueType: "public_matchmaking",
          matchId: queueMatchId,
        },
        match: mapMatchStateForStudent(queueMatchId, studentId, matchSnap.data() as Record<string, unknown>),
      };
    }
  }

  const candidateRooms = roomSnap.docs
    .map((doc) => ({
      doc,
      data: doc.data() as Record<string, unknown>,
      updatedMs: asTimestampMillis((doc.data() as Record<string, unknown>).updatedAt, 0),
    }))
    .filter((entry) => {
      const status = normalizeRoomStatus(entry.data.status);
      return status === "waiting" || status === "ready";
    })
    .sort((a, b) => b.updatedMs - a.updatedMs);

  if (candidateRooms.length > 0) {
    const activeRoom = candidateRooms[0];
    const room = mapRoomStateForStudent(activeRoom.doc.id, studentId, activeRoom.data);
    let match: QuizBattleMatchStateResponse | undefined;

    if (room.matchId) {
      const matchRef = db.collection("quizBattleMatches").doc(room.matchId);
      await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
      const matchSnap = await matchRef.get();
      if (matchSnap.exists) {
        match = mapMatchStateForStudent(room.matchId, studentId, matchSnap.data() as Record<string, unknown>);
        return {
          success: true,
          sessionType: "match",
          room,
          match,
        };
      }
    }

    return {
      success: true,
      sessionType: "room",
      room,
    };
  }

  if (queueData && queueStatus === "searching") {
    return {
      success: true,
      sessionType: "queue",
      queue: {
        status: "searching",
        queueType: "public_matchmaking",
      },
    };
  }

  return {
    success: true,
    sessionType: "idle",
  };
});

export const quizBattleResolvePublicMatchmakingSweep = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const db = admin.firestore();
    const summary = await resolvePublicMatchmakingPass(db, MAX_MATCHMAKING_PAIRS_PER_PASS);
    functions.logger.info("[QUIZ_BATTLE] Matchmaking sweep complete", summary);
    return null;
  });
