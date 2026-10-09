// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import LessonViewer, { shouldRestoreSavedLessonSection } from './LessonViewer';

describe('LessonViewer role gating', () => {
  it('does not expose staff-only evidence controls to an anonymous learner', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    const lesson = { id: 'intro', title: 'Introduction', duration: '10 min', completed: false, locked: false } satisfies Parameters<typeof LessonViewer>[0]['lesson'];
    render(<AuthContext.Provider value={authValue}><LessonViewer lesson={lesson} onBack={vi.fn()} onComplete={vi.fn()} /></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: /inspect evidence/i })).not.toBeInTheDocument();
  });

  it('does not restore saved reading position for the explicit practice sentinel', () => {
    expect(shouldRestoreSavedLessonSection(-1)).toBe(false);
    expect(shouldRestoreSavedLessonSection(0)).toBe(true);
  });

  it('keeps lesson completion gated until required practice is complete', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    const lesson = { id: 'intro', title: 'Introduction', duration: '10 min', completed: false, locked: false } satisfies Parameters<typeof LessonViewer>[0]['lesson'];
    // SAFETY: initialContent provides sections array so the component renders without network fetch.
    // The try-it section makes practice required, so completion stays gated until it is done.
    const mockInitialContent: never = {
      isLoading: false, error: null, retry: vi.fn(), sources: [],
      sections: [
        { type: 'introduction', title: 'Welcome', content: '' },
        { type: 'try_it_yourself', title: 'Practice', content: '' },
      ],
      retrievalBand: 'low', retrievalConfidence: 0, needsReview: false, isOffline: false,
    } as never;
    render(
      <AuthContext.Provider value={authValue}>
        <LessonViewer lesson={lesson} initialSection={1} initialContent={mockInitialContent} onBack={vi.fn()} onComplete={vi.fn()} />
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Complete lesson' })).toBeDisabled();
  });
});

describe('LessonViewer LaTeX rendering', () => {
  it('typesets lesson math and leaves currency as text', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    const lesson = { id: 'business-math', title: 'Business Math', duration: '10 min', completed: false, locked: false } satisfies Parameters<typeof LessonViewer>[0]['lesson'];
    const content = [
      '- **Net Income (Net Pay)**: The amount an employee takes home. It is calculated as:',
      '$$\\text{Net Income} = \\text{Gross Income} - \\text{Total Deductions}$$',
      '',
      'Let $x$ be the number of items sold, so revenue is $R = p \\times x$.',
      '',
      '**Profit $P = R - C$** grows with sales.',
      '',
      'A snack costs $5 and a drink costs $10.',
    ].join('\n');
    // SAFETY: initialContent provides sections so the component renders without a network fetch.
    const mockInitialContent: never = {
      isLoading: false, error: null, retry: vi.fn(), sources: [],
      sections: [
        { type: 'introduction', title: 'Welcome', content: '' },
        { type: 'key_concepts', title: 'Key Concepts', content },
      ],
      retrievalBand: 'low', retrievalConfidence: 0, needsReview: false, isOffline: false,
    } as never;
    render(
      <AuthContext.Provider value={authValue}>
        <LessonViewer lesson={lesson} initialSection={1} initialContent={mockInitialContent} onBack={vi.fn()} onComplete={vi.fn()} />
      </AuthContext.Provider>,
    );

    // The viewer portals into document.body.
    expect(document.body.querySelectorAll('.katex-display')).toHaveLength(1);
    expect(document.body.querySelectorAll('.katex')).toHaveLength(4);
    expect(document.body.querySelector('strong .katex')).not.toBeNull();

    const proseOnly = document.body.cloneNode(true);
    if (!(proseOnly instanceof HTMLElement)) throw new Error('expected an element clone');
    proseOnly.querySelectorAll('.katex').forEach((node) => node.remove());
    expect(proseOnly.textContent).not.toMatch(/\$\$|\\text|\\times|\*\*/);
    expect(proseOnly.textContent).toContain('A snack costs $5 and a drink costs $10.');
  });
});
