import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { DocumentData, DocumentReference } from 'firebase/firestore';
import { deriveIARAssessmentState } from '../../../functions/src/automations/iarAssessmentScoring';

vi.spyOn(firestore, 'doc').mockImplementation((...parts) =>
  // SAFETY: service tests use document references only as opaque keys.
  ({ path: parts.slice(1).join('/') }) as DocumentReference<DocumentData>,
);
vi.spyOn(firestore, 'collection').mockImplementation((...parts) =>
  // SAFETY: query construction only passes this opaque collection handle to Firestore stubs.
  ({ path: parts.slice(1).join('/') }) as ReturnType<typeof firestore.collection>,
);
// SAFETY: query constraints are opaque tokens; these service tests assert query construction, not SDK internals.
vi.spyOn(firestore, 'query').mockImplementation((source) => source as ReturnType<typeof firestore.query>);
// SAFETY: query constraints are opaque tokens consumed only by the query stub above.
vi.spyOn(firestore, 'where').mockImplementation(() => ({}) as ReturnType<typeof firestore.where>);
// SAFETY: query constraints are opaque tokens consumed only by the query stub above.
vi.spyOn(firestore, 'orderBy').mockImplementation(() => ({}) as ReturnType<typeof firestore.orderBy>);
// SAFETY: query constraints are opaque tokens consumed only by the query stub above.
vi.spyOn(firestore, 'limit').mockImplementation(() => ({}) as ReturnType<typeof firestore.limit>);
// SAFETY: the opaque sentinel is only checked for presence in persisted payloads.
vi.spyOn(firestore, 'serverTimestamp').mockImplementation(() => 'server-time' as never);

function snapshotWith(value: DocumentData | null) {
  // SAFETY: service paths exercise only docs[].data() and empty.
  return {
    empty: value === null,
    docs: value === null ? [] : [{ data: () => value }],
  } as never;
}

const { completeInitialAssessment, getInitialAssessment } = await import('../assessmentService');
const { resetTestingDataForRole } = await import('../testResetService');

const assessmentResult = {
  uid: 'student-1',
  assessmentId: 'attempt-1',
  completedAt: new Date('2026-09-30T00:00:00.000Z'),
  rawScore: 80,
  totalQuestions: 10,
  correctAnswers: 8,
  timeSpentSeconds: 120,
  competencyScores: { algebra: { score: 80, correct: 8, attempted: 10 } },
  recommendations: [],
  proficiencyProfile: {
    strengths: ['algebra'],
    weaknesses: [],
    borderline: [],
    suggestedStartingModule: 'gen-math-q1',
    recommendedPace: 'normal' as const,
    g11Readiness: {
      readyForFiniteMath: true,
      readyForAdvancedStats: true,
      readyForLogicMastery: true,
      needsStrongerFunctions: false,
      needsStrongerBusinessMath: false,
      needsStrongerLogic: false,
    },
  },
  assessmentType: 'initial' as const,
};

describe('FE-IAR persistence boundary', () => {
  beforeEach(() => {
    vi.mocked(firestore.doc).mockClear();
    vi.mocked(firestore.setDoc).mockReset().mockResolvedValue(undefined);
    vi.mocked(firestore.updateDoc).mockReset().mockResolvedValue(undefined);
    vi.mocked(firestore.getDocs).mockReset();
    vi.mocked(firestore.getDoc).mockReset();
    vi.mocked(firestore.collection).mockClear();
    vi.mocked(firestore.query).mockClear();
    vi.mocked(firestore.where).mockClear();
    vi.mocked(firestore.orderBy).mockClear();
    vi.mocked(firestore.limit).mockClear();
    vi.mocked(firestore.deleteDoc).mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  it('persists the initial result and completion flag, then resumes from the stored assessment', async () => {
    await completeInitialAssessment(assessmentResult);
    const writes = vi.mocked(firestore.setDoc).mock.calls;
    expect(writes[0]?.[0]).toMatchObject({ path: 'assessments/student-1/attempts/attempt-1' });
    expect(writes[0]?.[1]).toMatchObject({
      uid: 'student-1',
      assessmentId: 'attempt-1',
      assessmentType: 'initial',
      correctAnswers: 8,
    });
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/student-1' }),
      expect.objectContaining({ hasCompletedInitialAssessment: true, iarAssessmentState: 'completed' }),
    );

    const persistedAssessment = {
      ...writes[0]?.[1],
      completedAt: { toDate: () => assessmentResult.completedAt },
    };
    vi.mocked(firestore.getDocs).mockResolvedValue(snapshotWith(persistedAssessment));
    await expect(getInitialAssessment('student-1')).resolves.toMatchObject({
      uid: 'student-1',
      assessmentId: 'attempt-1',
      rawScore: 80,
    });
  });

  it('propagates a denied persisted assessment read without resuming or unlocking', async () => {
    vi.mocked(firestore.getDocs).mockRejectedValue(new Error('permission denied'));

    await expect(getInitialAssessment('someone-elses-uid')).rejects.toThrow('permission denied');
    expect(deriveIARAssessmentState({
      workflowMode: 'iar_plus_diagnostic',
      requiresDeepDiagnostic: true,
      assessmentType: 'initial_assessment',
      learningPathState: 'locked_pending_deep_diagnostic',
      remediationSummary: { total: 1, queued: 1, inProgress: 0, outstanding: 1 },
    })).toBe('deep_diagnostic_required');
  });

  it('resets persisted IAR ownership state and clears assessment completion fields', async () => {
    // SAFETY: reset service only uses exists() and data() from this snapshot.
    vi.mocked(firestore.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ photo: 'avatar.png', ownedAvatarItems: ['hat'] }),
    } as never);
    vi.mocked(firestore.getDocs).mockResolvedValue(snapshotWith(null));
    // SAFETY: query() only forwards this opaque input to the existing query spy.
    vi.mocked(firestore.query).mockImplementation((source) => source as ReturnType<typeof firestore.query>);
    await resetTestingDataForRole({ uid: 'student-1', role: 'student' });

    const userReset = vi.mocked(firestore.setDoc).mock.calls.find(([ref]) =>
      // SAFETY: Firestore document references are represented by their test path key.
      (ref as { path?: string }).path === 'users/student-1',
    );
    expect(userReset?.[1]).toMatchObject({
      photo: 'avatar.png',
      ownedAvatarItems: ['hat'],
      iarAssessmentState: 'not_started',
      learningPathState: 'unlocked',
      hasCompletedInitialAssessment: false,
      initialAssessmentCompletedAt: expect.anything(),
    });
    expect(firestore.deleteDoc).toHaveBeenCalled();
  });

  it('derives placed only when the supplied learning path state is unlocked', () => {
    const persistedResume = {
      workflowMode: 'iar_plus_diagnostic' as const,
      requiresDeepDiagnostic: true,
      assessmentType: 'followup_diagnostic' as const,
      remediationSummary: { total: 1, queued: 0, inProgress: 0, outstanding: 1 },
    };

    expect(deriveIARAssessmentState({
      ...persistedResume,
      learningPathState: 'locked_pending_deep_diagnostic',
    })).toBe('deep_diagnostic_required');
    expect(deriveIARAssessmentState({
      ...persistedResume,
      learningPathState: 'unlocked',
    })).toBe('placed');
  });

  it.each([
    {
      name: 'initial assessment with no deep diagnostic requirement remains completed while locked',
      assessmentType: 'initial_assessment' as const,
      requiresDeepDiagnostic: false,
      learningPathState: 'locked_pending_deep_diagnostic' as const,
      remediationSummary: { total: 0, queued: 0, inProgress: 0, outstanding: 0 },
      expected: 'completed',
    },
    {
      name: 'initial assessment with unresolved remediation requires deep diagnostic',
      assessmentType: 'initial_assessment' as const,
      requiresDeepDiagnostic: true,
      learningPathState: 'locked_pending_deep_diagnostic' as const,
      remediationSummary: { total: 1, queued: 1, inProgress: 0, outstanding: 1 },
      expected: 'deep_diagnostic_required',
    },
    {
      name: 'active remediation advances to deep diagnostic in progress, not placed',
      assessmentType: 'initial_assessment' as const,
      requiresDeepDiagnostic: true,
      learningPathState: 'locked_pending_deep_diagnostic' as const,
      remediationSummary: { total: 1, queued: 0, inProgress: 1, outstanding: 1 },
      expected: 'deep_diagnostic_in_progress',
    },
    {
      name: 'follow-up with outstanding remediation cannot place while path remains locked',
      assessmentType: 'followup_diagnostic' as const,
      requiresDeepDiagnostic: true,
      learningPathState: 'locked_pending_deep_diagnostic' as const,
      remediationSummary: { total: 1, queued: 1, inProgress: 0, outstanding: 1 },
      expected: 'deep_diagnostic_required',
    },
    {
      name: 'follow-up with active remediation stays in progress until path unlocks',
      assessmentType: 'followup_diagnostic' as const,
      requiresDeepDiagnostic: true,
      learningPathState: 'locked_pending_deep_diagnostic' as const,
      remediationSummary: { total: 1, queued: 0, inProgress: 1, outstanding: 1 },
      expected: 'deep_diagnostic_in_progress',
    },
    {
      name: 'follow-up places only after the persisted learning path unlocks',
      assessmentType: 'followup_diagnostic' as const,
      requiresDeepDiagnostic: true,
      learningPathState: 'unlocked' as const,
      remediationSummary: { total: 1, queued: 0, inProgress: 0, outstanding: 0 },
      expected: 'placed',
    },
  ])('$name', ({ assessmentType, requiresDeepDiagnostic, learningPathState, remediationSummary, expected }) => {
    expect(deriveIARAssessmentState({
      workflowMode: 'iar_plus_diagnostic',
      assessmentType,
      requiresDeepDiagnostic,
      learningPathState,
      remediationSummary,
    })).toBe(expected);
  });

  it('persists completed only after a reset baseline and keeps reset ownership fields', async () => {
    // SAFETY: reset service only uses exists() and data() from this snapshot.
    vi.mocked(firestore.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ photo: 'avatar.png' }),
    } as never);
    vi.mocked(firestore.getDocs).mockResolvedValue(snapshotWith(null));

    await resetTestingDataForRole({ uid: 'student-1', role: 'student' });
    const resetWrites = vi.mocked(firestore.setDoc).mock.calls;
    expect(resetWrites.find(([ref]) =>
      // SAFETY: Firestore document references are represented by their test path key.
      (ref as { path?: string }).path === 'users/student-1',
    )?.[1]).toMatchObject({ iarAssessmentState: 'not_started', learningPathState: 'unlocked' });

    vi.mocked(firestore.setDoc).mockClear();
    await completeInitialAssessment(assessmentResult);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/student-1' }),
      expect.objectContaining({ iarAssessmentState: 'completed', hasCompletedInitialAssessment: true }),
    );
  });
});
