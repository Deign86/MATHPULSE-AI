// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import LessonViewer from './LessonViewer';

describe('LessonViewer role gating', () => {
  it('does not expose staff-only evidence controls to an anonymous learner', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    const lesson = { id: 'intro', title: 'Introduction', duration: '10 min', completed: false, locked: false } satisfies Parameters<typeof LessonViewer>[0]['lesson'];
    render(<AuthContext.Provider value={authValue}><LessonViewer lesson={lesson} onBack={vi.fn()} onComplete={vi.fn()} /></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: /inspect evidence/i })).not.toBeInTheDocument();
  });
});
