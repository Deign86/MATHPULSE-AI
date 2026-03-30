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

// Re-export error classes so consumers can catch them
export { ApiError, ApiTimeoutError, ApiNetworkError, ApiValidationError };

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api.hf.space';

const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null || value.trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const IMPORT_GROUNDED_QUIZ_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_QUIZ, true);
const IMPORT_GROUNDED_LESSON_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_LESSON, true);
const IMPORT_GROUNDED_FEEDBACK_ENABLED = parseEnvBoolean(import.meta.env.VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS, true);

// ─── Types ────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userId?: string;
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

export interface UploadResponse {
  success: boolean;
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
  totalRows?: number;
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
  files?: {
    fileName: string;
    fileType: string;
    status: 'success' | 'partial_success' | 'failed';
    students: UploadResponse['students'];
    totalRows: number;
    columnMapping: Record<string, string>;
    unknownColumns: string[];
    warnings: string[];
    rowWarnings: { row: number; warning: string }[];
    classSectionId?: string | null;
    className?: string | null;
    importId?: string | null;
    persisted?: boolean;
    dedup?: { inserted: number; updated: number };
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
  warnings: string[];
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
  lrn: string;
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

/** Upload-specific: longer timeout, fewer retries */
const UPLOAD_RETRY_OPTS: RetryFetchOptions = {
  maxRetries: 2,
  timeoutMs: 120_000,
  baseBackoffMs: 2_000,
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

  const headers = new Headers(options?.headers ?? {});
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers.set('Authorization', `Bearer ${idToken}`);
      }
    } catch (err) {
      logApiError(endpoint, method, 'Failed to acquire Firebase ID token', err);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const result = await retryFetch<T>(url, fetchOptions, retryOpts);
    logApiInfo(endpoint, method, 'Request succeeded');
    return result;
  } catch (err) {
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

  const headers = new Headers(options?.headers ?? {});
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
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
  ): Promise<ChatResponse> {
    validateRequired('/api/chat', { message });

    return apiFetch<ChatResponse>(
      '/api/chat',
      { method: 'POST', body: JSON.stringify({ message, history: history ?? [] }) },
      AI_RETRY_OPTS,
    );
  },

  /** AI Math Tutor Chat with fallback */
  async chatSafe(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ data: ChatResponse; fromFallback: boolean }> {
    return withFallback(
      () => apiService.chat(message, history),
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

  /** Smart File Upload with AI Column Detection */
  async uploadClassRecords(
    files: File | File[],
    options?: { classSectionId?: string; className?: string },
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

    return apiFetch<UploadResponse>(
      '/api/upload/class-records',
      { method: 'POST', body: formData },
      UPLOAD_RETRY_OPTS,
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

    return apiFetch<LessonPlanResponse>(
      '/api/lesson/generate',
      { method: 'POST', body: JSON.stringify(effectiveRequest) },
      AI_RETRY_OPTS,
    );
  },

  // ─── Quiz Maker ───────────────────────────────────────────

  /** Generate AI-powered quiz */
  async generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
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

  /** Get math topics by grade level */
  async getQuizTopics(gradeLevel?: string): Promise<QuizTopicsResponse> {
    const query = gradeLevel ? `?gradeLevel=${encodeURIComponent(gradeLevel)}` : '';
    return apiFetch<QuizTopicsResponse>(`/api/quiz/topics${query}`);
  },

  /** Get student competency assessment */
  async getStudentCompetency(
    lrn: string,
    quizHistory?: { topic: string; score: number; total: number; timeTaken?: number }[],
  ): Promise<StudentCompetencyResponse> {
    validateRequired('/api/quiz/student-competency', { lrn });

    return apiFetch<StudentCompetencyResponse>('/api/quiz/student-competency', {
      method: 'POST',
      body: JSON.stringify({ lrn, quizHistory }),
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
