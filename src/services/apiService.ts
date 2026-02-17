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
};
