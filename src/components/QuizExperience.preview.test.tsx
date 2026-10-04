/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as automationService from '../services/automationService';
import * as quizService from '../services/quizService';
import * as progressService from '../services/progressService';
import * as extraHints from '../hooks/useExtraHints';
import QuizExperience, { type Quiz } from './QuizExperience';

const previewQuiz: Quiz = {
  id: 'preview-test', title: 'Preview test', subject: 'Math', difficulty: 'Medium',
  questions: 1, duration: '1', xpReward: 25, type: 'challenge', completed: false, locked: false,
  source: 'ai_generated', loadedQuestions: [{
    id: 'question-1', questionType: 'multiple_choice', question: 'What is 2 + 2?',
    options: ['4', '3'], correctAnswer: '4', bloomLevel: 'remember', difficulty: 'easy',
    topic: 'Addition', subject: 'Math', points: 1, explanation: '2 + 2 = 4',
  }],
};
const assignedQuiz: Quiz = { ...previewQuiz, id: 'assigned-test', generatedQuizId: 'generated-assignment' };

describe('QuizExperience preview mode', () => {
  beforeEach(() => {
    vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({
      extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false,
    });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it('keeps normal completion and retake local', async () => {
    const submit = vi.spyOn(automationService, 'triggerQuizSubmitted').mockResolvedValue({
      success: true, event: 'quiz_submitted', lrn: 'student-1', message: 'test', remedialQuizzesCreated: 0, notifications: [],
    });
    const saveResults = vi.spyOn(quizService, 'saveQuizResults').mockResolvedValue(undefined);
    const saveProgress = vi.spyOn(progressService, 'recordPracticeQuiz').mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onQuizEnd = vi.fn();
    vi.useFakeTimers();
    const { unmount } = render(
      <QuizExperience quiz={previewQuiz} previewMode studentId="student-1" onComplete={onComplete} onQuizEnd={onQuizEnd} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(screen.getByText(/Quiz Complete/)).toBeInTheDocument();
    expect(screen.getAllByText('+0').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'RETAKE QUIZ' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(screen.getAllByText(/Quiz Complete/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'FINISH' }));

    expect(submit).not.toHaveBeenCalled();
    expect(saveResults).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onQuizEnd).not.toHaveBeenCalled();
    unmount();
    vi.useRealTimers();
  });

  it('holds an incorrect answer on screen with its explanation instead of auto-advancing (STU-009)', async () => {
    const onComplete = vi.fn();
    const onQuizEnd = vi.fn();
    vi.useFakeTimers();
    const { unmount } = render(
      <QuizExperience quiz={previewQuiz} previewMode studentId="student-1" onComplete={onComplete} onQuizEnd={onQuizEnd} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText('2 + 2 = 4')).toBeInTheDocument();
    expect(screen.queryByText(/Quiz Complete/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    unmount();
    vi.useRealTimers();
  });

  it('keeps timeout local with no callbacks or persistence', async () => {
    const submit = vi.spyOn(automationService, 'triggerQuizSubmitted');
    const saveResults = vi.spyOn(quizService, 'saveQuizResults');
    const saveProgress = vi.spyOn(progressService, 'recordPracticeQuiz');
    const onComplete = vi.fn();
    const onQuizEnd = vi.fn();
    vi.useFakeTimers();
    render(<QuizExperience quiz={previewQuiz} previewMode studentId="student-1" onComplete={onComplete} onQuizEnd={onQuizEnd} onClose={vi.fn()} />);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText(/Quiz Complete/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'FINISH' }));
    expect(submit).not.toHaveBeenCalled();
    expect(saveResults).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onQuizEnd).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not invoke end callbacks when leaving before completion', () => {
    const onClose = vi.fn();
    const onQuizEnd = vi.fn();
    render(<QuizExperience quiz={previewQuiz} previewMode onClose={onClose} onQuizEnd={onQuizEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exit quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave Quiz' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onQuizEnd).not.toHaveBeenCalled();
  });

  it('does not persist or submit an ordinary-mode early abort', () => {
    vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
    const submit = vi.spyOn(automationService, 'triggerQuizSubmitted');
    const saveResults = vi.spyOn(quizService, 'saveQuizResults');
    const saveProgress = vi.spyOn(progressService, 'recordPracticeQuiz');
    const onClose = vi.fn();
    const onQuizEnd = vi.fn();
    render(<QuizExperience quiz={assignedQuiz} studentId="student-1" onClose={onClose} onQuizEnd={onQuizEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exit quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave Quiz' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onQuizEnd).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(saveResults).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
  });

  it('finalizes once after completion even if the old countdown would have expired', async () => {
    vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
    const submit = vi.spyOn(automationService, 'triggerQuizSubmitted').mockResolvedValue({
      success: true, event: 'quiz_submitted', lrn: 'student-1', message: 'test', remedialQuizzesCreated: 0, notifications: [],
    });
    const saveResults = vi.spyOn(quizService, 'saveQuizResults').mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onQuizEnd = vi.fn();
    vi.useFakeTimers();
    render(<QuizExperience quiz={assignedQuiz} studentId="student-1" onComplete={onComplete} onQuizEnd={onQuizEnd} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(screen.getByText(/Quiz Complete/)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(submit).toHaveBeenCalledOnce();
    expect(saveResults).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'FINISH' }));
    expect(onQuizEnd).toHaveBeenCalledOnce();
  });

  it('keeps retakes of completed assignments local-only', async () => {
    vi.spyOn(extraHints, 'useExtraHints').mockReturnValue({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
    const submit = vi.spyOn(automationService, 'triggerQuizSubmitted').mockResolvedValue({
      success: true, event: 'quiz_submitted', lrn: 'student-1', message: 'test', remedialQuizzesCreated: 0, notifications: [],
    });
    const saveResults = vi.spyOn(quizService, 'saveQuizResults').mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onQuizEnd = vi.fn();
    vi.useFakeTimers();
    render(<QuizExperience quiz={assignedQuiz} studentId="student-1" onComplete={onComplete} onQuizEnd={onQuizEnd} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(submit).toHaveBeenCalledOnce();
    expect(saveResults).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'RETAKE QUIZ' }));
    expect(onQuizEnd).toHaveBeenCalledOnce();
    const completedAttempt = onQuizEnd.mock.calls[0][1];
    expect(completedAttempt).toHaveLength(1);
    expect(completedAttempt[0]).toMatchObject({ questionId: 'question-1', correct: true });
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await act(async () => { vi.advanceTimersByTime(2_200); });
    expect(submit).toHaveBeenCalledOnce();
    expect(saveResults).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getAllByText('+0').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'FINISH' }));
    expect(onQuizEnd).toHaveBeenCalledOnce();
  });
});
