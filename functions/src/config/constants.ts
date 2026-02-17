/**
 * MathPulse AI Cloud Functions - Constants & Configuration
 *
 * Mirrors thresholds from backend/automation_engine.py to keep
 * rule-based classification consistent between Cloud Functions
 * and the FastAPI backend.
 */

// ─── Risk Thresholds ──────────────────────────────────────────

/** Subject score below this → "At Risk" */
export const AT_RISK_THRESHOLD = 60;

/** Topic accuracy below this → weak topic */
export const WEAK_TOPIC_THRESHOLD = 0.50;

/** Ratio of at-risk subjects to total that yields "High" overall risk */
export const HIGH_RISK_RATIO = 0.75;

/** Ratio that yields "Medium" overall risk */
export const MEDIUM_RISK_RATIO = 0.50;

// ─── Remedial Quiz Configuration ──────────────────────────────

export const REMEDIAL_CONFIG: Record<
  string,
  { questions: number; dist: { easy: number; medium: number; hard: number } }
> = {
  High: { questions: 15, dist: { easy: 60, medium: 30, hard: 10 } },
  Medium: { questions: 12, dist: { easy: 50, medium: 35, hard: 15 } },
  Low: { questions: 10, dist: { easy: 40, medium: 40, hard: 20 } },
};

// ─── Default Bloom's Taxonomy Levels for Remedial Quizzes ─────

export const DEFAULT_BLOOM_LEVELS = [
  "remember",
  "understand",
  "apply",
];

export const DEFAULT_QUESTION_TYPES = [
  "identification",
  "enumeration",
  "multiple_choice",
  "word_problem",
];

// ─── Notification Types ───────────────────────────────────────

export const NOTIFICATION_TYPES = {
  GRADE: "grade",
  REMINDER: "reminder",
  MESSAGE: "message",
  ACHIEVEMENT: "achievement",
} as const;

// ─── Gamification Defaults ────────────────────────────────────

export const INITIAL_GAMIFICATION = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
  streak: 0,
  hasTakenDiagnostic: false,
  atRiskSubjects: [] as string[],
};

// ─── Backend API URL ──────────────────────────────────────────

/**
 * FastAPI backend URL. Cloud Functions use this to call endpoints like
 * /api/predict-risk, /api/learning-path, /api/chat, etc.
 *
 * Set via: firebase functions:config:set backend.url="https://..."
 * Or use the BACKEND_URL environment variable / .env.local.
 */
export const BACKEND_API_URL =
  process.env.BACKEND_URL ||
  "https://deign86-mathpulse-api.hf.space";

// ─── Retry / Timing ──────────────────────────────────────────

export const BACKEND_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 2;

// ─── Due-date offsets ────────────────────────────────────────

/** Days until a remedial quiz is due */
export const REMEDIAL_QUIZ_DUE_DAYS = 7;
