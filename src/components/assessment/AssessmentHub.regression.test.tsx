// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssessmentHub from './AssessmentHub';
import { deriveIARAssessmentState } from '../../../functions/src/automations/iarAssessmentScoring';
import type { StudentProfile } from '../../types/models';

describe('AssessmentHub assessment state regression', () => {
  it('keeps start and results actions hidden while an assessment is in progress', () => {
    render(<AssessmentHub status="loading" onStartAssessment={vi.fn()} onViewResults={vi.fn()} onViewBreakdown={vi.fn()} />);
    expect(screen.getByTestId('assessment-hub-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-hub-start')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-hub-results')).not.toBeInTheDocument();
  });

  it('preserves the not-started, in-progress, completed, and placed IAR workflow states', () => {
    const iarAssessmentStates: NonNullable<StudentProfile['iarAssessmentState']>[] = ['not_started', 'in_progress', 'completed', 'placed'];
    expect(iarAssessmentStates).toEqual(['not_started', 'in_progress', 'completed', 'placed']);
    const initialWorkflow = { workflowMode: 'iar_plus_diagnostic' as const, requiresDeepDiagnostic: true, remediationSummary: { total: 1, queued: 1, inProgress: 0, outstanding: 1 } };
    expect(deriveIARAssessmentState({ ...initialWorkflow, assessmentType: 'initial_assessment', learningPathState: 'locked_pending_deep_diagnostic' })).toBe('deep_diagnostic_required');
    expect(deriveIARAssessmentState({ ...initialWorkflow, assessmentType: 'followup_diagnostic', learningPathState: 'locked_pending_deep_diagnostic', remediationSummary: { total: 1, queued: 0, inProgress: 1, outstanding: 1 } })).toBe('deep_diagnostic_in_progress');
    expect(deriveIARAssessmentState({ ...initialWorkflow, assessmentType: 'followup_diagnostic', learningPathState: 'locked_pending_deep_diagnostic', remediationSummary: { total: 0, queued: 0, inProgress: 0, outstanding: 0 } })).toBe('completed');
    expect(deriveIARAssessmentState({ ...initialWorkflow, assessmentType: 'followup_diagnostic', learningPathState: 'unlocked' })).toBe('placed');
  });
});
