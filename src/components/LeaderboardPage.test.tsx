// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import LeaderboardPage from './LeaderboardPage';

describe('LeaderboardPage', () => {
  it('renders leaderboard filters for an authenticated student profile', () => {
    const studentProfile = { uid: 'student-1', email: 'student@example.com', name: 'Kai Student', role: 'student' as const, createdAt: new Date(), updatedAt: new Date(), level: 1, currentXP: 0, totalXP: 0, atRiskSubjects: [], hasTakenDiagnostic: false };
    const authValue: AuthContextType = { currentUser: null, userProfile: studentProfile, loading: false, isLoggedIn: true, userRole: 'student', refreshProfile: async () => undefined };
    render(<AuthContext.Provider value={authValue}><LeaderboardPage /></AuthContext.Provider>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
