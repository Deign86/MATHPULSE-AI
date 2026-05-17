import { apiFetch } from './apiService';

// Request types
export interface GeneratePracticeRequest {
  userId: string;
  subject: string;
  competency: string;
  difficulty: 'Practice' | 'Challenge' | 'Mastery';
  count: number;
}

export interface SubmitPracticeRequest {
  session_id: string;
  userId: string;
  answers: { question_id: string; selected_index: number }[];
}

// Question shape (from backend)
export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  competency: string;
  difficulty: string;
  bloomsLevel: string;
}

// Response types
export interface GeneratePracticeResponse {
  session_id: string;
  questions: PracticeQuestion[];
  generated_at: string;
}

export interface PerQuestionFeedback {
  question_id: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
}

export interface UpdatedStats {
  totalXP: number;
  quizzesCompleted: number;
  averageScore: number;
}

export interface SubmitPracticeResponse {
  score_percent: number;
  correct_count: number;
  total: number;
  xp_earned: number;
  per_question_feedback: PerQuestionFeedback[];
  updated_stats: UpdatedStats;
}

export interface RecentSession {
  session_id: string;
  score_percent: number;
  subject: string;
  difficulty: string;
  timestamp: string;
}

export interface CompetencyBreakdown {
  [competency: string]: {
    total: number;
    correct: number;
    percent: number;
  };
}

export interface PracticeStatsResponse {
  quizzesCompleted: number;
  totalXPEarned: number;
  averageScore: number;
  recentSessions: RecentSession[];
  competencyBreakdown: CompetencyBreakdown;
}

export interface HistoryItem {
  session_id: string;
  score_percent: number;
  subject: string;
  difficulty: string;
  submitted_at: string;
}

export interface PracticeHistoryResponse {
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
  items: HistoryItem[];
}

export const generatePracticeSession = async (
  params: GeneratePracticeRequest,
): Promise<GeneratePracticeResponse> => {
  return apiFetch<GeneratePracticeResponse>('/api/practice/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const submitPracticeSession = async (
  submission: SubmitPracticeRequest,
): Promise<SubmitPracticeResponse> => {
  return apiFetch<SubmitPracticeResponse>('/api/practice/submit', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
};

export const fetchPracticeStats = async (userId: string): Promise<PracticeStatsResponse> => {
  return apiFetch<PracticeStatsResponse>(`/api/practice/stats/${userId}`, {
    method: 'GET',
  });
};

export const fetchPracticeHistory = async (
  userId: string,
  page = 1,
  limit = 10,
): Promise<PracticeHistoryResponse> => {
  return apiFetch<PracticeHistoryResponse>(`/api/practice/history/${userId}?page=${page}&limit=${limit}`, {
    method: 'GET',
  });
};
