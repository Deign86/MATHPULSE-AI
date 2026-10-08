import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { ApiError, readFastApiErrorDetail } from '../services/apiUtils';
import {
  fetchRagLessonStream,
  getRagLessonHealth,
  type RagLessonResponse,
  type RagLessonRequest,
  type RagLessonStage,
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
  /** Latest backend generation stage while loading; null when idle or unknown. */
  stage?: RagLessonStage | null;
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
  const [stage, setStage] = useState<RagLessonStage | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async (forceRefresh: boolean = false) => {
    // Cancel the previous request (lessonId change / retry) so its late result is ignored.
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    setStage(null);

    if (!lessonId) {
      // A fetch was requested but no lesson can be identified: surface it
      // instead of leaving the initial loading state in place forever.
      setIsLoading(false);
      setError('Lesson content is unavailable for this item.');
      return;
    }
    if (!enabled) {
      setIsLoading(false);
      return;
    }

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

    const controller = new AbortController();
    inFlightRef.current = controller;

    try {
      const currentUser = getAuth().currentUser;
      const userId = currentUser?.uid;

      const data = await fetchRagLessonStream(
        { ...request, lessonId, userId, ...(forceRefresh && { forceRefresh: true }) },
        { signal: controller.signal, onStage: (next) => { if (!controller.signal.aborted) setStage(next); } },
      );
      if (controller.signal.aborted) return;

      setSections(data.sections);
      setSources(data.sources || []);
      setRetrievalBand(data.retrievalBand);
      setRetrievalConfidence(data.retrievalConfidence);
      setNeedsReview(data.needsReview);
      setActiveModel(data.activeModel);
      setCachedLesson(lessonId, data);
      setError(null);
      setIsOffline(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      const status = err instanceof ApiError ? err.status : undefined;
      const detail = err instanceof ApiError ? readFastApiErrorDetail(err) : null;

      let errorMsg = 'Failed to load lesson content.';
      let offline = false;

      if (status === 404 && detail?.error === 'no_curriculum_context') {
        errorMsg = detail.message || 'Lesson source PDF not found or not yet ingested.';
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
    }
    if (inFlightRef.current === controller) inFlightRef.current = null;
    setStage(null);
    setIsLoading(false);
  }, [lessonId, enabled, JSON.stringify(request)]);

  useEffect(() => {
    void doFetch();
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [doFetch]);

  const retry = useCallback(() => {
    if (lessonId) sessionStorage.removeItem(getCacheKey(lessonId));
    setIsLoading(true);
    setError(null);
    void doFetch(true);
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
    stage,
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