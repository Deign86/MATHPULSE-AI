// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssessmentHub from './AssessmentHub';

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
});
