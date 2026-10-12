/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as extraHints from '../hooks/useExtraHints';
import type { AIQuizQuestion } from '../types/models';
import QuizExperience, { type Quiz } from './QuizExperience';

const QUIZ_TITLE = 'Represent business transactions and financial goals using variables and equations; Analyze financial options using ratio, percent change, and margin reasoning';

const question = (id: string, text: string, correct: string, wrong: [string, string], topic: string): AIQuizQuestion => ({
  id, questionType: 'multiple_choice', question: text,
  options: [correct, wrong[0], wrong[1]], correctAnswer: correct, bloomLevel: 'apply', difficulty: 'medium',
  topic, subject: 'Math', points: 1, explanation: `${text} = ${correct}`,
});

const reviewQuiz: Quiz = {
  id: 'review-test', title: QUIZ_TITLE, subject: 'Math', difficulty: 'Medium',
  questions: 3, duration: '5', xpReward: 25, type: 'practice', completed: false, locked: false,
  source: 'ai_generated', loadedQuestions: [
    question('q1', '2 + 2', '4', ['3', '5'], QUIZ_TITLE),
    question('q2', '3 + 3', '6', ['5', '7'], QUIZ_TITLE),
    question('q3', '4 + 4', '8', ['7', '9'], 'Percent change'),
  ],
};
const getCanvasContext = HTMLCanvasElement.prototype.getContext;

const option = (name: string) => screen.getByRole('button', { name });
const wrongOptions = () => screen.getAllByRole('button').filter((button) => button.className.includes('border-rose-400'));
const crossIcons = () => screen.getAllByRole('button').flatMap((button) => [...button.querySelectorAll('svg.text-rose-500')]);
const expectOnlyWrongPick = (name: string) => {
  expect(wrongOptions()).toHaveLength(1);
  expect(wrongOptions()[0]).toBe(option(name));
  expect(crossIcons()).toHaveLength(1);
  expect(option(name).querySelector('svg.text-rose-500')).not.toBeNull();
};
const answer = (name: string) => fireEvent.click(option(name));
const nextQuestion = () => fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
const previousQuestion = () => fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
const useHint = () => fireEvent.click(screen.getByRole('button', { name: /hint/i }));

describe('QuizExperience answer review', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({
      extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false,
    });
  });

  afterEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = getCanvasContext;
    vi.restoreAllMocks();
  });

  it('marks only the learner\'s own wrong pick as wrong, never the previous question\'s pick', () => {
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    answer('3');
    nextQuestion();
    answer('7');

    expectOnlyWrongPick('7');
    expect(option('5').className).not.toContain('border-rose-400');
    expect(option('6').className).toContain('border-emerald-400');
  });

  it('shows the earlier question\'s own wrong pick when reviewing it with the back arrow', () => {
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    answer('3');
    nextQuestion();
    answer('7');
    previousQuestion();

    expect(screen.getByText('Q1 of 3')).toBeInTheDocument();
    expectOnlyWrongPick('3');
    expect(option('4').className).toContain('border-emerald-400');
  });

  it('shows the hints used on an earlier question when reviewing it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    useHint();
    answer('5');
    nextQuestion();
    previousQuestion();

    expect(option('3').className).toContain('line-through');
    expectOnlyWrongPick('5');
  });

  it('does not credit the next question\'s answer to a question skipped after using every hint', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    useHint();
    useHint();
    nextQuestion();
    answer('7');
    previousQuestion();

    expect(screen.getByText('Q1 of 3')).toBeInTheDocument();
    expect(wrongOptions()).toHaveLength(0);
    expect(crossIcons()).toHaveLength(0);
  });

  it('does not repeat the quiz title as the explanation header on every question', () => {
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    answer('3');
    expect(screen.queryByRole('heading', { name: QUIZ_TITLE })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Question 1 Explanation' })).toBeInTheDocument();

    nextQuestion();
    answer('7');
    expect(screen.queryByRole('heading', { name: QUIZ_TITLE })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Question 2 Explanation' })).toBeInTheDocument();
    expect(screen.getByText('3 + 3 = 6')).toBeInTheDocument();
  });

  it('shows a question\'s own topic under the explanation header when it differs from the quiz title', () => {
    render(<QuizExperience quiz={reviewQuiz} previewMode onClose={vi.fn()} />);

    answer('4');
    nextQuestion();
    answer('6');
    nextQuestion();
    answer('8');

    expect(screen.getByRole('heading', { name: 'Question 3 Explanation' })).toBeInTheDocument();
    expect(screen.getByText('Percent change')).toBeInTheDocument();
  });
});
