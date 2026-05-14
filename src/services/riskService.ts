// src/services/riskService.ts
// WRI (Weighted Risk Index) Service
// Handles Firestore operations and backend API calls for student risk classification

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WRIWeights, RiskHistoryEntry, StudentRiskProfile } from '../types/models';

const API_BASE = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

// ─── API Response Types ───────────────────────────────────────────────────────

export interface WRIComputeResult {
  wri: number | null;
  risk_status: 'safe' | 'watch' | 'intervene' | 'critical' | 'at_risk' | 'pending_assessment';
  inputs: { D: number | null; G: number | null; P: number | null };
  g_fallback: boolean;
  p_fallback: boolean;
}

export interface WRIBatchResult {
  id: string;
  wri: number | null;
  risk_status: string;
  inputs?: { D: number | null; G: number | null; P: number | null };
  g_fallback?: boolean;
  p_fallback?: boolean;
  error?: string;
}

// ─── Firestore Operations ─────────────────────────────────────────────────────

/**
 * Get a single student's risk profile from Firestore managedStudents collection
 */
export async function getStudentRiskProfile(studentId: string): Promise<StudentRiskProfile | null> {
  const docRef = doc(db, 'managedStudents', studentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data() as Record<string, unknown>;
  return {
    wri: (data.wri as number) ?? null,
    riskStatus: (data.riskStatus as StudentRiskProfile['riskStatus']) ?? null,
    riskUpdatedAt: data.riskUpdatedAt ? (data.riskUpdatedAt as Timestamp).toDate() : null,
    weights: (data.weights as WRIWeights) ?? { w1: 0.30, w2: 0.40, w3: 0.30 },
    diagnosticScore: (data.diagnosticScore as number) ?? null,
    externalGradesAvg: (data.externalGradesAvg as number) ?? null,
    systemPerformanceAvg: (data.systemPerformanceAvg as number) ?? null,
    riskHistory: (data.riskHistory as RiskHistoryEntry[]) ?? [],
    riskRecalcNeeded: (data.riskRecalcNeeded as boolean) ?? false,
  };
}

/**
 * Update WRI fields on a managedStudents document
 * Called after backend computes WRI
 */
export async function updateStudentRiskProfile(
  studentId: string,
  result: WRIComputeResult,
  trigger: RiskHistoryEntry['trigger'] = 'manual'
): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);

  const historyEntry: RiskHistoryEntry = {
    wri: result.wri ?? 0,
    riskStatus: result.risk_status as RiskHistoryEntry['riskStatus'],
    computedAt: new Date(),
    trigger,
  };

  const riskStatus = result.risk_status === 'pending_assessment' ? null : result.risk_status;

  await updateDoc(docRef, {
    wri: result.wri,
    riskStatus,
    riskUpdatedAt: serverTimestamp(),
    riskHistory: arrayUnion(historyEntry),
    riskRecalcNeeded: false,
    diagnosticScore: result.inputs.D,
    externalGradesAvg: result.inputs.G,
    systemPerformanceAvg: result.inputs.P,
  });
}

/**
 * Flag a student for WRI recalculation (used by Cloud Functions / manual triggers)
 */
export async function flagStudentForRecalc(studentId: string): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);
  await updateDoc(docRef, { riskRecalcNeeded: true });
}

// ─── API Calls ───────────────────────────────────────────────────────────────

/**
 * Compute WRI via backend API — falls back to local computation if unavailable
 */
export async function computeWRI(
  d: number | null,
  g: number | null,
  p: number | null,
  weights: WRIWeights = { w1: 0.30, w2: 0.40, w3: 0.30 }
): Promise<WRIComputeResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(`${API_BASE}/api/risk/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d, g, p, weights }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch {
    // Fallback: compute locally (mirrors Python backend logic)
    return computeWRILocally(d, g, p, weights);
  }
}

/**
 * Local WRI computation fallback (mirrors backend logic exactly)
 * Used when backend API is unavailable
 */
function computeWRILocally(
  d: number | null,
  g: number | null,
  p: number | null,
  weights: WRIWeights
): WRIComputeResult {
  if (d === null) {
    return {
      wri: null,
      risk_status: 'pending_assessment',
      inputs: { D: d, G: g, P: p },
      g_fallback: false,
      p_fallback: false,
    };
  }

  const gVal = g ?? d;
  const pVal = p ?? d;
  const gFallback = g === null;
  const pFallback = p === null;

  const wri = Math.round((weights.w1 * d + weights.w2 * gVal + weights.w3 * pVal) * 100) / 100;

  let risk_status: WRIComputeResult['risk_status'];
  if (wri >= 88) risk_status = 'safe';
  else if (wri >= 80) risk_status = 'watch';
  else if (wri >= 75) risk_status = 'intervene';
  else if (wri >= 68) risk_status = 'critical';
  else risk_status = 'at_risk';

  return {
    wri,
    risk_status,
    inputs: { D: d, G: gVal, P: pVal },
    g_fallback: gFallback,
    p_fallback: pFallback,
  };
}

/**
 * Batch compute WRI for multiple students via backend API
 */
export async function computeWRIBatch(
  students: Array<{ id: string; d: number | null; g: number | null; p: number | null }>,
  weights: WRIWeights = { w1: 0.30, w2: 0.40, w3: 0.30 }
): Promise<Array<{ id: string } & WRIComputeResult>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const response = await fetch(`${API_BASE}/api/risk/compute/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, weights }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return data.results;
  } catch {
    // Fallback: compute locally
    return students.map((s) => ({
      id: s.id,
      ...computeWRILocally(s.d, s.g, s.p, weights),
    }));
  }
}

/**
 * Manually trigger WRI recalculation for a single student
 */
export async function recalculateStudentWRI(studentId: string): Promise<void> {
  const profile = await getStudentRiskProfile(studentId);
  if (!profile) throw new Error(`Student ${studentId} not found`);

  const result = await computeWRI(
    profile.diagnosticScore ?? null,
    profile.externalGradesAvg ?? null,
    profile.systemPerformanceAvg ?? null,
    profile.weights ?? { w1: 0.30, w2: 0.40, w3: 0.30 }
  );

  await updateStudentRiskProfile(studentId, result, 'manual');
}

/**
 * Update just the weights for a student's WRI configuration
 */
export async function updateStudentWRIWeights(
  studentId: string,
  weights: WRIWeights
): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);
  await updateDoc(docRef, { weights });
}