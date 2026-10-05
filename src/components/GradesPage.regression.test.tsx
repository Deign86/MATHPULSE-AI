// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import GradesPage, { calculateExamReadinessScore } from './GradesPage';

describe('exam readiness data states', () => {
  it('does not fabricate readiness when assessment data is absent', () => {
    expect(calculateExamReadinessScore(0, 0, undefined, false)).toBeNull();
  });

  it('keeps a completed zero-score assessment distinct from missing data', () => {
    expect(calculateExamReadinessScore(0, 0, undefined, true)).toBe(0);
  });

  it('uses a persisted zero diagnostic score', () => {
    expect(calculateExamReadinessScore(0, 0, 0, false)).toBe(0);
  });
});

describe('GradesPage anonymous access', () => {
  it('shows no student grade records without an authenticated profile', () => {
    const authValue: AuthContextType = { currentUser: null, userProfile: null, loading: false, isLoggedIn: false, userRole: 'student', refreshProfile: async () => undefined };
    render(<AuthContext.Provider value={authValue}><GradesPage /></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: /export report/i })).not.toBeInTheDocument();
  });
});
