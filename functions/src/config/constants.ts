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
  "https://deign86-mathpulse-api-v3test.hf.space";

// ─── Retry / Timing ──────────────────────────────────────────

export const BACKEND_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 2;

// ─── Due-date offsets ────────────────────────────────────────

/** Days until a remedial quiz is due */
export const REMEDIAL_QUIZ_DUE_DAYS = 7;

// ─── IAR Workflow Modes ─────────────────────────────────────

export type IARWorkflowMode = "iar_only" | "iar_plus_diagnostic";

/**
 * Default IAR mode. Override via env var IAR_WORKFLOW_MODE.
 */
export const DEFAULT_IAR_WORKFLOW_MODE: IARWorkflowMode =
  process.env.IAR_WORKFLOW_MODE === "iar_plus_diagnostic"
    ? "iar_plus_diagnostic"
    : "iar_only";

/**
 * Baseline minimum deep-diagnostic item counts per subject area.
 * This is used only when mode is `iar_plus_diagnostic`.
 */
export const DEEP_DIAGNOSTIC_MIN_ITEMS_BY_SUBJECT: Record<string, number> = {
  "gen-math": 12,
  "stats-prob": 10,
  "pre-calc": 10,
  "basic-calc": 10,
  Functions: 12,
  BusinessMath: 10,
  Logic: 10,
};

/** Default due window for deep-diagnostic assignments. */
export const DEEP_DIAGNOSTIC_DUE_DAYS = 14;

export type DeepDiagnosticAssignmentStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "completed"
  | "expired";

export const DEEP_DIAGNOSTIC_ACTIVE_STATUSES: DeepDiagnosticAssignmentStatus[] = [
  "pending",
  "queued",
  "in_progress",
  "expired",
];

export const LEARNING_PATH_UNLOCK_CRITERIA_VERSION = "v3_assignment_state_policy_bound";

/**
 * Reassessment inactivity threshold in days.
 * Set to 0 to disable inactivity-triggered reassessment scans.
 */
export const REASSESSMENT_INACTIVITY_DAYS = Number(
  process.env.REASSESSMENT_INACTIVITY_DAYS || "0",
);

/** Maximum number of student documents scanned per scheduled inactivity run. */
export const REASSESSMENT_SCAN_BATCH_LIMIT = Number(
  process.env.REASSESSMENT_SCAN_BATCH_LIMIT || "300",
);

/**
 * Grade 12 transition gating thresholds evaluated from the latest
 * Grade 11 mastery snapshot.
 */
export const G12_TRANSITION_MIN_MASTERED_RATIO = 0.7;
export const G12_TRANSITION_MAX_CRITICAL_GAPS = 1;

/**
 * Grade 11 prerequisite-first topic ordering for recommendation fallback.
 */
export const G11_TOPIC_SEQUENCE: string[] = [
  "functions_foundations",
  "rational_functions",
  "inverse_exponential_logarithmic",
  "business_interest_annuities",
  "business_stocks_bonds_loans",
  "logic_propositions",
  "logic_syllogisms_proof",
];
