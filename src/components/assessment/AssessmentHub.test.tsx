// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { deriveIARAssessmentState } from '../../../functions/src/automations/iarAssessmentScoring';
import AssessmentHub from './AssessmentHub';

afterEach(() => cleanup());

describe('AssessmentHub /assessment landing states', () => {
  it('renders loading skeleton while diagnostic status resolves', () => {
    render(
      <AssessmentHub
        status="loading"
        onStartAssessment={vi.fn()}
        onViewResults={vi.fn()}
        onViewBreakdown={vi.fn()}
      />,
    );
    expect(screen.getByTestId('assessment-hub-loading')).toBeInTheDocument();
    expect(screen.queryByText(/Content Coming Soon/i)).toBeNull();
  });

  it('renders start card for unassessed students', () => {
    const onStart = vi.fn();
    render(
      <AssessmentHub
        status="unassessed"
        onStartAssessment={onStart}
        onViewResults={vi.fn()}
        onViewBreakdown={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('assessment-hub-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Content Coming Soon/i)).toBeNull();
  });

  it('renders results hub with history, breakdown, and retake actions', () => {
    const onViewResults = vi.fn();
    const onViewBreakdown = vi.fn();
    const onStart = vi.fn();
    render(
      <AssessmentHub
        status="assessed"
        onStartAssessment={onStart}
        onViewResults={onViewResults}
        onViewBreakdown={onViewBreakdown}
      />,
    );
    fireEvent.click(screen.getByTestId('assessment-hub-results'));
    fireEvent.click(screen.getByTestId('assessment-hub-breakdown'));
    fireEvent.click(screen.getByTestId('assessment-hub-retake'));
    expect(onViewResults).toHaveBeenCalledTimes(1);
    expect(onViewBreakdown).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Content Coming Soon/i)).toBeNull();
  });

  it('derives persisted initial and follow-up states across diagnostic and path-lock boundaries', () => {
    const shared = {
      workflowMode: 'iar_plus_diagnostic' as const,
      requiresDeepDiagnostic: true,
      remediationSummary: { total: 2, queued: 1, inProgress: 0, outstanding: 2 },
    };
    expect(deriveIARAssessmentState({
      ...shared,
      assessmentType: 'initial_assessment',
      learningPathState: 'locked_pending_deep_diagnostic',
    })).toBe('deep_diagnostic_required');
    expect(deriveIARAssessmentState({
      ...shared,
      assessmentType: 'initial_assessment',
      learningPathState: 'unlocked',
    })).toBe('placed');
    expect(deriveIARAssessmentState({
      ...shared,
      assessmentType: 'followup_diagnostic',
      learningPathState: 'locked_pending_deep_diagnostic',
      remediationSummary: { ...shared.remediationSummary, inProgress: 1 },
    })).toBe('deep_diagnostic_in_progress');
    expect(deriveIARAssessmentState({
      ...shared,
      assessmentType: 'followup_diagnostic',
      learningPathState: 'unlocked',
    })).toBe('placed');
  });

  it('does not expose assessment actions while diagnostic status is unresolved', () => {
    const start = vi.fn();
    const { getByTestId, queryByTestId } = render(
      <AssessmentHub
        status="loading"
        onStartAssessment={start}
        onViewResults={vi.fn()}
        onViewBreakdown={vi.fn()}
      />,
    );
    expect(getByTestId('assessment-hub-loading')).toBeInTheDocument();
    expect(queryByTestId('assessment-hub-start')).not.toBeInTheDocument();
    expect(queryByTestId('assessment-hub-retake')).not.toBeInTheDocument();
    expect(start).not.toHaveBeenCalled();
  });

  it('resumes into the existing assessment action only after status resolves', () => {
    const start = vi.fn();
    const view = render(
      <AssessmentHub
        status="loading"
        onStartAssessment={start}
        onViewResults={vi.fn()}
        onViewBreakdown={vi.fn()}
      />,
    );
    expect(view.queryByTestId('assessment-hub-start')).not.toBeInTheDocument();

    view.rerender(
      <AssessmentHub
        status="unassessed"
        onStartAssessment={start}
        onViewResults={vi.fn()}
        onViewBreakdown={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('assessment-hub-start'));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
