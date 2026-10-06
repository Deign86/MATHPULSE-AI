// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';
import type { StudentProfile } from '../types/models';
import * as authContext from '../contexts/AuthContext';
import * as battleService from '../services/quizBattleService';
import QuizBattlePage from './QuizBattlePage';

describe('QuizBattlePage widget failures', () => {
  it('shows an actionable stats error when loading battle metrics fails', async () => {
    const studentProfile: StudentProfile = { uid: 'student-1', email: 'student@example.com', name: 'Test Student', role: 'student', grade: '11', section: 'STEM-A', school: 'Test SHS', enrollmentDate: '2026-01-01', major: 'STEM', gpa: '90', currentXP: 10, totalXP: 10, level: 1, atRiskSubjects: [], hasTakenDiagnostic: true, createdAt: new Date(), updatedAt: new Date() };
    const firebaseStudent: FirebaseUser = { uid: studentProfile.uid, email: studentProfile.email, emailVerified: true, isAnonymous: false, metadata: {}, phoneNumber: null, photoURL: null, providerData: [], providerId: 'password', refreshToken: '', tenantId: null, displayName: studentProfile.name, delete: async () => undefined, getIdToken: async () => 'token', getIdTokenResult: async () => ({ authTime: '', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: 'password', signInSecondFactor: null, token: 'token' }), reload: async () => undefined, toJSON: () => ({}) };
    vi.spyOn(authContext, 'useAuth').mockReturnValue({ currentUser: firebaseStudent, userProfile: studentProfile, loading: false, isLoggedIn: true, userRole: 'student', refreshProfile: async () => undefined });
    vi.spyOn(battleService, 'getStudentBattleStats').mockRejectedValueOnce(new Error('network unavailable'));
    vi.spyOn(battleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(battleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);
    render(<QuizBattlePage />);
    expect(await screen.findByTestId('widget-error-card-stats')).toHaveTextContent(/couldn't refresh stats/i);
  });

  it('notifies parent via setIsInQuizMode when unmounted or in hub', async () => {
    const studentProfile: StudentProfile = { uid: 'student-1', email: 'student@example.com', name: 'Test Student', role: 'student', grade: '11', section: 'STEM-A', school: 'Test SHS', enrollmentDate: '2026-01-01', major: 'STEM', gpa: '90', currentXP: 10, totalXP: 10, level: 1, atRiskSubjects: [], hasTakenDiagnostic: true, createdAt: new Date(), updatedAt: new Date() };
    const firebaseStudent: FirebaseUser = { uid: studentProfile.uid, email: studentProfile.email, emailVerified: true, isAnonymous: false, metadata: {}, phoneNumber: null, photoURL: null, providerData: [], providerId: 'password', refreshToken: '', tenantId: null, displayName: studentProfile.name, delete: async () => undefined, getIdToken: async () => 'token', getIdTokenResult: async () => ({ authTime: '', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: 'password', signInSecondFactor: null, token: 'token' }), reload: async () => undefined, toJSON: () => ({}) };
    vi.spyOn(authContext, 'useAuth').mockReturnValue({ currentUser: firebaseStudent, userProfile: studentProfile, loading: false, isLoggedIn: true, userRole: 'student', refreshProfile: async () => undefined });
    vi.spyOn(battleService, 'getStudentBattleStats').mockResolvedValue({
      userId: studentProfile.uid,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      averageAccuracy: 0,
      averageResponseMs: 0,
      bestStreak: 0,
      currentStreak: 0,
      leaderboardScore: 0,
      updatedAt: new Date(),
    });
    vi.spyOn(battleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(battleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);

    const setIsInQuizMode = vi.fn();
    const { unmount } = render(<QuizBattlePage setIsInQuizMode={setIsInQuizMode} />);
    expect(setIsInQuizMode).toHaveBeenCalledWith(false);

    unmount();
    expect(setIsInQuizMode).toHaveBeenLastCalledWith(false);
  });
});
