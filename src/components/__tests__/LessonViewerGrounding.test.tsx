// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LessonViewer from '../LessonViewer';
import type { User, UserRole } from '../../types/models';
import type { CurriculumSource } from '../../types/curriculum';
import type { UseLessonContentResult } from '../../hooks/useLessonContent';
import AuthContext, { type AuthContextType } from '../../contexts/AuthContext';

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
  activeModel: 'deepseek/deepseek-reasoner',
  isOffline: false,
};

const stubLogLessonView = vi.fn().mockResolvedValue(undefined);

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

function renderLessonViewer() {
  const authValue = buildTestAuthContext(activeProfile);
  return render(
    <AuthContext.Provider value={authValue}>
      <LessonViewer
        lesson={lesson}
        initialContent={stubLessonContent}
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
  });

  it('student sees neither the evidence trigger nor the evidence modal', () => {
    setRole('student');
    renderLessonViewer();

    expect(screen.queryByLabelText('Inspect evidence')).toBeNull();
    expect(screen.queryByText('Curriculum Grounding Evidence')).toBeNull();

    const page = document.body.textContent || '';
    expect(page).not.toContain('deepseek-reasoner');
    expect(page).not.toContain('SHS_GM_Q1_LE2.md');
  });

  it('staff evidence modal retains full RAG telemetry', () => {
    setRole('teacher');
    renderLessonViewer();

    expect(screen.getByLabelText('Inspect evidence')).toBeVisible();
    const page = document.body.textContent || '';
    expect(page).toContain('deepseek-reasoner');

    const modal = openEvidenceModal();
    const text = modal.textContent || '';
    expect(text).toContain('deepseek-reasoner');
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
});
