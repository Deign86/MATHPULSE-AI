/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useLessonContent } from '../useLessonContent';
import type { RagLessonResponse } from '../../services/lessonService';

const request = { topic: 'Functions', subject: 'General Mathematics', quarter: 1 };

const lessonPayload: RagLessonResponse = {
  sections: [{ type: 'introduction', title: 'Intro', content: 'Body' }],
  retrievalConfidence: 0.9,
  retrievalBand: 'high',
  needsReview: false,
  sources: [],
  activeModel: 'deepseek-chat',
};

describe('useLessonContent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => lessonPayload,
    })));
  });

  afterEach(() => {
    // NOTE: do NOT call vi.restoreAllMocks() here — it would restore the
    // global test-setup.ts Firebase spies to the real SDK mid-file.
    vi.unstubAllGlobals();
  });

  it('surfaces an error instead of loading forever when no lesson can be identified', () => {
    const { result } = renderHook(() => useLessonContent('', request));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Lesson content is unavailable for this item.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stays idle without error when fetching is disabled', () => {
    const { result } = renderHook(() => useLessonContent('lesson-1', request, false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('dispatches POST /api/rag/lesson for a valid lesson', async () => {
    const { result } = renderHook(() => useLessonContent('lesson-1', request));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetch).toHaveBeenCalledOnce();
    // SAFETY: the fetch stub above records one [url, init] tuple per call.
    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/rag/lesson');
    expect(options.method).toBe('POST');
    // SAFETY: lesson POST bodies are always JSON strings in this hook's flow.
    expect(JSON.parse(options.body as string).lessonId).toBe('lesson-1');
    expect(result.current.error).toBeNull();
    expect(result.current.sections).toHaveLength(1);
  });

  it('shows the curriculum-not-ingested message from a FastAPI 404 detail body', async () => {
    const message = 'No curriculum content found for this lesson. Please ensure the PDF has been ingested.';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({ detail: { error: 'no_curriculum_context', message } }),
    })));

    const { result } = renderHook(() => useLessonContent('lesson-1', request));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(message);
    expect(result.current.isOffline).toBe(true);
  });

  it('streams stages from POST /api/rag/lesson/stream and resolves with the lesson event', async () => {
    const sse = [
      'event: stage\ndata: {"stage": "retrieving"}\n\n',
      ': ping\n\n',
      'event: progress\ndata: {"phase": "thinking", "chars": 120}\n\n',
      `event: lesson\ndata: ${JSON.stringify(lessonPayload)}\n\n`,
    ].join('');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sse, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })));

    const { result } = renderHook(() => useLessonContent('lesson-1', request));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // SAFETY: the fetch stub above records one [url, init] tuple per call.
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/rag/lesson/stream');
    expect(result.current.error).toBeNull();
    expect(result.current.sections).toHaveLength(1);
    expect(result.current.stage).toBeNull();
    expect(sessionStorage.getItem('rag_lesson_lesson-1')).not.toBeNull();
  });

  it('maps an `event: error` frame to the same message as the HTTP error path', async () => {
    const message = 'No curriculum content found for this lesson.';
    const errorFrame = JSON.stringify({ status: 404, detail: { error: 'no_curriculum_context', message } });
    const sse = `event: stage\r\ndata: {"stage": "retrieving"}\r\n\r\nevent: error\r\ndata: ${errorFrame}\r\n\r\n`;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sse, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })));

    const { result } = renderHook(() => useLessonContent('lesson-1', request));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(message);
    expect(result.current.isOffline).toBe(true);
  });

  it('falls back to POST /api/rag/lesson when the stream route is missing (404 Not Found)', async () => {
    const fetchStub = vi.fn(async (url: string) => (url.endsWith('/api/rag/lesson/stream')
      ? new Response(JSON.stringify({ detail: 'Not Found' }), { status: 404, statusText: 'Not Found' })
      : new Response(JSON.stringify(lessonPayload), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchStub);

    const { result } = renderHook(() => useLessonContent('lesson-1', request));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(fetchStub.mock.calls[1][0]).toMatch(/\/api\/rag\/lesson$/);
    expect(result.current.error).toBeNull();
    expect(result.current.sections).toHaveLength(1);
  });

  it('aborts the in-flight request on unmount', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      if (init.signal) {
        signals.push(init.signal);
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }
    })));

    const { unmount } = renderHook(() => useLessonContent('lesson-1', request));
    await waitFor(() => expect(signals).toHaveLength(1));
    unmount();

    expect(signals[0].aborted).toBe(true);
  });

  it('sends forceRefresh: true when the learner retries', async () => {
    const { result } = renderHook(() => useLessonContent('lesson-1', request));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.retry());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // SAFETY: the fetch stub records one [url, init] tuple per call; lesson bodies are JSON strings.
    const [, retryInit] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    // SAFETY: lesson POST bodies are always JSON strings in this hook's flow.
    expect(JSON.parse(retryInit.body as string).forceRefresh).toBe(true);
    // SAFETY: same tuple shape as above.
    const [, firstInit] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    // SAFETY: lesson POST bodies are always JSON strings in this hook's flow.
    expect(JSON.parse(firstInit.body as string).forceRefresh).toBeUndefined();
  });
});
