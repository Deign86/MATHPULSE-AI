// src/services/__tests__/apiService.test.ts
// Comprehensive tests for apiService — every endpoint, error scenario, validation, and fallback

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _setSleep, _resetSleep } from '../apiUtils';
import { apiService, ApiError, ApiTimeoutError, ApiValidationError } from '../apiService';
import type {
  ChatResponse,
  RiskPrediction,
  StudentRiskData,
  LearningPathRequest,
  LearningPathResponse,
  DailyInsightRequest,
  DailyInsightResponse,
  QuizGenerationRequest,
  QuizGenerationResponse,
  CalculatorResponse,
  StudentCompetencyResponse,
  QuizTopicsResponse,
} from '../apiService';

// ─── Test Data ────────────────────────────────────────────────

const MOCK_CHAT_RESPONSE: ChatResponse = {
  response: 'The answer is 42.',
};

const MOCK_RISK_PREDICTION: RiskPrediction = {
  riskLevel: 'Low',
  confidence: 0.87,
  analysis: {
    labels: ['low risk academically stable', 'medium academic risk', 'high risk of failing'],
    scores: [0.87, 0.09, 0.04],
  },
};

const MOCK_STUDENT_DATA: StudentRiskData = {
  engagementScore: 75,
  avgQuizScore: 80,
  attendance: 90,
  assignmentCompletion: 85,
};

const MOCK_LEARNING_PATH: LearningPathResponse = {
  learningPath: '1. Start with fractions\n2. Practice decimals',
};

const MOCK_INSIGHT: DailyInsightResponse = {
  insight: 'Class is performing well overall.',
};

const MOCK_QUIZ: QuizGenerationResponse = {
  questions: [
    {
      questionType: 'multiple_choice',
      question: 'What is 2+2?',
      correctAnswer: '4',
      options: ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
      bloomLevel: 'remember',
      difficulty: 'easy',
      topic: 'Arithmetic',
      points: 1,
      explanation: '2+2=4',
    },
  ],
  totalPoints: 1,
  metadata: {
    topicsCovered: { Arithmetic: 1 },
    difficultyBreakdown: { easy: 1 },
    bloomTaxonomyDistribution: { remember: 1 },
    questionTypeBreakdown: { multiple_choice: 1 },
    gradeLevel: 'Grade 7',
    totalQuestions: 1,
    includesGraphQuestions: false,
    supplementalPurpose: 'test',
    bloomTaxonomyRationale: 'test',
    recommendedTeacherActions: [],
  },
};

const MOCK_CALCULATOR: CalculatorResponse = {
  expression: '2+2',
  result: '4',
  steps: ['Input: 2+2', 'Result: 4'],
  simplified: null,
  latex: '4',
};

const MOCK_COMPETENCY: StudentCompetencyResponse = {
  studentId: 'u123',
  competencies: [],
  recommendedTopics: [],
  excludeTopics: [],
};

// ─── Helpers ──────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

function mockFetchSequence(responses: { body: unknown; status: number }[]) {
  const fn = vi.fn();
  responses.forEach(({ body, status }) => {
    fn.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : `Error ${status}`,
      headers: new Headers(),
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    });
  });
  return fn;
}

// ─── Tests ────────────────────────────────────────────────────

describe('apiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Eliminate retry backoff delay in tests
    _setSleep(() => Promise.resolve());
  });

  afterEach(() => {
    _resetSleep();
  });

  // ─── Health Check ─────────────────────────────────────────

  describe('health()', () => {
    it('returns health status on success', async () => {
      globalThis.fetch = mockFetch({ status: 'healthy' });
      const result = await apiService.health();
      expect(result.status).toBe('healthy');
    });

    it('throws ApiError on 500', async () => {
      globalThis.fetch = mockFetch({ detail: 'down' }, 500);
      await expect(apiService.health()).rejects.toThrow();
    });
  });

  // ─── Chat ─────────────────────────────────────────────────

  describe('chat()', () => {
    it('returns AI response on success', async () => {
      globalThis.fetch = mockFetch(MOCK_CHAT_RESPONSE);
      const result = await apiService.chat('What is 2+2?', []);
      expect(result.response).toBe('The answer is 42.');
    });

    it('sends message and history in request body', async () => {
      globalThis.fetch = mockFetch(MOCK_CHAT_RESPONSE);
      const history = [{ role: 'user' as const, content: 'Hi' }];
      await apiService.chat('What is 2+2?', history);

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.message).toBe('What is 2+2?');
      expect(body.history).toEqual(history);
    });

    it('throws ApiValidationError for empty message', async () => {
      await expect(apiService.chat('', [])).rejects.toThrow(ApiValidationError);
    });

    it('retries on 502 and succeeds', async () => {
      globalThis.fetch = mockFetchSequence([
        { body: { detail: 'bad gateway' }, status: 502 },
        { body: MOCK_CHAT_RESPONSE, status: 200 },
      ]);
      const result = await apiService.chat('What is 2+2?', []);
      expect(result.response).toBe('The answer is 42.');
    });

    it('throws non-retryable error on 400', async () => {
      globalThis.fetch = mockFetch({ detail: 'bad request' }, 400);
      await expect(apiService.chat('test', [])).rejects.toThrow(ApiError);
    });
  });

  describe('chatSafe()', () => {
    it('returns fallback when API fails', async () => {
      globalThis.fetch = mockFetch({ detail: 'error' }, 500);
      const result = await apiService.chatSafe('Hi', []);
      expect(result.fromFallback).toBe(true);
      expect(result.data.response).toContain('temporarily unavailable');
    });
  });

  // ─── Risk Prediction ─────────────────────────────────────

  describe('predictRisk()', () => {
    it('returns risk prediction on success', async () => {
      globalThis.fetch = mockFetch(MOCK_RISK_PREDICTION);
      const result = await apiService.predictRisk(MOCK_STUDENT_DATA);
      expect(result.riskLevel).toBe('Low');
      expect(result.confidence).toBe(0.87);
    });

    it('validates engagementScore range', async () => {
      await expect(
        apiService.predictRisk({ ...MOCK_STUDENT_DATA, engagementScore: -10 }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('validates avgQuizScore range', async () => {
      await expect(
        apiService.predictRisk({ ...MOCK_STUDENT_DATA, avgQuizScore: 150 }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('validates attendance range', async () => {
      await expect(
        apiService.predictRisk({ ...MOCK_STUDENT_DATA, attendance: 105 }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('validates assignmentCompletion range', async () => {
      await expect(
        apiService.predictRisk({ ...MOCK_STUDENT_DATA, assignmentCompletion: -1 }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('throws on invalid response shape', async () => {
      globalThis.fetch = mockFetch({ unexpected: 'data' });
      await expect(apiService.predictRisk(MOCK_STUDENT_DATA)).rejects.toThrow();
    });
  });

  describe('predictRiskSafe()', () => {
    it('returns fallback when API fails', async () => {
      globalThis.fetch = mockFetch({ detail: 'error' }, 500);
      const result = await apiService.predictRiskSafe(MOCK_STUDENT_DATA);
      expect(result.fromFallback).toBe(true);
      expect(result.data.confidence).toBe(0);
    });
  });

  describe('predictRiskBatch()', () => {
    it('throws validation error for empty array', async () => {
      await expect(apiService.predictRiskBatch([])).rejects.toThrow(ApiValidationError);
    });

    it('returns array of predictions', async () => {
      globalThis.fetch = mockFetch([MOCK_RISK_PREDICTION, MOCK_RISK_PREDICTION]);
      const result = await apiService.predictRiskBatch([MOCK_STUDENT_DATA, MOCK_STUDENT_DATA]);
      expect(result).toHaveLength(2);
    });
  });

  // ─── Learning Path ────────────────────────────────────────

  describe('getLearningPath()', () => {
    it('returns learning path on success', async () => {
      globalThis.fetch = mockFetch(MOCK_LEARNING_PATH);
      const result = await apiService.getLearningPath({
        weaknesses: ['fractions'],
        gradeLevel: 'Grade 7',
      });
      expect(result.learningPath).toContain('fractions');
    });

    it('throws validation error for empty weaknesses', async () => {
      await expect(
        apiService.getLearningPath({ weaknesses: [], gradeLevel: 'Grade 7' }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('throws validation error for missing gradeLevel', async () => {
      await expect(
        apiService.getLearningPath({ weaknesses: ['fractions'], gradeLevel: '' }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  describe('getLearningPathSafe()', () => {
    it('returns fallback when API fails', async () => {
      globalThis.fetch = mockFetch({ detail: 'error' }, 500);
      const result = await apiService.getLearningPathSafe({
        weaknesses: ['fractions'],
        gradeLevel: 'Grade 7',
      });
      expect(result.fromFallback).toBe(true);
      expect(result.data.learningPath).toContain('Unable to generate');
    });
  });

  // ─── Daily Insight ────────────────────────────────────────

  describe('getDailyInsight()', () => {
    const request: DailyInsightRequest = {
      students: [
        { name: 'Alice', engagementScore: 80, avgQuizScore: 75, attendance: 90, riskLevel: 'Low' },
      ],
    };

    it('returns insight on success', async () => {
      globalThis.fetch = mockFetch(MOCK_INSIGHT);
      const result = await apiService.getDailyInsight(request);
      expect(result.insight).toBeTruthy();
    });

    it('throws validation error for empty students array', async () => {
      await expect(
        apiService.getDailyInsight({ students: [] }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  // ─── Upload ───────────────────────────────────────────────

  describe('uploadClassRecords()', () => {
    it('throws validation error for empty file', async () => {
      const emptyFile = new File([], 'test.csv', { type: 'text/csv' });
      await expect(apiService.uploadClassRecords(emptyFile)).rejects.toThrow(ApiValidationError);
    });

    it('throws validation error for file exceeding 10MB', async () => {
      const bigContent = new Uint8Array(11 * 1024 * 1024);
      const bigFile = new File([bigContent], 'big.csv', { type: 'text/csv' });
      await expect(apiService.uploadClassRecords(bigFile)).rejects.toThrow(ApiValidationError);
    });

    it('uploads valid file successfully', async () => {
      const mockResponse = { success: true, students: [], columnMapping: {} };
      globalThis.fetch = mockFetch(mockResponse);
      const file = new File(['name,score\nAlice,90'], 'records.csv', { type: 'text/csv' });
      const result = await apiService.uploadClassRecords(file);
      expect(result.success).toBe(true);
    });
  });

  // ─── Quiz Generation ─────────────────────────────────────

  describe('generateQuiz()', () => {
    const quizRequest: QuizGenerationRequest = {
      topics: ['Linear Equations'],
      gradeLevel: 'Grade 8',
    };

    it('returns quiz on success', async () => {
      globalThis.fetch = mockFetch(MOCK_QUIZ);
      const result = await apiService.generateQuiz(quizRequest);
      expect(result.questions).toHaveLength(1);
      expect(result.totalPoints).toBe(1);
    });

    it('throws validation error for empty topics', async () => {
      await expect(
        apiService.generateQuiz({ topics: [], gradeLevel: 'Grade 8' }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('throws validation error for missing gradeLevel', async () => {
      await expect(
        apiService.generateQuiz({ topics: ['Algebra'], gradeLevel: '' }),
      ).rejects.toThrow(ApiValidationError);
    });

    it('throws on invalid response shape', async () => {
      globalThis.fetch = mockFetch({ garbage: true });
      await expect(apiService.generateQuiz(quizRequest)).rejects.toThrow();
    });
  });

  describe('previewQuiz()', () => {
    it('returns preview quiz on success', async () => {
      globalThis.fetch = mockFetch(MOCK_QUIZ);
      const result = await apiService.previewQuiz({
        topics: ['Algebra'],
        gradeLevel: 'Grade 8',
      });
      expect(result.questions).toBeDefined();
    });
  });

  describe('getQuizTopics()', () => {
    it('returns all topics without gradeLevel', async () => {
      const topics: QuizTopicsResponse = {
        allTopics: { 'Grade 7': { Algebra: ['Equations'] } },
      };
      globalThis.fetch = mockFetch(topics);
      const result = await apiService.getQuizTopics();
      expect(result.allTopics).toBeDefined();
    });

    it('returns topics for specific grade level', async () => {
      const topics: QuizTopicsResponse = {
        gradeLevel: 'Grade 7',
        topics: { Algebra: ['Equations'] },
      };
      globalThis.fetch = mockFetch(topics);
      const result = await apiService.getQuizTopics('Grade 7');
      expect(result.gradeLevel).toBe('Grade 7');
    });
  });

  // ─── Student Competency ───────────────────────────────────

  describe('getStudentCompetency()', () => {
    it('returns competencies on success', async () => {
      globalThis.fetch = mockFetch(MOCK_COMPETENCY);
      const result = await apiService.getStudentCompetency('u123');
      expect(result.studentId).toBe('u123');
    });

    it('throws validation error for empty studentId', async () => {
      await expect(apiService.getStudentCompetency('')).rejects.toThrow(ApiValidationError);
    });
  });

  // ─── Calculator ───────────────────────────────────────────

  describe('evaluateExpression()', () => {
    it('returns calculation result', async () => {
      globalThis.fetch = mockFetch(MOCK_CALCULATOR);
      const result = await apiService.evaluateExpression('2+2');
      expect(result.result).toBe('4');
    });

    it('throws validation error for empty expression', async () => {
      await expect(apiService.evaluateExpression('')).rejects.toThrow(ApiValidationError);
    });
  });

  describe('evaluateExpressionSafe()', () => {
    it('returns fallback on failure', async () => {
      globalThis.fetch = mockFetch({ detail: 'error' }, 500);
      const result = await apiService.evaluateExpressionSafe('bad');
      expect(result.fromFallback).toBe(true);
      expect(result.data.result).toContain('unavailable');
    });
  });

  // ─── Automation Endpoints ─────────────────────────────────

  describe('automationDiagnosticCompleted()', () => {
    it('sends payload and returns result', async () => {
      globalThis.fetch = mockFetch({ success: true });
      const result = await apiService.automationDiagnosticCompleted({
        studentId: 's1',
        results: [{ subject: 'math', score: 80 }],
      });
      expect(result).toEqual({ success: true });
    });

    it('throws validation error for missing studentId', async () => {
      await expect(
        apiService.automationDiagnosticCompleted({
          studentId: '',
          results: [{ subject: 'math', score: 80 }],
        }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  describe('automationQuizSubmitted()', () => {
    it('throws validation error for missing fields', async () => {
      await expect(
        apiService.automationQuizSubmitted({
          studentId: '',
          quizId: '',
          subject: '',
          score: 80,
          totalQuestions: 10,
          correctAnswers: 8,
          timeSpentSeconds: 300,
        }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  describe('automationStudentEnrolled()', () => {
    it('throws validation error for missing name/email', async () => {
      await expect(
        apiService.automationStudentEnrolled({
          studentId: 's1',
          name: '',
          email: '',
        }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  describe('automationDataImported()', () => {
    it('throws validation error for missing teacherId', async () => {
      await expect(
        apiService.automationDataImported({
          teacherId: '',
          students: [],
          columnMapping: {},
        }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  describe('automationContentUpdated()', () => {
    it('sends payload on valid request', async () => {
      globalThis.fetch = mockFetch({ success: true });
      const result = await apiService.automationContentUpdated({
        adminId: 'a1',
        action: 'create',
        contentType: 'lesson',
        contentId: 'l1',
      });
      expect(result).toEqual({ success: true });
    });

    it('throws validation error for missing fields', async () => {
      await expect(
        apiService.automationContentUpdated({
          adminId: '',
          action: '',
          contentType: '',
          contentId: '',
        }),
      ).rejects.toThrow(ApiValidationError);
    });
  });

  // ─── Error Scenarios (cross-cutting) ──────────────────────

  describe('Error handling across endpoints', () => {
    it.each([
      ['health', () => apiService.health()],
      ['chat', () => apiService.chat('Hi', [])],
      ['predictRisk', () => apiService.predictRisk(MOCK_STUDENT_DATA)],
      ['getLearningPath', () => apiService.getLearningPath({ weaknesses: ['x'], gradeLevel: 'G7' })],
      ['getDailyInsight', () => apiService.getDailyInsight({ students: [{ name: 'A', engagementScore: 1, avgQuizScore: 1, attendance: 1, riskLevel: 'Low' }] })],
      ['getQuizTopics', () => apiService.getQuizTopics()],
    ] as [string, () => Promise<unknown>][])('%s throws on network error', async (_name, fn) => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(fn()).rejects.toThrow();
    });
  });
});
