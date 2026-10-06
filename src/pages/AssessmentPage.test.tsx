// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AssessmentPage from './AssessmentPage';
import * as diagnosticService from '../services/diagnosticService';
import type { DiagnosticQuestion } from '../services/diagnosticService';

const mockQuestions: DiagnosticQuestion[] = [
  {
    question_id: 'q1',
    competency_code: 'GM-11',
    domain: 'General Mathematics',
    topic: 'Functions',
    difficulty: 'easy',
    bloom_level: 'Remembering',
    question_text: 'Kung ang f(x) = 3x + 2, ano ang f(4)?',
    options: {
      A: '12',
      B: '14',
      C: '16',
      D: '18',
    },
    curriculum_reference: 'DepEd GenMath Q1 M1',
  },
  {
    question_id: 'q2',
    competency_code: 'GM-12',
    domain: 'General Mathematics',
    topic: 'Rational Functions',
    difficulty: 'easy',
    bloom_level: 'Understanding',
    question_text: 'Find the domain of f(x) = 1/x.',
    options: {
      A: 'All real numbers',
      B: 'x != 0',
      C: 'x > 0',
      D: 'x < 0',
    },
    curriculum_reference: 'DepEd GenMath Q1 M2',
  },
];

describe('AssessmentPage Regression Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(diagnosticService, 'submitDiagnostic').mockResolvedValue({
      success: true,
      overall_risk: 'low',
      overall_score_percent: 100,
      mastery_summary: {
        mastered: ['Functions'],
        developing: [],
        beginning: [],
      },
      recommended_intervention: 'None needed',
      xp_earned: 50,
      badge_unlocked: 'math_master',
      redirect_to: '/dashboard',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the question text, domain tag, and all 4 options', () => {
    render(
      <AssessmentPage
        testId="test-123"
        questions={mockQuestions}
        userName="Maria"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Diagnostic Assessment/i)).toBeInTheDocument();
    expect(screen.getAllByText(/General Mathematics/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kung ang/i)).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('14').length).toBeGreaterThan(0);
    expect(screen.getAllByText('16').length).toBeGreaterThan(0);
    expect(screen.getAllByText('18').length).toBeGreaterThan(0);
  });

  it('allows clicking an option and advances to the next question on Next Question', async () => {
    render(
      <AssessmentPage
        testId="test-123"
        questions={mockQuestions}
        userName="Maria"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const optionB = optionCards.find((btn) => btn.textContent?.includes('B') && btn.textContent?.includes('14'));
    expect(optionB).toBeTruthy();
    fireEvent.click(optionB!);

    const nextBtn = screen.getByRole('button', { name: /Next Question/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Find the domain/i)).toBeInTheDocument();
    });
  });

  it('triggers onCancel when exit button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <AssessmentPage
        testId="test-123"
        questions={mockQuestions}
        userName="Maria"
        onComplete={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const exitBtn = screen.getByTitle('Exit Assessment');
    fireEvent.click(exitBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

