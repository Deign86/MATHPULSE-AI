// @ts-nocheck — vitest types not installed in mobile project

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock references ─────────────────────────────────────────────────

const { mockGetDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  doc: vi.fn(() => 'mocked-doc-ref'),
  getDoc: mockGetDoc,
}));

import { getQuizDetails } from '../services/quizService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockSnapshot(exists, data) {
  return {
    exists: () => exists,
    id: 'quiz-123',
    data: () => data ?? null,
  };
}

const mockQuizData = {
  title: 'Algebra Fundamentals',
  gradeLevel: 'Grade 11',
  questions: [
    {
      id: 'q1',
      questionType: 'multiple_choice',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      bloomLevel: 'remember',
      difficulty: 'easy',
      topic: 'Algebra',
      subject: 'Mathematics',
      points: 5,
      explanation: '2 + 2 = 4',
    },
    {
      id: 'q2',
      questionType: 'multiple_choice',
      question: 'Solve for x: x + 3 = 7',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      bloomLevel: 'understand',
      difficulty: 'easy',
      topic: 'Algebra',
      subject: 'Mathematics',
      points: 5,
      explanation: 'x = 7 - 3 = 4',
    },
  ],
  totalPoints: 10,
  metadata: {
    topicsCovered: ['Algebra'],
    difficultyBreakdown: { easy: 2, medium: 0, hard: 0 },
    bloomDistribution: { remember: 1, understand: 1 },
    questionTypeBreakdown: { multiple_choice: 2 },
    supplementalPurpose: 'Practice',
    recommendedTeacherActions: [],
    generatedAt: '2026-06-01T00:00:00Z',
    generatedBy: 'teacher_generated',
  },
  status: 'published',
  source: 'teacher_generated',
};

// ─── getQuizDetails ─────────────────────────────────────────────────────────

describe('getQuizDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full quiz object when document exists', async () => {
    mockGetDoc.mockResolvedValue(createMockSnapshot(true, mockQuizData));

    const quiz = await getQuizDetails('quiz-123');

    expect(quiz.id).toBe('quiz-123');
    expect(quiz.title).toBe('Algebra Fundamentals');
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0].question).toBe('What is 2 + 2?');
    expect(quiz.questions[0].options).toEqual(['3', '4', '5', '6']);
    expect(quiz.questions[0].correctAnswer).toBe('4');
    expect(quiz.questions[0].points).toBe(5);
    expect(quiz.totalPoints).toBe(10);
  });

  it('throws when quiz document does not exist', async () => {
    mockGetDoc.mockResolvedValue(createMockSnapshot(false));

    await expect(getQuizDetails('nonexistent-id')).rejects.toThrow(
      'Quiz with id "nonexistent-id" not found',
    );
  });

  it('calls getDoc with the doc ref from doc()', async () => {
    mockGetDoc.mockResolvedValue(createMockSnapshot(true, mockQuizData));

    await getQuizDetails('some-quiz-id');

    expect(mockGetDoc).toHaveBeenCalledWith('mocked-doc-ref');
  });
});
