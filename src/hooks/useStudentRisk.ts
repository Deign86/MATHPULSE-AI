// src/hooks/useStudentRisk.ts
// Real-time Firestore hook for student WRI risk profiles

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getStudentRiskProfile,
  recalculateStudentWRI,
  computeWRI,
  updateStudentRiskProfile,
  type WRIComputeResult,
} from '../services/riskService';
import type { WRIWeights, RiskHistoryEntry, StudentRiskProfile } from '../types/models';

interface UseStudentRiskOptions {
  /** Auto-recalculate WRI when riskRecalcNeeded flag is set */
  autoRecalc?: boolean;
}

export interface UseStudentRiskResult {
  wri: number | null;
  riskStatus: 'safe' | 'monitoring' | 'at_risk' | null;
  diagnosticScore: number | null;
  externalGradesAvg: number | null;
  systemPerformanceAvg: number | null;
  weights: WRIWeights;
  riskHistory: RiskHistoryEntry[];
  riskUpdatedAt: Date | null;
  loading: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
  updateWeights: (weights: WRIWeights) => Promise<void>;
  breakdown: {
    diagnostic: number | null;
    external: number | null;
    system: number | null;
  };
  pendingAssessment: boolean;
}

/**
 * Subscribe to a student's risk profile in real-time via Firestore onSnapshot.
 * Returns WRI score, risk status, D/G/P breakdown, and risk history trend.
 */
export function useStudentRisk(
  studentId: string | null,
  options: UseStudentRiskOptions = {}
): UseStudentRiskResult {
  const { autoRecalc = false } = options;

  const [profile, setProfile] = useState<StudentRiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'managedStudents', studentId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const data = snap.data() as Record<string, unknown>;
        const parsed: StudentRiskProfile = {
          wri: (data.wri as number) ?? null,
          riskStatus: (data.riskStatus as StudentRiskProfile['riskStatus']) ?? null,
          riskUpdatedAt: data.riskUpdatedAt
            ? (data.riskUpdatedAt as Timestamp).toDate()
            : null,
          weights: (data.weights as WRIWeights) ?? { w1: 0.30, w2: 0.40, w3: 0.30 },
          diagnosticScore: (data.diagnosticScore as number) ?? null,
          externalGradesAvg: (data.externalGradesAvg as number) ?? null,
          systemPerformanceAvg: (data.systemPerformanceAvg as number) ?? null,
          riskHistory: (data.riskHistory as RiskHistoryEntry[]) ?? [],
          riskRecalcNeeded: (data.riskRecalcNeeded as boolean) ?? false,
        };

        setProfile(parsed);
        setLoading(false);
        setError(null);

        // Auto-recalculate if flagged by Cloud Function
        if (autoRecalc && parsed.riskRecalcNeeded) {
          recalculateStudentWRI(studentId).catch((e: unknown) =>
            console.error('[useStudentRisk] auto-recalc failed:', e)
          );
        }
      },
      (err: unknown) => {
        console.error('[useStudentRisk] snapshot error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [studentId, autoRecalc]);

  const recalculate = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      await recalculateStudentWRI(studentId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Recalculation failed');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const updateWeights = useCallback(
    async (weights: WRIWeights) => {
      if (!studentId || !profile) return;
      // Optimistically update local state
      setProfile((prev) => (prev ? { ...prev, weights } : prev));
      // Recompute WRI with new weights
      const result = await computeWRI(
        profile.diagnosticScore ?? null,
        profile.externalGradesAvg ?? null,
        profile.systemPerformanceAvg ?? null,
        weights
      );
      await updateStudentRiskProfile(studentId, result, 'manual');
    },
    [studentId, profile]
  );

  return {
    wri: profile?.wri ?? null,
    riskStatus: profile?.riskStatus ?? null,
    diagnosticScore: profile?.diagnosticScore ?? null,
    externalGradesAvg: profile?.externalGradesAvg ?? null,
    systemPerformanceAvg: profile?.systemPerformanceAvg ?? null,
    weights: profile?.weights ?? { w1: 0.30, w2: 0.40, w3: 0.30 },
    riskHistory: profile?.riskHistory ?? [],
    riskUpdatedAt: profile?.riskUpdatedAt ?? null,
    loading,
    error,
    recalculate,
    updateWeights,
    breakdown: {
      diagnostic: profile?.diagnosticScore ?? null,
      external: profile?.externalGradesAvg ?? null,
      system: profile?.systemPerformanceAvg ?? null,
    },
    pendingAssessment: profile?.diagnosticScore === null,
  };
}