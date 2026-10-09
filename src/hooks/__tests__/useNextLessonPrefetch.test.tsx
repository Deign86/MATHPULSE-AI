/** @vitest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildRagLessonRequest, useNextLessonPrefetch } from '../useLessonContent';
import { prefetchRagLesson } from '../../services/lessonService';
import type { Lesson } from '../../data/subjects';

const nextLesson: Lesson = {
  id: 'gm-q1-l3',
  title: 'Compound Interest',
  duration: '20 min',
  completed: false,
  locked: false,
  subjectId: 'general_math',
  subject: 'General Mathematics',
  quarter: 1,
  competencyCode: 'GM11-BF-2',
  storagePath: 'curriculum/SHS_GM_Q1_LE3.pdf',
};

function prefetchCalls(): RequestInit[] {
  return vi.mocked(fetch).mock.calls
    .filter((call) => String(call[0]).endsWith('/api/rag/lesson/prefetch'))
    .map((call) => {
      // SAFETY: the fetch stub records [url, init] tuples; prefetch always passes an init.
      const init = call[1] as RequestInit;
      return init;
    });
}

describe('useNextLessonPrefetch (contract C4)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"status":"queued"}', { status: 202 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefetches the next lesson once after the current lesson loads, with the shared request builder', async () => {
    const { rerender } = renderHook(({ ready }) => useNextLessonPrefetch('gm-q1-l2', nextLesson, ready), {
      initialProps: { ready: false },
    });
    expect(prefetchCalls()).toHaveLength(0);

    rerender({ ready: true });
    rerender({ ready: false });
    rerender({ ready: true });

    const calls = prefetchCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    // SAFETY: prefetch bodies are JSON strings built by prefetchRagLesson.
    const body = JSON.parse(calls[0].body as string);
    expect(body).toMatchObject(buildRagLessonRequest(nextLesson));
    expect(body.lessonId).toBe('gm-q1-l3');
  });

  it('does not prefetch while loading or after an error (ready=false)', () => {
    renderHook(() => useNextLessonPrefetch('gm-q1-l2', nextLesson, false));
    expect(prefetchCalls()).toHaveLength(0);
  });

  it('does not prefetch when there is no next lesson', () => {
    renderHook(() => useNextLessonPrefetch('gm-q1-l2', undefined, true));
    expect(prefetchCalls()).toHaveLength(0);
  });

  it('skips a next lesson that is already in the session cache', () => {
    sessionStorage.setItem('rag_lesson_gm-q1-l3', '{"sections":[]}');
    renderHook(() => useNextLessonPrefetch('gm-q1-l2', nextLesson, true));
    expect(prefetchCalls()).toHaveLength(0);
  });

  it('swallows network failures and 404s from older backends', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await expect(prefetchRagLesson(buildRagLessonRequest(nextLesson))).resolves.toBeUndefined();

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"detail":"Not Found"}', { status: 404 })));
    await expect(prefetchRagLesson(buildRagLessonRequest(nextLesson))).resolves.toBeUndefined();
    vi.mocked(console.debug).mockRestore();
  });
});
