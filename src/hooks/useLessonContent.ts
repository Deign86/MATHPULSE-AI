import { useState, useEffect, useCallback } from 'react';
import {
  fetchRagLesson,
  getRagLessonHealth,
  type RagLessonResponse,
  type RagLessonRequest,
} from '../services/lessonService';

const SESSION_CACHE_PREFIX = 'rag_lesson_';

function getCacheKey(lessonId: string): string {
  return `${SESSION_CACHE_PREFIX}${lessonId}`;
}

function getCachedLesson(lessonId: string): RagLessonResponse | null {
  try {
    const cached = sessionStorage.getItem(getCacheKey(lessonId));
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  return null;
}

function setCachedLesson(lessonId: string, data: RagLessonResponse): void {
  try {
    sessionStorage.setItem(getCacheKey(lessonId), JSON.stringify(data));
  } catch { /* ignore */ }
}

export interface UseLessonContentResult {
  sections: RagLessonResponse['sections'];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  sources: RagLessonResponse['sources'];
  retrievalBand: RagLessonResponse['retrievalBand'];
  retrievalConfidence: number;
  needsReview: boolean;
  activeModel?: string;
  isOffline: boolean;
}

export function useLessonContent(
  lessonId: string,
  request: Omit<RagLessonRequest, 'userId'>,
  enabled: boolean = true,
): UseLessonContentResult {
  const [sections, setSections] = useState<RagLessonResponse['sections']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<RagLessonResponse['sources']>([]);
  const [retrievalBand, setRetrievalBand] = useState<RagLessonResponse['retrievalBand']>('low');
  const [retrievalConfidence, setRetrievalConfidence] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [activeModel, setActiveModel] = useState<string | undefined>(undefined);
  const [isOffline, setIsOffline] = useState(false);

  const doFetch = useCallback(async () => {
    if (!enabled || !lessonId) return;

    const cached = getCachedLesson(lessonId);
    if (cached) {
      setSections(cached.sections);
      setSources(cached.sources);
      setRetrievalBand(cached.retrievalBand);
      setRetrievalConfidence(cached.retrievalConfidence);
      setNeedsReview(cached.needsReview);
      setActiveModel(cached.activeModel);
      setIsLoading(false);
      setError(null);
      setIsOffline(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const currentUser = await import('firebase/auth').then(m => m.getAuth().currentUser);
      const userId = currentUser?.uid;

      const data = await fetchRagLesson({
        ...request,
        lessonId,
        userId,
      } as RagLessonRequest);

      setSections(data.sections);
      setSources(data.sources || []);
      setRetrievalBand(data.retrievalBand);
      setRetrievalConfidence(data.retrievalConfidence);
      setNeedsReview(data.needsReview);
      setActiveModel(data.activeModel);
      setCachedLesson(lessonId, data);
      setError(null);
      setIsOffline(false);
    } catch (err: any) {
      const status = err.status || err.response?.status;
      const body = err.body || err.response;

      let errorMsg = 'Failed to load lesson content.';
      let offline = false;

      if (status === 404 && body?.error === 'no_curriculum_context') {
        errorMsg = body.message || 'Lesson source PDF not found or not yet ingested.';
        offline = true;
      } else if (status === 401) {
        errorMsg = 'Please sign in again to access lessons.';
      } else if (!navigator.onLine) {
        errorMsg = 'No internet connection. Please try again when online.';
        offline = true;
      }

      setError(errorMsg);
      setIsOffline(offline);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, enabled, JSON.stringify(request)]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const retry = useCallback(() => {
    if (lessonId) sessionStorage.removeItem(getCacheKey(lessonId));
    setIsLoading(true);
    setError(null);
    doFetch();
  }, [doFetch, lessonId]);

  return {
    sections,
    isLoading,
    error,
    retry,
    sources,
    retrievalBand,
    retrievalConfidence,
    needsReview,
    activeModel,
    isOffline,
  };
}

export async function checkRagHealth() {
  try {
    const health = await getRagLessonHealth();
    return health;
  } catch {
    return null;
  }
}