// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LessonViewer from '../LessonViewer';
import type { User, UserRole } from '../../types/models';
import type { CurriculumSource } from '../../types/curriculum';
import type { UseLessonContentResult } from '../../hooks/useLessonContent';
import AuthContext, { type AuthContextType } from '../../contexts/AuthContext';
import * as lessonQuizService from '../../services/lessonQuizService';

let activeProfile: User | null = null;

function buildTestAuthContext(profile: User | null): AuthContextType {
  // SAFETY: profile?.role is constrained to User['role'] or defaults to 'student'.
  const userRole: UserRole = profile?.role ?? 'student';
  return {
    currentUser: null,
    userProfile: profile,
    loading: false,
    isLoggedIn: profile !== null,
    userRole,
    refreshProfile: async () => {},
  };
}

const stubLessonContent: UseLessonContentResult = {
  sections: [
    {
      type: 'introduction',
      title: 'Welcome to Simple Interest',
      content: 'Welcome. 1. Identify the principal and rate in a simple interest problem.',
      callouts: [],
    },
  ],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  sources: [
    {
      subject: 'General Mathematics',
      quarter: 1,
      source_file: 'SHS_GM_Q1_LE2.md',
      storage_path: 'curriculum/SHS_GM_Q1_LE2.pdf',
      page: 62,
      score: 0.823,
      content: 'Raw vector store chunk excerpt about simple interest.',
      content_domain: 'general_mathematics',
      chunk_type: 'concept',
    },
  ],
  retrievalBand: 'high',
  retrievalConfidence: 0.812,
  needsReview: false,
  activeModel: 'deepseek/deepseek-v4-pro',
  isOffline: false,
};

const stubLogLessonView = vi.fn().mockResolvedValue(undefined);
const generateLessonQuizSpy = vi.spyOn(lessonQuizService, 'generateLessonQuiz');

function setRole(role: User['role']): void {
  activeProfile = {
    uid: `${role}-uid`,
    email: `${role}@school.edu`,
    name: `${role} user`,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// SAFETY: LessonViewer test prop carries curriculum pipeline metadata fields.
const lesson = {
  id: 'gm-q1-l2',
  title: 'Simple Interest',
  duration: '20 min',
  completed: false,
  locked: false,
  subjectId: 'general_math',
  subject: 'General Mathematics',
  quarter: 1,
  competencyCode: 'GM11-BF-1',
  storagePath: 'curriculum/SHS_GM_Q1_LE2.pdf',
} as Parameters<typeof LessonViewer>[0]['lesson'];

function renderLessonViewer(content: UseLessonContentResult = stubLessonContent) {
  const authValue = buildTestAuthContext(activeProfile);
  return render(
    <AuthContext.Provider value={authValue}>
      <LessonViewer
        lesson={lesson}
        initialContent={content}
        onLogLessonView={stubLogLessonView}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    </AuthContext.Provider>
  );
}

function openEvidenceModal(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: /inspect evidence/i }));
  const heading = screen.getByText('Curriculum Grounding Evidence');
  const root = heading.closest('.max-w-3xl');
  if (!root) throw new Error('evidence modal root not found');
  // SAFETY: null-throw above guarantees root is the modal container div.
  return root as HTMLElement;
}

describe('Issue #164: Curriculum Grounding Evidence role gating', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    activeProfile = null;
    generateLessonQuizSpy.mockReset();
  });

  it('student sees neither the evidence trigger nor the evidence modal', () => {
    setRole('student');
    renderLessonViewer();

    expect(screen.queryByLabelText('Inspect evidence')).toBeNull();
    expect(screen.queryByText('Curriculum Grounding Evidence')).toBeNull();

    const page = document.body.textContent || '';
    expect(page).not.toContain('deepseek-v4-pro');
    expect(page).not.toContain('SHS_GM_Q1_LE2.md');
  });

  it('staff evidence modal retains full RAG telemetry', () => {
    setRole('teacher');
    renderLessonViewer();

    expect(screen.getByLabelText('Inspect evidence')).toBeVisible();
    const page = document.body.textContent || '';
    expect(page).toContain('deepseek-v4-pro');

    const modal = openEvidenceModal();
    const text = modal.textContent || '';
    expect(text).toContain('deepseek-v4-pro');
    expect(text).toContain('Similarity: 82.3%');
    expect(text).toContain('Chunk #1');
    expect(text).toContain('81.2%');
    expect(text).toContain('DepEd RAG Grounding');
  });

  it('student cannot mount a stale evidence modal after staff opens it', () => {
    setRole('teacher');
    const view = renderLessonViewer();
    openEvidenceModal();
    expect(screen.getByText('Chunk #1')).toBeInTheDocument();

    setRole('student');
    view.rerender(
      <AuthContext.Provider value={buildTestAuthContext(activeProfile)}>
        <LessonViewer
          lesson={lesson}
          initialContent={stubLessonContent}
          onLogLessonView={stubLogLessonView}
          onBack={vi.fn()}
          onComplete={vi.fn()}
        />
      </AuthContext.Provider>
    );
    expect(screen.queryByLabelText('Inspect evidence')).toBeNull();
    expect(screen.queryByText('Curriculum Grounding Evidence')).toBeNull();
  });

  it('shows the Merrill deck when RAG sections contain card content', () => {
    setRole('student');
    renderLessonViewer();

    expect(screen.getByRole('region', { name: 'Merrill micro-lesson' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome to Simple Interest' })).toBeInTheDocument();
  });

  it('keeps the PDF fallback when RAG content fails', () => {
    setRole('student');
    renderLessonViewer({
      ...stubLessonContent,
      sections: [],
      error: 'retrieval failed',
    });

    expect(screen.queryByRole('region', { name: 'Merrill micro-lesson' })).toBeNull();
    expect(screen.getByText('AI lesson unavailable')).toBeInTheDocument();
    expect(screen.getByText(/showing the DepEd source PDF/i)).toBeInTheDocument();
  });

  it('announces the lesson generation stage while loading', () => {
    setRole('student');
    renderLessonViewer({ ...stubLessonContent, sections: [], isLoading: true, stage: 'retrieving' });

    const stageLine = screen.getByText('Finding curriculum sources…');
    expect(stageLine.closest('[aria-live="polite"]')).not.toBeNull();
  });

  describe('next-lesson prefetch (contract C4)', () => {
    const nextLesson = { ...lesson, id: 'gm-q1-l3', title: 'Compound Interest' };
    const fetchStub = vi.fn();
    const prefetchUrls = () => fetchStub.mock.calls.map((call) => String(call[0])).filter((url) => url.endsWith('/prefetch'));

    function renderFetching() {
      return render(
        <AuthContext.Provider value={buildTestAuthContext(activeProfile)}>
          <LessonViewer lesson={lesson} nextLesson={nextLesson} onBack={vi.fn()} onComplete={vi.fn()} />
        </AuthContext.Provider>
      );
    }

    beforeEach(() => {
      sessionStorage.clear();
      fetchStub.mockReset();
      vi.stubGlobal('fetch', fetchStub);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('prefetches the next lesson after a student lesson loads', async () => {
      setRole('student');
      fetchStub.mockImplementation(async (url: string) => (url.endsWith('/prefetch')
        ? new Response('{"status":"queued"}', { status: 202 })
        : new Response(JSON.stringify(stubLessonContent), { status: 200, headers: { 'Content-Type': 'application/json' } })));
      renderFetching();

      await waitFor(() => expect(prefetchUrls()).toHaveLength(1));
      const prefetchCall = fetchStub.mock.calls.find((call) => String(call[0]).endsWith('/prefetch'));
      expect(JSON.parse(String(prefetchCall?.[1]?.body)).lessonId).toBe('gm-q1-l3');
    });

    it('does not prefetch when the current lesson fails to load', async () => {
      setRole('student');
      fetchStub.mockImplementation(async () => new Response('boom', { status: 500, statusText: 'Server Error' }));
      renderFetching();

      await screen.findByText('AI lesson unavailable');
      expect(prefetchUrls()).toHaveLength(0);
    });

    it('does not prefetch for initialContent previews', () => {
      setRole('student');
      render(
        <AuthContext.Provider value={buildTestAuthContext(activeProfile)}>
          <LessonViewer lesson={lesson} nextLesson={nextLesson} initialContent={stubLessonContent} onBack={vi.fn()} onComplete={vi.fn()} />
        </AuthContext.Provider>
      );
      expect(prefetchUrls()).toHaveLength(0);
    });
  });

  it('returns to the lesson after lesson quiz generation fails', async () => {
    setRole('student');
    generateLessonQuizSpy.mockRejectedValue(new Error('API unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderLessonViewer({
      ...stubLessonContent,
      sections: [{ type: 'try_it_yourself', title: 'Practice', content: 'Practice this lesson.' }],
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Practice Quiz/i }));

    expect(await screen.findByText(/Lesson-specific practice questions could not be generated/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to lesson' }));

    expect(screen.queryByText(/Lesson-specific practice questions could not be generated/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Start Practice Quiz/i })).toBeInTheDocument();
    expect(screen.queryByText(/If 2x \+ 5 = 13/)).toBeNull();
  });

  it('retries failed lesson quiz generation and renders the quiz after success', async () => {
    setRole('student');
    generateLessonQuizSpy
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce([{
        id: 1,
        type: 'multiple-choice',
        question: 'What is the simple interest?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        explanation: 'Use the lesson formula.',
      }]);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderLessonViewer({
      ...stubLessonContent,
      sections: [{ type: 'try_it_yourself', title: 'Practice', content: 'Practice this lesson.' }],
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Practice Quiz/i }));
    await screen.findByText(/Lesson-specific practice questions could not be generated/i);
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(await screen.findByText('Try It Yourself!')).toBeInTheDocument();
    expect(generateLessonQuizSpy).toHaveBeenCalledTimes(2);
  });
});
