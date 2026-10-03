/** @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
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
});
