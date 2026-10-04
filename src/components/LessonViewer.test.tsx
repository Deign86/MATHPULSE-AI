// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import LessonViewer, { resolveRestoredSection } from './LessonViewer';

describe('LessonViewer role gating', () => {
  it('does not expose staff-only evidence controls to an anonymous learner', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    const lesson = { id: 'intro', title: 'Introduction', duration: '10 min', completed: false, locked: false } satisfies Parameters<typeof LessonViewer>[0]['lesson'];
    render(<AuthContext.Provider value={authValue}><LessonViewer lesson={lesson} onBack={vi.fn()} onComplete={vi.fn()} /></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: /inspect evidence/i })).not.toBeInTheDocument();
  });
});

describe('resolveRestoredSection (STU-010)', () => {
  it('restores the saved section on fresh open', () => {
    expect(resolveRestoredSection(false, 0, 7, 1)).toBe(1);
  });

  it('ignores late-saved values after manual navigation', () => {
    expect(resolveRestoredSection(true, 0, 7, 5)).toBeUndefined();
  });

  it('restores nothing without a saved section', () => {
    expect(resolveRestoredSection(false, 0, 7, undefined)).toBeUndefined();
  });

  it('restores nothing when the initial section is out of range', () => {
    expect(resolveRestoredSection(false, 9, 7, 1)).toBeUndefined();
  });

  it('clamps restored sections to the available range', () => {
    expect(resolveRestoredSection(false, 0, 7, 12)).toBe(6);
  });
});
