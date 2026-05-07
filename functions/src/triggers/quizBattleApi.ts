import axios from "axios";
import { createHash } from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { resolveCurriculumVersionSetId } from "../config/diagnosticPolicies";
import { createRuntimeCacheKey, runtimeCache } from "../services/runtimeCache";

const ALLOWED_SUBJECT_IDS = new Set(["gen-math", "stats-prob", "pre-calc", "basic-calc"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard", "adaptive"]);
const ALLOWED_QUEUE_TYPES = new Set(["public_matchmaking", "private_room"]);
const ALLOWED_MODES = new Set(["online", "bot"]);
const HEARTBEAT_SCOPES = new Set(["queue", "room", "match"]);

const QUEUE_HEARTBEAT_STALE_MS = 90000;
const QUEUE_MATCHED_TTL_MS = 5 * 60 * 1000;
const ROOM_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ROOM_EMPTY_GRACE_MS = 60 * 1000;
const ROOM_TIMEOUT_SWEEP_CONCURRENCY = 12;
const MAX_MATCHMAKING_PAIRS_PER_PASS = 20;
const PUBLIC_MATCHMAKING_TIMEOUT_MS = 5 * 60 * 1000;

const isEnvFlagEnabled = (raw: string | undefined, fallback = false): boolean => {
  if (typeof raw !== "string") return fallback;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const QUIZ_BATTLE_QUESTION_BANK_COLLECTION =
  (process.env.QUIZ_BATTLE_QUESTION_BANK_COLLECTION || "quizBattleQuestionBank").trim();
const QUIZ_BATTLE_QUESTION_BANK_QUERY_LIMIT = clampNumberEnv(
  process.env.QUIZ_BATTLE_QUESTION_BANK_QUERY_LIMIT,
  240,
  30,
  800,
);
const QUIZ_BATTLE_ALLOW_STATIC_BANK_FALLBACK = isEnvFlagEnabled(
  process.env.QUIZ_BATTLE_ALLOW_STATIC_BANK_FALLBACK,
  true,
);
const QUIZ_BATTLE_ENFORCE_GRADE_SEGREGATION = isEnvFlagEnabled(
  process.env.QUIZ_BATTLE_ENFORCE_GRADE_SEGREGATION,
  true,
);
const QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE = isEnvFlagEnabled(
  process.env.QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE,
  false,
);
const QUIZ_BATTLE_REQUIRE_AI_SOURCE_FOR_START = isEnvFlagEnabled(
  process.env.QUIZ_BATTLE_REQUIRE_AI_SOURCE_FOR_START,
  false,
);
const QUIZ_BATTLE_QUESTION_BANK_CACHE_TTL_MS = clampNumberEnv(
  process.env.QUIZ_BATTLE_QUESTION_BANK_CACHE_TTL_MS,
  45_000,
  5_000,
  300_000,
);
const QUIZ_BATTLE_PROFILE_CACHE_TTL_MS = clampNumberEnv(
  process.env.QUIZ_BATTLE_PROFILE_CACHE_TTL_MS,
  30_000,
  5_000,
  180_000,
);

function clampNumberEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw || String(fallback));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

// ── FastAPI Question Bank Integration ───────────────────────────────

const FASTAPI_BACKEND_URL = process.env.BACKEND_URL || "https://deign86-mathpulse-api-v3test.hf.space";
const QUIZ_BATTLE_INTERNAL_SECRET = process.env.QUIZ_BATTLE_INTERNAL_SECRET || "";

interface FastAPIQuestion {
  question: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  grade_level: number;
  source_chunk_id: string;
  variance_applied?: string[];
}

interface FastAPIGenerateResponse {
  questions: FastAPIQuestion[];
  session_id: string;
}

const fetchQuestionsFromFastAPI = async (
  matchId: string,
  playerIds: string[],
  gradeLevel: number,
  topic: string,
  questionCount: number,
): Promise<GeneratedAiQuestionSet | null> => {
  if (!QUIZ_BATTLE_INTERNAL_SECRET) {
    functions.logger.warn("[QUIZ_BATTLE] QUIZ_BATTLE_INTERNAL_SECRET not set, skipping FastAPI question fetch");
    return null;
  }

  try {
    const response = await axios.post<FastAPIGenerateResponse>(
      `${FASTAPI_BACKEND_URL}/api/quiz-battle/generate`,
      {
        grade_level: gradeLevel,
        topic,
        question_count: questionCount,
        session_id: matchId,
        player_ids: playerIds,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service": QUIZ_BATTLE_INTERNAL_SECRET,
        },
        timeout: 30_000,
      },
    );

    const data = response.data;
    if (!data.questions || data.questions.length === 0) {
      functions.logger.warn("[QUIZ_BATTLE] FastAPI returned empty questions");
      return null;
    }

    // Convert FastAPI format to BattleQuestionPublic[]
    const questions: BattleQuestionPublic[] = data.questions.map((q: FastAPIQuestion, idx: number) => ({
      roundNumber: idx + 1,
      questionId: `${q.source_chunk_id || "rag"}_${idx}`,
      prompt: q.question,
      choices: q.choices,
    }));

    // Extract answer keys from correct_answer field
    const answerKeys = data.questions.map((q: FastAPIQuestion) => {
      const letter = q.correct_answer;
      return letter.charCodeAt(0) - "A".charCodeAt(0);
    });

    const questionFingerprints = questions.map((q) => computeQuestionFingerprint(q));

    functions.logger.info("[QUIZ_BATTLE] FastAPI question fetch succeeded", {
      matchId,
      questionCount: questions.length,
      topic,
      gradeLevel,
    });

    return {
      questions,
      answerKeys,
      questionSetId: `fastapi-${matchId}`,
      questionFingerprints,
      attempts: 1,
      latencyMs: 0,
      model: "fastapi-rag",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    functions.logger.warn("[QUIZ_BATTLE] FastAPI question fetch failed, falling back to AI generation", {
      matchId,
      error: message,
    });
    return null;
  }
};

type QueueStatus = "searching" | "matched" | "cancelled";
type MatchStatus = "ready" | "in_progress" | "completed" | "cancelled";
type RoomStatus = "waiting" | "ready" | "cancelled" | "expired";
type RoundWinner = "playerA" | "playerB" | "draw";
import { MatchOutcome } from '../scoring/scoringEngine';
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
  playerAScoreBreakdown?: RoundScoreBreakdown;
  playerBScoreBreakdown?: RoundScoreBreakdown;
}

import { RoundScoreBreakdown, MatchXPBreakdown } from '../scoring/scoringEngine';

interface RoundResultRecord {
  roundNumber: number;
  questionId: string;
  correctOptionIndex: number;
  studentSelectedIndex: number | null;
  studentCorrect: boolean;
  botSelectedIndex: number;
  opponentSelectedIndex: number | null;
  botCorrect: boolean;
  winner: RoundWinner;
  playerAResponseMs: number;
  botResponseMs: number;
  resolvedAtMs: number;
  scoreBreakdown?: RoundScoreBreakdown;
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
  expiresAtMs?: number;
  lifecycle?: MatchLifecycleStateResponse;
  currentQuestion: BattleQuestionPublic | null;
  roundResults: RoundResultRecord[];
  outcome?: MatchOutcome;
  xpEarned?: number;
  xpBreakdown?: MatchXPBreakdown;
}

interface QuizBattleGenerationAuditResponse {
  success: boolean;
  matchId: string;
  status: MatchStatus;
  questionSetSource: string;
  questionSetId: string;
  generatedQuestionCount: number;
  questionFingerprints: string[];
  aiGenerationAttempted: boolean;
  aiGenerationAttempts: number;
  aiGenerationLatencyMs: number;
  aiGenerationModel: string;
  generationFailureReason: string;
  questionSetGeneratedAtMs?: number;
  isAiSource: boolean;
  auditSchemaVersion: "qb-generation-audit-v1";
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
    expiresAtMs?: number;
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
  sharedPoolMode: "grade_strict" | "admin_shared";
}

type BattleGradeLevel = 11 | 12;
type BattleGradeLabel = "Grade 11" | "Grade 12";
type BattleCurriculumVersion = "strengthened" | "legacy" | "transition";
type BattleQuestionSourceType = "premade" | "teacher-authored" | "reviewed-ai" | "imported";

interface BattlePlayerEligibility {
  uid: string;
  displayName: string;
  photo: string;
  gradeLevel: BattleGradeLevel;
  gradeLabel: BattleGradeLabel;
  school: string;
  curriculumVersionSetId: string;
  curriculumVersion: BattleCurriculumVersion;
}

interface CanonicalBattleQuestion {
  id: string;
  subject: string;
  gradeLevel: BattleGradeLevel;
  curriculumVersion: BattleCurriculumVersion;
  curriculumTrack: string;
  schoolYearApplicability: string[];
  topic: string;
  subtopic: string;
  competencyCode: string;
  competencyText: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "multiple_choice";
  stem: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  tags: string[];
  language: string;
  isActive: boolean;
  sourceType: BattleQuestionSourceType;
  sourceReference: string;
  variantGroupId: string;
  reviewedBy: string;
  reviewedAt: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

interface QuestionPoolSelector {
  gradeLevel?: BattleGradeLevel;
  curriculumVersion?: BattleCurriculumVersion;
  curriculumVersionSetId?: string;
  subjectId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  sharedPoolMode: "grade_strict" | "admin_shared";
}

interface BattleQuestionCandidate {
  questionId: string;
  prompt: string;
  choices: string[];
  correctOptionIndex: number;
  difficulty: "easy" | "medium" | "hard";
}

interface QuestionSetBundle {
  questions: BattleQuestionPublic[];
  answerKeys: number[];
  difficulties: ('easy' | 'medium' | 'hard')[];
  source: "ai" | "bank";
  servedQuestionIds: string[];
  selector: QuestionPoolSelector;
}

type QuizBattleGenerationFailureReason =
  | "missing_ai_token"
  | "non_qwen_model_override"
  | "ai_timeout"
  | "ai_upstream_error"
  | "ai_payload_invalid"
  | "ai_insufficient_unique_questions"
  | "ai_generation_in_progress"
  | "ai_non_ai_source_blocked"
  | "ai_unknown_error";

interface GeneratedAiQuestionSet {
  questions: BattleQuestionPublic[];
  answerKeys: number[];
  questionSetId: string;
  questionFingerprints: string[];
  attempts: number;
  latencyMs: number;
  model: string;
}

class QuizBattleGenerationError extends Error {
  readonly reason: QuizBattleGenerationFailureReason;
  readonly retriable: boolean;

  constructor(reason: QuizBattleGenerationFailureReason, message: string, retriable: boolean) {
    super(message);
    this.reason = reason;
    this.retriable = retriable;
  }
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
  {
    questionId: "qb-gm-05",
    subjectId: "gen-math",
    topicId: "functions",
    prompt: "If f(x)=2x+3 and g(x)=x-1, what is (f o g)(4)?",
    choices: ["7", "8", "9", "10"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-gm-06",
    subjectId: "gen-math",
    topicId: "business-math",
    prompt: "An item priced at 1200 gets a 15% discount. What is the final price?",
    choices: ["960", "1020", "1080", "1140"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-gm-07",
    subjectId: "gen-math",
    topicId: "logic",
    prompt: "Which expression is logically equivalent to p -> q?",
    choices: ["p AND q", "p OR q", "NOT p OR q", "NOT p AND NOT q"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-gm-08",
    subjectId: "gen-math",
    topicId: "business-math",
    prompt: "If simple interest I=450, principal P=3000, and rate r=5% per year, what is the time t?",
    choices: ["2 years", "3 years", "4 years", "5 years"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-05",
    subjectId: "stats-prob",
    topicId: "statistics",
    prompt: "Find the mean of 2, 4, 4, 6, and 8.",
    choices: ["4.4", "4.8", "5.0", "5.2"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-06",
    subjectId: "stats-prob",
    topicId: "normal-distribution",
    prompt: "For z=1.00 in the standard normal distribution, the area to the left is approximately:",
    choices: ["0.5000", "0.6827", "0.8413", "0.9772"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-07",
    subjectId: "stats-prob",
    topicId: "sampling",
    prompt: "A sample statistic used to estimate a population parameter is called a:",
    choices: ["Bias", "Estimator", "Variance", "Residual"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-sp-08",
    subjectId: "stats-prob",
    topicId: "probability",
    prompt: "If events A and B are independent, then P(A intersection B) equals:",
    choices: ["P(A)+P(B)", "P(A)-P(B)", "P(A)P(B)", "P(A|B)"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-05",
    subjectId: "pre-calc",
    topicId: "sequences",
    prompt: "In an arithmetic sequence with a1=5 and d=3, what is a10?",
    choices: ["30", "32", "35", "38"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-06",
    subjectId: "pre-calc",
    topicId: "trigonometry",
    prompt: "cos(60 degrees) is equal to:",
    choices: ["sqrt(3)/2", "1/2", "0", "1"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-07",
    subjectId: "pre-calc",
    topicId: "conics",
    prompt: "Which equation represents a circle with center at the origin and radius 4?",
    choices: ["x^2+y^2=8", "x^2+y^2=16", "x^2-y^2=16", "(x-4)^2+y^2=16"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-pc-08",
    subjectId: "pre-calc",
    topicId: "functions",
    prompt: "If h(x)=3x-2, what is h^(-1)(13)?",
    choices: ["3", "4", "5", "6"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-05",
    subjectId: "basic-calc",
    topicId: "derivatives",
    prompt: "What is the derivative of sin(x)?",
    choices: ["sin(x)", "-sin(x)", "cos(x)", "-cos(x)"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-06",
    subjectId: "basic-calc",
    topicId: "integration",
    prompt: "The integral of 1/x with respect to x is:",
    choices: ["x^-1 + C", "ln|x| + C", "e^x + C", "x ln(x) + C"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-07",
    subjectId: "basic-calc",
    topicId: "applications",
    prompt: "If s(t)=t^2+2t, what is the velocity at t=3?",
    choices: ["6", "7", "8", "9"],
    correctOptionIndex: 2,
    difficulty: "medium",
  },
  {
    questionId: "qb-bc-08",
    subjectId: "basic-calc",
    topicId: "limits",
    prompt: "Evaluate lim x->0 of sin(x)/x.",
    choices: ["0", "1", "Undefined", "Infinity"],
    correctOptionIndex: 1,
    difficulty: "medium",
  },
];

import { clamp } from '../utils/math';

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

const parseGradeLevel = (raw: unknown): BattleGradeLevel | null => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (Math.floor(raw) === 11) return 11;
    if (Math.floor(raw) === 12) return 12;
  }

  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "11" || normalized === "grade 11" || normalized.includes("11")) return 11;
  if (normalized === "12" || normalized === "grade 12" || normalized.includes("12")) return 12;
  return null;
};

const toGradeLabel = (gradeLevel: BattleGradeLevel): BattleGradeLabel => {
  return gradeLevel === 11 ? "Grade 11" : "Grade 12";
};

const normalizeCurriculumVersion = (
  rawVersion: unknown,
  fallbackVersionSetId = "",
): BattleCurriculumVersion => {
  const direct = asString(rawVersion, "").toLowerCase();
  const fallback = asString(fallbackVersionSetId, "").toLowerCase();
  const merged = `${direct} ${fallback}`;

  if (direct === "legacy" || direct === "strengthened" || direct === "transition") {
    return direct;
  }

  if (merged.includes("legacy")) {
    return "legacy";
  }

  if (merged.includes("transition") || merged.includes("pilot")) {
    return "transition";
  }

  return "strengthened";
};

const createDeterministicRandomIntFactory = (seedText: string): ((min: number, max: number) => number) => {
  let cursor = 0;

  return (min: number, max: number): number => {
    if (max <= min) return min;

    const digest = createHash("sha256").update(`${seedText}:${cursor}`).digest();
    cursor += 1;
    const bucket = digest.readUInt32BE(0);
    const span = max - min + 1;
    return min + (bucket % span);
  };
};

const STATIC_BANK_GRADE_BY_SUBJECT: Record<string, BattleGradeLevel> = {
  "gen-math": 11,
  "stats-prob": 11,
  "pre-calc": 12,
  "basic-calc": 12,
};

const buildProfileError = (reason: string, message: string): functions.https.HttpsError => {
  return new functions.https.HttpsError(
    "failed-precondition",
    message,
    { reason },
  );
};

const mapUserDataToEligibility = (
  uid: string,
  userData: Record<string, unknown>,
): BattlePlayerEligibility => {
  const gradeLevel = parseGradeLevel(userData.grade ?? userData.gradeLevel);
  if (!gradeLevel) {
    throw buildProfileError(
      "profile_missing_grade_level",
      "Quiz Battle requires a valid learner grade level (Grade 11 or Grade 12).",
    );
  }

  const gradeLabel = toGradeLabel(gradeLevel);
  const curriculumVersionSetId =
    asString(userData.currentCurriculumVersionSetId, "") ||
    resolveCurriculumVersionSetId(gradeLabel);

  return {
    uid,
    displayName: asString(userData.displayName, asString(userData.name, "Student")),
    photo: asString(userData.photo),
    gradeLevel,
    gradeLabel,
    school: asString(userData.school, ""),
    curriculumVersionSetId,
    curriculumVersion: normalizeCurriculumVersion(userData.curriculumVersion, curriculumVersionSetId),
  };
};

const normalizeQuizBattleMode = (value: unknown): "online" | "bot" => {
  return asString(value, "bot") === "online" ? "online" : "bot";
};

const shouldBlockStartDueToNonAiSource = (params: {
  status: unknown;
  mode: unknown;
  questionSetSource: unknown;
  requireAiSourceForStart?: boolean;
}): boolean => {
  if (!(params.requireAiSourceForStart ?? QUIZ_BATTLE_REQUIRE_AI_SOURCE_FOR_START)) {
    return false;
  }

  if (asString(params.status, "ready") !== "ready") {
    return false;
  }

  if (normalizeQuizBattleMode(params.mode) !== "online") {
    return false;
  }

  // Temporary unblock: allow seeded bank questions when AI generation is unstable.
  if (asString(params.questionSetSource, "") === "bank") {
    return false;
  }

  return asString(params.questionSetSource, "") !== "ai";
};

const SUBJECT_LABELS: Record<string, string> = {
  "gen-math": "General Mathematics",
  "stats-prob": "Statistics and Probability",
  "pre-calc": "Pre-Calculus",
  "basic-calc": "Basic Calculus",
};

const QUIZ_BATTLE_AI_CHAT_URL =
  process.env.QUIZ_BATTLE_AI_CHAT_URL ||
  process.env.INFERENCE_HF_CHAT_URL ||
  "https://router.huggingface.co/v1/chat/completions";

const QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE =
  "Question generation temporarily unavailable. Please retry in a moment.";
const DEFAULT_QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen3-32B";
const QUIZ_BATTLE_AI_BACKOFF_BASE_MS = 300;
const QUIZ_BATTLE_AI_BACKOFF_MAX_MS = 3200;
const QUIZ_BATTLE_AI_BACKOFF_JITTER_MS = 250;
const QUIZ_BATTLE_AI_GENERATION_LOCK_TTL_MS = 45000;

const quizBattleAiTimeoutRaw = Number(process.env.QUIZ_BATTLE_AI_TIMEOUT_MS || "25000");
const QUIZ_BATTLE_AI_TIMEOUT_MS = Number.isFinite(quizBattleAiTimeoutRaw)
  ? Math.max(8000, Math.min(120000, Math.floor(quizBattleAiTimeoutRaw)))
  : 25000;

const quizBattleAiRetriesRaw = Number(process.env.QUIZ_BATTLE_AI_MAX_RETRIES || "2");
const QUIZ_BATTLE_AI_MAX_RETRIES = Number.isFinite(quizBattleAiRetriesRaw)
  ? Math.max(1, Math.min(4, Math.floor(quizBattleAiRetriesRaw)))
  : 2;

const quizBattleAiMaxTokensRaw = Number(process.env.QUIZ_BATTLE_AI_MAX_TOKENS || "640");
const QUIZ_BATTLE_AI_MAX_TOKENS = Number.isFinite(quizBattleAiMaxTokensRaw)
  ? Math.max(256, Math.min(4096, Math.floor(quizBattleAiMaxTokensRaw)))
  : 640;

const extractAiErrorDetail = (data: unknown): string => {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data.trim();
  }

  if (!isRecord(data)) {
    return "";
  }

  const direct = asString(data.message, "") || asString(data.error_description, "") || asString(data.detail, "");
  if (direct) {
    return direct;
  }

  if (isRecord(data.error)) {
    const nested = asString(data.error.message, "") || asString(data.error.detail, "");
    if (nested) {
      return nested;
    }
  }

  return "";
};

const shouldRetryWithoutStructuredJsonMode = (error: unknown, structuredJsonModeEnabled: boolean): boolean => {
  if (!structuredJsonModeEnabled || !axios.isAxiosError(error)) {
    return false;
  }

  const statusCode = error.response?.status ?? 0;
  return statusCode === 400;
};

const resolveQuizBattleAiToken = (): string => {
  return asString(
    process.env.QUIZ_BATTLE_AI_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HUGGING_FACE_API_TOKEN ||
    process.env.HUGGINGFACE_API_TOKEN ||
    "",
  );
};

const normalizeModelBaseId = (modelId: string): string => {
  return asString(modelId).split(":")[0].trim();
};

const isQwenFamilyModel = (modelId: string): boolean => {
  return /^qwen\//i.test(normalizeModelBaseId(modelId));
};

const resolveQuizBattleAiModel = (): string => {
  const explicitOverride = asString(process.env.QUIZ_BATTLE_AI_MODEL, "");
  if (explicitOverride) {
    if (!isQwenFamilyModel(explicitOverride)) {
      throw new QuizBattleGenerationError(
        "non_qwen_model_override",
        `QUIZ_BATTLE_AI_MODEL must be a Qwen-family model for Quiz Battle. Received '${explicitOverride}'.`,
        false,
      );
    }
    return explicitOverride;
  }

  return DEFAULT_QUIZ_BATTLE_AI_MODEL;
};

const resolveQuizBattleAiModelName = (): string => {
  const resolved = resolveQuizBattleAiModel();
  return resolved.includes(":") ? resolved : `${resolved}:fastest`;
};

const waitForMs = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.floor(durationMs))));
};

const computeRetryDelayMs = (
  attempt: number,
  randomInt: (min: number, max: number) => number = randomInRange,
): number => {
  const exponent = Math.max(0, attempt - 1);
  const baseDelayMs = Math.min(
    QUIZ_BATTLE_AI_BACKOFF_MAX_MS,
    QUIZ_BATTLE_AI_BACKOFF_BASE_MS * (2 ** exponent),
  );
  const jitterMs = randomInt(0, QUIZ_BATTLE_AI_BACKOFF_JITTER_MS);
  return baseDelayMs + jitterMs;
};

const normalizeTopicLabel = (topicId: string): string => {
  const normalized = asString(topicId, "topic").replace(/[-_]+/g, " ").trim();
  if (!normalized) return "topic";
  return normalized.replace(/\b\w/g, (token) => token.toUpperCase());
};

const areChoiceArraysEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
};

const shuffleDecoratedChoices = (
  decoratedChoices: Array<{ choice: string; isCorrect: boolean }>,
  randomInt: (min: number, max: number) => number,
): Array<{ choice: string; isCorrect: boolean }> => {
  const clone = decoratedChoices.map((entry) => ({ ...entry }));
  for (let idx = clone.length - 1; idx > 0; idx -= 1) {
    const swapIndex = randomInt(0, idx);
    const tmp = clone[idx];
    clone[idx] = clone[swapIndex];
    clone[swapIndex] = tmp;
  }
  return clone;
};

const shuffleChoicesPreservingCorrect = (
  choices: string[],
  correctOptionIndex: number,
  randomInt: (min: number, max: number) => number = randomInRange,
): { choices: string[]; correctOptionIndex: number } => {
  const decorated = choices.map((choice, index) => ({
    choice,
    isCorrect: index === correctOptionIndex,
  }));

  const originalChoices = [...choices];
  const choicesAreDistinct = new Set(choices.map((entry) => entry.trim().toLowerCase())).size === choices.length;
  const maxReshuffleAttempts = 4;

  let shuffledDecorated = shuffleDecoratedChoices(decorated, randomInt);
  let reshuffleAttempts = 0;

  while (
    choicesAreDistinct &&
    areChoiceArraysEqual(shuffledDecorated.map((entry) => entry.choice), originalChoices) &&
    reshuffleAttempts < maxReshuffleAttempts
  ) {
    shuffledDecorated = shuffleDecoratedChoices(decorated, randomInt);
    reshuffleAttempts += 1;
  }

  let shuffledChoices = shuffledDecorated.map((entry) => entry.choice);
  let shuffledCorrectIndex = shuffledDecorated.findIndex((entry) => entry.isCorrect);

  if (choicesAreDistinct && areChoiceArraysEqual(shuffledChoices, originalChoices) && shuffledChoices.length > 1) {
    const forcedChoices = [...shuffledChoices];
    const tmp = forcedChoices[0];
    forcedChoices[0] = forcedChoices[1];
    forcedChoices[1] = tmp;
    shuffledChoices = forcedChoices;

    const correctChoice = choices[correctOptionIndex];
    const forcedCorrectIndex = forcedChoices.findIndex((entry) => entry === correctChoice);
    shuffledCorrectIndex = forcedCorrectIndex >= 0 ? forcedCorrectIndex : 0;
  }

  return {
    choices: shuffledChoices,
    correctOptionIndex: shuffledCorrectIndex >= 0 ? shuffledCorrectIndex : 0,
  };
};

const materializeQuestionSet = (
  candidates: BattleQuestionCandidate[],
  randomInt: (min: number, max: number) => number = randomInRange,
): { questions: BattleQuestionPublic[]; answerKeys: number[]; difficulties: ('easy' | 'medium' | 'hard')[] } => {
  const answerKeys: number[] = [];
  const difficulties: ('easy' | 'medium' | 'hard')[] = [];
  const questions = candidates.map((candidate, index) => {
    const shuffled = shuffleChoicesPreservingCorrect(candidate.choices, candidate.correctOptionIndex, randomInt);
    answerKeys.push(shuffled.correctOptionIndex);
    const diff: 'easy' | 'medium' | 'hard' = (candidate.difficulty === 'easy' || candidate.difficulty === 'medium' || candidate.difficulty === 'hard')
      ? candidate.difficulty
      : 'medium';
    difficulties.push(diff);
    return {
      roundNumber: index + 1,
      questionId: candidate.questionId,
      prompt: candidate.prompt,
      choices: shuffled.choices,
    };
  });

  return {
    questions,
    answerKeys,
    difficulties,
  };
};

const extractMessageContentText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        if (!isRecord(entry)) {
          return "";
        }

        return asString(entry.text, "") || asString(entry.content, "") || asString(entry.value, "");
      })
      .filter((entry) => entry.length > 0)
      .join("\n")
      .trim();

    return joined;
  }

  if (isRecord(content)) {
    return asString(content.text, "") || asString(content.content, "") || asString(content.value, "");
  }

  return "";
};

const extractChatCompletionText = (raw: unknown): string => {
  if (!isRecord(raw)) return "";

  const choicesRaw = raw.choices;
  if (Array.isArray(choicesRaw) && choicesRaw.length > 0) {
    for (const choice of choicesRaw) {
      if (!isRecord(choice)) {
        continue;
      }

      const message = choice.message;
      if (isRecord(message)) {
        const content = extractMessageContentText(message.content);
        if (content) {
          return content;
        }

        const parsed = extractMessageContentText(message.parsed);
        if (parsed) {
          return parsed;
        }
      }

      const delta = choice.delta;
      if (isRecord(delta)) {
        const deltaContent = extractMessageContentText(delta.content);
        if (deltaContent) {
          return deltaContent;
        }
      }

      const text = asString(choice.text, "");
      if (text) {
        return text;
      }
    }
  }

  const outputText = asString(raw.output_text, "");
  if (outputText) {
    return outputText;
  }

  const generatedText = asString(raw.generated_text, "");
  if (generatedText) {
    return generatedText;
  }

  const message = raw.message;
  if (isRecord(message)) {
    const content = extractMessageContentText(message.content);
    if (content) {
      return content;
    }
  }

  return "";
};

const extractJsonPayloadCandidate = (rawText: string): string | null => {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim();
  }

  return trimmed.startsWith("{") || trimmed.startsWith("[") ? trimmed : null;
};

const parseJsonValue = (rawText: string): unknown => {
  const candidate = extractJsonPayloadCandidate(rawText);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
};

const extractQuestionsArrayFromPayload = (payload: unknown): unknown[] | null => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return null;
  }

  if (Array.isArray(payload.questions)) {
    return payload.questions;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (isRecord(payload.data) && Array.isArray(payload.data.questions)) {
    return payload.data.questions;
  }

  if (isRecord(payload.quiz) && Array.isArray(payload.quiz.questions)) {
    return payload.quiz.questions;
  }

  if (isRecord(payload.result) && Array.isArray(payload.result.questions)) {
    return payload.result.questions;
  }

  return null;
};

const normalizeQuestionPromptKey = (prompt: string): string => {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase();
};

const normalizeQuestionIdKey = (questionId: string): string => {
  return questionId.replace(/\s+/g, " ").trim().toLowerCase();
};

const computeQuestionFingerprint = (question: BattleQuestionPublic): string => {
  const promptKey = normalizeQuestionPromptKey(question.prompt);
  const choicesKey = question.choices.map((entry) => entry.trim().toLowerCase()).join("|");
  const raw = `${normalizeQuestionIdKey(question.questionId)}::${promptKey}::${choicesKey}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
};

const buildGeneratedQuestionSetId = (questionFingerprints: string[]): string => {
  const digest = createHash("sha256").update(questionFingerprints.join("|")).digest("hex").slice(0, 14);
  return `qb-ai-${Date.now()}-${digest}`;
};

const normalizeAiQuestionCandidate = (
  rawQuestion: unknown,
  index: number,
  setup: NormalizedBattleSetup,
): BattleQuestionCandidate | null => {
  if (!isRecord(rawQuestion)) return null;

  const prompt = asString(rawQuestion.prompt, "") || asString(rawQuestion.question, "") || asString(rawQuestion.stem, "");
  const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();
  if (normalizedPrompt.length < 8) {
    return null;
  }

  const rawChoicesFromArray = Array.isArray(rawQuestion.choices)
    ? rawQuestion.choices.map((choice) => asString(choice, "")).filter((choice) => choice.length > 0)
    : [];

  const rawChoicesFromMap = isRecord(rawQuestion.options)
    ? Object.values(rawQuestion.options).map((choice) => asString(choice, "")).filter((choice) => choice.length > 0)
    : [];

  const rawChoices = rawChoicesFromArray.length >= 4 ? rawChoicesFromArray : rawChoicesFromMap;

  if (rawChoices.length < 4) {
    return null;
  }

  const dedupedChoices: string[] = [];
  const seenChoices = new Set<string>();
  rawChoices.forEach((choice) => {
    const key = choice.toLowerCase();
    if (!seenChoices.has(key)) {
      seenChoices.add(key);
      dedupedChoices.push(choice);
    }
  });

  let choices = dedupedChoices.slice(0, 4);
  if (choices.length < 4) {
    // Preserve minimally valid multiple choice format even when AI repeats distractors.
    choices = rawChoices.slice(0, 4);
  }

  let correctOptionIndex = Math.floor(asNumber(rawQuestion.correctOptionIndex, -1));
  if (correctOptionIndex < 0 || correctOptionIndex >= choices.length) {
    const correctAnswerText =
      asString(rawQuestion.correctAnswer, "") ||
      asString(rawQuestion.answer, "") ||
      asString(rawQuestion.correctChoice, "");

    if (correctAnswerText) {
      const trimmedAnswer = correctAnswerText.trim();
      if (/^[A-D]$/i.test(trimmedAnswer)) {
        correctOptionIndex = trimmedAnswer.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      }

      const matchIndex = choices.findIndex((choice) => choice.toLowerCase() === trimmedAnswer.toLowerCase());
      if (matchIndex >= 0) {
        correctOptionIndex = matchIndex;
      }
    }
  }

  if (correctOptionIndex < 0 || correctOptionIndex >= choices.length) {
    return null;
  }

  const explicitQuestionId = asString(rawQuestion.questionId, "") || asString(rawQuestion.id, "");
  const generatedQuestionId = explicitQuestionId || `qb-ai-${setup.subjectId}-${setup.topicId}-${index + 1}`;
  const normalizedQuestionId = generatedQuestionId.replace(/\s+/g, "-").slice(0, 120);

  return {
    questionId: normalizedQuestionId,
    prompt: normalizedPrompt.slice(0, 260),
    choices,
    correctOptionIndex,
    difficulty: "medium",
  };
};

const dedupeAiQuestionCandidates = (
  candidates: BattleQuestionCandidate[],
  requiredRounds: number,
): BattleQuestionCandidate[] => {
  const seenPromptKeys = new Set<string>();
  const seenQuestionIdKeys = new Set<string>();
  const deduped: BattleQuestionCandidate[] = [];

  candidates.forEach((candidate) => {
    const promptKey = normalizeQuestionPromptKey(candidate.prompt);
    const questionIdKey = normalizeQuestionIdKey(candidate.questionId);

    if (!promptKey || !questionIdKey) {
      return;
    }

    if (seenPromptKeys.has(promptKey) || seenQuestionIdKeys.has(questionIdKey)) {
      return;
    }

    seenPromptKeys.add(promptKey);
    seenQuestionIdKeys.add(questionIdKey);
    deduped.push(candidate);
  });

  if (deduped.length < requiredRounds) {
    throw new QuizBattleGenerationError(
      "ai_insufficient_unique_questions",
      `AI returned insufficient unique questions (${deduped.length}/${requiredRounds}).`,
      true,
    );
  }

  return deduped.slice(0, requiredRounds);
};

const classifyGenerationError = (error: unknown): QuizBattleGenerationError => {
  if (error instanceof QuizBattleGenerationError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status ?? 0;
    const errorDetail = extractAiErrorDetail(error.response?.data);
    const errorMessage = [error.message || "AI request failed.", errorDetail]
      .filter((entry) => entry && entry.trim().length > 0)
      .join(" | ");

    if (error.code === "ECONNABORTED" || /timeout/i.test(errorMessage)) {
      return new QuizBattleGenerationError("ai_timeout", errorMessage, true);
    }

    if (statusCode === 408 || statusCode === 429 || statusCode >= 500) {
      return new QuizBattleGenerationError(
        "ai_upstream_error",
        `AI upstream error (${statusCode || "unknown"}). ${errorMessage}`,
        true,
      );
    }

    if (statusCode >= 400) {
      return new QuizBattleGenerationError(
        "ai_upstream_error",
        `AI request rejected (${statusCode}). ${errorMessage}`,
        false,
      );
    }
  }

  const fallbackMessage = error instanceof Error ? error.message : String(error);
  return new QuizBattleGenerationError(
    "ai_unknown_error",
    fallbackMessage || "Unknown Quiz Battle AI generation failure.",
    true,
  );
};

type InvokeAiGenerationRequest = (
  requestPayload: Record<string, unknown>,
  timeoutMs: number,
  requestHeaders: Record<string, string>,
) => Promise<unknown>;

interface GenerateAiQuestionSetOptions {
  invokeRequest?: InvokeAiGenerationRequest;
  sleepMs?: (durationMs: number) => Promise<void>;
  randomInt?: (min: number, max: number) => number;
  now?: () => number;
}

const invokeQuizBattleAiRequest: InvokeAiGenerationRequest = async (
  requestPayload,
  timeoutMs,
  requestHeaders,
): Promise<unknown> => {
  const response = await axios.post(QUIZ_BATTLE_AI_CHAT_URL, requestPayload, {
    timeout: timeoutMs,
    headers: requestHeaders,
  });
  return response.data;
};

const buildAiQuestionPrompt = (setup: NormalizedBattleSetup, requestedQuestionCount: number): string => {
  const requestedDifficulty = setup.mode === "bot" ? setup.botDifficulty : setup.difficulty;
  const subjectLabel = SUBJECT_LABELS[setup.subjectId] || "Mathematics";
  const topicLabel = normalizeTopicLabel(setup.topicId);

  return [
    `Generate ${requestedQuestionCount} Grade 11-12 multiple-choice battle quiz questions.`,
    `Subject: ${subjectLabel}`,
    `Topic: ${topicLabel}`,
    `Difficulty: ${requestedDifficulty === "adaptive" ? "mixed medium and hard" : requestedDifficulty}`,
    "Each question must have exactly 4 choices and exactly 1 correct choice.",
    "Correct answers must not follow a fixed index pattern.",
    `Return at least ${setup.rounds} valid questions in the questions array.`,
    "Return ONLY valid JSON in this exact shape:",
    "{\"questions\":[{\"prompt\":\"...\",\"choices\":[\"...\",\"...\",\"...\",\"...\"],\"correctOptionIndex\":0}]}",
    "No markdown fences. No explanations. JSON only.",
    "Do not include <think> tags, reasoning traces, or text outside the JSON object.",
  ].join("\n");
};

const generateAiQuestionSet = async (
  setup: NormalizedBattleSetup,
  options: GenerateAiQuestionSetOptions = {},
): Promise<GeneratedAiQuestionSet> => {
  const quizBattleToken = resolveQuizBattleAiToken();
  if (!quizBattleToken) {
    throw new QuizBattleGenerationError(
      "missing_ai_token",
      "Missing QUIZ_BATTLE_AI_TOKEN/HF_TOKEN for quiz battle AI generation.",
      false,
    );
  }

  const modelName = resolveQuizBattleAiModelName();
  const invokeRequest = options.invokeRequest || invokeQuizBattleAiRequest;
  const sleepMs = options.sleepMs || waitForMs;
  const randomInt = options.randomInt || randomInRange;
  const now = options.now || (() => Date.now());

  const requestedQuestionCount = Math.max(setup.rounds + 2, setup.rounds);
  const requestedMaxTokens = Math.max(320, requestedQuestionCount * 90);
  const maxTokens = Math.min(QUIZ_BATTLE_AI_MAX_TOKENS, requestedMaxTokens);
  let structuredJsonModeEnabled = true;

  const messages = [
    {
      role: "system",
      content: "You generate strict JSON for Grade 11-12 multiple-choice math battle questions.",
    },
    {
      role: "user",
      content: buildAiQuestionPrompt(setup, requestedQuestionCount),
    },
  ];

  const generationStartedAtMs = now();
  let lastError = new QuizBattleGenerationError(
    "ai_unknown_error",
    "Unknown Quiz Battle AI generation failure.",
    true,
  );

  for (let attempt = 1; attempt <= QUIZ_BATTLE_AI_MAX_RETRIES; attempt += 1) {
    const attemptStartedAtMs = now();
    const structuredJsonModeEnabledAtStart = structuredJsonModeEnabled;
    functions.logger.info("[QUIZ_BATTLE] AI generation attempt started", {
      attempt,
      maxAttempts: QUIZ_BATTLE_AI_MAX_RETRIES,
      model: modelName,
      subjectId: setup.subjectId,
      topicId: setup.topicId,
      rounds: setup.rounds,
    });

    try {
      const requestPayload: Record<string, unknown> = {
        model: modelName,
        messages,
        stream: false,
        max_tokens: maxTokens,
        temperature: 0.2,
        top_p: 0.9,
      };

      if (structuredJsonModeEnabledAtStart) {
        requestPayload.response_format = {
          type: "json_object",
        };
      }

      const responseData = await invokeRequest(
        requestPayload,
        QUIZ_BATTLE_AI_TIMEOUT_MS,
        {
          Authorization: `Bearer ${quizBattleToken}`,
          "Content-Type": "application/json",
          "X-MathPulse-Task": "quiz_generation",
        },
      );

      const text = extractChatCompletionText(responseData);
      const payload = parseJsonValue(text);
      const payloadQuestions = extractQuestionsArrayFromPayload(payload);

      if (!payloadQuestions) {
        functions.logger.warn("[QUIZ_BATTLE] AI payload missing questions array", {
          model: modelName,
          subjectId: setup.subjectId,
          topicId: setup.topicId,
          rounds: setup.rounds,
          responsePreview: text.slice(0, 1200),
          parsedPayloadType: Array.isArray(payload) ? "array" : typeof payload,
          parsedPayloadKeys: isRecord(payload) ? Object.keys(payload).slice(0, 20) : [],
          rawResponseKeys: isRecord(responseData) ? Object.keys(responseData).slice(0, 20) : [],
        });

        throw new QuizBattleGenerationError(
          "ai_payload_invalid",
          "AI response did not contain a valid questions array.",
          true,
        );
      }

      const normalizedCandidates = payloadQuestions
        .map((entry, index) => normalizeAiQuestionCandidate(entry, index, setup))
        .filter((entry): entry is BattleQuestionCandidate => entry !== null);

      if (normalizedCandidates.length < setup.rounds) {
        throw new QuizBattleGenerationError(
          "ai_payload_invalid",
          `AI returned insufficient valid questions (${normalizedCandidates.length}/${setup.rounds}).`,
          true,
        );
      }

      const dedupedCandidates = dedupeAiQuestionCandidates(normalizedCandidates, setup.rounds);
      const materializedSet = materializeQuestionSet(dedupedCandidates, randomInt);
      const questionFingerprints = materializedSet.questions.map((question) => computeQuestionFingerprint(question));

      if (new Set(questionFingerprints).size < setup.rounds) {
        throw new QuizBattleGenerationError(
          "ai_insufficient_unique_questions",
          "AI generation produced duplicate fingerprints after shuffle.",
          true,
        );
      }

      const totalLatencyMs = now() - generationStartedAtMs;
      functions.logger.info("[QUIZ_BATTLE] AI generation succeeded", {
        attempt,
        maxAttempts: QUIZ_BATTLE_AI_MAX_RETRIES,
        model: modelName,
        subjectId: setup.subjectId,
        topicId: setup.topicId,
        rounds: setup.rounds,
        latencyMs: totalLatencyMs,
      });

      return {
        ...materializedSet,
        questionSetId: buildGeneratedQuestionSetId(questionFingerprints),
        questionFingerprints,
        attempts: attempt,
        latencyMs: totalLatencyMs,
        model: modelName,
      };
    } catch (error) {
      const classified = classifyGenerationError(error);
      lastError = classified;
      const shouldRetryWithJsonModeRelaxed =
        shouldRetryWithoutStructuredJsonMode(error, structuredJsonModeEnabledAtStart);

      if (shouldRetryWithJsonModeRelaxed) {
        structuredJsonModeEnabled = false;
      }

      functions.logger.warn("[QUIZ_BATTLE] AI generation attempt failed", {
        attempt,
        maxAttempts: QUIZ_BATTLE_AI_MAX_RETRIES,
        model: modelName,
        subjectId: setup.subjectId,
        topicId: setup.topicId,
        rounds: setup.rounds,
        structuredJsonModeEnabledAtStart,
        structuredJsonModeEnabledForNextAttempt: structuredJsonModeEnabled,
        shouldRetryWithJsonModeRelaxed,
        maxTokens,
        latencyMs: now() - attemptStartedAtMs,
        reason: classified.reason,
        retriable: classified.retriable,
        error: classified.message,
      });

      if (attempt < QUIZ_BATTLE_AI_MAX_RETRIES && (classified.retriable || shouldRetryWithJsonModeRelaxed)) {
        const backoffMs = computeRetryDelayMs(attempt, randomInt);
        await sleepMs(backoffMs);
        continue;
      }

      break;
    }
  }

  throw new QuizBattleGenerationError(lastError.reason, lastError.message, lastError.retriable);
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

import {
  DIFFICULTY_MULTIPLIERS,
  XP_CAP_PER_BATTLE,
  DAILY_BATTLE_XP_CAP,
  computeRoundScoreBreakdown,
  computeMatchXP,
} from '../scoring/scoringEngine';

const normalizeSourceType = (raw: unknown): BattleQuestionSourceType => {
  const value = asString(raw, "").toLowerCase();
  if (value === "premade" || value === "teacher-authored" || value === "reviewed-ai" || value === "imported") {
    return value;
  }
  return "premade";
};

const resolveQuestionChoices = (rawQuestion: Record<string, unknown>): string[] => {
  if (Array.isArray(rawQuestion.choices)) {
    return rawQuestion.choices.map((entry) => asString(entry)).filter((entry) => entry.length > 0);
  }

  if (Array.isArray(rawQuestion.options)) {
    return rawQuestion.options.map((entry) => asString(entry)).filter((entry) => entry.length > 0);
  }

  if (isRecord(rawQuestion.options)) {
    return Object.values(rawQuestion.options).map((entry) => asString(entry)).filter((entry) => entry.length > 0);
  }

  return [];
};

const resolveCorrectAnswerText = (rawQuestion: Record<string, unknown>, choices: string[]): string => {
  const direct = asString(rawQuestion.correctAnswer, "") || asString(rawQuestion.answer, "");
  if (direct) {
    if (/^[A-D]$/i.test(direct.trim())) {
      const index = direct.trim().toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      return choices[index] || "";
    }
    return direct;
  }

  const explicitIndex = Math.floor(asNumber(rawQuestion.correctOptionIndex, -1));
  if (explicitIndex >= 0 && explicitIndex < choices.length) {
    return choices[explicitIndex];
  }

  return "";
};

const normalizeCanonicalBattleQuestion = (
  docId: string,
  rawQuestion: Record<string, unknown>,
): CanonicalBattleQuestion | null => {
  const subject = asString(rawQuestion.subject, asString(rawQuestion.subjectId, ""));
  if (!subject) return null;

  const gradeLevel = parseGradeLevel(rawQuestion.gradeLevel ?? rawQuestion.grade);
  if (!gradeLevel) return null;

  const curriculumVersionSetId = asString(rawQuestion.curriculumVersionSetId, "");
  const curriculumVersion = normalizeCurriculumVersion(rawQuestion.curriculumVersion, curriculumVersionSetId);

  const stem = asString(rawQuestion.stem, asString(rawQuestion.prompt, asString(rawQuestion.question, "")));
  if (stem.length < 8) return null;

  const choices = resolveQuestionChoices(rawQuestion);
  if (choices.length < 4) return null;

  const trimmedChoices = choices.slice(0, 4).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (trimmedChoices.length !== 4) return null;

  const correctAnswer = resolveCorrectAnswerText(rawQuestion, trimmedChoices);
  if (!correctAnswer) return null;
  const canonicalCorrect = trimmedChoices.find((entry) => entry.toLowerCase() === correctAnswer.toLowerCase());
  if (!canonicalCorrect) return null;

  const difficultyRaw = asString(rawQuestion.difficulty, "medium");
  const difficulty = (difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard")
    ? difficultyRaw
    : "medium";

  const questionType = asString(rawQuestion.questionType, "multiple_choice").toLowerCase();
  if (questionType !== "multiple_choice") return null;

  const topic = asString(rawQuestion.topic, asString(rawQuestion.topicId, ""));
  if (!topic) return null;

  const competencyCode = asString(rawQuestion.competencyCode, "");
  const competencyText = asString(rawQuestion.competencyText, asString(rawQuestion.competency, ""));
  if (!competencyCode || !competencyText) return null;

  const schoolYearApplicability = Array.isArray(rawQuestion.schoolYearApplicability)
    ? rawQuestion.schoolYearApplicability.map((entry) => asString(entry)).filter((entry) => entry.length > 0)
    : [];

  const tags = Array.isArray(rawQuestion.tags)
    ? rawQuestion.tags.map((entry) => asString(entry).toLowerCase()).filter((entry) => entry.length > 0)
    : [];

  const reviewedAtMs = asTimestampMillis(rawQuestion.reviewedAt, 0);

  return {
    id: asString(rawQuestion.id, docId),
    subject,
    gradeLevel,
    curriculumVersion,
    curriculumTrack: asString(rawQuestion.curriculumTrack, "core"),
    schoolYearApplicability,
    topic,
    subtopic: asString(rawQuestion.subtopic, topic),
    competencyCode,
    competencyText,
    difficulty,
    questionType: "multiple_choice",
    stem,
    choices: trimmedChoices,
    correctAnswer: canonicalCorrect,
    explanation: asString(rawQuestion.explanation, ""),
    hint: asString(rawQuestion.hint, ""),
    tags,
    language: asString(rawQuestion.language, "en"),
    isActive: asBoolean(rawQuestion.isActive, true),
    sourceType: normalizeSourceType(rawQuestion.sourceType),
    sourceReference: asString(rawQuestion.sourceReference, ""),
    variantGroupId: asString(rawQuestion.variantGroupId, ""),
    reviewedBy: asString(rawQuestion.reviewedBy, ""),
    reviewedAt: reviewedAtMs > 0 ? reviewedAtMs : null,
    createdBy: asString(rawQuestion.createdBy, ""),
    createdAt: asTimestampMillis(rawQuestion.createdAt, 0),
    updatedAt: asTimestampMillis(rawQuestion.updatedAt, 0),
  };
};

const toBattleCandidateFromCanonical = (question: CanonicalBattleQuestion): BattleQuestionCandidate => {
  const correctOptionIndex = question.choices.findIndex(
    (choice) => choice.toLowerCase() === question.correctAnswer.toLowerCase(),
  );

  return {
    questionId: question.id,
    prompt: question.stem,
    choices: question.choices,
    correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
    difficulty: question.difficulty,
  };
};

const normalizeDifficultyForSelection = (
  setup: NormalizedBattleSetup,
): "easy" | "medium" | "hard" => {
  const targetDifficulty = setup.mode === "bot" ? setup.botDifficulty : setup.difficulty;
  return targetDifficulty === "adaptive" ? "medium" : targetDifficulty;
};

const resolveEffectiveSharedPoolMode = (setup: NormalizedBattleSetup): "grade_strict" | "admin_shared" => {
  if (setup.sharedPoolMode === "admin_shared" && QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE) {
    return "admin_shared";
  }
  return "grade_strict";
};

const buildSelectorForSinglePlayer = (
  player: BattlePlayerEligibility,
  setup: NormalizedBattleSetup,
): QuestionPoolSelector => {
  return {
    gradeLevel: player.gradeLevel,
    curriculumVersion: player.curriculumVersion,
    curriculumVersionSetId: player.curriculumVersionSetId,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: normalizeDifficultyForSelection(setup),
    sharedPoolMode: resolveEffectiveSharedPoolMode(setup),
  };
};

const buildSelectorForOnlinePlayers = (
  playerA: BattlePlayerEligibility,
  playerB: BattlePlayerEligibility,
  setup: NormalizedBattleSetup,
): QuestionPoolSelector => {
  const sharedPoolMode = resolveEffectiveSharedPoolMode(setup);

  if (sharedPoolMode !== "admin_shared") {
    if (QUIZ_BATTLE_ENFORCE_GRADE_SEGREGATION && playerA.gradeLevel !== playerB.gradeLevel) {
      throw buildProfileError(
        "mixed_grade_blocked",
        "Mixed-grade Quiz Battle matches are blocked by default. Use admin-approved shared mode to continue.",
      );
    }

    if (playerA.curriculumVersionSetId !== playerB.curriculumVersionSetId) {
      throw buildProfileError(
        "curriculum_mismatch",
        "Players must share the same curriculum cohort for a standard Quiz Battle pool.",
      );
    }

    if (playerA.curriculumVersion !== playerB.curriculumVersion) {
      throw buildProfileError(
        "curriculum_version_mismatch",
        "Players must share the same curriculum version for a standard Quiz Battle pool.",
      );
    }

    return {
      gradeLevel: playerA.gradeLevel,
      curriculumVersion: playerA.curriculumVersion,
      curriculumVersionSetId: playerA.curriculumVersionSetId,
      subjectId: setup.subjectId,
      topicId: setup.topicId,
      difficulty: normalizeDifficultyForSelection(setup),
      sharedPoolMode,
    };
  }

  return {
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: normalizeDifficultyForSelection(setup),
    sharedPoolMode,
  };
};

const filterCanonicalPoolBySelector = (
  pool: CanonicalBattleQuestion[],
  selector: QuestionPoolSelector,
): CanonicalBattleQuestion[] => {
  return pool.filter((entry) => {
    if (!entry.isActive) return false;
    if (entry.subject !== selector.subjectId) return false;

    if (selector.sharedPoolMode === "admin_shared") {
      const sharedTagged =
        entry.tags.includes("shared_pool") ||
        entry.tags.includes("shared") ||
        entry.curriculumTrack.toLowerCase().includes("shared");
      if (!sharedTagged) return false;
    } else {
      if (typeof selector.gradeLevel === "number" && entry.gradeLevel !== selector.gradeLevel) return false;
      if (selector.curriculumVersion && entry.curriculumVersion !== selector.curriculumVersion) return false;
    }

    return true;
  });
};

const chooseQuestionCandidates = (
  canonicalPool: CanonicalBattleQuestion[],
  selector: QuestionPoolSelector,
  rounds: number,
  randomInt: (min: number, max: number) => number,
): BattleQuestionCandidate[] => {
  const basePool = filterCanonicalPoolBySelector(canonicalPool, selector);
  const normalizedTopic = selector.topicId.trim().toLowerCase();

  const stagedPools = [
    basePool.filter((entry) => entry.topic.toLowerCase() === normalizedTopic && entry.difficulty === selector.difficulty),
    basePool.filter((entry) => entry.difficulty === selector.difficulty),
    basePool.filter((entry) => entry.topic.toLowerCase() === normalizedTopic),
    basePool,
  ];

  const selectedPool = stagedPools.find((entry) => entry.length >= rounds) || basePool;
  if (selectedPool.length < rounds) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Insufficient vetted question pool for ${selector.subjectId} (${selectedPool.length}/${rounds}).`,
      {
        reason: "insufficient_question_pool",
      },
    );
  }

  const remaining = [...selectedPool];
  const picked: CanonicalBattleQuestion[] = [];

  while (picked.length < rounds && remaining.length > 0) {
    const idx = randomInt(0, remaining.length - 1);
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }

  const questionIds = new Set<string>();
  picked.forEach((entry) => questionIds.add(entry.id));
  if (questionIds.size < rounds) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Question selection must produce unique question IDs per match.",
      {
        reason: "duplicate_question_ids",
      },
    );
  }

  return picked.map((entry) => toBattleCandidateFromCanonical(entry));
};

const buildStaticFallbackPool = (
  selector: QuestionPoolSelector,
  rounds: number,
): BattleQuestionCandidate[] => {
  const topic = selector.topicId.trim().toLowerCase();
  const difficulty = selector.difficulty;

  const basePool = QUESTION_BANK.filter((entry) => {
    if (entry.subjectId !== selector.subjectId) return false;

    if (selector.sharedPoolMode !== "admin_shared") {
      const gradeFromSubject = STATIC_BANK_GRADE_BY_SUBJECT[entry.subjectId];
      if (typeof selector.gradeLevel === "number" && gradeFromSubject !== selector.gradeLevel) {
        return false;
      }
    }

    return true;
  });

  const stagedPools = [
    basePool.filter((entry) => entry.topicId.toLowerCase() === topic && entry.difficulty === difficulty),
    basePool.filter((entry) => entry.difficulty === difficulty),
    basePool,
  ];

  const selected =
    stagedPools.find((entry) => entry.length >= rounds) ||
    [...stagedPools].sort((left, right) => right.length - left.length)[0] ||
    [];
  return selected.map((entry) => ({
    questionId: entry.questionId,
    prompt: entry.prompt,
    choices: entry.choices,
    correctOptionIndex: entry.correctOptionIndex,
    difficulty: entry.difficulty,
  }));
};

const expandStaticFallbackCandidates = (
  baseCandidates: BattleQuestionCandidate[],
  rounds: number,
): BattleQuestionCandidate[] => {
  if (baseCandidates.length === 0 || baseCandidates.length >= rounds) {
    return baseCandidates;
  }

  const expanded = [...baseCandidates];
  let cursor = 0;

  while (expanded.length < rounds) {
    const source = baseCandidates[cursor % baseCandidates.length];
    const variantNumber = Math.floor(cursor / baseCandidates.length) + 2;

    expanded.push({
      questionId: `${source.questionId}-v${variantNumber}`,
      prompt: `${source.prompt} (Variant ${variantNumber})`,
      choices: [...source.choices],
      correctOptionIndex: source.correctOptionIndex,
      difficulty: source.difficulty,
    });

    cursor += 1;
  }

  return expanded;
};

const fetchQuestionBankPool = async (
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction | undefined,
  selector: QuestionPoolSelector,
): Promise<CanonicalBattleQuestion[]> => {
  const useRuntimeCache = !tx;
  const cacheKey = createRuntimeCacheKey(
    "quiz-battle-question-bank",
    QUIZ_BATTLE_QUESTION_BANK_COLLECTION,
    selector.subjectId,
    QUIZ_BATTLE_QUESTION_BANK_QUERY_LIMIT,
  );

  if (useRuntimeCache) {
    const cached = runtimeCache.get<CanonicalBattleQuestion[]>(cacheKey);
    if (cached) {
      return cached.map((entry) => ({
        ...entry,
        choices: [...entry.choices],
      }));
    }
  }

  const baseQuery = db
    .collection(QUIZ_BATTLE_QUESTION_BANK_COLLECTION)
    .where("isActive", "==", true)
    .where("subject", "==", selector.subjectId)
    .limit(QUIZ_BATTLE_QUESTION_BANK_QUERY_LIMIT);

  const querySnap = tx ? await tx.get(baseQuery) : await baseQuery.get();
  const normalized = querySnap.docs
    .map((entry) => normalizeCanonicalBattleQuestion(entry.id, entry.data() as Record<string, unknown>))
    .filter((entry): entry is CanonicalBattleQuestion => entry !== null);

  if (useRuntimeCache) {
    runtimeCache.set(cacheKey, normalized, QUIZ_BATTLE_QUESTION_BANK_CACHE_TTL_MS);
  }

  return normalized;
};

const selectQuestionSet = async (params: {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  setup: NormalizedBattleSetup;
  selectionSeed: string;
  playerA?: BattlePlayerEligibility;
  playerB?: BattlePlayerEligibility;
  singlePlayer?: BattlePlayerEligibility;
}): Promise<QuestionSetBundle> => {
  const { db, tx, setup, selectionSeed, playerA, playerB, singlePlayer } = params;

  const selector = setup.mode === "online"
    ? (() => {
      if (!playerA || !playerB) {
        throw new functions.https.HttpsError("failed-precondition", "Missing match participant profiles.", {
          reason: "missing_participant_profiles",
        });
      }
      return buildSelectorForOnlinePlayers(playerA, playerB, setup);
    })()
    : (() => {
      if (!singlePlayer) {
        throw new functions.https.HttpsError("failed-precondition", "Missing player profile for bot match.", {
          reason: "missing_player_profile",
        });
      }
      return buildSelectorForSinglePlayer(singlePlayer, setup);
    })();

  const randomInt = createDeterministicRandomIntFactory(selectionSeed);

  let candidates: BattleQuestionCandidate[] = [];

  try {
    const canonicalPool = await fetchQuestionBankPool(db, tx, selector);
    if (canonicalPool.length > 0) {
      candidates = chooseQuestionCandidates(canonicalPool, selector, setup.rounds, randomInt);
    }
  } catch (error) {
    functions.logger.warn("[QUIZ_BATTLE] Question bank query failed; evaluating static fallback", {
      collection: QUIZ_BATTLE_QUESTION_BANK_COLLECTION,
      subjectId: selector.subjectId,
      topicId: selector.topicId,
      difficulty: selector.difficulty,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (candidates.length < setup.rounds) {
    if (!QUIZ_BATTLE_ALLOW_STATIC_BANK_FALLBACK) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Question bank fallback is disabled and no eligible question set was found.",
        {
          reason: "question_bank_empty",
        },
      );
    }

    const fallbackPool = buildStaticFallbackPool(selector, setup.rounds);
    const expandedFallbackPool = expandStaticFallbackCandidates(fallbackPool, setup.rounds);

    if (expandedFallbackPool.length > fallbackPool.length) {
      functions.logger.warn("[QUIZ_BATTLE] Static fallback pool expanded with deterministic variants", {
        subjectId: selector.subjectId,
        topicId: selector.topicId,
        difficulty: selector.difficulty,
        requestedRounds: setup.rounds,
        basePoolCount: fallbackPool.length,
        expandedPoolCount: expandedFallbackPool.length,
      });
    }

    if (expandedFallbackPool.length < setup.rounds) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Insufficient eligible question pool for ${selector.subjectId} (${expandedFallbackPool.length}/${setup.rounds}).`,
        {
          reason: "insufficient_question_pool",
        },
      );
    }

    const remaining = [...expandedFallbackPool];
    candidates = [];
    while (candidates.length < setup.rounds && remaining.length > 0) {
      const idx = randomInt(0, remaining.length - 1);
      candidates.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  const materialized = materializeQuestionSet(candidates, randomInt);
  const servedQuestionIds = candidates.map((entry) => entry.questionId);

  return {
    ...materialized,
    source: "bank",
    servedQuestionIds,
    selector,
  };
};

const getRoundDifficulties = (raw: unknown): ('easy' | 'medium' | 'hard')[] => {
  if (!isRecord(raw)) return [];
  const diffs = raw.difficulties;
  if (!Array.isArray(diffs)) return [];
  return diffs.map((entry) => {
    const s = asString(entry, 'medium');
    return (s === 'easy' || s === 'medium' || s === 'hard') ? s : 'medium';
  });
};

const computeConsecutiveCorrect = (
  roundResults: Record<string, unknown>[],
  isPlayerA: boolean,
  currentRound: number,
): number => {
  let streak = 0;
  const sortedResults = [...roundResults]
    .sort((a, b) => Math.floor(asNumber(a.roundNumber, 0)) - Math.floor(asNumber(b.roundNumber, 0)));
  for (const entry of sortedResults) {
    const rn = Math.floor(asNumber(entry.roundNumber, 0));
    if (rn >= currentRound) break;
    const correct = isPlayerA
      ? asBoolean(entry.playerACorrect, false)
      : asBoolean(entry.playerBCorrect, false);
    if (correct) {
      streak += 1;
    } else {
      streak = 0;
    }
  }
  return streak;
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
    opponentSelectedIndex,
    botCorrect: opponentCorrect,
    winner: normalizeRoundWinner(entry.winner),
    playerAResponseMs: studentResponseMs,
    botResponseMs: opponentResponseMs,
    resolvedAtMs: Math.floor(asNumber(entry.resolvedAtMs, Date.now())),
    scoreBreakdown: isPlayerA && isRecord(entry.playerAScoreBreakdown)
      ? (entry.playerAScoreBreakdown as unknown as RoundScoreBreakdown)
      : !isPlayerA && isRecord(entry.playerBScoreBreakdown)
        ? (entry.playerBScoreBreakdown as unknown as RoundScoreBreakdown)
        : undefined,
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
  const expiresAtMs = isPublicMatchmakingReadyMatch(data) ? getPublicMatchmakingDeadlineMs(data) : 0;

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
    expiresAtMs: expiresAtMs > 0 ? expiresAtMs : undefined,
    lifecycle,
    currentQuestion,
    roundResults,
  };

  if (status === "completed") {
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const outcome = getOutcomeFromMetadata(metadata, studentId, scoreFor, scoreAgainst);
    baseState.outcome = outcome;
    baseState.xpEarned = getXpFromMetadata(metadata, studentId, outcome);
    const xpBreakdownByPlayer = isRecord(metadata.xpBreakdownByPlayer)
      ? metadata.xpBreakdownByPlayer
      : null;
    const xpBreakdownForStudent = xpBreakdownByPlayer && isRecord(xpBreakdownByPlayer[studentId])
      ? xpBreakdownByPlayer[studentId]
      : metadata.xpBreakdown;
    if (isRecord(xpBreakdownForStudent)) {
      baseState.xpBreakdown = xpBreakdownForStudent as unknown as MatchXPBreakdown;
    }
  }

  return baseState;
};

const mapGenerationAuditForStudent = (
  matchId: string,
  data: Record<string, unknown>,
): QuizBattleGenerationAuditResponse => {
  const statusRaw = asString(data.status, "ready");
  const status: MatchStatus = ["ready", "in_progress", "completed", "cancelled"].includes(statusRaw)
    ? (statusRaw as MatchStatus)
    : "ready";

  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const questionFingerprints = Array.isArray(metadata.questionFingerprints)
    ? metadata.questionFingerprints.map((entry) => asString(entry)).filter((entry) => entry.length > 0)
    : [];

  const questionSetSource = asString(metadata.questionSetSource, "");
  const generatedQuestionCount = (Array.isArray(data.questions) ? data.questions : [])
    .filter((entry) => isRecord(entry))
    .length;
  const questionSetGeneratedAtMs = asTimestampMillis(metadata.questionSetGeneratedAt, 0);

  return {
    success: true,
    matchId,
    status,
    questionSetSource,
    questionSetId: asString(metadata.questionSetId, ""),
    generatedQuestionCount,
    questionFingerprints,
    aiGenerationAttempted: asBoolean(metadata.aiGenerationAttempted, false),
    aiGenerationAttempts: Math.max(0, Math.floor(asNumber(metadata.aiGenerationAttempts, 0))),
    aiGenerationLatencyMs: Math.max(0, Math.floor(asNumber(metadata.aiGenerationLatencyMs, 0))),
    aiGenerationModel: asString(metadata.aiGenerationModel, ""),
    generationFailureReason: asString(metadata.generationFailureReason, ""),
    questionSetGeneratedAtMs: questionSetGeneratedAtMs > 0 ? questionSetGeneratedAtMs : undefined,
    isAiSource: questionSetSource === "ai",
    auditSchemaVersion: "qb-generation-audit-v1",
  };
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

const loadUserBattleProfileFromTx = async (
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<BattlePlayerEligibility> => {
  const userSnap = await tx.get(db.collection("users").doc(uid));
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
  return mapUserDataToEligibility(uid, userData);
};

const loadUserBattleProfile = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<BattlePlayerEligibility> => {
  const cacheKey = createRuntimeCacheKey("quiz-battle-profile", uid);
  const cachedProfile = runtimeCache.get<BattlePlayerEligibility>(cacheKey);
  if (cachedProfile) {
    return { ...cachedProfile };
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
  const profile = mapUserDataToEligibility(uid, userData);
  runtimeCache.set(cacheKey, profile, QUIZ_BATTLE_PROFILE_CACHE_TTL_MS);
  return profile;
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
    loadUserBattleProfileFromTx(tx, db, playerAId),
    loadUserBattleProfileFromTx(tx, db, playerBId),
  ]);
  const {
    questions,
    answerKeys,
    difficulties,
    source: questionSetSource,
    servedQuestionIds,
    selector,
  } = await selectQuestionSet({
    db,
    tx,
    setup,
    selectionSeed: `match:${matchRef.id}`,
    playerA: playerAProfile,
    playerB: playerBProfile,
  });

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
    readyAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(source === "public_matchmaking"
      ? { expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + PUBLIC_MATCHMAKING_TIMEOUT_MS) }
      : {}),
    startedAt: null,
    endedAt: null,
    metadata: {
      source,
      seededQuestionSet: true,
      sharedPoolMode: selector.sharedPoolMode,
      questionSetSource,
      questionSetId: `qb-scaffold-${matchRef.id}`,
      questionFingerprints: [],
      servedQuestionIds,
      aiGenerationAttempted: false,
      aiGenerationAttempts: 0,
      aiGenerationLatencyMs: 0,
      generationFailureReason: "",
      implementationStatus: "live_online_v1",
      playerAPhoto: playerAProfile.photo,
      playerBPhoto: playerBProfile.photo,
      playerAGradeLevel: playerAProfile.gradeLevel,
      playerBGradeLevel: playerBProfile.gradeLevel,
      playerACurriculumVersionSetId: playerAProfile.curriculumVersionSetId,
      playerBCurriculumVersionSetId: playerBProfile.curriculumVersionSetId,
      playerACurriculumVersion: playerAProfile.curriculumVersion,
      playerBCurriculumVersion: playerBProfile.curriculumVersion,
      questionPoolSelector: selector,
    },
  });

  tx.set(matchRef.collection("server").doc("roundKeys"), {
    keys: answerKeys,
    difficulties,
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
  const playerProfile = await loadUserBattleProfile(db, studentId);
  const playerADisplayName = playerProfile.displayName;

  const {
    questions,
    answerKeys,
    difficulties,
    source,
    servedQuestionIds,
    selector,
  } = await selectQuestionSet({
    db,
    setup,
    selectionSeed: `bot-match:${matchRef.id}`,
    singlePlayer: playerProfile,
  });
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
      sharedPoolMode: selector.sharedPoolMode,
      questionSetSource: source,
      questionSetId: `qb-scaffold-${matchRef.id}`,
      questionFingerprints: [],
      servedQuestionIds,
      aiGenerationAttempted: false,
      aiGenerationAttempts: 0,
      aiGenerationLatencyMs: 0,
      generationFailureReason: "",
      implementationStatus: "live_bot_v2",
      playerAGradeLevel: playerProfile.gradeLevel,
      playerACurriculumVersionSetId: playerProfile.curriculumVersionSetId,
      playerACurriculumVersion: playerProfile.curriculumVersion,
      questionPoolSelector: selector,
    },
  });

  batch.set(roundKeysRef, {
    keys: answerKeys,
    difficulties,
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
    const xpBreakdownByPlayer: Record<string, MatchXPBreakdown> = {};

    for (const participantId of participants) {
      const isPlayerA = participantId === playerAId;
      const scoreFor = isPlayerA ? scoreA : scoreB;
      const scoreAgainst = isPlayerA ? scoreB : scoreA;
      const outcome = outcomeFromScores(scoreFor, scoreAgainst);
      const metrics = computeParticipantRoundMetrics(roundResults, isPlayerA, rounds, fallbackResponseMs);

      const totalPointsEarned = roundResults.reduce((sum, entry) => {
        const participantScoreBreakdown = isPlayerA
          ? entry.playerAScoreBreakdown
          : entry.playerBScoreBreakdown;

        if (isRecord(participantScoreBreakdown)) {
          const breakdown = participantScoreBreakdown as Record<string, unknown>;
          if (breakdown.isCorrect === true || asNumber(breakdown.totalPointsAwarded, 0) > 0) {
            return sum + Math.floor(asNumber(breakdown.totalPointsAwarded, 0));
          }
        }
        return sum;
      }, 0);

      const existingStats = participantStats[participantId];
      const todayUTC = new Date().toISOString().slice(0, 10);
      const battleXPEarnedDate = asString(existingStats.battleXPEarnedDate, '');
      const battleXPEarnedToday = battleXPEarnedDate === todayUTC
        ? asNumber(existingStats.battleXPEarnedToday, 0)
        : 0;

      const { xpBreakdown, actualXPAwarded } = computeMatchXP({
        outcome,
        totalPointsEarned,
        battleXPEarnedToday,
      });

      const xpEarned = actualXPAwarded;

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
      const newBattleXPEarnedToday = battleXPEarnedToday + xpEarned;
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
        xpBreakdown,
        totalPointsEarned,
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
        battleXPEarnedToday: newBattleXPEarnedToday,
        battleXPEarnedDate: todayUTC,
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
      xpBreakdownByPlayer[participantId] = xpBreakdown;
    }

    tx.update(matchRef, {
      "metadata.finalizedAt": admin.firestore.FieldValue.serverTimestamp(),
      "metadata.outcomeByPlayer": outcomeByPlayer,
      "metadata.xpByPlayer": xpByPlayer,
      "metadata.xpBreakdownByPlayer": xpBreakdownByPlayer,
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
  const sharedPoolModeRaw = asString(input.sharedPoolMode, "grade_strict").toLowerCase();
  const sharedPoolMode = sharedPoolModeRaw === "admin_shared" ? "admin_shared" : "grade_strict";

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

  if (sharedPoolMode === "admin_shared" && !QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Admin shared pool mode is currently disabled for Quiz Battle.",
      { reason: "shared_pool_mode_disabled" },
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
    sharedPoolMode,
  };
};

const setupFromRoomData = (roomData: Record<string, unknown>): NormalizedBattleSetup => {
  const sharedPoolModeRaw = asString(roomData.sharedPoolMode, "grade_strict").toLowerCase();
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
    sharedPoolMode: sharedPoolModeRaw === "admin_shared" ? "admin_shared" : "grade_strict",
  };
};

const setupFromQueueData = (queueData: Record<string, unknown>): NormalizedBattleSetup => {
  const sharedPoolModeRaw = asString(queueData.sharedPoolMode, "grade_strict").toLowerCase();
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
    sharedPoolMode: sharedPoolModeRaw === "admin_shared" ? "admin_shared" : "grade_strict",
  };
};

const setupFromMatchData = (matchData: Record<string, unknown>): NormalizedBattleSetup => {
  const mode = asString(matchData.mode, "online") === "bot" ? "bot" : "online";
  const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
  const matchDifficulty = asString(matchData.difficulty, "medium");
  const metadataBotDifficulty = asString(metadata.botDifficulty, matchDifficulty);

  const normalizedDifficulty = (["easy", "medium", "hard"] as const).includes(matchDifficulty as "easy" | "medium" | "hard")
    ? (matchDifficulty as "easy" | "medium" | "hard")
    : "medium";

  const botDifficulty = ALLOWED_DIFFICULTIES.has(metadataBotDifficulty)
    ? (metadataBotDifficulty as "easy" | "medium" | "hard" | "adaptive")
    : ALLOWED_DIFFICULTIES.has(matchDifficulty)
      ? (matchDifficulty as "easy" | "medium" | "hard" | "adaptive")
      : "medium";

  const adaptiveBot = asBoolean(
    metadata.adaptiveBot,
    botDifficulty === "adaptive" || matchDifficulty === "adaptive",
  );
  const sharedPoolModeRaw = asString(metadata.sharedPoolMode, "grade_strict").toLowerCase();

  return {
    mode,
    subjectId: ALLOWED_SUBJECT_IDS.has(asString(matchData.subjectId)) ? asString(matchData.subjectId) : "gen-math",
    topicId: asString(matchData.topicId, "unknown-topic"),
    difficulty: normalizedDifficulty,
    rounds: clamp(Math.floor(asNumber(matchData.rounds, 5)), 3, 20),
    timePerQuestionSec: clamp(Math.floor(asNumber(matchData.timePerQuestionSec, 30)), 10, 180),
    queueType: "public_matchmaking",
    botDifficulty,
    adaptiveBot,
    sharedPoolMode: sharedPoolModeRaw === "admin_shared" ? "admin_shared" : "grade_strict",
  };
};

interface AiGenerationLeaseResult {
  status: "skip" | "generate" | "in_progress";
  attemptId?: string;
  attemptNumber?: number;
  setup?: NormalizedBattleSetup;
}

const acquireAiGenerationLease = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
): Promise<AiGenerationLeaseResult> => {
  const nowMs = Date.now();

  return db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Match not found.");
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const status = asString(matchData.status, "ready");
    if (status !== "ready") {
      return { status: "skip" };
    }

    const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
    const existingSource = asString(metadata.questionSetSource, "");
    if (existingSource === "ai") {
      return { status: "skip" };
    }

    const inFlightAttemptId = asString(metadata.aiGenerationInFlightAttemptId, "");
    const inFlightAtMs = Math.floor(asNumber(metadata.aiGenerationInFlightAtMs, 0));
    const lockAgeMs = nowMs - inFlightAtMs;
    if (inFlightAttemptId && inFlightAtMs > 0 && lockAgeMs >= 0 && lockAgeMs < QUIZ_BATTLE_AI_GENERATION_LOCK_TTL_MS) {
      tx.update(matchRef, {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        "metadata.aiGenerationAttempted": true,
        "metadata.generationFailureReason": "ai_generation_in_progress",
      });

      return {
        status: "in_progress",
        attemptId: inFlightAttemptId,
      };
    }

    const currentAttempts = Math.max(0, Math.floor(asNumber(metadata.aiGenerationAttempts, 0)));
    const nextAttemptNumber = currentAttempts + 1;
    const attemptId = `qb-gen-${matchRef.id}-${nowMs}-${randomInRange(1000, 9999)}`;

    tx.update(matchRef, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      "metadata.aiGenerationAttempted": true,
      "metadata.aiGenerationAttempts": nextAttemptNumber,
      "metadata.aiGenerationInFlightAttemptId": attemptId,
      "metadata.aiGenerationInFlightAtMs": nowMs,
      "metadata.generationFailureReason": "",
    });

    return {
      status: "generate",
      attemptId,
      attemptNumber: nextAttemptNumber,
      setup: setupFromMatchData(matchData),
    };
  });
};

const persistAiGenerationFailure = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
  attemptId: string,
  attemptNumber: number,
  failureReason: QuizBattleGenerationFailureReason,
  latencyMs: number,
  modelName: string,
): Promise<void> => {
  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      return;
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
    const lockedAttemptId = asString(metadata.aiGenerationInFlightAttemptId, "");

    if (lockedAttemptId && lockedAttemptId !== attemptId) {
      return;
    }

    tx.update(matchRef, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      "metadata.aiGenerationAttempted": true,
      "metadata.aiGenerationAttempts": attemptNumber,
      "metadata.aiGenerationLatencyMs": Math.max(0, Math.floor(latencyMs)),
      "metadata.aiGenerationModel": modelName,
      "metadata.generationFailureReason": failureReason,
      "metadata.aiGenerationInFlightAttemptId": admin.firestore.FieldValue.delete(),
      "metadata.aiGenerationInFlightAtMs": admin.firestore.FieldValue.delete(),
    });
  });
};

const persistAiGenerationSuccess = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
  roundKeysRef: FirebaseFirestore.DocumentReference,
  attemptId: string,
  attemptNumber: number,
  generatedSet: GeneratedAiQuestionSet,
): Promise<boolean> => {
  return db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      return false;
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    const status = asString(matchData.status, "ready");
    if (status !== "ready") {
      return false;
    }

    const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
    const currentSource = asString(metadata.questionSetSource, "");
    if (currentSource === "ai") {
      return true;
    }

    const lockedAttemptId = asString(metadata.aiGenerationInFlightAttemptId, "");
    if (lockedAttemptId && lockedAttemptId !== attemptId) {
      return false;
    }

    tx.update(matchRef, {
      questions: generatedSet.questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      "metadata.questionSetSource": "ai",
      "metadata.seededQuestionSet": false,
      "metadata.questionSetGeneratedAt": admin.firestore.FieldValue.serverTimestamp(),
      "metadata.questionSetId": generatedSet.questionSetId,
      "metadata.questionFingerprints": generatedSet.questionFingerprints,
      "metadata.aiGenerationAttempted": true,
      "metadata.aiGenerationAttempts": attemptNumber,
      "metadata.aiGenerationLatencyMs": generatedSet.latencyMs,
      "metadata.aiGenerationModel": generatedSet.model,
      "metadata.generationFailureReason": "",
      "metadata.aiGenerationInFlightAttemptId": admin.firestore.FieldValue.delete(),
      "metadata.aiGenerationInFlightAtMs": admin.firestore.FieldValue.delete(),
    });

    tx.set(roundKeysRef, {
      keys: generatedSet.answerKeys,
      difficulties: generatedSet.answerKeys.map(() => 'medium' as const),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return true;
  });
};

const ensureAiQuestionSetForLiveStart = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
  roundKeysRef: FirebaseFirestore.DocumentReference,
): Promise<void> => {
  const lease = await acquireAiGenerationLease(db, matchRef);
  if (lease.status === "skip") {
    return;
  }

  if (lease.status === "in_progress") {
    throw new functions.https.HttpsError("unavailable", QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE);
  }

  const setup = lease.setup;
  const attemptId = asString(lease.attemptId, "");
  const attemptNumber = Math.max(1, Math.floor(asNumber(lease.attemptNumber, 1)));
  const modelNameForFailure = (() => {
    try {
      return resolveQuizBattleAiModelName();
    } catch {
      return "unresolved";
    }
  })();

  if (!setup || !attemptId) {
    throw new functions.https.HttpsError("unavailable", QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE);
  }

  const generationStartedAtMs = Date.now();

  try {
    // Try FastAPI question bank first
    let generatedSet: GeneratedAiQuestionSet | null = null;

    const matchSnap = await matchRef.get();
    if (matchSnap.exists) {
      const matchData = matchSnap.data() as Record<string, unknown>;
      const playerAId = asString(matchData.playerAId);
      const playerBId = asString(matchData.playerBId);
      const playerIds = [playerAId, playerBId].filter((id): id is string => !!id);

      const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
      const gradeLevel = asNumber(metadata.playerAGradeLevel, 11);
      const topic = setup.topicId || "general_mathematics";
      const questionCount = setup.rounds;

      generatedSet = await fetchQuestionsFromFastAPI(
        matchRef.id,
        playerIds,
        gradeLevel,
        topic,
        questionCount,
      );
    }

    // Fall back to AI generation if FastAPI fails or returns empty
    if (!generatedSet) {
      generatedSet = await generateAiQuestionSet(setup);
    }

    const persisted = await persistAiGenerationSuccess(
      db,
      matchRef,
      roundKeysRef,
      attemptId,
      attemptNumber,
      generatedSet,
    );

    if (!persisted) {
      const latestSnap = await matchRef.get();
      const latestData = latestSnap.exists ? (latestSnap.data() as Record<string, unknown>) : {};
      const latestMetadata = isRecord(latestData.metadata) ? latestData.metadata : {};
      if (asString(latestMetadata.questionSetSource, "") !== "ai") {
        throw new QuizBattleGenerationError(
          "ai_non_ai_source_blocked",
          "AI question set was not persisted before match start.",
          true,
        );
      }
    }
  } catch (error) {
    const classified = classifyGenerationError(error);
    await persistAiGenerationFailure(
      db,
      matchRef,
      attemptId,
      attemptNumber,
      classified.reason,
      Date.now() - generationStartedAtMs,
      modelNameForFailure,
    );

    functions.logger.error("[QUIZ_BATTLE] AI generation failed for live start", {
      matchId: matchRef.id,
      attemptId,
      attemptNumber,
      reason: classified.reason,
      retriable: classified.retriable,
      model: modelNameForFailure,
      latencyMs: Date.now() - generationStartedAtMs,
      error: classified.message,
    });

    throw new functions.https.HttpsError("unavailable", QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE);
  }
};

const queueCompatibilityKey = (queueData: Record<string, unknown>): string => {
  return [
    asString(queueData.mode, "online"),
    asString(queueData.queueType, "public_matchmaking"),
    asString(queueData.sharedPoolMode, "grade_strict"),
    asString(queueData.gradeLevel, ""),
    asString(queueData.curriculumVersionSetId, ""),
    asString(queueData.curriculumVersion, ""),
    asString(queueData.subjectId, "gen-math"),
    asString(queueData.topicId, "unknown-topic"),
    asString(queueData.difficulty, "medium"),
    clamp(Math.floor(asNumber(queueData.rounds, 5)), 3, 20),
    clamp(Math.floor(asNumber(queueData.timePerQuestionSec, 30)), 10, 180),
  ].join("|");
};

const getPublicMatchmakingDeadlineMs = (data: Record<string, unknown>): number => {
  const explicitDeadline = Math.floor(asNumber(data.expiresAt, 0));
  if (explicitDeadline > 0) {
    return explicitDeadline;
  }

  const readyAtMs = asTimestampMillis(data.readyAt, 0);
  if (readyAtMs > 0) {
    return readyAtMs + PUBLIC_MATCHMAKING_TIMEOUT_MS;
  }

  const joinedAtMs = asTimestampMillis(data.joinedAt, 0);
  if (joinedAtMs > 0) {
    return joinedAtMs + PUBLIC_MATCHMAKING_TIMEOUT_MS;
  }

  const createdAtMs = asTimestampMillis(data.createdAt, 0);
  if (createdAtMs > 0) {
    return createdAtMs + PUBLIC_MATCHMAKING_TIMEOUT_MS;
  }

  return 0;
};

const isPublicMatchmakingReadyMatch = (matchData: Record<string, unknown>): boolean => {
  const status = asString(matchData.status, "ready");
  if (status !== "ready") {
    return false;
  }

  const mode = asString(matchData.mode, "online");
  if (mode !== "online") {
    return false;
  }

  const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
  return asString(metadata.source, "") === "public_matchmaking";
};

const isExpiredPublicMatchmakingSession = (data: Record<string, unknown>): boolean => {
  const deadlineMs = getPublicMatchmakingDeadlineMs(data);
  return deadlineMs > 0 && Date.now() > deadlineMs;
};

const cancelExpiredPublicMatchIfNeeded = async (
  db: FirebaseFirestore.Firestore,
  matchRef: FirebaseFirestore.DocumentReference,
): Promise<boolean> => {
  let expired = false;

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      return;
    }

    const matchData = matchSnap.data() as Record<string, unknown>;
    if (!isPublicMatchmakingReadyMatch(matchData) || !isExpiredPublicMatchmakingSession(matchData)) {
      return;
    }

    const playerAId = asString(matchData.playerAId);
    const playerBId = asString(matchData.playerBId);

    tx.update(matchRef, {
      status: "cancelled" as MatchStatus,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cancellationReason: "public_match_timeout",
      expiresAt: admin.firestore.FieldValue.delete(),
    });

    if (playerAId) {
      tx.delete(db.collection("quizBattleQueue").doc(playerAId));
    }

    if (playerBId) {
      tx.delete(db.collection("quizBattleQueue").doc(playerBId));
    }

    expired = true;
  });

  return expired;
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
): Promise<{ paired: number; staleRemoved: number; readyMatchesExpired: number }> => {
  const queueSnap = await db.collection("quizBattleQueue").limit(300).get();
  const readyMatchSnap = await db.collection("quizBattleMatches").where("status", "==", "ready").limit(300).get();
  const now = Date.now();
  const staleRefs: FirebaseFirestore.DocumentReference[] = [];
  const candidatesByKey = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();

  queueSnap.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    const status = asString(data.status, "searching");
    const mode = asString(data.mode, "online");
    const queueType = asString(data.queueType, "public_matchmaking");
    const sharedPoolModeRaw = asString(data.sharedPoolMode, "grade_strict").toLowerCase();
    const sharedPoolMode = sharedPoolModeRaw === "admin_shared" && QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE
      ? "admin_shared"
      : "grade_strict";
    const heartbeatMs = asTimestampMillis(data.heartbeatAt, 0);
    const updatedMs = asTimestampMillis(data.updatedAt, 0);
    const deadlineMs = getPublicMatchmakingDeadlineMs(data);

    if (status === "searching") {
      if ((heartbeatMs > 0 && now - heartbeatMs > QUEUE_HEARTBEAT_STALE_MS) || (deadlineMs > 0 && now > deadlineMs)) {
        staleRefs.push(entry.ref);
        return;
      }

      if (mode !== "online" || queueType !== "public_matchmaking") {
        return;
      }

      if (sharedPoolMode !== "admin_shared") {
        const queueGradeLevel = parseGradeLevel(data.gradeLevel);
        const queueCurriculumVersionSetId = asString(data.curriculumVersionSetId, "");
        const queueCurriculumVersion = asString(data.curriculumVersion, "");

        if (!queueGradeLevel || !queueCurriculumVersionSetId || !queueCurriculumVersion) {
          staleRefs.push(entry.ref);
          return;
        }
      }

      const key = queueCompatibilityKey(data);
      const existing = candidatesByKey.get(key) || [];
      existing.push(entry);
      candidatesByKey.set(key, existing);
      return;
    }

    if (
      status === "matched" &&
      ((updatedMs > 0 && now - updatedMs > QUEUE_MATCHED_TTL_MS) || (deadlineMs > 0 && now > deadlineMs))
    ) {
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

  let readyMatchesExpired = 0;
  for (const matchRef of readyMatchSnap.docs.map((entry) => entry.ref)) {
    if (await cancelExpiredPublicMatchIfNeeded(db, matchRef)) {
      readyMatchesExpired += 1;
    }
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

  return { paired, staleRemoved, readyMatchesExpired };
};

const resolvePrivateRoomTimeoutPass = async (
  db: FirebaseFirestore.Firestore,
  maxRooms = 300,
): Promise<{ roomsExpired: number; emptyRoomsExpired: number; readyMatchesCancelled: number }> => {
  const [waitingSnap, readySnap] = await Promise.all([
    db.collection("quizBattleRooms").where("status", "==", "waiting").limit(maxRooms).get(),
    db.collection("quizBattleRooms").where("status", "==", "ready").limit(maxRooms).get(),
  ]);

  const now = Date.now();
  const roomRefs = new Map<string, FirebaseFirestore.DocumentReference>();
  [...waitingSnap.docs, ...readySnap.docs].forEach((entry) => {
    const roomData = entry.data() as Record<string, unknown>;
    const participantIds = getParticipantIds(roomData.participantIds);
    const expiresAtMs = asTimestampMillis(roomData.expiresAt, 0);
    const updatedAtMs = asTimestampMillis(roomData.updatedAt, 0);
    const createdAtMs = asTimestampMillis(roomData.createdAt, 0);
    const lastRoomActivityMs = Math.max(updatedAtMs, createdAtMs, 0);
    const maybeEmptyGraceExpired =
      participantIds.length === 0 &&
      lastRoomActivityMs > 0 &&
      now - lastRoomActivityMs > ROOM_EMPTY_GRACE_MS;
    const maybeIdleExpired = expiresAtMs > 0 && now > expiresAtMs;

    if (maybeIdleExpired || maybeEmptyGraceExpired) {
      roomRefs.set(entry.ref.path, entry.ref);
    }
  });

  const refs = [...roomRefs.values()];
  if (refs.length === 0) {
    return { roomsExpired: 0, emptyRoomsExpired: 0, readyMatchesCancelled: 0 };
  }

  let roomsExpired = 0;
  let emptyRoomsExpired = 0;
  let readyMatchesCancelled = 0;
  let refIndex = 0;
  const workerCount = Math.max(1, Math.min(ROOM_TIMEOUT_SWEEP_CONCURRENCY, refs.length));

  await Promise.all(Array.from({ length: workerCount }, async () => {
    let hasPendingRef = true;
    while (hasPendingRef) {
      const currentIndex = refIndex;
      refIndex += 1;
      if (currentIndex >= refs.length) {
        hasPendingRef = false;
        continue;
      }

      const roomRef = refs[currentIndex];
      const outcome = await db.runTransaction(async (tx): Promise<{
        expired: boolean;
        expiredEmpty: boolean;
        cancelledReadyMatch: boolean;
      }> => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists) {
          return { expired: false, expiredEmpty: false, cancelledReadyMatch: false };
        }

        const roomData = roomSnap.data() as Record<string, unknown>;
        const roomStatus = normalizeRoomStatus(roomData.status);
        if (roomStatus !== "waiting" && roomStatus !== "ready") {
          return { expired: false, expiredEmpty: false, cancelledReadyMatch: false };
        }

        const participantIds = getParticipantIds(roomData.participantIds);
        const expiresAtMs = asTimestampMillis(roomData.expiresAt, 0);
        const updatedAtMs = asTimestampMillis(roomData.updatedAt, 0);
        const createdAtMs = asTimestampMillis(roomData.createdAt, 0);
        const lastRoomActivityMs = Math.max(updatedAtMs, createdAtMs, 0);
        const emptyRoomGraceExceeded =
          participantIds.length === 0 &&
          lastRoomActivityMs > 0 &&
          now - lastRoomActivityMs > ROOM_EMPTY_GRACE_MS;
        const roomTimedOut = (expiresAtMs > 0 && now > expiresAtMs) || emptyRoomGraceExceeded;

        if (!roomTimedOut) {
          return { expired: false, expiredEmpty: false, cancelledReadyMatch: false };
        }

        let cancelledReadyMatch = false;
        const matchId = asString(roomData.matchId, "");
        if (matchId) {
          const matchRef = db.collection("quizBattleMatches").doc(matchId);
          const matchSnap = await tx.get(matchRef);
          if (matchSnap.exists) {
            const matchData = matchSnap.data() as Record<string, unknown>;
            const matchStatus = asString(matchData.status, "ready");

            if (matchStatus === "ready") {
              tx.update(matchRef, {
                status: "cancelled" as MatchStatus,
                endedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                cancellationReason: "room_timeout",
              });
              cancelledReadyMatch = true;
            }
          }
        }

        tx.update(roomRef, {
          status: "expired" as RoomStatus,
          participantIds: [],
          participantHeartbeat: {},
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          timeoutReason: emptyRoomGraceExceeded ? "empty_room_idle" : "idle_timeout",
          matchId: admin.firestore.FieldValue.delete(),
          readyAt: admin.firestore.FieldValue.delete(),
        });

        return {
          expired: true,
          expiredEmpty: participantIds.length === 0,
          cancelledReadyMatch,
        };
      });

      if (outcome.expired) {
        roomsExpired += 1;
        if (outcome.expiredEmpty) {
          emptyRoomsExpired += 1;
        }
        if (outcome.cancelledReadyMatch) {
          readyMatchesCancelled += 1;
        }
      }
    }
  }));

  return {
    roomsExpired,
    emptyRoomsExpired,
    readyMatchesCancelled,
  };
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

    const roundDeadlineAtMs = getRoundDeadlineAtMs(matchData);
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
    const roundDifficulties = keysSnap.exists ? getRoundDifficulties(keysSnap.data()) : [];
    const roundDifficulty: 'easy' | 'medium' | 'hard' = roundDifficulties.length > currentRound - 1
      ? roundDifficulties[currentRound - 1]
      : 'medium';
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

    const roundStartedAtMs = Math.floor(asNumber(matchData.roundStartedAtMs, Date.now()));
    const roundDeadlineForScoring = roundDeadlineAtMs > 0 ? roundDeadlineAtMs : roundStartedAtMs + timeLimitMs;

    const playerAStreak = computeConsecutiveCorrect(
      (Array.isArray(matchData.roundResults) ? matchData.roundResults : []).filter((entry) => isRecord(entry)) as Record<string, unknown>[],
      true,
      currentRound,
    );
    const playerAScoringStreak = playerACorrect ? playerAStreak + 1 : 0;
    if (playerACorrect) {
      roundResult.playerAScoreBreakdown = computeRoundScoreBreakdown({
        difficulty: roundDifficulty,
        consecutiveCorrect: playerAScoringStreak,
        responseMs: playerAResponseMs,
        roundStartedAtMs,
        roundDeadlineAtMs: roundDeadlineForScoring,
      });
    }

    const playerBStreak = computeConsecutiveCorrect(
      (Array.isArray(matchData.roundResults) ? matchData.roundResults : []).filter((entry) => isRecord(entry)) as Record<string, unknown>[],
      false,
      currentRound,
    );
    const playerBScoringStreak = playerBCorrect ? playerBStreak + 1 : 0;
    if (playerBCorrect) {
      roundResult.playerBScoreBreakdown = computeRoundScoreBreakdown({
        difficulty: roundDifficulty,
        consecutiveCorrect: playerBScoringStreak,
        responseMs: playerBResponseMs,
        roundStartedAtMs,
        roundDeadlineAtMs: roundDeadlineForScoring,
      });
    }

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
  const playerProfile = await loadUserBattleProfile(db, studentId);
  const queueRef = db.collection("quizBattleQueue").doc(studentId);

  await queueRef.set(
    {
      studentId,
      mode: "online",
      queueType: "public_matchmaking",
      sharedPoolMode: setup.sharedPoolMode,
      gradeLevel: playerProfile.gradeLabel,
      curriculumVersionSetId: playerProfile.curriculumVersionSetId,
      curriculumVersion: playerProfile.curriculumVersion,
      subjectId: setup.subjectId,
      topicId: setup.topicId,
      difficulty: setup.difficulty,
      rounds: setup.rounds,
      timePerQuestionSec: setup.timePerQuestionSec,
      status: "searching" as QueueStatus,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      heartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + PUBLIC_MATCHMAKING_TIMEOUT_MS),
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
    expiresAtMs: getPublicMatchmakingDeadlineMs(refreshedData) || undefined,
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

export const quizBattleLeavePrivateRoom = functions.https.onCall(async (data, context) => {
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
  } else {
    const roomSnap = await db.collection("quizBattleRooms").where("participantIds", "array-contains", studentId).limit(6).get();
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

    roomRef = candidateRooms[0]?.doc.ref || null;
  }

  if (!roomRef) {
    return { success: true, status: "idle" };
  }

  const resolvedRoomRef = roomRef;

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(resolvedRoomRef);
    if (!roomSnap.exists) {
      return;
    }

    const roomData = roomSnap.data() as Record<string, unknown>;
    const roomStatus = normalizeRoomStatus(roomData.status);
    if (roomStatus === "cancelled" || roomStatus === "expired") {
      return;
    }

    const participantIds = getParticipantIds(roomData.participantIds);
    if (!participantIds.includes(studentId)) {
      if (roomId || roomCode) {
        throw new functions.https.HttpsError("permission-denied", "You are not a participant in this room.");
      }
      return;
    }

    const matchId = asString(roomData.matchId, "");
    if (matchId) {
      const matchRef = db.collection("quizBattleMatches").doc(matchId);
      const matchSnap = await tx.get(matchRef);

      if (matchSnap.exists) {
        const matchData = matchSnap.data() as Record<string, unknown>;
        const matchStatus = asString(matchData.status, "ready");

        if (matchStatus === "in_progress" || matchStatus === "completed") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Private room cannot be cancelled after the match has started.",
          );
        }

        tx.update(matchRef, {
          status: "cancelled" as MatchStatus,
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelledBy: studentId,
          cancellationReason: "room_left",
        });
      }
    }

    const nextParticipantIds = participantIds.filter((entry) => entry !== studentId);
    const currentOwnerStudentId = asString(roomData.ownerStudentId);
    const nextOwnerStudentId =
      nextParticipantIds.length === 0
        ? currentOwnerStudentId
        : (nextParticipantIds.includes(currentOwnerStudentId) ? currentOwnerStudentId : nextParticipantIds[0]);

    const roomUpdates: Record<string, unknown> = {
      participantIds: nextParticipantIds,
      status: nextParticipantIds.length === 0 ? ("cancelled" as RoomStatus) : ("waiting" as RoomStatus),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_IDLE_TIMEOUT_MS),
      matchId: admin.firestore.FieldValue.delete(),
      readyAt: admin.firestore.FieldValue.delete(),
      [`participantHeartbeat.${studentId}`]: admin.firestore.FieldValue.delete(),
    };

    if (nextParticipantIds.length > 0) {
      roomUpdates.ownerStudentId = nextOwnerStudentId;
    }

    tx.update(resolvedRoomRef, roomUpdates);
  });

  await db.collection("quizBattleQueue").doc(studentId).delete().catch(() => undefined);

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
  const ownerProfile = await loadUserBattleProfile(db, studentId);
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
    sharedPoolMode: setup.sharedPoolMode,
    gradeLevel: ownerProfile.gradeLabel,
    curriculumVersionSetId: ownerProfile.curriculumVersionSetId,
    curriculumVersion: ownerProfile.curriculumVersion,
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: setup.difficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    status: "waiting" as RoomStatus,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_IDLE_TIMEOUT_MS),
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
  const joiningProfile = await loadUserBattleProfile(db, studentId);
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

    const sharedPoolModeRaw = asString(roomData.sharedPoolMode, "grade_strict").toLowerCase();
    const sharedPoolMode = sharedPoolModeRaw === "admin_shared" && QUIZ_BATTLE_ALLOW_ADMIN_SHARED_MODE
      ? "admin_shared"
      : "grade_strict";

    if (!alreadyJoined && sharedPoolMode !== "admin_shared") {
      let roomGradeLevel = parseGradeLevel(roomData.gradeLevel);
      let roomCurriculumVersionSetId = asString(roomData.curriculumVersionSetId, "");
      let roomCurriculumVersion = asString(roomData.curriculumVersion, "");

      if (!roomGradeLevel || !roomCurriculumVersionSetId || !roomCurriculumVersion) {
        const baselineStudentId = asString(roomData.ownerStudentId, participantIds[0] || "");
        if (baselineStudentId) {
          const baselineProfile = await loadUserBattleProfileFromTx(tx, db, baselineStudentId);
          roomGradeLevel = baselineProfile.gradeLevel;
          roomCurriculumVersionSetId = baselineProfile.curriculumVersionSetId;
          roomCurriculumVersion = baselineProfile.curriculumVersion;
        }
      }

      if (QUIZ_BATTLE_ENFORCE_GRADE_SEGREGATION && roomGradeLevel && joiningProfile.gradeLevel !== roomGradeLevel) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This private room is restricted to a different grade cohort.",
          { reason: "mixed_grade_blocked" },
        );
      }

      if (roomCurriculumVersionSetId && joiningProfile.curriculumVersionSetId !== roomCurriculumVersionSetId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This private room is restricted to a different curriculum cohort.",
          { reason: "curriculum_mismatch" },
        );
      }

      const normalizedRoomCurriculumVersion = normalizeCurriculumVersion(
        roomCurriculumVersion,
        roomCurriculumVersionSetId,
      );
      if (joiningProfile.curriculumVersion !== normalizedRoomCurriculumVersion) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This private room is restricted to a different curriculum version.",
          { reason: "curriculum_version_mismatch" },
        );
      }
    }

    const nextParticipants = alreadyJoined ? participantIds : [...participantIds, studentId];

    if (!alreadyJoined && participantIds.length >= 2) {
      throw new functions.https.HttpsError("already-exists", "Private room is full.");
    }

    const roomUpdates: Record<string, unknown> = {
      participantIds: nextParticipants,
      sharedPoolMode,
      gradeLevel: asString(roomData.gradeLevel, joiningProfile.gradeLabel) || joiningProfile.gradeLabel,
      curriculumVersionSetId:
        asString(roomData.curriculumVersionSetId, joiningProfile.curriculumVersionSetId) || joiningProfile.curriculumVersionSetId,
      curriculumVersion:
        asString(roomData.curriculumVersion, joiningProfile.curriculumVersion) || joiningProfile.curriculumVersion,
      [`participantHeartbeat.${studentId}`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_IDLE_TIMEOUT_MS),
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
  const roomStatus = normalizeRoomStatus(roomData.status);
  const expiresAtMs = asTimestampMillis(roomData.expiresAt, 0);

  if ((roomStatus === "waiting" || roomStatus === "ready") && expiresAtMs > 0 && Date.now() > expiresAtMs) {
    await db.runTransaction(async (tx) => {
      const latestRoomSnap = await tx.get(roomRef);
      if (!latestRoomSnap.exists) {
        return;
      }

      const latestRoomData = latestRoomSnap.data() as Record<string, unknown>;
      const latestRoomStatus = normalizeRoomStatus(latestRoomData.status);
      const latestExpiresAtMs = asTimestampMillis(latestRoomData.expiresAt, 0);
      if ((latestRoomStatus !== "waiting" && latestRoomStatus !== "ready") || latestExpiresAtMs <= 0 || Date.now() <= latestExpiresAtMs) {
        return;
      }

      const matchId = asString(latestRoomData.matchId, "");
      if (matchId) {
        const matchRef = db.collection("quizBattleMatches").doc(matchId);
        const matchSnap = await tx.get(matchRef);
        if (matchSnap.exists) {
          const matchData = matchSnap.data() as Record<string, unknown>;
          if (asString(matchData.status, "ready") === "ready") {
            tx.update(matchRef, {
              status: "cancelled" as MatchStatus,
              endedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              cancellationReason: "room_timeout",
            });
          }
        }
      }

      tx.update(roomRef, {
        status: "expired" as RoomStatus,
        participantIds: [],
        participantHeartbeat: {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        timeoutReason: "idle_timeout",
        matchId: admin.firestore.FieldValue.delete(),
        readyAt: admin.firestore.FieldValue.delete(),
      });
    });

    throw new functions.https.HttpsError("deadline-exceeded", "Private room has expired.");
  }

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
  const roundKeysRef = matchRef.collection("server").doc("roundKeys");

  const preStartSnap = await matchRef.get();
  if (!preStartSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Match not found.");
  }

  const preStartData = preStartSnap.data() as Record<string, unknown>;
  const preStartStatus = asString(preStartData.status, "ready");
  if (preStartStatus === "ready") {
    const metadata = isRecord(preStartData.metadata) ? preStartData.metadata : {};
    const existingQuestionSource = asString(metadata.questionSetSource, "");
    if (shouldBlockStartDueToNonAiSource({
      status: preStartStatus,
      mode: preStartData.mode,
      questionSetSource: existingQuestionSource,
    })) {
      await ensureAiQuestionSetForLiveStart(db, matchRef, roundKeysRef);
    }
  }

  const postGenerationSnap = await matchRef.get();
  if (!postGenerationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Match not found.");
  }

  const postGenerationData = postGenerationSnap.data() as Record<string, unknown>;
  const postGenerationStatus = asString(postGenerationData.status, "ready");
  if (postGenerationStatus === "ready") {
    const postGenerationMetadata = isRecord(postGenerationData.metadata) ? postGenerationData.metadata : {};
    if (shouldBlockStartDueToNonAiSource({
      status: postGenerationStatus,
      mode: postGenerationData.mode,
      questionSetSource: asString(postGenerationMetadata.questionSetSource, ""),
    })) {
      await matchRef.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        "metadata.aiGenerationAttempted": true,
        "metadata.generationFailureReason": "ai_non_ai_source_blocked",
      });
      throw new functions.https.HttpsError("unavailable", QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE);
    }
  }

  if (isPublicMatchmakingReadyMatch(postGenerationData) && isExpiredPublicMatchmakingSession(postGenerationData)) {
    await cancelExpiredPublicMatchIfNeeded(db, matchRef);
    const refreshedExpiredSnap = await matchRef.get();
    if (refreshedExpiredSnap.exists) {
      return mapMatchStateForStudent(matchRef.id, studentId, refreshedExpiredSnap.data() as Record<string, unknown>);
    }
  }

  let nonAiSourceDetectedInTransaction = false;

  try {
    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found.");
      }

      const matchData = matchSnap.data() as Record<string, unknown>;
      const participantA = asString(matchData.playerAId);
      const participantB = asString(matchData.playerBId);
      const mode = normalizeQuizBattleMode(matchData.mode);

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

      if (isPublicMatchmakingReadyMatch(matchData) && isExpiredPublicMatchmakingSession(matchData)) {
        tx.update(matchRef, {
          status: "cancelled" as MatchStatus,
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationReason: "public_match_timeout",
          expiresAt: admin.firestore.FieldValue.delete(),
        });
        return;
      }

      if (status !== "ready") {
        throw new functions.https.HttpsError("failed-precondition", "Match is not in a startable state.");
      }

      const metadata = isRecord(matchData.metadata) ? matchData.metadata : {};
      const questionSetSource = asString(metadata.questionSetSource, "");
      if (shouldBlockStartDueToNonAiSource({ status, mode, questionSetSource })) {
        nonAiSourceDetectedInTransaction = true;
        throw new functions.https.HttpsError("unavailable", QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE);
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
  } catch (error) {
    if (
      error instanceof functions.https.HttpsError &&
      error.code === "unavailable" &&
      nonAiSourceDetectedInTransaction
    ) {
      await matchRef.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        "metadata.aiGenerationAttempted": true,
        "metadata.generationFailureReason": "ai_non_ai_source_blocked",
      });
    }
    throw error;
  }

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

  if (isPublicMatchmakingReadyMatch(matchData) && isExpiredPublicMatchmakingSession(matchData)) {
    await cancelExpiredPublicMatchIfNeeded(db, matchRef);
    const refreshedExpiredSnap = await matchRef.get();
    if (refreshedExpiredSnap.exists) {
      return {
        success: true,
        match: mapMatchStateForStudent(matchRef.id, studentId, refreshedExpiredSnap.data() as Record<string, unknown>),
      };
    }
  }

  return {
    success: true,
    match: mapMatchStateForStudent(matchRef.id, studentId, matchData),
  };
});

export const quizBattleGetGenerationAudit = functions.https.onCall(async (data, context): Promise<QuizBattleGenerationAuditResponse> => {
  const studentId = await requireStudentUid(context);
  const matchId = asString(data?.matchId);

  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument", "matchId is required.");
  }

  const db = admin.firestore();
  const matchRef = db.collection("quizBattleMatches").doc(matchId);
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

  return mapGenerationAuditForStudent(matchRef.id, matchData);
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
    const roundDifficulties = keysSnap.exists ? getRoundDifficulties(keysSnap.data()) : [];
    const roundDifficulty: 'easy' | 'medium' | 'hard' = roundDifficulties.length > roundNumber - 1
      ? roundDifficulties[roundNumber - 1]
      : 'medium';
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

      const playerAStreak = computeConsecutiveCorrect(
        (Array.isArray(matchData.roundResults) ? matchData.roundResults : []).filter((entry) => isRecord(entry)) as Record<string, unknown>[],
        true,
        roundNumber,
      );
      const roundStartedAtMs = Math.floor(asNumber(matchData.roundStartedAtMs, Date.now()));
      const deadlineMs = roundDeadlineAtMs > 0 ? roundDeadlineAtMs : roundStartedAtMs + timeLimitMs;
      roundResult.playerAScoreBreakdown = computeRoundScoreBreakdown({
        difficulty: roundDifficulty,
        consecutiveCorrect: playerAStreak,
        responseMs: boundedResponseMs,
        roundStartedAtMs,
        roundDeadlineAtMs: deadlineMs,
      });

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

    const roundStartedAtMs = Math.floor(asNumber(matchData.roundStartedAtMs, Date.now()));
    const deadlineMs = roundDeadlineAtMs > 0 ? roundDeadlineAtMs : roundStartedAtMs + timeLimitMs;

    const playerAStreak = computeConsecutiveCorrect(
      (Array.isArray(matchData.roundResults) ? matchData.roundResults : []).filter((entry) => isRecord(entry)) as Record<string, unknown>[],
      true,
      roundNumber,
    );
    if (playerACorrect) {
      roundResult.playerAScoreBreakdown = computeRoundScoreBreakdown({
        difficulty: roundDifficulty,
        consecutiveCorrect: playerAStreak + 1,
        responseMs: playerAResponseMs,
        roundStartedAtMs,
        roundDeadlineAtMs: deadlineMs,
      });
    }

    const playerBStreak = computeConsecutiveCorrect(
      (Array.isArray(matchData.roundResults) ? matchData.roundResults : []).filter((entry) => isRecord(entry)) as Record<string, unknown>[],
      false,
      roundNumber,
    );
    if (playerBCorrect) {
      roundResult.playerBScoreBreakdown = computeRoundScoreBreakdown({
        difficulty: roundDifficulty,
        consecutiveCorrect: playerBStreak + 1,
        responseMs: playerBResponseMs,
        roundStartedAtMs,
        roundDeadlineAtMs: deadlineMs,
      });
    }

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
    sharedPoolMode: "grade_strict",
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
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ROOM_IDLE_TIMEOUT_MS),
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
  const now = Date.now();
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
      if (status === "ready" && isPublicMatchmakingReadyMatch(entry.data) && isExpiredPublicMatchmakingSession(entry.data)) {
        return false;
      }
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
      const matchData = matchSnap.data() as Record<string, unknown>;
      if (isPublicMatchmakingReadyMatch(matchData) && isExpiredPublicMatchmakingSession(matchData)) {
        return { success: true, sessionType: "idle" };
      }

      return {
        success: true,
        sessionType: "match",
        queue: {
          status: "matched",
          queueType: "public_matchmaking",
          matchId: queueMatchId,
          expiresAtMs: getPublicMatchmakingDeadlineMs(queueData),
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
      if (status !== "waiting" && status !== "ready") {
        return false;
      }

      const expiresAtMs = asTimestampMillis(entry.data.expiresAt, 0);
      if (expiresAtMs > 0 && now > expiresAtMs) {
        return false;
      }

      return true;
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
    await resolvePublicMatchmakingPass(db, 1);
    const refreshedQueueSnap = await queueRef.get();
    if (refreshedQueueSnap.exists) {
      const refreshedQueueData = refreshedQueueSnap.data() as Record<string, unknown>;
      const refreshedStatus = asString(refreshedQueueData.status, "searching");
      const refreshedMatchId = asString(refreshedQueueData.matchId, "");
      if (refreshedStatus === "matched" && refreshedMatchId) {
        const matchRef = db.collection("quizBattleMatches").doc(refreshedMatchId);
        await progressAndFinalizeMatchIfNeeded(db, matchRef, studentId);
        const matchSnap = await matchRef.get();
        if (matchSnap.exists) {
          return {
            success: true,
            sessionType: "match",
            queue: {
              status: "matched",
              queueType: "public_matchmaking",
              matchId: refreshedMatchId,
              expiresAtMs: getPublicMatchmakingDeadlineMs(refreshedQueueData),
            },
            match: mapMatchStateForStudent(refreshedMatchId, studentId, matchSnap.data() as Record<string, unknown>),
          };
        }
      }

      if (refreshedStatus === "searching") {
        return {
          success: true,
          sessionType: "queue",
          queue: {
            status: "searching",
            queueType: "public_matchmaking",
            expiresAtMs: getPublicMatchmakingDeadlineMs(refreshedQueueData),
          },
        };
      }
    }

    return { success: true, sessionType: "idle" };
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
    const [queueSummary, roomSummary] = await Promise.all([
      resolvePublicMatchmakingPass(db, MAX_MATCHMAKING_PAIRS_PER_PASS),
      resolvePrivateRoomTimeoutPass(db),
    ]);
    functions.logger.info("[QUIZ_BATTLE] Matchmaking + room timeout sweep complete", {
      queueSummary,
      roomSummary,
    });
    return null;
  });

export const __quizBattleTestUtils = {
  resolveQuizBattleAiModel,
  resolveQuizBattleAiModelName,
  shouldBlockStartDueToNonAiSource,
  computeRetryDelayMs,
  shuffleChoicesPreservingCorrect,
  buildStaticFallbackPool,
  expandStaticFallbackCandidates,
  dedupeAiQuestionCandidates,
  generateAiQuestionSet,
  classifyGenerationError,
  QUIZ_BATTLE_GENERATION_RETRYABLE_MESSAGE,
  getPublicMatchmakingDeadlineMs,
  isPublicMatchmakingReadyMatch,
  isExpiredPublicMatchmakingSession,
};
