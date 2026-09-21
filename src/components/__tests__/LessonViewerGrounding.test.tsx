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

  it('student evidence modal hides all RAG telemetry and shows assurance copy', () => {
    setRole('student');
    renderLessonViewer();

    const page = document.body.textContent || '';
    expect(page).not.toContain('deepseek-reasoner');
    expect(page).not.toContain('SHS_GM_Q1_LE2.md');

    const modal = openEvidenceModal();
    const text = modal.textContent || '';
    for (const banned of [
      'deepseek',
      '.md',
      'Similarity',
      'Chunk #',
      'Active Model',
      'Retrieval Score',
      'Retrieved Chunks',
      'general_mathematics',
      'concept',
      'Raw vector store chunk excerpt',
      '81.2%',
      '82.3%',
      'DepEd RAG Grounding',
      'Flagged for Review',
    ]) {
      expect(text).not.toContain(banned);
    }
    expect(text).toContain('Verified DepEd Senior High School STEM Curriculum');
    expect(text).toContain('GM11-BF-1');
    expect(text).toContain('Open official textbook lesson');
  });

  it('staff evidence modal retains full RAG telemetry', () => {
    setRole('teacher');
    renderLessonViewer();

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

  it('role switch re-renders evidence modal without reload', () => {
    setRole('student');
    const view = renderLessonViewer();
    let modal = openEvidenceModal();
    expect((modal.textContent || '')).toContain(
      'Verified DepEd Senior High School STEM Curriculum',
    );

    setRole('admin');
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
    const heading = screen.getByText('Curriculum Grounding Evidence');
    // SAFETY: getByText throws when absent and the heading always renders inside the .max-w-3xl modal.
    modal = heading.closest('.max-w-3xl') as HTMLElement;
    const text = modal.textContent || '';
    expect(text).toContain('Chunk #1');
    expect(text).toContain('deepseek-reasoner');
    expect(text).not.toContain('Verified DepEd Senior High School STEM Curriculum');
  });
});
