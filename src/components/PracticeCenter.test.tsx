/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeCenter from './PracticeCenter';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { uid: 'user-1', totalXP: 0 } }),
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
}));

vi.mock('../data/subjects', () => ({
  SHS_MATH_SUBJECTS: [
    {
      id: 'gen-math',
      name: 'General Mathematics',
      topics: [
        { id: 'gen-math-001', name: 'Functions', unit: 'Patterns' },
      ],
    },
  ],
}));

describe('PracticeCenter', () => {
  it('renders topic cards from curriculum', async () => {
    render(<PracticeCenter userId="user-1" />);
    expect(await screen.findByText('Functions')).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(<PracticeCenter userId="user-1" />);
    expect(screen.getByText('Quizzes Completed')).toBeInTheDocument();
    expect(screen.getByText('Total XP Earned')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
  });
});
