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

// Re-export error classes so consumers can catch them
export { ApiError, ApiTimeoutError, ApiNetworkError, ApiValidationError };

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api.hf.space';

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
    studentId: string;
    email: string;
    engagementScore: number;
    avgQuizScore: number;
    attendance: number;
  }[];
  columnMapping: Record<string, string>;
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

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
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

// ─── Fallback values ─────────────────────────────────────────

const FALLBACK_CHAT: ChatResponse = {
  response: 'Sorry, the AI tutor is temporarily unavailable. Please try again in a moment.',
};

const FALLBACK_RISK: RiskPrediction = {
  riskLevel: 'Medium',
  confidence: 0,
  analysis: { labels: [], scores: [] },
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
  /** Health check */
  async health(): Promise<{ status: string }> {
    return apiFetch('/health', undefined, { ...DEFAULT_RETRY_OPTS, timeoutMs: 10_000 });
  },

  /** AI Math Tutor Chat (Qwen/Qwen2.5-3B-Instruct) */
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

  /** AI-Generated Learning Path (Qwen model) */
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

  /** Daily AI Insights for Teacher Dashboard (Qwen model) */
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
  async uploadClassRecords(file: File): Promise<UploadResponse> {
    if (!file || file.size === 0) {
      throw new ApiValidationError('/api/upload/class-records', 'File is required and must not be empty');
    }
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      throw new ApiValidationError('/api/upload/class-records', 'File size exceeds 10 MB limit');
    }

    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<UploadResponse>(
      '/api/upload/class-records',
      { method: 'POST', body: formData },
      UPLOAD_RETRY_OPTS,
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

    const result = await apiFetch<QuizGenerationResponse>(
      '/api/quiz/generate',
      { method: 'POST', body: JSON.stringify(request) },
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

    return apiFetch<QuizGenerationResponse>(
      '/api/quiz/preview',
      { method: 'POST', body: JSON.stringify(request) },
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
    studentId: string;
    results: { subject: string; score: number }[];
    gradeLevel?: string;
    questionBreakdown?: Record<string, { correct: boolean }[]>;
  }): Promise<unknown> {
    validateRequired('/api/automation/diagnostic-completed', {
      studentId: payload.studentId,
      results: payload.results,
    });

    return apiFetch('/api/automation/diagnostic-completed', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Trigger quiz submission automation */
  async automationQuizSubmitted(payload: {
    studentId: string;
    quizId: string;
    subject: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpentSeconds: number;
  }): Promise<unknown> {
    validateRequired('/api/automation/quiz-submitted', {
      studentId: payload.studentId,
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
    studentId: string;
    name: string;
    email: string;
    gradeLevel?: string;
    teacherId?: string;
  }): Promise<unknown> {
    validateRequired('/api/automation/student-enrolled', {
      studentId: payload.studentId,
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
