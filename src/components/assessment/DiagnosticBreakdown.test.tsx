// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import DiagnosticBreakdown from './DiagnosticBreakdown';

describe('DiagnosticBreakdown modal mode', () => {
  it('does not mount an inactive breakdown dialog', () => {
    render(<DiagnosticBreakdown userId="student-1" mode="modal" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DiagnosticBreakdown empty results (STU-015)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('explains missing results instead of an empty filter message', async () => {
    // SAFETY: opaque references returned by the Firestore boundary spies; consumed only by mocked IO.
    vi.spyOn(firestore, 'doc').mockReturnValue({} as never);
    // SAFETY: boundary mock resolves a non-existing doc so the empty state renders.
    vi.spyOn(firestore, 'getDoc').mockResolvedValue({ exists: () => false } as never);
    render(<DiagnosticBreakdown userId="student-1" mode="modal" isOpen onClose={vi.fn()} />);
    expect(await screen.findByText('No diagnostic results yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Complete the initial assessment to see your score breakdown here.'),
    ).toBeInTheDocument();
  });
});

describe('DiagnosticBreakdown modal mode', () => {
  it('does not mount an inactive breakdown dialog', () => {
    render(<DiagnosticBreakdown userId="student-1" mode="modal" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
