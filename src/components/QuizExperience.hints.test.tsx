/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as extraHints from '../hooks/useExtraHints';
import type { AIQuizQuestion } from '../types/models';
import QuizExperience, { type Quiz } from './QuizExperience';

const threeChoiceQuestion = (id: string, question: string, correct: string, wrong: [string, string]): AIQuizQuestion => ({
  id, questionType: 'multiple_choice', question,
  options: [correct, wrong[0], wrong[1]], correctAnswer: correct, bloomLevel: 'remember', difficulty: 'easy',
  topic: 'Addition', subject: 'Math', points: 1, explanation: `${question} = ${correct}`,
});

const threeQuestionQuiz: Quiz = {
  id: 'hints-test', title: 'Hints test', subject: 'Math', difficulty: 'Medium',
  questions: 3, duration: '1', xpReward: 25, type: 'challenge', completed: false, locked: false,
  source: 'ai_generated', loadedQuestions: [
    threeChoiceQuestion('q1', '2 + 2', '4', ['3', '5']),
    threeChoiceQuestion('q2', '3 + 3', '6', ['5', '7']),
    threeChoiceQuestion('q3', '4 + 4', '8', ['7', '9']),
  ],
};
const getCanvasContext = HTMLCanvasElement.prototype.getContext;

const mockExtraHints = (totalHintsAvailable: number) =>
  vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({
    extraHintsEnabled: totalHintsAvailable > 0, hintTokens: 0, totalHintsAvailable, loading: false,
  });

const hintButton = () => screen.getByRole('button', { name: /hint/i });
const useHint = () => fireEvent.click(hintButton());
const nextQuestion = () => fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));

describe('QuizExperience hints and review navigation', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = getCanvasContext;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('disables Hint once the five local keys are spent and no extra hints exist', () => {
    mockExtraHints(0);
    render(<QuizExperience quiz={threeQuestionQuiz} previewMode onClose={vi.fn()} />);

    useHint(); useHint(); nextQuestion();
    useHint(); useHint(); nextQuestion();
    useHint();

    expect(hintButton()).toBeDisabled();
  });

  it('spends an extra hint once local keys run out', () => {
    mockExtraHints(1);
    render(<QuizExperience quiz={threeQuestionQuiz} previewMode onClose={vi.fn()} />);

    useHint(); useHint(); nextQuestion();
    useHint(); useHint(); nextQuestion();
    useHint();
    expect(hintButton()).toBeEnabled();
    useHint();

    expect(screen.getByRole('button', { name: '7' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '9' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hint/i })).not.toBeInTheDocument();
  });

  it('offers Back to Current Question while reviewing an earlier question', async () => {
    mockExtraHints(0);
    vi.useFakeTimers();
    render(<QuizExperience quiz={threeQuestionQuiz} previewMode onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    nextQuestion();
    expect(screen.getByText('Q2 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(screen.getByText('Q1 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Next Question|View Results)$/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Current Question' }));
    expect(screen.getByText('Q2 of 3')).toBeInTheDocument();
    expect(screen.queryByText('Question 2 Explanation')).not.toBeInTheDocument();
  });
});
