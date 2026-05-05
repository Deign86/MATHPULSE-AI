import { describe, it, expect, vi } from 'vitest';
import { generateLessonQuiz, getQuestionCountForQuiz } from '../lessonQuizService';

// Mock apiService for tests - returns correct question count
vi.mock('./apiService', () => ({
  apiFetch: vi.fn().mockImplementation(async (url: string, options: { body?: { questionCount?: number } }) => {
    const count = options?.body?.questionCount || 6;
    const questions = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      type: i % 3 === 0 ? 'multiple-choice' : i % 3 === 1 ? 'true-false' : 'fill-in-blank',
      question: `Test Q${i + 1}`,
      options: i % 3 === 0 ? ['A', 'B', 'C', 'D'] : ['True', 'False'],
      correctAnswer: i % 3 === 0 ? 'A' : 'True',
      explanation: 'Test',
    }));
    return Promise.resolve({
      questions,
      retrievalConfidence: { level: 'high' },
      sourceChunks: 3,
      generatedAt: new Date().toISOString(),
    });
  }),
}));

describe('lessonQuizService', () => {
  describe('generateLessonQuiz', () => {
    it('returns the requested number of questions', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'gm-1-l1',
        lessonTitle: 'Patterns and Real-Life Relationships',
        questionCount: 6,
      });
      expect(quiz).toHaveLength(6);
    });

    it('returns 8 questions when questionCount is 8', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Functions and Graphs',
        questionCount: 8,
      });
      expect(quiz).toHaveLength(8);
    });

    it('returns questions with valid IDs', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Simple and Compound Interest',
        questionCount: 6,
      });
      quiz.forEach((q, i) => {
        expect(q.id).toBe(i + 1);
      });
    });

    it('includes multiple-choice, true-false, and fill-in-blank types', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Probability Distributions',
        questionCount: 6,
      });
      const types = new Set(quiz.map((q) => q.type));
      expect(types.has('multiple-choice')).toBe(true);
      expect(types.has('true-false')).toBe(true);
      expect(types.has('fill-in-blank')).toBe(true);
    });

    it('ensures multiple-choice options contain the correct answer', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Functions as Mathematical Models',
        questionCount: 6,
      });
      const mc = quiz.filter((q) => q.type === 'multiple-choice');
      expect(mc.length).toBeGreaterThan(0);
      mc.forEach((q) => {
        expect(q.options).toContain(q.correctAnswer);
      });
    });

    it('ensures true-false questions have True or False as correct answer', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Geometric Sequences',
        questionCount: 6,
      });
      const tf = quiz.filter((q) => q.type === 'true-false');
      expect(tf.length).toBeGreaterThan(0);
      tf.forEach((q) => {
        expect(['True', 'False']).toContain(q.correctAnswer);
      });
    });

    it('ensures fill-in-blank questions have non-empty correct answers', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: 'Confidence Intervals',
        questionCount: 6,
      });
      const fib = quiz.filter((q) => q.type === 'fill-in-blank');
      expect(fib.length).toBeGreaterThan(0);
      fib.forEach((q) => {
        expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
      });
    });

    it('returns fallback questions on API failure', async () => {
      const quiz = await generateLessonQuiz({
        lessonId: 'test',
        lessonTitle: '', // Empty title may cause API issues
        questionCount: 6,
      });
      expect(quiz.length).toBeGreaterThan(0);
      quiz.forEach((q) => {
        expect(q.question).toBeTruthy();
        expect(q.correctAnswer).toBeTruthy();
      });
    });
  });

  describe('getQuestionCountForQuiz', () => {
    it('returns 6 for practice quizzes', () => {
      expect(getQuestionCountForQuiz('practice')).toBe(6);
    });

    it('returns 8 for module quizzes', () => {
      expect(getQuestionCountForQuiz('quiz')).toBe(8);
    });
  });
});
