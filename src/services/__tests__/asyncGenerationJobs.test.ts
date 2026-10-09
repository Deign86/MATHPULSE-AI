import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiService, type AsyncTaskStatusResponse, type AsyncTaskSubmitResponse } from '../apiService';
import { ApiError } from '../apiUtils';

/**
 * Contract C3: once an async generation job has a taskId the sync endpoint is never called;
 * an interrupted (server restart) or 404 task is resubmitted exactly once.
 */
const fetchMock = vi.fn();
const lessonRequest = { gradeLevel: 'Grade 11' };
const quizRequest = { topics: ['Functions'], gradeLevel: 'Grade 11' };
const quizPayload = { questions: [], totalPoints: 0 };

function submitted(taskId: string): AsyncTaskSubmitResponse {
  return { success: true, taskId, taskKind: 'lesson_generation', status: 'queued', createdAt: '2026-10-09T00:00:00Z' };
}

function taskStatus(
  taskId: string,
  status: AsyncTaskStatusResponse['status'],
  extra: Partial<AsyncTaskStatusResponse> = {},
): AsyncTaskStatusResponse {
  return {
    success: true,
    taskId,
    taskKind: 'lesson_generation',
    status,
    createdAt: '2026-10-09T00:00:00Z',
    ...extra,
  };
}

function syncCalls(): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe('async generation jobs (contract C3)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(quizPayload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(console.warn).mockRestore();
  });

  it('does not call the sync endpoint when an async lesson-plan task fails', async () => {
    const submit = vi.spyOn(apiService, 'submitLessonPlanAsync').mockResolvedValue(submitted('t1'));
    const poll = vi.spyOn(apiService, 'getTaskStatus').mockResolvedValue(
      taskStatus('t1', 'failed', { error: { code: 'generation_failed', message: 'model error' } }),
    );

    await expect(apiService.generateLessonPlan(lessonRequest)).rejects.toThrow('model error');
    expect(submit).toHaveBeenCalledOnce();
    expect(poll).toHaveBeenCalledOnce();
    expect(syncCalls()).toEqual([]);
    submit.mockRestore();
    poll.mockRestore();
  });

  it('resubmits once when the task was interrupted by a server restart', async () => {
    const submit = vi.spyOn(apiService, 'submitLessonPlanAsync')
      .mockResolvedValueOnce(submitted('t1'))
      .mockResolvedValueOnce(submitted('t2'));
    const poll = vi.spyOn(apiService, 'getTaskStatus').mockImplementation(async (taskId) => (taskId === 't1'
      ? taskStatus('t1', 'failed', { error: { code: 'interrupted', message: 'Generation was interrupted.' } })
      : taskStatus('t2', 'completed', { result: { title: 'Plan' } })));

    await expect(apiService.generateLessonPlan(lessonRequest)).resolves.toEqual({ title: 'Plan' });
    expect(submit).toHaveBeenCalledTimes(2);
    expect(poll.mock.calls.map((call) => call[0])).toEqual(['t1', 't2']);
    expect(syncCalls()).toEqual([]);
    submit.mockRestore();
    poll.mockRestore();
  });

  it('resubmits only once when polling keeps returning 404', async () => {
    const submit = vi.spyOn(apiService, 'submitQuizAsync')
      .mockResolvedValueOnce(submitted('q1'))
      .mockResolvedValueOnce(submitted('q2'));
    const notFound = new ApiError({
      status: 404,
      statusText: 'Not Found',
      endpoint: '/api/tasks/q',
      responseBody: '{"detail":"Task not found"}',
      retryable: false,
    });
    const poll = vi.spyOn(apiService, 'getTaskStatus').mockRejectedValue(notFound);
    const onTaskCreated = vi.fn();

    await expect(apiService.generateQuiz(quizRequest, { onTaskCreated })).rejects.toBe(notFound);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(onTaskCreated.mock.calls.map((call) => call[0])).toEqual(['q1', 'q2']);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(syncCalls()).toEqual([]);
    submit.mockRestore();
    poll.mockRestore();
  });

  it('uses the sync endpoint only when the async submit itself fails', async () => {
    const submit = vi.spyOn(apiService, 'submitQuizAsync').mockRejectedValue(
      new ApiError({ status: 404, statusText: 'Not Found', endpoint: '/api/quiz/generate-async', responseBody: '', retryable: false }),
    );
    const poll = vi.spyOn(apiService, 'getTaskStatus');

    await expect(apiService.generateQuiz(quizRequest)).resolves.toEqual(quizPayload);
    expect(poll).not.toHaveBeenCalled();
    expect(syncCalls()).toHaveLength(1);
    expect(syncCalls()[0]).toContain('/api/quiz/generate');
    submit.mockRestore();
    poll.mockRestore();
  });
});
