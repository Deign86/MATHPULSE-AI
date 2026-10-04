/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as authNs from '../contexts/AuthContext';
import * as practiceServiceNs from '../services/practiceService';
import type { PracticeQuestion } from '../services/practiceService';
import PracticeCenter from './PracticeCenter';

afterEach(cleanup);

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

const generatePracticeSessionSpy = vi.spyOn(practiceServiceNs, 'generatePracticeSession').mockResolvedValue({
  session_id: 'test-session',
  questions: [],
  generated_at: '2026-01-01T00:00:00Z',
});

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

  it('sends the selected topic contract and hands mapped questions to the quiz callback', async () => {
    const generatedQuestion: PracticeQuestion = {
      id: 'question-1',
      question: 'What is f(2) when f(x) = x + 3?',
      options: ['4', '5', '6', '7'],
      correct_index: 1,
      explanation: 'Add three to two.',
      competency: 'Functions as Mathematical Models',
      difficulty: 'Mastery',
      bloomsLevel: 'apply',
    };
    const onStartQuiz = vi.fn();
    generatePracticeSessionSpy.mockResolvedValue({
      session_id: 'session-42',
      questions: [generatedQuestion],
      generated_at: '2026-10-04T00:00:00Z',
    });
    render(<PracticeCenter userId="student-7" onStartQuiz={onStartQuiz} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Hard' }));
    fireEvent.click(screen.getByText('Functions as Mathematical Models'));

    await waitFor(() => expect(onStartQuiz).toHaveBeenCalledTimes(1));
    expect(generatePracticeSessionSpy).toHaveBeenCalledWith({
      userId: 'student-7',
      subject: 'General Mathematics',
      competency: 'Functions as Mathematical Models',
      difficulty: 'Mastery',
      count: 5,
    });
    expect(onStartQuiz).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-42',
      subject: 'General Mathematics',
      difficulty: 'Hard',
      questions: 1,
      loadedQuestions: [{
        id: 'question-1',
        questionType: 'multiple_choice',
        question: generatedQuestion.question,
        options: generatedQuestion.options,
        correctAnswer: '5',
        bloomLevel: 'apply',
        difficulty: 'hard',
        topic: 'Functions as Mathematical Models',
        subject: 'General Mathematics',
        points: 10,
        explanation: generatedQuestion.explanation,
      }],
    }));
  });

  it('suppresses duplicate generation while pending and allows retry after rejection', async () => {
    generatePracticeSessionSpy.mockClear();
    let rejectGeneration: (reason: Error) => void = () => {};
    generatePracticeSessionSpy.mockReturnValue(new Promise((_, reject) => {
      rejectGeneration = reject;
    }));
    const onStartQuiz = vi.fn();
    render(<PracticeCenter userId="student-8" onStartQuiz={onStartQuiz} />);
    const topicCard = await screen.findByText('Functions as Mathematical Models');

    fireEvent.click(topicCard);
    await waitFor(() => expect(generatePracticeSessionSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(topicCard);
    expect(generatePracticeSessionSpy).toHaveBeenCalledTimes(1);

    rejectGeneration(new Error('generation failed'));
    await waitFor(() => expect(screen.queryByText('Generating Quiz...')).not.toBeInTheDocument());
    expect(onStartQuiz).not.toHaveBeenCalled();

    generatePracticeSessionSpy.mockResolvedValue({
      session_id: 'retry-session',
      questions: [],
      generated_at: '2026-10-04T00:00:00Z',
    });
    fireEvent.click(topicCard);
    await waitFor(() => expect(generatePracticeSessionSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onStartQuiz).toHaveBeenCalledTimes(1));
  });
});
