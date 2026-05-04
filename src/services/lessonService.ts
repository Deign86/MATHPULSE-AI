import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

export interface RagLessonSection {
  type: 'introduction' | 'key_concepts' | 'video' | 'worked_examples' | 'important_notes' | 'try_it_yourself' | 'summary';
  title: string;
  content?: string;
  callouts?: { type: 'important' | 'tip' | 'warning'; text: string }[];
  examples?: { problem: string; steps: string[]; answer: string }[];
  bulletPoints?: string[];
  practiceProblems?: { question: string; solution: string }[];
  videoId?: string;
  videoTitle?: string;
  videoChannel?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  videos?: VideoResult[];
}

export interface RagLessonSource {
  subject: string;
  quarter: number;
  source_file: string;
  storage_path: string;
  page: number;
  score: number;
  content_domain?: string;
  chunk_type?: string;
  content?: string;
}

export interface StudyMaterial {
  title: string;
  source_pdf_url: string;
  topic_match: string;
}

export interface Flashcard {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface RagLessonResponse {
  sections: RagLessonSection[];
  retrievalConfidence: number;
  retrievalBand: 'high' | 'medium' | 'low';
  retrievalMode?: string;
  needsReview: boolean;
  sources: RagLessonSource[];
  activeModel?: string;
  study_materials?: StudyMaterial[];
  flashcards?: Flashcard[];
}

export interface RagLessonRequest {
  topic: string;
  subject: string;
  quarter: number;
  lessonTitle?: string;
  learningCompetency?: string;
  moduleUnit?: string;
  learnerLevel?: string;
  userId?: string;
  moduleId?: string;
  lessonId?: string;
  competencyCode?: string;
  storagePath?: string;
}

// ─── Video Search Types ───────────────────────────────────────

export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

export interface VideoSearchRequest {
  topic: string;
  grade_level?: string;
  subject?: string;
  lesson_context?: string;
  lesson_id?: string;
}

export interface VideoSearchResponse {
  videos: VideoResult[];
  cached: boolean;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit, forceRefresh: boolean = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(forceRefresh);
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    } catch (err) {
      console.error('[lessonService] Failed to get Firebase ID token:', err);
      throw new Error('Authentication failed. Please sign in again.');
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Retry once with forced token refresh on 401
  if (res.status === 401 && currentUser && !forceRefresh) {
    console.log('[lessonService] Received 401, retrying with refreshed token...');
    return apiFetch<T>(endpoint, options, true);
  }

  if (!res.ok) {
    let errorBody: any;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = await res.text();
    }
    const error = new Error(
      typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody
    ) as any;
    error.status = res.status;
    error.body = errorBody;
    throw error;
  }

  return res.json();
}

export async function fetchRagLesson(payload: RagLessonRequest): Promise<RagLessonResponse> {
  return apiFetch<RagLessonResponse>('/api/rag/lesson', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchVideos(payload: VideoSearchRequest): Promise<VideoSearchResponse> {
  return apiFetch<VideoSearchResponse>('/api/lessons/videos/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getRagLessonHealth() {
  return apiFetch<{
    status: 'ok' | 'degraded';
    chunkCount: number;
    subjects: Record<string, number>;
    lastIngested: string | null;
    activeModel: string;
    isSequentialModel?: boolean;
    warning?: string;
  }>('/api/rag/health');
}