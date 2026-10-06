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
    const mockInitialContent: never = {
      isLoading: false, error: null, retry: vi.fn(), sources: [],
      sections: [{ type: 'introduction', title: 'Welcome', content: '' }],
      retrievalBand: 'low', retrievalConfidence: 0, needsReview: false, isOffline: false,
    } as never;
    render(
      <AuthContext.Provider value={authValue}>
        <LessonViewer lesson={lesson} initialSection={4} initialContent={mockInitialContent} onBack={vi.fn()} onComplete={vi.fn()} />
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Complete lesson' })).toBeDisabled();
  });
});
