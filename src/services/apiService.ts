// src/services/apiService.ts
// Backend API client for FastAPI backend (Hugging Face Spaces)

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api.hf.space';

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

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const apiService = {
  /** Health check */
  async health(): Promise<{ status: string }> {
    return apiFetch('/health');
  },

  /** AI Math Tutor Chat (Qwen/Qwen2.5-3B-Instruct) */
  async chat(message: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<ChatResponse> {
    return apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  },

  /** Student Risk Prediction (facebook/bart-large-mnli) */
  async predictRisk(studentData: StudentRiskData): Promise<RiskPrediction> {
    return apiFetch('/api/predict-risk', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  /** Batch Risk Prediction for multiple students */
  async predictRiskBatch(students: StudentRiskData[]): Promise<RiskPrediction[]> {
    return apiFetch('/api/predict-risk/batch', {
      method: 'POST',
      body: JSON.stringify({ students }),
    });
  },

  /** AI-Generated Learning Path (Qwen model) */
  async getLearningPath(request: LearningPathRequest): Promise<LearningPathResponse> {
    return apiFetch('/api/learning-path', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /** Daily AI Insights for Teacher Dashboard (Qwen model) */
  async getDailyInsight(request: DailyInsightRequest): Promise<DailyInsightResponse> {
    return apiFetch('/api/analytics/daily-insight', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /** Smart File Upload with AI Column Detection */
  async uploadClassRecords(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch('/api/upload/class-records', {
      method: 'POST',
      body: formData,
    });
  },

  // ─── Quiz Maker ───────────────────────────────────────────

  /** Generate AI-powered quiz */
  async generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    return apiFetch('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /** Preview quiz (3 questions) for teacher review */
  async previewQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    return apiFetch('/api/quiz/preview', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /** Get math topics by grade level */
  async getQuizTopics(gradeLevel?: string): Promise<QuizTopicsResponse> {
    const query = gradeLevel ? `?gradeLevel=${encodeURIComponent(gradeLevel)}` : '';
    return apiFetch(`/api/quiz/topics${query}`);
  },

  /** Get student competency assessment */
  async getStudentCompetency(
    studentId: string,
    quizHistory?: { topic: string; score: number; total: number; timeTaken?: number }[]
  ): Promise<StudentCompetencyResponse> {
    return apiFetch('/api/quiz/student-competency', {
      method: 'POST',
      body: JSON.stringify({ studentId, quizHistory }),
    });
  },

  /** Evaluate mathematical expression */
  async evaluateExpression(expression: string): Promise<CalculatorResponse> {
    return apiFetch('/api/calculator/evaluate', {
      method: 'POST',
      body: JSON.stringify({ expression }),
    });
  },

  // ─── Automation Engine ──────────────────────────────────────

  /** Trigger diagnostic completion automation */
  async automationDiagnosticCompleted(payload: {
    studentId: string;
    results: { subject: string; score: number }[];
    gradeLevel?: string;
    questionBreakdown?: Record<string, { correct: boolean }[]>;
  }): Promise<unknown> {
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
    return apiFetch('/api/automation/content-updated', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
