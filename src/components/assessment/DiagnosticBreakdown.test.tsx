// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiagnosticBreakdown from './DiagnosticBreakdown';

describe('DiagnosticBreakdown modal mode', () => {
  it('does not mount an inactive breakdown dialog', () => {
    render(<DiagnosticBreakdown userId="student-1" mode="modal" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
