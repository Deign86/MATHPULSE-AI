/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeCenter from './PracticeCenter';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { uid: 'user-1', totalXP: 0 } }),
}));

vi.mock('../services/progressService', () => ({
  getUserProgress: vi.fn(() => Promise.resolve({
    totalQuizzesCompleted: 0,
    averageScore: 0,
    quizAttempts: [],
  })),
}));

vi.mock('../services/practiceService', () => ({
  fetchPracticeStats: vi.fn(() => Promise.resolve({
    quizzesCompleted: 0,
    totalXPEarned: 0,
    averageScore: 0,
    recentSessions: [],
    competencyBreakdown: {},
  })),
  generatePracticeSession: vi.fn(),
  submitPracticeSession: vi.fn(),
}));

vi.mock('../data/subjects', () => ({
  subjects: [
    {
      id: 'subject-1',
      title: 'General Mathematics',
      modules: [
        {
          quizzes: [
            { id: 'quiz-1', title: 'Quiz 1', type: 'module', questions: 5, duration: '10m', locked: false },
          ],
        },
      ],
    },
  ],
}));

describe('PracticeCenter', () => {
  it('renders stats cards', () => {
    render(<PracticeCenter userId="user-1" />);

    expect(screen.getByText(/quizzes completed/i)).toBeInTheDocument();
    expect(screen.getByText(/total xp earned/i)).toBeInTheDocument();
    expect(screen.getByText(/average score/i)).toBeInTheDocument();
  });
});
