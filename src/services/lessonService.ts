import { auth } from '../lib/firebase';
import { apiUrl } from '../config/env';
import { z } from 'zod';
import { ApiError, ApiTimeoutError, readFastApiErrorDetail } from './apiUtils';

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

export interface RagLessonResponse {
  sections: RagLessonSection[];
  retrievalConfidence: number;
  retrievalBand: 'high' | 'medium' | 'low';
  retrievalMode?: string;
  needsReview: boolean;
  sources: RagLessonSource[];
  activeModel?: string;
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
  /** Bypass the backend lesson cache (Try Again). Excluded from the cache key. */
  forceRefresh?: boolean;
}

/** Backend stages from POST /api/rag/lesson/stream, plus the reasoner's `thinking` progress phase. */
export type RagLessonStage = 'retrieving' | 'generating' | 'thinking' | 'verifying' | 'finalizing' | 'cached';

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

async function authorizedFetch(endpoint: string, options?: RequestInit, forceRefresh: boolean = false): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(forceRefresh);
      if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
    } catch (err) {
      console.error('[lessonService] Failed to get Firebase ID token:', err);
      throw new Error('Authentication failed. Please sign in again.');
    }
  }

  const res = await fetch(apiUrl(endpoint), {
    ...options,
    headers,
  });

  // Retry once with forced token refresh on 401
  if (res.status === 401 && currentUser && !forceRefresh) {
    return authorizedFetch(endpoint, options, true);
  }
  return res;
}

async function toApiError(res: Response, endpoint: string): Promise<ApiError> {
  // useLessonContent reads the status and FastAPI's nested `detail` from ApiError.
  return new ApiError({
    status: res.status,
    statusText: res.statusText,
    endpoint,
    responseBody: await res.text(),
    retryable: res.status >= 500,
  });
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await authorizedFetch(endpoint, options);
  if (!res.ok) throw await toApiError(res, endpoint);
  return res.json();
}

export async function fetchRagLesson(payload: RagLessonRequest, signal?: AbortSignal): Promise<RagLessonResponse> {
  return apiFetch<RagLessonResponse>('/api/rag/lesson', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

/** Above the backend's own generation budget so the server, not the client, normally ends the stream. */
const RAG_LESSON_STREAM_TIMEOUT_MS = 330_000;
const RAG_LESSON_STREAM_ENDPOINT = '/api/rag/lesson/stream';

const stageEventSchema = z.object({
  stage: z.enum(['retrieving', 'generating', 'verifying', 'finalizing', 'cached']),
});
const progressEventSchema = z.object({ phase: z.enum(['thinking', 'writing']) });
const errorEventSchema = z.object({ status: z.number().int(), detail: z.unknown() });

/** Splits an SSE buffer into complete events; returns the unconsumed tail. */
function drainSseEvents(buffer: string, onEvent: (event: string, payload: string) => void): string {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const tail = blocks.pop() ?? '';
  for (const block of blocks) {
    let event = 'message';
    const payloadLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) payloadLines.push(line.slice(5).trimStart());
    }
    if (payloadLines.length > 0) onEvent(event, payloadLines.join('\n'));
  }
  return tail;
}

interface LessonStreamOutcome {
  lesson: RagLessonResponse | null;
  streamError: ApiError | null;
}

async function readLessonStream(
  body: ReadableStream<Uint8Array>,
  onStage: ((stage: RagLessonStage) => void) | undefined,
): Promise<RagLessonResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // A holder object: TS would narrow captured `let`s to `null` after the callback assigns them.
  const outcome: LessonStreamOutcome = { lesson: null, streamError: null };

  const handleEvent = (event: string, payload: string) => {
    if (event === 'lesson') {
      // SAFETY: contract C1 makes the lesson event identical in shape to the POST /api/rag/lesson response.
      outcome.lesson = JSON.parse(payload) as RagLessonResponse;
    } else if (event === 'error') {
      const parsed = errorEventSchema.safeParse(JSON.parse(payload));
      const status = parsed.success ? parsed.data.status : 500;
      outcome.streamError = new ApiError({
        status,
        statusText: 'Stream error',
        endpoint: RAG_LESSON_STREAM_ENDPOINT,
        // Same `{detail}` body FastAPI sends, so readFastApiErrorDetail works unchanged.
        responseBody: JSON.stringify({ detail: parsed.success ? parsed.data.detail : payload }),
        retryable: status >= 500,
      });
    } else if (event === 'stage' || event === 'progress') {
      // Stage/progress frames are cosmetic: a malformed one must not fail the lesson.
      try {
        const frame = JSON.parse(payload);
        const stageFrame = stageEventSchema.safeParse(frame);
        const progressFrame = progressEventSchema.safeParse(frame);
        if (event === 'stage' && stageFrame.success) onStage?.(stageFrame.data.stage);
        if (event === 'progress' && progressFrame.success) {
          onStage?.(progressFrame.data.phase === 'thinking' ? 'thinking' : 'generating');
        }
      } catch {
        // ignore malformed cosmetic frame
      }
    }
  };

  try {
    while (!outcome.lesson && !outcome.streamError) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = drainSseEvents(buffer + decoder.decode(value, { stream: true }), handleEvent);
    }
    if (!outcome.lesson && !outcome.streamError) drainSseEvents(`${buffer}\n\n`, handleEvent);
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (outcome.streamError) throw outcome.streamError;
  if (!outcome.lesson) {
    throw new ApiError({
      status: 502,
      statusText: 'Stream ended',
      endpoint: RAG_LESSON_STREAM_ENDPOINT,
      responseBody: '',
      retryable: true,
    });
  }
  return outcome.lesson;
}

/**
 * POST /api/rag/lesson/stream (contract C1). Reports stages via `onStage`, accepts a plain JSON
 * response, and falls back to POST /api/rag/lesson when the stream route does not exist (404).
 */
export async function fetchRagLessonStream(
  payload: RagLessonRequest,
  options: { signal?: AbortSignal; onStage?: (stage: RagLessonStage) => void } = {},
): Promise<RagLessonResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, RAG_LESSON_STREAM_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);

  try {
    const res = await authorizedFetch(RAG_LESSON_STREAM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const apiError = await toApiError(res, RAG_LESSON_STREAM_ENDPOINT);
      // A route-level 404 ({"detail":"Not Found"}) means the backend predates the stream endpoint.
      // Structured 404s (e.g. no_curriculum_context) are real answers and are surfaced as-is.
      if (res.status === 404 && !readFastApiErrorDetail(apiError)) {
        return await fetchRagLesson(payload, controller.signal);
      }
      throw apiError;
    }

    if (!res.body || !res.headers.get('content-type')?.includes('text/event-stream')) {
      return await res.json();
    }
    return await readLessonStream(res.body, options.onStage);
  } catch (err) {
    if (timedOut) throw new ApiTimeoutError(RAG_LESSON_STREAM_ENDPOINT, RAG_LESSON_STREAM_TIMEOUT_MS);
    throw err;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

/**
 * Contract C4: fire-and-forget pregeneration of the next lesson (202 with a status we don't need).
 * Never throws: an older backend without the route (404), auth or network failures are all ignored.
 */
export async function prefetchRagLesson(payload: RagLessonRequest): Promise<void> {
  try {
    await authorizedFetch('/api/rag/lesson/prefetch', { method: 'POST', body: JSON.stringify(payload) });
  } catch (err) {
    console.debug('[lessonService] Lesson prefetch skipped:', err);
  }
}

export async function searchVideos(payload: VideoSearchRequest): Promise<VideoSearchResponse> {
  return apiFetch<VideoSearchResponse>('/api/lessons/videos/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchYouTubeVideos(query: string): Promise<VideoResult[]> {
  const res = await searchVideos({ topic: query });
  return res.videos;
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