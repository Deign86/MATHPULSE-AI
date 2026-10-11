/** @vitest-environment jsdom */
/**
 * Regression: model-generated hints, explanations and chat replies must render
 * as formatted text (bold, typeset math), never as raw `**`, `\(..\)` or
 * `<think>` markup, everywhere they are shown outside the main chat page.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as extraHints from '../../hooks/useExtraHints';
import type { AIQuizQuestion } from '../../types/models';
import type { Question } from '@/types/curriculum';
import QuizExperience, { type Quiz } from '../QuizExperience';
import TryItYourselfEngine from '../TryItYourselfEngine';

vi.mock('../../services/tryItYourselfService', () => ({
  resolveQuestion: vi.fn().mockResolvedValue({}),
  useHint: vi.fn().mockResolvedValue({}),
  completeSession: vi.fn().mockResolvedValue({}),
  fetchShadowRetries: vi.fn().mockResolvedValue({ questions: [] }),
}));

const RAW_MARKUP = /\*\*|\\\(|\\\[|<think>|\\n/;
const getCanvasContext = HTMLCanvasElement.prototype.getContext;

describe('AI text formatting regression', () => {
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
    vi.useRealTimers();
  });

  it('QuizExperience renders a markdown + TeX explanation after answering', async () => {
    vi.useFakeTimers();
    const q: AIQuizQuestion = {
      id: 'q1', questionType: 'multiple_choice', question: 'Find the **slope** of \\(y = 2x\\)',
      options: ['2', '1', '0'], correctAnswer: '2', bloomLevel: 'remember', difficulty: 'easy',
      topic: 'Linear', subject: 'Math', points: 1,
      explanation: 'The **coefficient** of \\(x\\) is the slope, so \\(m = 2\\).',
    };
    const quiz: Quiz = {
      id: 'fmt', title: 'Format', subject: 'Math', difficulty: 'Easy', questions: 1, duration: '1',
      xpReward: 5, type: 'challenge', completed: false, locked: false, source: 'ai_generated', loadedQuestions: [q],
    };
    render(<QuizExperience quiz={quiz} previewMode onClose={vi.fn()} />);

    // Question text goes through MathText: bold rendered, \(..\) typeset.
    expect(screen.getByText('slope').tagName).toBe('STRONG');

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });

    expect(screen.getByText('coefficient').tagName).toBe('STRONG');
    // Quiz UI mounts in a portal, so inspect the whole document.
    expect(document.body.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent ?? '').not.toMatch(RAW_MARKUP);
  });

  it('TryItYourselfEngine renders hints and the explanation as formatted text', async () => {
    const question: Question = {
      id: 1, type: 'multiple-choice', question: 'Evaluate \\(2^3\\)', options: ['6', '8', '9'],
      correctAnswer: '8',
      hints: ['<think>plan</think>Multiply **2** by itself three times', 'That is \\(2 \\times 2 \\times 2\\)'],
      explanation: '**Answer:** \\(2^3 = 8\\)\\nCount the factors.',
    };
    render(
      <TryItYourselfEngine
        questions={[question]} lessonTitle="Exponents" subject="General Mathematics" sessionId="s1"
        onComplete={vi.fn()} onBack={vi.fn()}
      />,
    );

    const useHintButton = () => document.querySelector<HTMLButtonElement>('button[aria-label="Use hint"]')!;
    await act(async () => { fireEvent.click(useHintButton()); });
    expect(screen.getByText('2', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText(/plan/)).toBeNull();

    await act(async () => { fireEvent.click(useHintButton()); });
    expect(document.body.querySelector('.katex')).not.toBeNull();

    const answer = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === '8')!;
    await act(async () => { fireEvent.click(answer); });
    const explainButton = await screen.findByRole('button', { name: 'Explain question' });
    await act(async () => { fireEvent.click(explainButton); });
    expect(await screen.findByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Answer:').tagName).toBe('STRONG');
    expect(screen.getByText(/Count the factors/)).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(RAW_MARKUP);
  });
});
