// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiagnosticBreakdown, { getOriginalQuestionNumber } from './DiagnosticBreakdown';

describe('DiagnosticBreakdown question identity', () => {
  it('keeps original question numbering after filtering', () => {
    const originalIds = ['question-1', 'question-2', 'question-3'];
    expect(getOriginalQuestionNumber(originalIds, 'question-2')).toBe(2);
    expect(getOriginalQuestionNumber(originalIds, 'missing-question')).toBe(0);
  });
});

describe('DiagnosticBreakdown modal mode', () => {
  it('does not mount an inactive breakdown dialog', () => {
    render(<DiagnosticBreakdown userId="student-1" mode="modal" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
