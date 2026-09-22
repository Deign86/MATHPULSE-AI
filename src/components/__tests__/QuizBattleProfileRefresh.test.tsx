/** @vitest-environment jsdom */
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthContext, { type AuthContextType } from '../../contexts/AuthContext';
import type { StudentProfile } from '../../types/models';
import * as quizBattleService from '../../services/quizBattleService';
import type { QuizBattleLiveMatchState } from '../../services/quizBattleService';
import QuizBattlePage from '../QuizBattlePage';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const initialProfile: StudentProfile = {
  uid: 'student-172',
  email: 'student-172@example.com',
  name: 'Student 172',
  role: 'student',
  grade: 'Grade 11',
  section: 'STEM-A',
  school: 'MathPulse High School',
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

const freshProfile: StudentProfile = {
  ...initialProfile,
  currentXP: 150,
  totalXP: 150,
};

const liveMatch: QuizBattleLiveMatchState = {
  matchId: 'match-172',
  mode: 'bot',
  status: 'in_progress',
  subjectId: 'gen-math',
  topicId: 'gen-math-functions',
  difficulty: 'medium',
  currentRound: 1,
  totalRounds: 1,
  timePerQuestionSec: 30,
  scoreFor: 0,
  scoreAgainst: 0,
  opponentName: 'Practice Bot',
  currentQuestion: {
    roundNumber: 1,
    questionId: 'question-172',
    prompt: 'What is 1 + 1?',
    choices: ['2', '3'],
  },
  roundResults: [],
};

const completedMatch: QuizBattleLiveMatchState = {
  ...liveMatch,
  status: 'completed',
  scoreFor: 1,
  outcome: 'win',
  xpEarned: 50,
  currentQuestion: null,
};

const battleStats = {
  userId: initialProfile.uid,
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
};

interface ProfileRefreshHarnessProps {
  readonly refreshProfile: () => Promise<void>;
}

const ProfileRefreshHarness: React.FC<ProfileRefreshHarnessProps> = ({ refreshProfile }) => {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const handleRefreshProfile = async () => {
    await refreshProfile();
    setProfile(freshProfile);
  };
  const authValue: AuthContextType = {
    currentUser: null,
    userProfile: profile,
    loading: false,
    isLoggedIn: true,
    userRole: 'student',
    refreshProfile: handleRefreshProfile,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <span data-testid="header-xp">{profile.currentXP} XP</span>
      <QuizBattlePage />
    </AuthContext.Provider>
  );
};

describe('QuizBattlePage profile refresh after match completion', () => {
  it('updates header XP after delayed profile refresh without reloading', async () => {
    let releaseProfileWrite: (() => void) | undefined;
    const profileWrite = new Promise<void>((resolve) => {
      releaseProfileWrite = resolve;
    });
    const refreshProfile = vi.fn(async () => {
      await profileWrite;
    });

    vi.spyOn(quizBattleService, 'resumeQuizBattleSession').mockResolvedValue({
      success: true,
      sessionType: 'idle',
    });
    vi.spyOn(quizBattleService, 'getStudentBattleStats').mockResolvedValue(battleStats);
    vi.spyOn(quizBattleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(quizBattleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);
    vi.spyOn(quizBattleService, 'createQuizBattleBotMatch').mockResolvedValue({
      success: true,
      matchId: liveMatch.matchId,
      status: 'ready',
      botDifficulty: 'medium',
    });
    vi.spyOn(quizBattleService, 'startQuizBattleMatch').mockResolvedValue(liveMatch);
    vi.spyOn(quizBattleService, 'submitQuizBattleAnswer').mockResolvedValue({
      success: true,
      duplicate: false,
      roundResult: null,
      completion: { outcome: 'win', xpEarned: 50 },
      match: completedMatch,
    });

    render(<ProfileRefreshHarness refreshProfile={refreshProfile} />);

    fireEvent.click(screen.getByRole('button', { name: /VS Bot/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start Battle' }));
    const answerButton = await waitFor(() => {
      const matchingButton = screen.getAllByRole('button').find(
        (button) => button.textContent?.replace(/\s+/g, '') === 'A2',
      );
      if (!matchingButton) {
        throw new Error('Answer button was not rendered.');
      }
      return matchingButton;
    });
    fireEvent.click(answerButton);

    await waitFor(() => {
      expect(refreshProfile).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('header-xp')).toHaveTextContent('100 XP');

    if (!releaseProfileWrite) {
      throw new Error('Profile write was not scheduled.');
    }
    releaseProfileWrite();

    await waitFor(() => {
      expect(screen.getByTestId('header-xp')).toHaveTextContent('150 XP');
    });
  });
});
