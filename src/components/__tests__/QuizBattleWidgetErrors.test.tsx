/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { StudentProfile } from '../../types/models';
import type { User as FirebaseUser } from 'firebase/auth';
import * as authNs from '../../contexts/AuthContext';
import * as quizBattleService from '../../services/quizBattleService';
import QuizBattlePage from '../QuizBattlePage';

// Mock matchMedia for motion / responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockStudentProfile: StudentProfile = {
  uid: 'student-123',
  email: 'student@example.com',
  name: 'Test Student',
  role: 'student',
  grade: 'Grade 11',
  section: 'STEM-A',
  school: 'Test High School',
  enrollmentDate: '2026-06-01',
  major: 'STEM',
  gpa: '90.0',
  currentXP: 100,
  totalXP: 100,
  level: 1,
  atRiskSubjects: [],
  hasTakenDiagnostic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('QuizBattlePage - async failure error cards and retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quizBattleService.takeBattleWidgetErrors();

    vi.spyOn(authNs, 'useAuth').mockReturnValue({
      // SAFETY: minimal FirebaseUser interface implementation for testing authenticated session
      currentUser: {
        uid: 'student-123',
        email: 'student@example.com',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: vi.fn(),
        getIdToken: vi.fn(),
        getIdTokenResult: vi.fn(),
        reload: vi.fn(),
        toJSON: vi.fn(),
        displayName: 'Test Student',
        phoneNumber: null,
        photoURL: null,
        providerId: 'firebase',
      } as FirebaseUser,
      userProfile: mockStudentProfile,
      loading: false,
      isLoggedIn: true,
      userRole: 'student',
      refreshProfile: async () => {},
    });
  });

  it('renders visible error card with retry when battle stats fail to load', async () => {
    vi.spyOn(quizBattleService, 'getStudentBattleStats').mockRejectedValueOnce(
      new Error('Failed to fetch stats from server'),
    );
    vi.spyOn(quizBattleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(quizBattleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);

    render(<QuizBattlePage />);

    // Expect the error card to be visible in the document
    const statsErrorCard = await screen.findByTestId('widget-error-card-stats');
    expect(statsErrorCard).toBeInTheDocument();
    expect(statsErrorCard).toHaveTextContent(/Couldn't refresh stats/i);

    // Click retry and expect getStudentBattleStats to be called again
    const retryBtn = statsErrorCard.querySelector('button');
    expect(retryBtn).toBeInTheDocument();

    vi.spyOn(quizBattleService, 'getStudentBattleStats').mockResolvedValueOnce({
      userId: 'student-123',
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      draws: 0,
      winRate: 60,
      currentStreak: 2,
      bestStreak: 4,
      leaderboardScore: 500,
      averageAccuracy: 80,
      averageResponseMs: 3000,
      updatedAt: new Date(),
    });

    fireEvent.click(retryBtn!);

    await waitFor(() => {
      expect(quizBattleService.getStudentBattleStats).toHaveBeenCalledTimes(2);
    });
  });

  it('renders visible error card with retry when battle leaderboard fails to load', async () => {
    vi.spyOn(quizBattleService, 'getStudentBattleStats').mockResolvedValue({
      userId: 'student-123',
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      leaderboardScore: 0,
      averageAccuracy: 0,
      averageResponseMs: 0,
      updatedAt: new Date(),
    });
    vi.spyOn(quizBattleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(quizBattleService, 'getStudentBattleLeaderboard').mockRejectedValueOnce(
      new Error('Failed to load leaderboard entries'),
    );

    render(<QuizBattlePage />);

    // Wait for leaderboard error to appear
    const leaderboardErrorCard = await screen.findByTestId('widget-error-card-leaderboard');
    expect(leaderboardErrorCard).toBeInTheDocument();
    expect(leaderboardErrorCard).toHaveTextContent(/Couldn't refresh leaderboard/i);

    const retryBtn = leaderboardErrorCard.querySelector('button');
    expect(retryBtn).toBeInTheDocument();

    vi.spyOn(quizBattleService, 'getStudentBattleLeaderboard').mockResolvedValueOnce([
      {
        userId: 'student-123',
        displayName: 'Test Student',
        rank: 1,
        leaderboardScore: 100,
        winRate: 100,
        bestStreak: 1,
      },
    ]);

    fireEvent.click(retryBtn!);

    await waitFor(() => {
      expect(quizBattleService.getStudentBattleLeaderboard).toHaveBeenCalledTimes(2);
    });
  });

  it('renders visible error card with retry when battle history fails to load', async () => {
    vi.spyOn(quizBattleService, 'getStudentBattleStats').mockResolvedValue({
      userId: 'student-123',
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      leaderboardScore: 0,
      averageAccuracy: 0,
      averageResponseMs: 0,
      updatedAt: new Date(),
    });
    vi.spyOn(quizBattleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);
    vi.spyOn(quizBattleService, 'getStudentBattleHistory').mockRejectedValueOnce(
      new Error('Failed to load battle history entries'),
    );

    render(<QuizBattlePage />);

    const historyErrorCard = await screen.findByTestId('widget-error-card-stats-history');
    expect(historyErrorCard).toBeInTheDocument();
    expect(historyErrorCard).toHaveTextContent(/Couldn't refresh history/i);

    const retryBtn = historyErrorCard.querySelector('button');
    expect(retryBtn).toBeInTheDocument();

    vi.spyOn(quizBattleService, 'getStudentBattleHistory').mockResolvedValueOnce([]);

    fireEvent.click(retryBtn!);

    await waitFor(() => {
      expect(quizBattleService.getStudentBattleHistory).toHaveBeenCalledTimes(2);
    });
  });
});
