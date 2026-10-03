// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InitialAssessmentModal from './InitialAssessmentModal';

describe('InitialAssessmentModal visibility', () => {
  it('keeps a not-started assessment closed when the parent marks it closed', () => {
    render(<InitialAssessmentModal isOpen={false} onClose={vi.fn()} onDismiss={vi.fn()} userId="student-1" strand="STEM" gradeLevel="11" onAssessmentStart={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
