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

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('PracticeCenter', () => {
  it('focuses on the practice topic hint left by Grades or the Diagnostic Breakdown', async () => {
    sessionStorage.setItem('mathpulse_practice_topic', 'Functions');
    render(<PracticeCenter userId="user-1" />);

    expect(await screen.findByText('Patterns and Real-Life Relationships')).toBeInTheDocument();
    expect(screen.queryByText('Systems of Linear Equations and Matrices')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('mathpulse_practice_topic')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear focus on Functions' }));
    expect(await screen.findByText('Systems of Linear Equations and Matrices')).toBeInTheDocument();
  });

  it('preselects the subject when the hint names one', async () => {
    sessionStorage.setItem('mathpulse_practice_subject', 'General Mathematics');
    render(<PracticeCenter userId="user-1" />);

    expect(await screen.findByText('Functions as Mathematical Models')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('General Mathematics');
    expect(screen.queryByRole('button', { name: /Clear focus/ })).not.toBeInTheDocument();
  });

  it('ignores a hint that matches no topic', async () => {
    sessionStorage.setItem('mathpulse_practice_topic', 'Review your notes before the next quiz');
    render(<PracticeCenter userId="user-1" />);

    expect(await screen.findByText('Functions as Mathematical Models')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear focus/ })).not.toBeInTheDocument();
  });

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

  it.each([
    ['BusinessMath', 'Simple and Compound Interest'],
    ['Logic', 'Truth Values and Truth Tables'],
    ['Functions', 'Patterns and Real-Life Relationships'],
  ])('shows practice topics in the diagnostic %s focus area', async (focus, title) => {
    render(<PracticeCenter userId="user-1" atRiskTopics={[focus]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Recommended' }));

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByText('No recommended practice topics yet')).not.toBeInTheDocument();
    expect(screen.queryByText('Systems of Linear Equations and Matrices')).not.toBeInTheDocument();
  });
});
