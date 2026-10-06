// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AssessmentResultsModal from './AssessmentResultsModal';
import * as assessmentResultsService from '../../services/assessmentResultsService';
import type { HeroBannerModalSummary } from '../../types/models';

describe('AssessmentResultsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(assessmentResultsService, 'getAssessmentHistory').mockResolvedValue([]);
    vi.spyOn(assessmentResultsService, 'getLatestAssessmentResult').mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  const mockSummary: HeroBannerModalSummary = {
    status: 'ready',
    headline: "Let's build your foundation",
    summary: 'The diagnostic shows there are foundational topics to work on.',
    strengths: ['Basic Arithmetic'],
    weaknesses: ['Functions and Relations'],
    recommendation: "Focus on the topics where you need more practice. You've got this!",
    latestAssessmentId: 'test-123',
    latestScorePercent: 46.7,
    latestRiskLevel: 'Moderate',
    updatedAt: new Date('2026-10-06T10:00:00Z'),
  };

  it('renders assessment results with hero score and English recommendations', async () => {
    render(
      <AssessmentResultsModal
        isOpen={true}
        onClose={vi.fn()}
        studentId="student-123"
        heroBannerSummary={mockSummary}
      />
    );

    expect(screen.getByText('Assessment Results')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Let's build your foundation")).toBeInTheDocument();
    });
    expect(screen.getByText('47%')).toBeInTheDocument();
    expect(screen.getByText('Moderate Risk')).toBeInTheDocument();
    expect(screen.getByText(/Basic Arithmetic/i)).toBeInTheDocument();
    expect(screen.getByText(/Functions and Relations/i)).toBeInTheDocument();
    expect(screen.getByText(/You've got this!/i)).toBeInTheDocument();
  });

  it('triggers onClose when Continue to Learning Path button is clicked', () => {
    const handleClose = vi.fn();
    const handleContinue = vi.fn();
    render(
      <AssessmentResultsModal
        isOpen={true}
        onClose={handleClose}
        studentId="student-123"
        heroBannerSummary={mockSummary}
        onContinueToLearningPath={handleContinue}
      />
    );

    const continueBtn = screen.getByRole('button', { name: /Continue to Learning Path/i });
    fireEvent.click(continueBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onClose only when no onContinueToLearningPath callback is provided', () => {
    const handleClose = vi.fn();
    render(
      <AssessmentResultsModal
        isOpen={true}
        onClose={handleClose}
        studentId="student-123"
        heroBannerSummary={mockSummary}
      />
    );

    const continueBtn = screen.getByRole('button', { name: /Continue to Learning Path/i });
    fireEvent.click(continueBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows toggling between Last Results and History & Trends tabs', async () => {
    render(
      <AssessmentResultsModal
        isOpen={true}
        onClose={vi.fn()}
        studentId="student-123"
        heroBannerSummary={mockSummary}
      />
    );

    const historyTab = screen.getByRole('button', { name: /History & Trends/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText(/Performance Over Time/i)).toBeInTheDocument();
    });
  });
});
