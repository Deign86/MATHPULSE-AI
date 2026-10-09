// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudentProfile } from '../types/models';
import * as authContext from '../contexts/AuthContext';
import * as battleService from '../services/quizBattleService';
import QuizBattlePage from './QuizBattlePage';

afterEach(cleanup);
describe('student tour battle safety', () => {
  it('does not resume a session in preview, but preserves normal session resume', async () => {
    const learner: StudentProfile = {
      uid: 'tour-student', email: 'learner@example.com', name: 'Tour Student', role: 'student',
      grade: '11', section: 'STEM-A', school: 'Test SHS', enrollmentDate: '2026-01-01',
      major: 'STEM', gpa: '90', currentXP: 0, totalXP: 0, level: 1, atRiskSubjects: [],
      hasTakenDiagnostic: true, createdAt: new Date(), updatedAt: new Date(),
    };
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      currentUser: null, userProfile: learner, loading: false, isLoggedIn: true,
      userRole: 'student', refreshProfile: async () => {},
    });
    vi.spyOn(battleService, 'getStudentBattleStats').mockResolvedValue({
      userId: learner.uid, matchesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0,
      averageAccuracy: 0, averageResponseMs: 0, bestStreak: 0, currentStreak: 0,
      leaderboardScore: 0, updatedAt: new Date(),
    });
    vi.spyOn(battleService, 'getStudentBattleHistory').mockResolvedValue([]);
    vi.spyOn(battleService, 'getStudentBattleLeaderboard').mockResolvedValue([]);
    const resume = vi.spyOn(battleService, 'resumeQuizBattleSession').mockResolvedValue({ success: true, sessionType: 'idle' });
    const { rerender, container } = render(<QuizBattlePage tourPreview tourView="setup" />);
    expect(resume).not.toHaveBeenCalled();
    await waitFor(() => expect(container.querySelector('[data-tour="battle-start"]')).toBeInTheDocument());
    rerender(<QuizBattlePage />);
    await waitFor(() => expect(resume).toHaveBeenCalledOnce());
    await waitFor(() => expect(container.querySelector('[data-tour="battle-modes"]')).toBeInTheDocument());
    expect(container.querySelector('[data-tour="battle-start"]')).not.toBeInTheDocument();
  });
});
