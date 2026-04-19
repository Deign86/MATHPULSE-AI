// src/services/apiService.ts
// Backend API client for FastAPI backend (Hugging Face Spaces)
//
// Features:
//  - Retry with exponential backoff (max 3 retries)
//  - 30-second request timeout via AbortController
//  - Granular HTTP error-code handling (400–503)
//  - Detailed request/response logging
//  - Pre-request validation
//  - Fallback responses for critical endpoints
//  - Network-error & connection-timeout recovery
//  - Response-data validation

import {
  retryFetch,
  withFallback,
  validateRequired,
  validateRange,
  logApiInfo,
  logApiError,
  ApiError,
  ApiTimeoutError,
  ApiNetworkError,
  ApiValidationError,
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES,
  type RetryFetchOptions,
} from './apiUtils';
import { auth } from '../lib/firebase';
import type { ClassSectionMetadata } from '../types/models';

// Re-export error classes so consumers can catch them
export { ApiError, ApiTimeoutError, ApiNetworkError, ApiValidationError };

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null || value.trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseEnvPositiveInt = (value: string | undefined, defaultValue: number): number => {
  if (value == null || value.trim() === '') return defaultValue;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
};

const IMPORT_GROUNDED_QUIZ_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_QUIZ, true);
const IMPORT_GROUNDED_LESSON_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_LESSON, true);
const IMPORT_GROUNDED_FEEDBACK_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS, true);
const ASYNC_GENERATION_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_ASYNC_GENERATION, true);
const CHAT_STREAM_IDLE_TIMEOUT_MS = parseEnvPositiveInt(import.meta.env.VITE_CHAT_STREAM_IDLE_TIMEOUT_MS, 90_000);
const CHAT_STREAM_TOTAL_TIMEOUT_MS = parseEnvPositiveInt(import.meta.env.VITE_CHAT_STREAM_TOTAL_TIMEOUT_MS, 900_000);
let IMPORTED_CLASS_OVERVIEW_ENDPOINT_AVAILABLE = true;
let IMPORTED_CLASS_OVERVIEW_RETRY_AT_EPOCH_MS = 0;
const IMPORTED_CLASS_OVERVIEW_RETRY_COOLDOWN_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userId?: string;
  verify?: boolean;
  expectedEndMarker?: string;
  completionMode?: 'auto' | 'marker' | 'none';
  continuationMaxRounds?: number;
}

export interface ChatCompletionOptions {
  expectedEndMarker?: string;
  completionMode?: 'auto' | 'marker' | 'none';
  continuationMaxRounds?: number;
}

export interface ChatResponse {
  response: string;
}

export interface StudentRiskData {
  engagementScore: number;
  avgQuizScore: number;
  attendance: number;
  assignmentCompletion: number;
}

export interface RiskPrediction {
  riskLevel: 'High' | 'Medium' | 'Low';
  confidence: number;
  analysis: {
    labels: string[];
    scores: number[];
  };
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  top_factors: string[];
}

export interface LearningPathRequest {
  weaknesses: string[];
  gradeLevel: string;
  learningStyle?: string;
}

export interface LearningPathResponse {
  learningPath: string;
}

export interface DailyInsightRequest {
  students: {
    name: string;
    engagementScore: number;
    avgQuizScore: number;
    attendance: number;
    riskLevel: string;
  }[];
}

export interface DailyInsightResponse {
  insight: string;
}

export interface ImportedClassroomOverviewItem {
  id: string;
  name: string;
  classSectionId?: string | null;
  grade?: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section?: string;
  managerId?: string | null;
  managerName?: string | null;
  classMetadata?: ClassSectionMetadata | null;
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
}

export interface InferredStudentState {
  state: 'urgent_intervention' | 'at_risk' | 'watchlist' | 'on_track';
  confidence: number;
  signals: string[];
  explanation: string;
  fallbackUsed: boolean;
}

export interface ImportedStudentOverviewItem {
  id: string;
  lrn?: string | null;
  name: string;
  email?: string;
  classSectionId?: string | null;
  className: string;
  grade?: string;
  gradeLevel?: string;
  classification?: string;
  strand?: string;
  section?: string;
  managerId?: string | null;
  managerName?: string | null;
  classMetadata?: ClassSectionMetadata | null;
  avgQuizScore: number;
  attendance: number;
  engagementScore: number;
  assignmentCompletion: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  weakestTopic: string;
  inferredState?: InferredStudentState;
  stateConfidence?: number;
  stateSignals?: string[];
}

export interface ImportedClassOverviewResponse {
  success: boolean;
  classSectionId?: string | null;
  classrooms: ImportedClassroomOverviewItem[];
  students: ImportedStudentOverviewItem[];
  inferredStateCoverage?: {
    inferredRows: number;
    studentRows: number;
    coveragePct: number;
  };
  warnings: string[];
}

export interface UploadResponse {
  success: boolean;
  classMetadata?: ClassSectionMetadata | null;
  datasetIntent?: 'synthetic_student_records' | 'general_analytics' | 'eval_only';
  students: {
    name: string;
    lrn?: string;
    email?: string;
    engagementScore: number;
    avgQuizScore: number;
    attendance: number;
    assignmentCompletion?: number;
    term?: string;
    assessmentName?: string;
    unknownFields?: Record<string, string>;
    sourceMeta?: {
      fileName: string;
      fileHash: string;
      sourceRow: number;
    };
    studentId?: string;
    dedupKey?: string;
  }[];
  columnMapping: Record<string, string>;
  columnInterpretations?: {
    columnName: string;
    mappedField?: string;
    mappingSource: 'ai' | 'fallback' | 'unmapped';
    confidenceBand: 'high' | 'medium' | 'low';
    usagePolicy: 'scoring' | 'display' | 'storage_only';
    reason: string;
    domainSignals?: string[];
  }[];
  interpretationSummary?: {
    scoringColumns: number;
    displayColumns: number;
    storageOnlyColumns: number;
    lowConfidenceColumns: number;
    domainMismatchWarnings: number;
  };
  totalRows?: number;
  interpretedRows?: number;
  rejectedRows?: number;
  rejectedRowDetails?: { row: number; reason: string }[];
  rejectedReasons?: Record<string, number>;
  persistedRows?: number;
  inferredStateCoverage?: {
    inferredRows: number;
    interpretedRows: number;
    fallbackRows: number;
    coveragePct: number;
  };
  unknownColumns?: string[];
  warnings?: string[];
  rowWarnings?: { row: number; warning: string }[];
  importId?: string | null;
  persisted?: boolean;
  dedup?: { inserted: number; updated: number };
  summary?: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
  };
  riskRefresh?: {
    queued: boolean;
    studentsQueued: number;
    reason?: string | null;
    refreshId?: string | null;
    queuedAtEpoch?: number | null;
  };
  dashboardSync?: {
    synced: boolean;
    createdStudents: number;
    updatedStudents: number;
    classroomsTouched: number;
    classroomId?: string | null;
    classSectionId?: string | null;
    className?: string | null;
    classMetadata?: ClassSectionMetadata | null;
    warning?: string | null;
  };
  files?: {
    fileName: string;
    fileType: string;
    status: 'success' | 'partial_success' | 'failed';
    students: UploadResponse['students'];
    totalRows: number;
    columnMapping: Record<string, string>;
    datasetIntent?: 'synthetic_student_records' | 'general_analytics' | 'eval_only';
    columnInterpretations?: UploadResponse['columnInterpretations'];
    interpretationSummary?: UploadResponse['interpretationSummary'];
    unknownColumns: string[];
    warnings: string[];
    rowWarnings: { row: number; warning: string }[];
    rejectedRows?: { row: number; reason: string }[];
    classSectionId?: string | null;
    className?: string | null;
    classMetadata?: ClassSectionMetadata | null;
    importId?: string | null;
    persisted?: boolean;
    dedup?: { inserted: number; updated: number };
    interpretedRows?: number;
    rejectedRowsCount?: number;
    inferredRows?: number;
    fallbackInferenceRows?: number;
  }[];
}

export interface RiskRefreshMonitorJob {
  refreshId: string;
  status: 'queued' | 'success' | 'failed' | 'unknown';
  studentsQueued: number;
  classSectionId?: string | null;
  queuedAtEpoch?: number | null;
  startedAtEpoch?: number | null;
  completedAtEpoch?: number | null;
  durationMs?: number | null;
  updatedAtIso?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RiskRefreshMonitorStats {
  queuedCount: number;
  successCount: number;
  failedCount: number;
  lastRefreshId?: string | null;
  lastStatus?: string | null;
  lastStudentsQueued?: number | null;
  lastQueuedAtEpoch?: number | null;
  lastStartedAtEpoch?: number | null;
  lastCompletedAtEpoch?: number | null;
  lastDurationMs?: number | null;
  updatedAtIso?: string | null;
}

export interface RiskRefreshMonitorResponse {
  success: boolean;
  classSectionId?: string | null;
  stats: RiskRefreshMonitorStats;
  jobs: RiskRefreshMonitorJob[];
  warnings: string[];
}

export interface CourseMaterialTopic {
  topicId: string;
  title: string;
  description: string;
  prerequisiteTopics: string[];
  sourceFiles: string[];
}

export interface CourseMaterialSection {
  sectionId: string;
  title: string;
  preview: string;
  sourceFile: string;
}

export interface CourseMaterialUploadResponse {
  success: boolean;
  fileName: string;
  fileType: string;
  fileHash?: string;
  materialId?: string | null;
  persisted?: boolean;
  classSectionId?: string | null;
  className?: string | null;
  extractedTextLength: number;
  sections: CourseMaterialSection[];
  topics: CourseMaterialTopic[];
  warnings: string[];
  files?: {
    fileName: string;
    fileType: string;
    status: 'success' | 'partial_success' | 'failed';
    fileHash?: string | null;
    materialId?: string | null;
    persisted?: boolean;
    sourceLegitimacy?: SourceLegitimacyReport;
    classSectionId?: string | null;
    className?: string | null;
    extractedTextLength: number;
    sections: CourseMaterialSection[];
    topics: CourseMaterialTopic[];
    warnings: string[];
  }[];
  summary?: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
  };
}

export interface CourseMaterialArtifactSummary {
  materialId: string;
  fileName: string;
  fileType: string;
  fileHash?: string;
  sourceLegitimacy?: SourceLegitimacyReport;
  classSectionId?: string | null;
  className?: string | null;
  topicsCount: number;
  topicTitles: string[];
  extractedTextLength: number;
  retentionDays?: number | null;
  expiresAtEpoch?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface RecentCourseMaterialsResponse {
  success: boolean;
  classSectionId?: string | null;
  materials: CourseMaterialArtifactSummary[];
  warnings: string[];
}

export interface CourseMaterialTopicMapTopic {
  topicId: string;
  title: string;
  description: string;
  prerequisiteTopics: string[];
  sourceFiles: string[];
  materialId: string;
  sourceFile?: string | null;
  sectionId?: string | null;
  classSectionId?: string | null;
  className?: string | null;
}

export interface CourseMaterialTopicMapResponse {
  success: boolean;
  classSectionId?: string | null;
  materialId?: string | null;
  topics: CourseMaterialTopicMapTopic[];
  materials: CourseMaterialArtifactSummary[];
  warnings: string[];
}

export interface LessonGenerationRequest {
  gradeLevel: string;
  classSectionId?: string;
  className?: string;
  materialId?: string;
  focusTopics?: string[];
  topicCount?: number;
  preferImportedTopics?: boolean;
  allowReviewSources?: boolean;
  allowUnverifiedLesson?: boolean;
}

export interface SourceLegitimacyReport {
  status: 'verified' | 'review_required' | 'rejected';
  score: number;
  verifiedMaterials: number;
  reviewMaterials: number;
  rejectedMaterials: number;
  evidenceChecked: string[];
  issues: string[];
}

export interface LessonSelfValidationReport {
  passed: boolean;
  score: number;
  issues: string[];
  checks: Record<string, unknown>;
}

export interface LessonPlanBlock {
  blockId: string;
  title: string;
  objective: string;
  strategy: string;
  estimatedMinutes: number;
  activities: string[];
  checksForUnderstanding: string[];
  remediationTips: string[];
  provenance?: {
    topicId?: string | null;
    title?: string | null;
    materialId?: string | null;
    sourceFile?: string | null;
    sectionId?: string | null;
  } | null;
}

export interface LessonPlanResponse {
  success: boolean;
  lessonTitle: string;
  gradeLevel: string;
  classSectionId?: string | null;
  className?: string | null;
  usedImportedTopics: boolean;
  importedTopicCount: number;
  weakSignals: {
    recordsCount: number;
    averageQuizScore: number;
    averageAttendance: number;
    averageEngagement: number;
    averageAssignmentCompletion: number;
    atRiskRate: number;
  };
  focusTopics: string[];
  blocks: LessonPlanBlock[];
  provenanceSummary: {
    topicId?: string | null;
    title?: string | null;
    materialId?: string | null;
    sourceFile?: string | null;
    sectionId?: string | null;
  }[];
  sourceLegitimacy: SourceLegitimacyReport;
  selfValidation: LessonSelfValidationReport;
  publishReady: boolean;
  warnings: string[];
}

export type AsyncTaskKind = 'lesson_generation' | 'quiz_generation';
export type AsyncTaskStatus = 'queued' | 'running' | 'cancelling' | 'completed' | 'failed' | 'cancelled';

export interface AsyncTaskSubmitResponse {
  success: boolean;
  taskId: string;
  status: AsyncTaskStatus;
  taskKind: AsyncTaskKind;
  createdAt: string;
}

export interface AsyncTaskStatusResponse {
  success: boolean;
  taskId: string;
  taskKind: AsyncTaskKind;
  status: AsyncTaskStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercent?: number;
  progressStage?: string;
  progressMessage?: string | null;
  result?: Record<string, unknown> | null;
  error?: unknown;
}

export interface AsyncTaskWaitOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onProgress?: (status: AsyncTaskStatusResponse) => void;
}

export interface QuizGenerationOptions {
  onTaskCreated?: (taskId: string) => void;
  onProgress?: (status: AsyncTaskStatusResponse) => void;
}

export interface AsyncTaskListResponse {
  success: boolean;
  count: number;
  tasks: AsyncTaskStatusResponse[];
}

export interface AsyncTaskCancelResponse {
  success: boolean;
  taskId: string;
  status: AsyncTaskStatus;
  message: string;
}

export interface ImportGroundedFeedbackRequest {
  flow: 'quiz' | 'lesson';
  status: 'success' | 'failed' | 'skipped';
  classSectionId?: string;
  className?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportGroundedFeedbackResponse {
  success: boolean;
  stored: boolean;
  warnings: string[];
}

export interface ImportGroundedRolloutFlags {
  quizEnabled: boolean;
  lessonEnabled: boolean;
  feedbackEnabled: boolean;
}

export interface ImportGroundedHourlyVolumeItem {
  hourBucket: string;
  flow: string;
  status: string;
  eventCount: number;
}

export interface ImportGroundedClassRateItem {
  classSectionId: string;
  total24h: number;
  failed24h: number;
  skipped24h: number;
  failureRate24h: number;
  skippedRate24h: number;
  total7d: number;
  failed7d: number;
  skipped7d: number;
  failureRate7d: number;
  skippedRate7d: number;
}

export interface ImportGroundedFlowUsageItem {
  flow: string;
  totalEvents: number;
  eligibleEvents: number;
  groundedEvents: number;
  groundedUsageRatio: number;
}

export interface ImportGroundedErrorReasonItem {
  normalizedErrorReason: string;
  occurrences: number;
}

export interface ImportGroundedTelemetryThresholds {
  go: boolean;
  reasons: string[];
}

export interface ImportGroundedTelemetrySummaryResponse {
  success: boolean;
  classSectionId?: string | null;
  lookbackDays: number;
  totalEvents: number;
  hourlyVolume: ImportGroundedHourlyVolumeItem[];
  classRates: ImportGroundedClassRateItem[];
  flowUsage: ImportGroundedFlowUsageItem[];
  topErrors: ImportGroundedErrorReasonItem[];
  thresholds: ImportGroundedTelemetryThresholds;
  warnings: string[];
}

export interface ImportGroundedAccessAuditItem {
  auditId: string;
  action: string;
  status: string;
  path: string;
  method: string;
  classSectionId?: string | null;
  createdAtIso?: string | null;
  metadata: Record<string, unknown>;
}

export interface ImportGroundedAccessAuditSummary {
  totalEvents: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ImportGroundedAccessAuditResponse {
  success: boolean;
  classSectionId?: string | null;
  lookbackDays: number;
  entries: ImportGroundedAccessAuditItem[];
  summary: ImportGroundedAccessAuditSummary;
  warnings: string[];
}

export type StudentAccountPreviewStatus = 'valid' | 'invalid' | 'duplicate';
export type StudentAccountCommitStatus = 'created' | 'updated' | 'skipped' | 'blocked' | 'failed';

export interface StudentAccountProvisionPreviewRow {
  rowNumber: number;
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  email: string;
  grade: string;
  section: string;
  classSectionId: string;
  status: StudentAccountPreviewStatus;
  issues: string[];
  duplicateInFile?: boolean;
  duplicateInFirestore?: boolean;
  duplicateInAuth?: boolean;
}

export interface StudentAccountImportPreviewResponse {
  success: boolean;
  previewToken?: string | null;
  classSectionId?: string | null;
  className?: string | null;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  };
  rows: StudentAccountProvisionPreviewRow[];
  warnings: string[];
}

export interface StudentAccountProvisionCommitRow {
  rowNumber: number;
  studentId: string;
  fullName: string;
  email: string;
  uid?: string | null;
  classSectionId: string;
  status: StudentAccountCommitStatus;
  message: string;
  temporaryPassword?: string | null;
}

export interface StudentAccountImportCommitResponse {
  success: boolean;
  previewToken: string;
  summary: {
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    skippedRows: number;
    blockedRows: number;
    failedRows: number;
  };
  rows: StudentAccountProvisionCommitRow[];
  warnings: string[];
}

export interface AdminCreateUserApiRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
  grade: string;
  section: string;
  lrn?: string;
}

export interface AdminCreateUserApiResponse {
  success: boolean;
  resultCode: 'created_and_emailed' | 'created_email_failed';
  message: string;
  userCreated: boolean;
  emailSent: boolean;
  uid?: string | null;
  warnings: string[];
  emailError?: {
    provider?: string;
    code?: string;
    message?: string;
    retryable?: boolean;
  } | null;
}

export interface AdminDeleteUserApiResponse {
  success: boolean;
  uid: string;
  authDeleted: boolean;
  profileDeleted: boolean;
  message: string;
  warnings: string[];
}

export interface AdminUsersListApiRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
}

export interface AdminUsersListApiItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  grade?: string | null;
  section?: string | null;
  classSectionId?: string | null;
  lrn?: string | null;
  photo?: string | null;
  lastLogin: string;
  createdAtEpoch?: number | null;
}

export interface AdminUsersListApiResponse {
  success: boolean;
  users: AdminUsersListApiItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPage?: number | null;
  warnings: string[];
}

// ─── Quiz Maker Types ────────────────────────────────────────

export type QuestionType = 'identification' | 'enumeration' | 'multiple_choice' | 'word_problem' | 'equation_based';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuizGenerationRequest {
  topics: string[];
  gradeLevel: string;
  numQuestions?: number;
  questionTypes?: QuestionType[];
  includeGraphs?: boolean;
  difficultyDistribution?: Record<DifficultyLevel, number>;
  bloomLevels?: BloomLevel[];
  excludeTopics?: string[];
  classSectionId?: string;
  className?: string;
  materialId?: string;
  preferImportedTopics?: boolean;
}

export interface QuizQuestionGenerated {
  questionType: string;
  question: string;
  correctAnswer: string;
  options?: string[] | null;
  bloomLevel: string;
  difficulty: string;
  topic: string;
  points: number;
  explanation: string;
  provenance?: {
    topicId?: string | null;
    title?: string | null;
    materialId?: string | null;
    sourceFile?: string | null;
    sectionId?: string | null;
  } | null;
}

export interface QuizGenerationResponse {
  questions: QuizQuestionGenerated[];
  totalPoints: number;
  metadata: {
    topicsCovered: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
    bloomTaxonomyDistribution: Record<string, number>;
    questionTypeBreakdown: Record<string, number>;
    gradeLevel: string;
    totalQuestions: number;
    includesGraphQuestions: boolean;
    supplementalPurpose: string;
    bloomTaxonomyRationale: string;
    recommendedTeacherActions: string[];
    graphQuestionNote?: string;
    classSectionId?: string | null;
    className?: string | null;
    materialId?: string | null;
    importGroundingEnabled?: boolean;
    usedImportedTopics?: boolean;
    importedMaterialsCount?: number;
    importedTopicCount?: number;
    importWarnings?: string[];
    topicProvenance?: {
      topicId?: string;
      title?: string;
      materialId?: string;
      sourceFile?: string;
      sectionId?: string | null;
    }[];
  };
}

export interface TopicCompetency {
  topic: string;
  efficiencyScore: number;
  competencyLevel: 'beginner' | 'developing' | 'proficient' | 'advanced';
  perspective: string;
}

export interface StudentCompetencyResponse {
  studentId: string;
  competencies: TopicCompetency[];
  recommendedTopics: string[];
  excludeTopics: string[];
}

export interface CalculatorRequest {
  expression: string;
}

export interface CalculatorResponse {
  expression: string;
  result: string;
  steps: string[];
  simplified?: string | null;
  latex?: string | null;
}

export interface QuizTopicsResponse {
  gradeLevel?: string;
  topics?: Record<string, string[]>;
  allTopics?: Record<string, Record<string, string[]>>;
}

// ─── Default retry options ───────────────────────────────────

const DEFAULT_RETRY_OPTS: RetryFetchOptions = {
  maxRetries: MAX_RETRIES,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  baseBackoffMs: 1_000,
};

/** Longer timeout for AI-heavy endpoints (quiz generation, chat) */
const AI_RETRY_OPTS: RetryFetchOptions = {
  ...DEFAULT_RETRY_OPTS,
  timeoutMs: 60_000,
};

/** Chat-specific retry profile to avoid compounding backend fallback latency. */
const CHAT_RETRY_OPTS: RetryFetchOptions = {
  ...AI_RETRY_OPTS,
  maxRetries: 1,
  timeoutMs: 45_000,
  baseBackoffMs: 750,
};

/** Upload-specific: longer timeout, fewer retries */
const UPLOAD_RETRY_OPTS: RetryFetchOptions = {
  maxRetries: 2,
  timeoutMs: 120_000,
  baseBackoffMs: 2_000,
};

/** Imported class overview should fail fast so dashboard loading never stalls. */
const IMPORTED_OVERVIEW_RETRY_OPTS: RetryFetchOptions = {
  maxRetries: 0,
  timeoutMs: 8_000,
  baseBackoffMs: 500,
};

/** Admin users list should fail fast to avoid indefinite loading states in user-management UI. */
const ADMIN_USERS_RETRY_OPTS: RetryFetchOptions = {
  maxRetries: 0,
  timeoutMs: 12_000,
  baseBackoffMs: 500,
};

// ─── Warmup / Health Ping ────────────────────────────────────

let _warmupPromise: Promise<boolean> | null = null;

/**
 * Wake up the HuggingFace Space by pinging the health endpoint.
 * Called early (e.g., on app load or when chat page mounts) to reduce
 * cold-start latency when the user actually sends a message.
 *
 * Returns true if the backend is healthy, false if unreachable.
 * Safe to call multiple times – only one request is made.
 */
export async function warmupBackend(): Promise<boolean> {
  if (_warmupPromise) return _warmupPromise;

  _warmupPromise = (async () => {
    try {
      logApiInfo('/health', 'GET', 'Warming up HuggingFace Space...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        logApiInfo('/health', 'GET', 'Backend warm and ready');
        return true;
      }
      console.warn('[apiService] Backend health check returned', res.status);
      return false;
    } catch (err) {
      console.warn('[apiService] Backend warmup failed (cold start expected):', err);
      return false;
    }
  })();

  return _warmupPromise;
}

// ─── Core fetch wrapper ──────────────────────────────────────

/**
 * Central API fetch with retry, timeout, and structured error handling.
 * All `apiService` methods funnel through this function.
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  retryOpts: RetryFetchOptions = DEFAULT_RETRY_OPTS,
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const method = options?.method ?? 'GET';

  logApiInfo(endpoint, method, 'Starting request');

  const buildFetchOptions = async (forceTokenRefresh: boolean): Promise<RequestInit> => {
    const headers = new Headers(options?.headers ?? {});
    if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken(forceTokenRefresh);
        if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
        }
      } catch (err) {
        logApiError(endpoint, method, 'Failed to acquire Firebase ID token', err);
      }
    }

    return {
      ...options,
      headers,
    };
  };

  let fetchOptions = await buildFetchOptions(false);

  try {
    const result = await retryFetch<T>(url, fetchOptions, retryOpts);
    logApiInfo(endpoint, method, 'Request succeeded');
    return result;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && auth.currentUser) {
      try {
        logApiInfo(endpoint, method, '401 received, refreshing Firebase token and retrying once');
        fetchOptions = await buildFetchOptions(true);
        const refreshedResult = await retryFetch<T>(url, fetchOptions, retryOpts);
        logApiInfo(endpoint, method, 'Request succeeded after token refresh');
        return refreshedResult;
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError) {
          logApiError(endpoint, method, `HTTP ${refreshErr.status}: ${refreshErr.responseBody.slice(0, 300)}`);
        } else if (refreshErr instanceof ApiTimeoutError) {
          logApiError(endpoint, method, `Timeout after ${refreshErr.timeoutMs}ms`);
        } else if (refreshErr instanceof ApiNetworkError) {
          logApiError(endpoint, method, `Network error: ${refreshErr.originalError.message}`);
        } else {
          logApiError(endpoint, method, `Unexpected: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`);
        }
        throw refreshErr;
      }
    }

    // Enrich the error log with endpoint context
    if (err instanceof ApiError) {
      logApiError(endpoint, method, `HTTP ${err.status}: ${err.responseBody.slice(0, 300)}`);
    } else if (err instanceof ApiTimeoutError) {
      logApiError(endpoint, method, `Timeout after ${err.timeoutMs}ms`);
    } else if (err instanceof ApiNetworkError) {
      logApiError(endpoint, method, `Network error: ${err.originalError.message}`);
    } else {
      logApiError(endpoint, method, `Unexpected: ${err instanceof Error ? err.message : String(err)}`);
    }
    throw err;
  }
}

async function apiFetchBlob(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Blob> {
  const url = `${API_URL}${endpoint}`;
  const method = options?.method ?? 'GET';
  logApiInfo(endpoint, method, 'Starting blob request');

  const fetchBlobOnce = async (forceTokenRefresh: boolean): Promise<Blob> => {
    const headers = new Headers(options?.headers ?? {});
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken(forceTokenRefresh);
        if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
        }
      } catch (err) {
        logApiError(endpoint, method, 'Failed to acquire Firebase ID token', err);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new ApiError({
          status: res.status,
          statusText: res.statusText || 'Request Failed',
          endpoint,
          responseBody: body,
          retryable: res.status >= 500 || res.status === 429,
        });
      }
      return await res.blob();
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await fetchBlobOnce(false);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && auth.currentUser) {
      logApiInfo(endpoint, method, '401 received for blob request, refreshing Firebase token and retrying once');
      return fetchBlobOnce(true);
    }
    throw err;
  }
}

// ─── Fallback values ─────────────────────────────────────────

const FALLBACK_CHAT: ChatResponse = {
  response: 'Sorry, the AI tutor is temporarily unavailable. Please try again in a moment.',
};

const FALLBACK_RISK: RiskPrediction = {
  riskLevel: 'Medium',
  confidence: 0,
  analysis: { labels: [], scores: [] },
  risk_level: 'medium',
  risk_score: 0,
  top_factors: ['Fallback risk response due to temporary service unavailability'],
};

const FALLBACK_LEARNING_PATH: LearningPathResponse = {
  learningPath: 'Unable to generate a learning path right now. Please try again later.',
};

const FALLBACK_INSIGHT: DailyInsightResponse = {
  insight: 'Daily insight is temporarily unavailable. Please refresh later.',
};

const FALLBACK_CALCULATOR: CalculatorResponse = {
  expression: '',
  result: 'Error: calculation service unavailable',
  steps: [],
  simplified: null,
  latex: null,
};

// ─── Response validators ─────────────────────────────────────

function validateChatResponse(data: unknown): data is ChatResponse {
  return typeof data === 'object' && data !== null && typeof (data as ChatResponse).response === 'string';
}

function validateRiskPrediction(data: unknown): data is RiskPrediction {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as RiskPrediction;
  return typeof d.riskLevel === 'string' && typeof d.confidence === 'number';
}

function validateQuizResponse(data: unknown): data is QuizGenerationResponse {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as QuizGenerationResponse;
  return Array.isArray(d.questions) && typeof d.totalPoints === 'number';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractTaskErrorMessage(error: unknown): string {
  if (!error) return 'Generation task failed without a detailed error.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const maybeRecord = error as Record<string, unknown>;
    if (typeof maybeRecord.message === 'string') return maybeRecord.message;
    try {
      return JSON.stringify(maybeRecord);
    } catch {
      return 'Generation task failed due to an unknown error.';
    }
  }
  return String(error);
}

// ─── Public API ──────────────────────────────────────────────

export const apiService = {
  getImportGroundedRolloutFlags(): ImportGroundedRolloutFlags {
    return {
      quizEnabled: IMPORT_GROUNDED_QUIZ_ENABLED,
      lessonEnabled: IMPORT_GROUNDED_LESSON_ENABLED,
      feedbackEnabled: IMPORT_GROUNDED_FEEDBACK_ENABLED,
    };
  },

  async reportImportGroundedFeedback(payload: ImportGroundedFeedbackRequest): Promise<ImportGroundedFeedbackResponse> {
    if (!IMPORT_GROUNDED_FEEDBACK_ENABLED) {
      return {
        success: true,
        stored: false,
        warnings: ['Import-grounded feedback events are disabled by frontend rollout flag.'],
      };
    }

    return apiFetch<ImportGroundedFeedbackResponse>('/api/feedback/import-grounded', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Health check */
  async health(): Promise<{ status: string }> {
    return apiFetch('/health', undefined, { ...DEFAULT_RETRY_OPTS, timeoutMs: 10_000 });
  },

  /** AI Math Tutor Chat (HF Serverless Inference) */
  async chat(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    onChunk?: (chunk: string) => void,
    options?: ChatCompletionOptions,
  ): Promise<ChatResponse> {
    validateRequired('/api/chat', { message });

    const requestPayload: ChatRequest = {
      message,
      history: history ?? [],
      ...(options?.expectedEndMarker ? { expectedEndMarker: options.expectedEndMarker } : {}),
      ...(options?.completionMode ? { completionMode: options.completionMode } : {}),
      ...(typeof options?.continuationMaxRounds === 'number'
        ? { continuationMaxRounds: Math.max(0, Math.floor(options.continuationMaxRounds)) }
        : {}),
    };

    if (onChunk) {
      const streamController = new AbortController();
      let streamAbortReason: 'idle' | 'total' | null = null;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let totalTimer: ReturnType<typeof setTimeout> | null = null;

      const abortStream = (reason: 'idle' | 'total') => {
        if (streamAbortReason) return;
        streamAbortReason = reason;
        streamController.abort();
      };

      const clearStreamTimers = () => {
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        if (totalTimer) {
          clearTimeout(totalTimer);
          totalTimer = null;
        }
      };

      const refreshIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => abortStream('idle'), CHAT_STREAM_IDLE_TIMEOUT_MS);
      };

      totalTimer = setTimeout(() => abortStream('total'), CHAT_STREAM_TOTAL_TIMEOUT_MS);

      const headers = new Headers({
        'Content-Type': 'application/json',
      });

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(false);
          if (idToken) {
            headers.set('Authorization', `Bearer ${idToken}`);
          }
        } catch (err) {
          logApiError('/api/chat/stream', 'POST', 'Failed to acquire Firebase ID token', err);
        }
      }

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        refreshIdleTimer();

        const response = await fetch(`${API_URL}/api/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestPayload),
          signal: streamController.signal,
        });

        if (!response.ok || !response.body) {
          const bodyText = await response.text().catch(() => 'Unable to read response body');
          throw new Error(`Streaming request failed (${response.status}): ${bodyText.slice(0, 300)}`);
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let sawEndEvent = false;

        const findSseBoundary = (text: string): { index: number; length: number } | null => {
          const lfBoundary = text.indexOf('\n\n');
          const crlfBoundary = text.indexOf('\r\n\r\n');

          if (lfBoundary === -1 && crlfBoundary === -1) {
            return null;
          }
          if (lfBoundary === -1) {
            return { index: crlfBoundary, length: 4 };
          }
          if (crlfBoundary === -1) {
            return { index: lfBoundary, length: 2 };
          }

          return lfBoundary < crlfBoundary
            ? { index: lfBoundary, length: 2 }
            : { index: crlfBoundary, length: 4 };
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          refreshIdleTimer();

          buffer += decoder.decode(value, { stream: true });

          let boundaryInfo = findSseBoundary(buffer);
          while (boundaryInfo) {
            const rawEvent = buffer.slice(0, boundaryInfo.index);
            buffer = buffer.slice(boundaryInfo.index + boundaryInfo.length);

            let eventType = 'message';
            const dataLines: string[] = [];
            for (const line of rawEvent.split(/\r?\n/)) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trimStart());
              }
            }

            if (eventType === 'end') {
              sawEndEvent = true;
              return { response: fullResponse };
            }

            const eventData = dataLines.join('\n');
            if (!eventData) {
              boundaryInfo = findSseBoundary(buffer);
              continue;
            }

            if (eventType === 'chunk') {
              let chunk = eventData;
              try {
                const parsed = JSON.parse(eventData) as { chunk?: string };
                if (typeof parsed?.chunk === 'string') {
                  chunk = parsed.chunk;
                }
              } catch {
                // Keep raw chunk when payload is plain text.
              }

              if (chunk) {
                fullResponse += chunk;
                onChunk(chunk);
                refreshIdleTimer();
              }
            } else if (eventType === 'error') {
              let errorMessage = 'Streaming failed on server.';
              try {
                const parsed = JSON.parse(eventData) as { detail?: string };
                if (typeof parsed?.detail === 'string' && parsed.detail.trim()) {
                  errorMessage = parsed.detail;
                }
              } catch {
                if (eventData.trim()) errorMessage = eventData.trim();
              }
              throw new Error(errorMessage);
            }

            boundaryInfo = findSseBoundary(buffer);
          }
        }

        if (sawEndEvent) {
          return { response: fullResponse };
        }

        throw new Error('Stream closed before end event.');
      } catch (err) {
        if (streamAbortReason === 'idle') {
          throw new ApiTimeoutError('/api/chat/stream', CHAT_STREAM_IDLE_TIMEOUT_MS);
        }
        if (streamAbortReason === 'total') {
          throw new ApiTimeoutError('/api/chat/stream', CHAT_STREAM_TOTAL_TIMEOUT_MS);
        }
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new ApiTimeoutError('/api/chat/stream', CHAT_STREAM_TOTAL_TIMEOUT_MS);
        }
        throw err;
      } finally {
        clearStreamTimers();
        if (reader) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors during cleanup.
          }
        }
      }
    }

    const result = await apiFetch<ChatResponse>(
      '/api/chat',
      { method: 'POST', body: JSON.stringify(requestPayload) },
      CHAT_RETRY_OPTS,
    );

    return result;
  },

  /** AI Math Tutor Chat with fallback */
  async chatSafe(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    options?: ChatCompletionOptions,
  ): Promise<{ data: ChatResponse; fromFallback: boolean }> {
    return withFallback(
      () => apiService.chat(message, history, undefined, options),
      FALLBACK_CHAT,
      'chat',
    );
  },

  /** Student Risk Prediction (facebook/bart-large-mnli) */
  async predictRisk(studentData: StudentRiskData): Promise<RiskPrediction> {
    validateRequired('/api/predict-risk', {
      engagementScore: studentData.engagementScore,
      avgQuizScore: studentData.avgQuizScore,
      attendance: studentData.attendance,
      assignmentCompletion: studentData.assignmentCompletion,
    });
    validateRange('/api/predict-risk', 'engagementScore', studentData.engagementScore, 0, 100);
    validateRange('/api/predict-risk', 'avgQuizScore', studentData.avgQuizScore, 0, 100);
    validateRange('/api/predict-risk', 'attendance', studentData.attendance, 0, 100);
    validateRange('/api/predict-risk', 'assignmentCompletion', studentData.assignmentCompletion, 0, 100);

    const result = await apiFetch<RiskPrediction>('/api/predict-risk', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });

    if (!validateRiskPrediction(result)) {
      logApiError('/api/predict-risk', 'POST', 'Invalid response shape', result);
      throw new Error('Invalid risk prediction response from server');
    }

    return result;
  },

  /** Student Risk Prediction with fallback */
  async predictRiskSafe(studentData: StudentRiskData): Promise<{ data: RiskPrediction; fromFallback: boolean }> {
    return withFallback(
      () => apiService.predictRisk(studentData),
      FALLBACK_RISK,
      'predictRisk',
    );
  },

  /** Batch Risk Prediction for multiple students */
  async predictRiskBatch(students: StudentRiskData[]): Promise<RiskPrediction[]> {
    if (!Array.isArray(students) || students.length === 0) {
      throw new ApiValidationError('/api/predict-risk/batch', 'students array must not be empty');
    }

    return apiFetch<RiskPrediction[]>('/api/predict-risk/batch', {
      method: 'POST',
      body: JSON.stringify({ students }),
    });
  },

  /** AI-Generated Learning Path */
  async getLearningPath(request: LearningPathRequest): Promise<LearningPathResponse> {
    validateRequired('/api/learning-path', {
      weaknesses: request.weaknesses,
      gradeLevel: request.gradeLevel,
    });
    if (!Array.isArray(request.weaknesses) || request.weaknesses.length === 0) {
      throw new ApiValidationError('/api/learning-path', 'weaknesses must be a non-empty array');
    }

    return apiFetch<LearningPathResponse>(
      '/api/learning-path',
      { method: 'POST', body: JSON.stringify(request) },
      AI_RETRY_OPTS,
    );
  },

  /** AI-Generated Learning Path with fallback */
  async getLearningPathSafe(request: LearningPathRequest): Promise<{ data: LearningPathResponse; fromFallback: boolean }> {
    return withFallback(
      () => apiService.getLearningPath(request),
      FALLBACK_LEARNING_PATH,
      'getLearningPath',
    );
  },

  /** Daily AI Insights for Teacher Dashboard */
  async getDailyInsight(request: DailyInsightRequest): Promise<DailyInsightResponse> {
    if (!Array.isArray(request.students) || request.students.length === 0) {
      throw new ApiValidationError('/api/analytics/daily-insight', 'students array must not be empty');
    }

    return apiFetch<DailyInsightResponse>(
      '/api/analytics/daily-insight',
      { method: 'POST', body: JSON.stringify(request) },
      AI_RETRY_OPTS,
    );
  },

  /** Daily AI Insights with fallback */
  async getDailyInsightSafe(request: DailyInsightRequest): Promise<{ data: DailyInsightResponse; fromFallback: boolean }> {
    return withFallback(
      () => apiService.getDailyInsight(request),
      FALLBACK_INSIGHT,
      'getDailyInsight',
    );
  },

  /** Retrieve class/student overview derived from imported normalized records */
  async getImportedClassOverview(options?: {
    classSectionId?: string;
    limit?: number;
    forceRefresh?: boolean;
  }): Promise<ImportedClassOverviewResponse> {
    const shouldBackoff =
      !options?.forceRefresh
      && !IMPORTED_CLASS_OVERVIEW_ENDPOINT_AVAILABLE
      && Date.now() < IMPORTED_CLASS_OVERVIEW_RETRY_AT_EPOCH_MS;

    if (shouldBackoff) {
      return {
        success: true,
        classSectionId: options?.classSectionId ?? null,
        classrooms: [],
        students: [],
        warnings: ['Imported class overview endpoint is temporarily unavailable. Retrying automatically soon.'],
      };
    }

    const limit = options?.limit ?? 3000;
    validateRange('/api/analytics/imported-class-overview', 'limit', limit, 1, 5000);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }

    try {
      // Allow automatic recovery after transient backend deployment mismatches.
      IMPORTED_CLASS_OVERVIEW_ENDPOINT_AVAILABLE = true;
      return await apiFetch<ImportedClassOverviewResponse>(
        `/api/analytics/imported-class-overview?${params.toString()}`,
        undefined,
        IMPORTED_OVERVIEW_RETRY_OPTS,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        IMPORTED_CLASS_OVERVIEW_ENDPOINT_AVAILABLE = false;
        IMPORTED_CLASS_OVERVIEW_RETRY_AT_EPOCH_MS = Date.now() + IMPORTED_CLASS_OVERVIEW_RETRY_COOLDOWN_MS;
        return {
          success: true,
          classSectionId: options?.classSectionId ?? null,
          classrooms: [],
          students: [],
          warnings: ['Imported class overview endpoint is unavailable on this backend deployment.'],
        };
      }
      throw error;
    }
  },

  /** Smart File Upload with AI Column Detection */
  async uploadClassRecords(
    files: File | File[],
    options?: {
      classSectionId?: string;
      className?: string;
      datasetIntent?: 'synthetic_student_records' | 'general_analytics' | 'eval_only';
    },
  ): Promise<UploadResponse> {
    const resolvedFiles = Array.isArray(files) ? files : [files];
    if (resolvedFiles.length === 0) {
      throw new ApiValidationError('/api/upload/class-records', 'At least one file is required');
    }
    if (resolvedFiles.some((file) => !file || file.size === 0)) {
      throw new ApiValidationError('/api/upload/class-records', 'All files must be non-empty');
    }
    if (resolvedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      throw new ApiValidationError('/api/upload/class-records', 'One or more files exceed the 10 MB size limit');
    }

    const formData = new FormData();
    resolvedFiles.forEach((file) => formData.append('files', file));
    if (options?.classSectionId) {
      formData.append('classSectionId', options.classSectionId);
    }
    if (options?.className) {
      formData.append('className', options.className);
    }
    formData.append('datasetIntent', options?.datasetIntent ?? 'synthetic_student_records');

    return apiFetch<UploadResponse>(
      '/api/upload/class-records',
      { method: 'POST', body: formData },
      UPLOAD_RETRY_OPTS,
    );
  },

  /** Parse and validate student account rows before provisioning Auth/Firestore users. */
  async previewStudentAccountImport(
    file: File,
    options?: {
      classSectionId?: string;
      className?: string;
      defaultGrade?: string;
      defaultSection?: string;
    },
  ): Promise<StudentAccountImportPreviewResponse> {
    if (!file || file.size === 0) {
      throw new ApiValidationError('/api/import/student-accounts/preview', 'A non-empty file is required');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new ApiValidationError('/api/import/student-accounts/preview', 'File exceeds 10 MB size limit');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (options?.classSectionId) {
      formData.append('classSectionId', options.classSectionId);
    }
    if (options?.className) {
      formData.append('className', options.className);
    }
    if (options?.defaultGrade) {
      formData.append('defaultGrade', options.defaultGrade);
    }
    if (options?.defaultSection) {
      formData.append('defaultSection', options.defaultSection);
    }

    return apiFetch<StudentAccountImportPreviewResponse>(
      '/api/import/student-accounts/preview',
      { method: 'POST', body: formData },
      UPLOAD_RETRY_OPTS,
    );
  },

  /** Commit validated preview rows and provision student profiles/auth accounts. */
  async commitStudentAccountImport(payload: {
    previewToken: string;
    defaultPassword?: string;
    forcePasswordChange?: boolean;
    createAuthUsers?: boolean;
  }): Promise<StudentAccountImportCommitResponse> {
    validateRequired('/api/import/student-accounts/commit', {
      previewToken: payload.previewToken,
    });

    return apiFetch<StudentAccountImportCommitResponse>(
      '/api/import/student-accounts/commit',
      { method: 'POST', body: JSON.stringify(payload) },
      DEFAULT_RETRY_OPTS,
    );
  },

  /** Create one user account via backend (Auth + Firestore) and send welcome credentials email. */
  async getAdminUsers(options?: AdminUsersListApiRequest): Promise<AdminUsersListApiResponse> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 25;
    validateRange('/api/admin/users', 'page', page, 1, 10000);
    validateRange('/api/admin/users', 'pageSize', pageSize, 1, 100);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    if (options?.search?.trim()) {
      params.set('search', options.search.trim());
    }
    if (options?.role?.trim()) {
      params.set('role', options.role.trim());
    }
    if (options?.status?.trim()) {
      params.set('status', options.status.trim());
    }
    if (options?.grade?.trim()) {
      params.set('grade', options.grade.trim());
    }
    if (options?.section?.trim()) {
      params.set('section', options.section.trim());
    }
    if (options?.classSectionId?.trim()) {
      params.set('classSectionId', options.classSectionId.trim());
    }

    return apiFetch<AdminUsersListApiResponse>(
      `/api/admin/users?${params.toString()}`,
      { method: 'GET' },
      ADMIN_USERS_RETRY_OPTS,
    );
  },

  /** Create one user account via backend (Auth + Firestore) and send welcome credentials email. */
  async createAdminUser(payload: AdminCreateUserApiRequest): Promise<AdminCreateUserApiResponse> {
    validateRequired('/api/admin/users', {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      role: payload.role,
      status: payload.status,
      grade: payload.grade,
      section: payload.section,
    });

    if (payload.role.trim().toLowerCase() === 'student' && !payload.lrn?.trim()) {
      throw new ApiValidationError('/api/admin/users', 'lrn is required for student accounts');
    }

    return apiFetch<AdminCreateUserApiResponse>(
      '/api/admin/users',
      { method: 'POST', body: JSON.stringify(payload) },
      DEFAULT_RETRY_OPTS,
    );
  },

  /** Delete one user account via backend (Auth + Firestore profile). */
  async deleteAdminUser(uid: string): Promise<AdminDeleteUserApiResponse> {
    const normalizedUid = uid.trim();
    validateRequired('/api/admin/users', { uid: normalizedUid });

    const params = new URLSearchParams();
    params.set('uid', normalizedUid);

    return apiFetch<AdminDeleteUserApiResponse>(
      `/api/admin/users?${params.toString()}`,
      { method: 'DELETE' },
      DEFAULT_RETRY_OPTS,
    );
  },

  /** Retrieve recent post-import risk refresh queue/job monitor data */
  async getRiskRefreshMonitor(options?: {
    classSectionId?: string;
    limit?: number;
  }): Promise<RiskRefreshMonitorResponse> {
    const limit = options?.limit ?? 10;
    validateRange('/api/upload/class-records/risk-refresh/recent', 'limit', limit, 1, 50);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }
    return apiFetch<RiskRefreshMonitorResponse>(`/api/upload/class-records/risk-refresh/recent?${params.toString()}`);
  },

  /** Aggregate import-grounded pilot telemetry (Query A-D equivalent) */
  async getImportGroundedTelemetrySummary(options?: {
    classSectionId?: string;
    days?: number;
    limit?: number;
  }): Promise<ImportGroundedTelemetrySummaryResponse> {
    const days = options?.days ?? 7;
    const limit = options?.limit ?? 5000;
    validateRange('/api/feedback/import-grounded/summary', 'days', days, 1, 30);
    validateRange('/api/feedback/import-grounded/summary', 'limit', limit, 100, 20000);

    const params = new URLSearchParams();
    params.set('days', String(days));
    params.set('limit', String(limit));
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }

    return apiFetch<ImportGroundedTelemetrySummaryResponse>(
      `/api/feedback/import-grounded/summary?${params.toString()}`,
    );
  },

  /** Retrieve import-grounded access audit events for the current teacher scope */
  async getImportGroundedAccessAudit(options?: {
    classSectionId?: string;
    days?: number;
    limit?: number;
  }): Promise<ImportGroundedAccessAuditResponse> {
    const days = options?.days ?? 7;
    const limit = options?.limit ?? 200;
    validateRange('/api/import-grounded/access-audit', 'days', days, 1, 30);
    validateRange('/api/import-grounded/access-audit', 'limit', limit, 1, 1000);

    const params = new URLSearchParams();
    params.set('days', String(days));
    params.set('limit', String(limit));
    params.set('export', 'json');
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }

    return apiFetch<ImportGroundedAccessAuditResponse>(
      `/api/import-grounded/access-audit?${params.toString()}`,
    );
  },

  /** Export import-grounded access audit events as CSV */
  async exportImportGroundedAccessAuditCsv(options?: {
    classSectionId?: string;
    days?: number;
    limit?: number;
  }): Promise<Blob> {
    const days = options?.days ?? 7;
    const limit = options?.limit ?? 200;
    validateRange('/api/import-grounded/access-audit', 'days', days, 1, 30);
    validateRange('/api/import-grounded/access-audit', 'limit', limit, 1, 1000);

    const params = new URLSearchParams();
    params.set('days', String(days));
    params.set('limit', String(limit));
    params.set('export', 'csv');
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }

    return apiFetchBlob(`/api/import-grounded/access-audit?${params.toString()}`, { method: 'GET' }, 30_000);
  },

  /** Upload course materials and extract topic map */
  async uploadCourseMaterials(
    files: File | File[],
    options?: { classSectionId?: string; className?: string },
  ): Promise<CourseMaterialUploadResponse> {
    const resolvedFiles = Array.isArray(files) ? files : [files];
    if (resolvedFiles.length === 0) {
      throw new ApiValidationError('/api/upload/course-materials', 'At least one file is required');
    }
    if (resolvedFiles.some((file) => !file || file.size === 0)) {
      throw new ApiValidationError('/api/upload/course-materials', 'All files must be non-empty');
    }
    if (resolvedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      throw new ApiValidationError('/api/upload/course-materials', 'One or more files exceed the 10 MB size limit');
    }

    const formData = new FormData();
    resolvedFiles.forEach((file) => formData.append('files', file));
    if (options?.classSectionId) {
      formData.append('classSectionId', options.classSectionId);
    }
    if (options?.className) {
      formData.append('className', options.className);
    }

    return apiFetch<CourseMaterialUploadResponse>(
      '/api/upload/course-materials',
      { method: 'POST', body: formData },
      UPLOAD_RETRY_OPTS,
    );
  },

  /** List recent persisted course-material artifacts for current teacher/admin */
  async getRecentCourseMaterials(options?: {
    classSectionId?: string;
    limit?: number;
  }): Promise<RecentCourseMaterialsResponse> {
    const limit = options?.limit ?? 10;
    validateRange('/api/upload/course-materials/recent', 'limit', limit, 1, 50);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }

    return apiFetch<RecentCourseMaterialsResponse>(`/api/upload/course-materials/recent?${params.toString()}`);
  },

  /** Retrieve normalized topic map from persisted course materials */
  async getCourseMaterialTopics(options?: {
    classSectionId?: string;
    materialId?: string;
    limit?: number;
  }): Promise<CourseMaterialTopicMapResponse> {
    const limit = options?.limit ?? 20;
    validateRange('/api/course-materials/topics', 'limit', limit, 1, 50);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (options?.classSectionId) {
      params.set('classSectionId', options.classSectionId);
    }
    if (options?.materialId) {
      params.set('materialId', options.materialId);
    }

    return apiFetch<CourseMaterialTopicMapResponse>(`/api/course-materials/topics?${params.toString()}`);
  },

  /** Generate class lesson plan grounded on imported topics and class performance artifacts */
  async generateLessonPlan(request: LessonGenerationRequest): Promise<LessonPlanResponse> {
    validateRequired('/api/lesson/generate', {
      gradeLevel: request.gradeLevel,
    });

    const effectiveRequest: LessonGenerationRequest = {
      ...request,
      preferImportedTopics: IMPORT_GROUNDED_LESSON_ENABLED && (request.preferImportedTopics ?? true),
    };

    if (ASYNC_GENERATION_ENABLED) {
      const submitted = await apiService.submitLessonPlanAsync(effectiveRequest);
      const task = await apiService.waitForTaskResult(submitted.taskId, {
        timeoutMs: 240_000,
        pollIntervalMs: 1_500,
      });
      const payload = task.result;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Lesson generation completed without a valid result payload.');
      }
      return payload as unknown as LessonPlanResponse;
    }

    return apiFetch<LessonPlanResponse>(
      '/api/lesson/generate',
      { method: 'POST', body: JSON.stringify(effectiveRequest) },
      AI_RETRY_OPTS,
    );
  },

  // ─── Quiz Maker ───────────────────────────────────────────

  /** Generate AI-powered quiz */
  async generateQuiz(
    request: QuizGenerationRequest,
    options?: QuizGenerationOptions,
  ): Promise<QuizGenerationResponse> {
    validateRequired('/api/quiz/generate', {
      topics: request.topics,
      gradeLevel: request.gradeLevel,
    });
    if (!Array.isArray(request.topics) || request.topics.length === 0) {
      throw new ApiValidationError('/api/quiz/generate', 'topics must be a non-empty array');
    }

    const effectiveRequest: QuizGenerationRequest = {
      ...request,
      preferImportedTopics: IMPORT_GROUNDED_QUIZ_ENABLED && (request.preferImportedTopics ?? true),
    };

    if (ASYNC_GENERATION_ENABLED) {
      const submitted = await apiService.submitQuizAsync(effectiveRequest);
      options?.onTaskCreated?.(submitted.taskId);
      const task = await apiService.waitForTaskResult(submitted.taskId, {
        timeoutMs: 240_000,
        pollIntervalMs: 1_500,
        onProgress: options?.onProgress,
      });
      const payload = task.result;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Quiz generation completed without a valid result payload.');
      }
      if (!validateQuizResponse(payload)) {
        throw new Error('Invalid quiz generation response from async task payload.');
      }
      return payload as unknown as QuizGenerationResponse;
    }

    const result = await apiFetch<QuizGenerationResponse>(
      '/api/quiz/generate',
      { method: 'POST', body: JSON.stringify(effectiveRequest) },
      AI_RETRY_OPTS,
    );

    if (!validateQuizResponse(result)) {
      logApiError('/api/quiz/generate', 'POST', 'Invalid response shape', result);
      throw new Error('Invalid quiz generation response from server');
    }

    return result;
  },

  /** Preview quiz (3 questions) for teacher review */
  async previewQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    validateRequired('/api/quiz/preview', {
      topics: request.topics,
      gradeLevel: request.gradeLevel,
    });

    const effectiveRequest: QuizGenerationRequest = {
      ...request,
      preferImportedTopics: IMPORT_GROUNDED_QUIZ_ENABLED && (request.preferImportedTopics ?? true),
    };

    return apiFetch<QuizGenerationResponse>(
      '/api/quiz/preview',
      { method: 'POST', body: JSON.stringify(effectiveRequest) },
      AI_RETRY_OPTS,
    );
  },

  async submitLessonPlanAsync(request: LessonGenerationRequest): Promise<AsyncTaskSubmitResponse> {
    return apiFetch<AsyncTaskSubmitResponse>(
      '/api/lesson/generate-async',
      { method: 'POST', body: JSON.stringify(request) },
      AI_RETRY_OPTS,
    );
  },

  async submitQuizAsync(request: QuizGenerationRequest): Promise<AsyncTaskSubmitResponse> {
    return apiFetch<AsyncTaskSubmitResponse>(
      '/api/quiz/generate-async',
      { method: 'POST', body: JSON.stringify(request) },
      AI_RETRY_OPTS,
    );
  },

  async getTaskStatus(taskId: string): Promise<AsyncTaskStatusResponse> {
    validateRequired('/api/tasks/{taskId}', { taskId });
    return apiFetch<AsyncTaskStatusResponse>(`/api/tasks/${encodeURIComponent(taskId)}`);
  },

  async listTasks(options?: {
    limit?: number;
    status?: AsyncTaskStatus;
    includeResults?: boolean;
  }): Promise<AsyncTaskListResponse> {
    const params = new URLSearchParams();
    if (options?.limit != null) {
      validateRange('/api/tasks', 'limit', options.limit, 1, 200);
      params.set('limit', String(options.limit));
    }
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.includeResults != null) {
      params.set('include_results', String(options.includeResults));
    }
    const query = params.toString();
    return apiFetch<AsyncTaskListResponse>(`/api/tasks${query ? `?${query}` : ''}`);
  },

  async cancelTask(taskId: string): Promise<AsyncTaskCancelResponse> {
    validateRequired('/api/tasks/{taskId}/cancel', { taskId });
    return apiFetch<AsyncTaskCancelResponse>(
      `/api/tasks/${encodeURIComponent(taskId)}/cancel`,
      { method: 'POST' },
    );
  },

  async waitForTaskResult(
    taskId: string,
    options?: AsyncTaskWaitOptions,
  ): Promise<AsyncTaskStatusResponse> {
    const timeoutMs = options?.timeoutMs ?? 180_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 1_500;
    const started = Date.now();

    while (Date.now() - started <= timeoutMs) {
      const status = await apiService.getTaskStatus(taskId);
      options?.onProgress?.(status);
      if (status.status === 'completed') {
        return status;
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(extractTaskErrorMessage(status.error));
      }
      await sleep(pollIntervalMs);
    }

    throw new Error(`Async generation task timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
  },

  /** Get math topics by grade level */
  async getQuizTopics(gradeLevel?: string): Promise<QuizTopicsResponse> {
    const query = gradeLevel ? `?gradeLevel=${encodeURIComponent(gradeLevel)}` : '';
    return apiFetch<QuizTopicsResponse>(`/api/quiz/topics${query}`);
  },

  /** Get student competency assessment */
  async getStudentCompetency(
    studentId: string,
    quizHistory?: { topic: string; score: number; total: number; timeTaken?: number }[],
  ): Promise<StudentCompetencyResponse> {
    validateRequired('/api/quiz/student-competency', { studentId });

    return apiFetch<StudentCompetencyResponse>('/api/quiz/student-competency', {
      method: 'POST',
      body: JSON.stringify({ studentId, quizHistory }),
    });
  },

  /** Evaluate mathematical expression */
  async evaluateExpression(expression: string): Promise<CalculatorResponse> {
    validateRequired('/api/calculator/evaluate', { expression });

    return apiFetch<CalculatorResponse>('/api/calculator/evaluate', {
      method: 'POST',
      body: JSON.stringify({ expression }),
    });
  },

  /** Evaluate mathematical expression with fallback */
  async evaluateExpressionSafe(expression: string): Promise<{ data: CalculatorResponse; fromFallback: boolean }> {
    return withFallback(
      () => apiService.evaluateExpression(expression),
      { ...FALLBACK_CALCULATOR, expression },
      'evaluateExpression',
    );
  },

  // ─── Automation Engine ──────────────────────────────────────

  /** Trigger diagnostic completion automation */
  async automationDiagnosticCompleted(payload: {
    lrn: string;
    results: { subject: string; score: number }[];
    gradeLevel?: string;
    questionBreakdown?: Record<string, { correct: boolean }[]>;
  }): Promise<unknown> {
    validateRequired('/api/automation/diagnostic-completed', {
      lrn: payload.lrn,
      results: payload.results,
    });

    return apiFetch('/api/automation/diagnostic-completed', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Trigger quiz submission automation */
  async automationQuizSubmitted(payload: {
    lrn: string;
    quizId: string;
    subject: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpentSeconds: number;
  }): Promise<unknown> {
    validateRequired('/api/automation/quiz-submitted', {
      lrn: payload.lrn,
      quizId: payload.quizId,
      subject: payload.subject,
    });

    return apiFetch('/api/automation/quiz-submitted', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Trigger student enrollment automation */
  async automationStudentEnrolled(payload: {
    lrn: string;
    name: string;
    email: string;
    gradeLevel?: string;
    teacherId?: string;
  }): Promise<unknown> {
    validateRequired('/api/automation/student-enrolled', {
      lrn: payload.lrn,
      name: payload.name,
      email: payload.email,
    });

    return apiFetch('/api/automation/student-enrolled', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Trigger data import automation */
  async automationDataImported(payload: {
    teacherId: string;
    students: Record<string, unknown>[];
    columnMapping: Record<string, string>;
  }): Promise<unknown> {
    validateRequired('/api/automation/data-imported', {
      teacherId: payload.teacherId,
      students: payload.students,
    });

    return apiFetch('/api/automation/data-imported', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Trigger content update automation */
  async automationContentUpdated(payload: {
    adminId: string;
    action: string;
    contentType: string;
    contentId: string;
    subjectId?: string;
    details?: string;
  }): Promise<unknown> {
    validateRequired('/api/automation/content-updated', {
      adminId: payload.adminId,
      action: payload.action,
      contentType: payload.contentType,
      contentId: payload.contentId,
    });

    return apiFetch('/api/automation/content-updated', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
