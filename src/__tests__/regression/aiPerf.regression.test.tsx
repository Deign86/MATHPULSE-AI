/** @vitest-environment jsdom */

/**
 * Regression guards for the perf/ai-latency frontend fixes. Each block pins a bug that was fixed:
 * teacher jobs double-running on the sync endpoint, lesson fetches that outlive their view, and AI
 * effects that refire whenever a parent hands down an equal-but-new array.
 * Seams: global fetch (the network contract), apiService methods, and the firebase namespaces
 * already stubbed by src/test-setup.ts. No module-level mocking.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as firestore from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authNs from '../../contexts/AuthContext';
import type { AuthContextType } from '../../contexts/AuthContext';
import type { DiagnosticTopicKey } from '../../lib/diagnosticTopics';
import { useLessonContent } from '../../hooks/useLessonContent';
import {
  apiService,
  type AsyncTaskStatusResponse,
  type AsyncTaskSubmitResponse,
} from '../../services/apiService';
import { ApiError, ApiNetworkError } from '../../services/apiUtils';
import type { RagLessonResponse } from '../../services/lessonService';
import type { StudentProfile } from '../../types/models';
import ModuleFolderCard from '../../components/ModuleFolderCard';
import ModulesPage from '../../components/ModulesPage';

function jsonResponse(serializedBody: string, status = 200): Response {
  return new Response(serializedBody, { status, headers: { 'Content-Type': 'application/json' } });
}

function requestedUrls(fetchStub: ReturnType<typeof vi.fn>): string[] {
  return fetchStub.mock.calls.map((call) => String(call[0]));
}

// ─── 6. Teacher jobs never fall back to the sync endpoint after a successful async submit ─────────

type PollOutcome = {
  label: string;
  expectedSubmits: number;
  arrange: () => void;
};

const notFoundError = new ApiError({
  status: 404,
  statusText: 'Not Found',
  endpoint: '/api/tasks/task',
  responseBody: '{"detail":"Task not found"}',
  retryable: false,
});

function failedStatus(taskId: string, status: 'failed' | 'cancelled', code: string): AsyncTaskStatusResponse {
  return {
    success: true,
    taskId,
    taskKind: 'quiz_generation',
    status,
    createdAt: '2026-10-09T00:00:00Z',
    error: { code, message: `${code} happened` },
  };
}

const pollOutcomes: PollOutcome[] = [
  {
    label: 'failed',
    expectedSubmits: 1,
    arrange: () => {
      vi.spyOn(apiService, 'getTaskStatus').mockImplementation(async (taskId) => failedStatus(taskId, 'failed', 'generation_failed'));
    },
  },
  {
    label: 'cancelled',
    expectedSubmits: 1,
    arrange: () => {
      vi.spyOn(apiService, 'getTaskStatus').mockImplementation(async (taskId) => failedStatus(taskId, 'cancelled', 'cancelled'));
    },
  },
  {
    label: 'interrupted twice (server restarts)',
    expectedSubmits: 2,
    arrange: () => {
      vi.spyOn(apiService, 'getTaskStatus').mockImplementation(async (taskId) => failedStatus(taskId, 'failed', 'interrupted'));
    },
  },
  {
    label: '404 twice (task unknown to the server)',
    expectedSubmits: 2,
    arrange: () => {
      vi.spyOn(apiService, 'getTaskStatus').mockRejectedValue(notFoundError);
    },
  },
  {
    label: 'poll timeout',
    expectedSubmits: 1,
    arrange: () => {
      vi.spyOn(apiService, 'waitForTaskResult').mockRejectedValue(
        new Error('Async generation task timed out after 240 seconds.'),
      );
    },
  },
  {
    label: 'network error while polling',
    expectedSubmits: 1,
    arrange: () => {
      vi.spyOn(apiService, 'getTaskStatus').mockRejectedValue(
        new ApiNetworkError('/api/tasks/task', new TypeError('Failed to fetch')),
      );
    },
  },
];

type TeacherJob = {
  name: string;
  submitMethod: 'submitQuizAsync' | 'submitLessonPlanAsync';
  syncPath: RegExp;
  run: () => Promise<object>;
};

const teacherJobs: TeacherJob[] = [
  {
    name: 'quiz',
    submitMethod: 'submitQuizAsync',
    syncPath: /\/api\/quiz\/generate$/,
    run: () => apiService.generateQuiz({ topics: ['Functions'], gradeLevel: 'Grade 11' }),
  },
  {
    name: 'lesson plan',
    submitMethod: 'submitLessonPlanAsync',
    syncPath: /\/api\/lesson\/generate$/,
    run: () => apiService.generateLessonPlan({ gradeLevel: 'Grade 11' }),
  },
];

function submittedTask(taskId: string): AsyncTaskSubmitResponse {
  return { success: true, taskId, taskKind: 'quiz_generation', status: 'queued', createdAt: '2026-10-09T00:00:00Z' };
}

describe('teacher jobs (contract C3)', () => {
  const fetchStub = vi.fn();

  beforeEach(() => {
    fetchStub.mockReset();
    fetchStub.mockImplementation(async () => jsonResponse(JSON.stringify({ questions: [], totalPoints: 0, title: 'sync result' })));
    vi.stubGlobal('fetch', fetchStub);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(console.warn).mockRestore();
    vi.mocked(apiService.submitQuizAsync).mockRestore?.();
    vi.mocked(apiService.submitLessonPlanAsync).mockRestore?.();
    vi.mocked(apiService.getTaskStatus).mockRestore?.();
    vi.mocked(apiService.waitForTaskResult).mockRestore?.();
  });

  describe.each(teacherJobs)('$name', (job) => {
    it.each(pollOutcomes)('rejects without calling the sync endpoint when polling ends: $label', async (outcome) => {
      let submitCount = 0;
      const submit = vi.spyOn(apiService, job.submitMethod).mockImplementation(async () => {
        submitCount += 1;
        return submittedTask(`task-${submitCount}`);
      });
      outcome.arrange();

      await expect(job.run()).rejects.toBeInstanceOf(Error);

      expect(submit).toHaveBeenCalledTimes(outcome.expectedSubmits);
      expect(requestedUrls(fetchStub).filter((url) => job.syncPath.test(url))).toEqual([]);
      expect(fetchStub).not.toHaveBeenCalled();
    });
  });
});

// ─── 7. useLessonContent cancellation and caching ────────────────────────────────────────────────

const lessonRequest = { topic: 'Functions', subject: 'General Mathematics', quarter: 1 };

function lessonFor(title: string): RagLessonResponse {
  return {
    sections: [{ type: 'introduction', title, content: `${title} body` }],
    retrievalConfidence: 0.9,
    retrievalBand: 'high',
    needsReview: false,
    sources: [],
    activeModel: 'deepseek-v4-pro',
  };
}

type PendingLesson = { lessonId: string; signal: AbortSignal | null; respond: (lesson: RagLessonResponse) => void };

/** fetch stub that never settles until the test responds; it deliberately ignores abort so a late
 * response really arrives and the hook itself must discard it. */
function deferredLessonFetch(pending: PendingLesson[]) {
  return vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolveResponse) => {
    // SAFETY: the lesson hook always POSTs a JSON string body.
    const body: { lessonId: string } = JSON.parse(init.body as string);
    pending.push({
      lessonId: body.lessonId,
      signal: init.signal ?? null,
      respond: (lesson) => resolveResponse(jsonResponse(JSON.stringify(lesson))),
    });
  }));
}

describe('useLessonContent', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aborts on unmount and never caches the late response', async () => {
    const pending: PendingLesson[] = [];
    vi.stubGlobal('fetch', deferredLessonFetch(pending));

    const { unmount } = renderHook(() => useLessonContent('lesson-1', lessonRequest));
    await waitFor(() => expect(pending).toHaveLength(1));
    unmount();
    expect(pending[0].signal?.aborted).toBe(true);

    await act(async () => {
      pending[0].respond(lessonFor('Late'));
    });
    expect(sessionStorage.getItem('rag_lesson_lesson-1')).toBeNull();
  });

  it('aborts the previous lesson on lessonId change and ignores its late result', async () => {
    const pending: PendingLesson[] = [];
    vi.stubGlobal('fetch', deferredLessonFetch(pending));

    const { result, rerender } = renderHook(({ lessonId }) => useLessonContent(lessonId, lessonRequest), {
      initialProps: { lessonId: 'lesson-1' },
    });
    await waitFor(() => expect(pending).toHaveLength(1));

    rerender({ lessonId: 'lesson-2' });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].signal?.aborted).toBe(true);

    await act(async () => {
      pending[1].respond(lessonFor('Second'));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      pending[0].respond(lessonFor('First (stale)'));
    });
    expect(result.current.sections.map((section) => section.title)).toEqual(['Second']);
    expect(sessionStorage.getItem('rag_lesson_lesson-1')).toBeNull();
    expect(sessionStorage.getItem('rag_lesson_lesson-2')).not.toBeNull();
  });

  it('does not refetch when re-rendered with an equal but new request object', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(JSON.stringify(lessonFor('Only'))));
    vi.stubGlobal('fetch', fetchStub);

    const { result, rerender } = renderHook(({ request }) => useLessonContent('lesson-1', request), {
      initialProps: { request: { ...lessonRequest } },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ request: { ...lessonRequest } });
    rerender({ request: { ...lessonRequest } });
    await act(async () => {});

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('serves a sessionStorage hit with zero network calls', async () => {
    sessionStorage.setItem('rag_lesson_lesson-1', JSON.stringify(lessonFor('Cached')));
    const fetchStub = vi.fn(async () => jsonResponse(JSON.stringify(lessonFor('Network'))));
    vi.stubGlobal('fetch', fetchStub);

    const { result } = renderHook(() => useLessonContent('lesson-1', lessonRequest));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchStub).not.toHaveBeenCalled();
    expect(result.current.sections.map((section) => section.title)).toEqual(['Cached']);
  });
});

// ─── 8. AI effects do not refire on equal-but-new inputs ────────────────────────────────────────

const studentProfile: StudentProfile = {
  uid: 'student-refire',
  lrn: 'lrn-refire',
  email: 'student-refire@example.test',
  name: 'Refire Student',
  role: 'student',
  grade: '11',
  school: 'Test SHS',
  enrollmentDate: '2026-01-01',
  major: 'STEM',
  gpa: '90',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  atRiskSubjects: [],
  hasTakenDiagnostic: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const studentAuth: AuthContextType = {
  currentUser: null,
  userProfile: studentProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
};

function routedFetch(routes: Array<[RegExp, () => object]>) {
  return vi.fn(async (url: string) => {
    const route = routes.find(([pattern]) => pattern.test(url));
    return jsonResponse(JSON.stringify(route ? route[1]() : {}));
  });
}

describe('refire guards', () => {
  beforeEach(() => {
    // SAFETY: consumers only keep the unsubscribe function returned by onSnapshot.
    vi.spyOn(firestore, 'onSnapshot').mockImplementation((() => vi.fn()) as typeof firestore.onSnapshot);
    vi.spyOn(authNs, 'useAuth').mockReturnValue(studentAuth);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.mocked(authNs.useAuth).mockRestore();
    vi.mocked(firestore.onSnapshot).mockRestore();
    vi.mocked(console.debug).mockRestore();
  });

  it('ModulesPage asks for the analysis context once across equal risk-topic arrays', async () => {
    const fetchStub = routedFetch([[/\/api\/rag\/analysis-context$/, () => ({ curriculumContext: 'ctx' })]]);
    vi.stubGlobal('fetch', fetchStub);
    const analysisCalls = () => requestedUrls(fetchStub).filter((url) => url.endsWith('/api/rag/analysis-context'));
    const renderPage = (priorityTopics: DiagnosticTopicKey[]) => (
      <QueryClientProvider client={queryClient}>
        <ModulesPage priorityTopics={priorityTopics} atRiskSubjects={['Functions']} hasCompletedDiagnostic />
      </QueryClientProvider>
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(renderPage(['Functions']));
    fireEvent.click(screen.getAllByRole('button', { name: /^recommended$/i })[0]);
    await waitFor(() => expect(analysisCalls()).toHaveLength(1));

    rerender(renderPage(['Functions']));
    rerender(renderPage(['Functions']));
    await act(async () => {});
    expect(analysisCalls()).toHaveLength(1);

    rerender(renderPage(['Logic']));
    await waitFor(() => expect(analysisCalls()).toHaveLength(2));
  });

  it('ModuleFolderCard runs one AI preview per module across remounts with equal module objects', async () => {
    const fetchStub = routedFetch([[/\/api\/deepseek\/module-preview$/, () => ({
      ai_overview: 'Preview from DepEd modules',
      rag_confidence: 'high',
      generated: true,
    })]]);
    vi.stubGlobal('fetch', fetchStub);
    const previewCalls = () => requestedUrls(fetchStub).filter((url) => url.endsWith('/api/deepseek/module-preview'));
    const comingSoonModule = () => ({
      id: 'refire-module-1',
      title: 'Rational Functions',
      subject: 'General Mathematics',
      subjectId: 'gen-math',
      quarter: 'Q2',
      isAvailable: false,
      moduleStatus: 'coming_soon',
    });

    const first = render(<ModuleFolderCard module={comingSoonModule()} index={0} onClick={() => {}} precomputedAvailable={false} />);
    expect(await screen.findByText('Preview from DepEd modules')).toBeInTheDocument();
    first.rerender(<ModuleFolderCard module={comingSoonModule()} index={0} onClick={() => {}} precomputedAvailable={false} />);
    first.unmount();

    render(<ModuleFolderCard module={comingSoonModule()} index={1} onClick={() => {}} precomputedAvailable={false} />);
    expect(await screen.findByText('Preview from DepEd modules')).toBeInTheDocument();
    expect(previewCalls()).toHaveLength(1);
  });

  it('ModuleFolderCard retries a preview that was not generated on the next mount', async () => {
    const fetchStub = routedFetch([[/\/api\/deepseek\/module-preview$/, () => ({
      ai_overview: '',
      rag_confidence: 'low',
      generated: false,
    })]]);
    vi.stubGlobal('fetch', fetchStub);
    const previewCalls = () => requestedUrls(fetchStub).filter((url) => url.endsWith('/api/deepseek/module-preview'));
    const comingSoonModule = { id: 'refire-module-2', title: 'Logic', subject: 'General Mathematics', quarter: 'Q3', isAvailable: false, moduleStatus: 'coming_soon' };

    const first = render(<ModuleFolderCard module={comingSoonModule} index={0} onClick={() => {}} precomputedAvailable={false} />);
    await waitFor(() => expect(previewCalls()).toHaveLength(1));
    await act(async () => {});
    first.unmount();

    render(<ModuleFolderCard module={{ ...comingSoonModule }} index={0} onClick={() => {}} precomputedAvailable={false} />);
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  });

  // TeacherDashboard's daily-insight and learning-path effects live inside a 7k-line component whose roster
  // comes from a dozen Firestore/service loads, and their key helpers are not exported. Until they are
  // extracted, pin the dependency arrays: keying them on `students` / `effectiveStruggles` memoized by
  // reference is exactly what made the AI calls refire on every roster merge.
  it('TeacherDashboard AI effects stay keyed on value keys, not array references', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/TeacherDashboard.tsx'), 'utf8');
    const depsAfter = (marker: string): string => {
      const start = source.indexOf(marker);
      expect(start, `marker not found: ${marker}`).toBeGreaterThan(-1);
      const deps = /\n\s*\}, \[([^\]]*)\]\);/.exec(source.slice(start));
      expect(deps, `no effect deps after ${marker}`).not.toBeNull();
      return deps ? deps[1].trim() : '';
    };

    expect(source).toMatch(/const dailyInsightInputKey = useMemo\(\(\) => JSON\.stringify\(/);
    expect(depsAfter('apiService.getDailyInsightSafe(')).toBe('dailyInsightInputKey');

    expect(source).toMatch(/const strugglesKey = \(student\.struggles \|\| \[\]\)\.join\(/);
    expect(depsAfter('const effectiveStruggles = useMemo(')).toBe('strugglesKey, effectiveWeakestTopic');
    expect(depsAfter('apiService.getLearningPath(')).toBe('student.id, effectiveStruggles');
  });
});
