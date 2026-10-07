/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as authNs from '../contexts/AuthContext';
import * as practiceServiceNs from '../services/practiceService';
import PracticeCenter from './PracticeCenter';

// Auth seam: spy on the real hook so PracticeCenter sees a signed-in student.
vi.spyOn(authNs, 'useAuth').mockReturnValue({
  currentUser: null,
  userProfile: null,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => {},
});

vi.spyOn(practiceServiceNs, 'fetchPracticeStats').mockResolvedValue({
  quizzesCompleted: 0,
  totalXPEarned: 0,
  averageScore: 0,
  recentSessions: [],
  competencyBreakdown: {},
});

vi.spyOn(practiceServiceNs, 'generatePracticeSession').mockResolvedValue({
  session_id: 'test-session',
  questions: [],
  generated_at: '2026-01-01T00:00:00Z',
});

afterEach(cleanup);

describe('PracticeCenter', () => {
  it('renders topic cards from curriculum', async () => {
    render(<PracticeCenter userId="user-1" />);
    expect(await screen.findByText('Functions as Mathematical Models')).toBeInTheDocument();
  });

  it('renders stats cards', async () => {
    render(<PracticeCenter userId="user-1" />);
    expect((await screen.findAllByText('Quizzes Completed')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Total XP Earned')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Average Score')).length).toBeGreaterThan(0);
  });

  it('explains what Recommended means when there are no diagnostic focus topics', async () => {
    render(<PracticeCenter userId="user-1" atRiskTopics={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Recommended' }));

    expect(await screen.findByText('No recommended practice topics yet')).toBeInTheDocument();
    expect(screen.getByText(/recommended practice topics come from your diagnostic results/i)).toBeInTheDocument();
    expect(screen.getByText(/teacher-assigned quiz/i)).toBeInTheDocument();
  });
});
