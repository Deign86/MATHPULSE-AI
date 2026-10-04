/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as tryItYourselfService from '../services/tryItYourselfService';
import type { Question } from '../types/curriculum';
import TryItYourselfEngine from './TryItYourselfEngine';

afterEach(() => {
  cleanup();
  resolveQuestionSpy.mockReset();
  completeSessionSpy.mockReset();
});

const resolveQuestionSpy = vi.spyOn(tryItYourselfService, 'resolveQuestion').mockResolvedValue({
  xpAwarded: 10,
  status: 'resolved',
  struggleFlag: false,
});
const completeSessionSpy = vi.spyOn(tryItYourselfService, 'completeSession').mockResolvedValue({
  totalXP: 99,
  questionsResolved: 2,
  questionsRevealed: 1,
  averageAttempts: 2,
  struggleTopics: [],
});

const questions: Question[] = [
  {
    id: 101,
    type: 'multiple-choice',
    question: 'Which value solves 2x = 8?',
    options: ['2', '3', '4', '5'],
    correctAnswer: '4',
    explanation: 'Divide both sides by two.',
  },
  {
    id: 102,
    type: 'multiple-choice',
    question: 'What is 3 + 4?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    explanation: 'Three plus four is seven.',
  },
];

describe('TryItYourselfEngine', () => {
  it('keeps wrong answers retryable, locks reveal until two attempts, then completes with server XP', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    resolveQuestionSpy.mockResolvedValue({ xpAwarded: 10, status: 'resolved', struggleFlag: false });
    completeSessionSpy.mockResolvedValue({
      totalXP: 99,
      questionsResolved: 2,
      questionsRevealed: 1,
      averageAttempts: 2,
      struggleTopics: [],
    });
    const onComplete = vi.fn();
    const { container } = render(
      <TryItYourselfEngine
        questions={questions}
        lessonTitle="Linear equations"
        subject="General Mathematics"
        sessionId="session-21"
        userId="student-21"
        onComplete={onComplete}
        onBack={vi.fn()}
      />,
    );

    const revealButton = screen.getByRole('button', { name: 'Reveal answer' });
    expect(revealButton).toBeDisabled();
    const progressDot = container.querySelector('header div.h-1\\.5');
    expect(progressDot).not.toBeNull();
    expect(progressDot).toHaveClass('bg-white/20');

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('button', { name: '2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeDisabled();
    expect(progressDot).toHaveClass('bg-white/20');
    expect(resolveQuestionSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));

    await waitFor(() => expect(progressDot).toHaveClass('bg-white'));
    expect(resolveQuestionSpy).toHaveBeenCalledWith({
      userId: 'student-21',
      sessionId: 'session-21',
      questionId: '101',
      resolution: 'revealed',
      attempts: 2,
      hintsUsed: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    fireEvent.click(screen.getByRole('button', { name: '7' }));
    await waitFor(() => expect(resolveQuestionSpy).toHaveBeenCalledWith({
      userId: 'student-21',
      sessionId: 'session-21',
      questionId: '102',
      resolution: 'correct',
      attempts: 1,
      hintsUsed: 0,
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    fireEvent.click(await screen.findByRole('button', { name: 'FINISH' }));
    await waitFor(() => expect(completeSessionSpy).toHaveBeenCalledWith({
      userId: 'student-21',
      sessionId: 'session-21',
      questionResults: [
        { questionId: '101', resolution: 'revealed', attempts: 2, hintsUsed: 0, topic: 'Linear equations' },
        { questionId: '102', resolution: 'correct', attempts: 1, hintsUsed: 0, topic: 'Linear equations' },
      ],
    }));
    expect(onComplete).toHaveBeenCalledWith(50, 99);
  });
});
