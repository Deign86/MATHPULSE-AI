import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  WRIWeights,
  RiskHistoryEntry,
  StudentRiskProfile,
} from '../types/models';

// ─── Constants ────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: WRIWeights = { w1: 0.30, w2: 0.40, w3: 0.30 };

// ─── WRI Result Types ─────────────────────────────────────────────

export interface WRIResult {
  wri: number;
  riskStatus: RiskHistoryEntry['riskStatus'];
}

export interface WRIBatchItem {
  id: string;
  wri: number;
  riskStatus: RiskHistoryEntry['riskStatus'];
}

// ─── Helpers ──────────────────────────────────────────────────────

function computeRiskStatus(wri: number): RiskHistoryEntry['riskStatus'] {
  if (wri >= 88) return 'safe';
  if (wri >= 80) return 'watch';
  if (wri >= 75) return 'intervene';
  if (wri >= 68) return 'critical';
  return 'at_risk';
}

/**
 * Local WRI computation.
 * Formula: WRI = floor((w1*D + w2*G + w3*P) * 100) / 100
 * Default weights: w1=0.30 (diagnostic), w2=0.40 (external), w3=0.30 (system perf.)
 *
 * Risk thresholds (descending):
 *  ≥ 88  → safe
 *  ≥ 80  → watch
 *  ≥ 75  → intervene
 *  ≥ 68  → critical
 *  < 68  → at_risk
 */
export function computeWRI(
  diagnosticScore: number | null,
  externalGradesAvg: number | null,
  systemPerformanceAvg: number | null,
  weights: WRIWeights = DEFAULT_WEIGHTS,
): WRIResult {
  if (diagnosticScore === null) {
    return { wri: 0, riskStatus: 'at_risk' };
  }

  const g = externalGradesAvg ?? diagnosticScore;
  const p = systemPerformanceAvg ?? diagnosticScore;

  const raw = weights.w1 * diagnosticScore + weights.w2 * g + weights.w3 * p;
  const wri = Math.floor(raw * 100) / 100;

  return { wri, riskStatus: computeRiskStatus(wri) };
}

// ─── Firestore: Read ──────────────────────────────────────────────

/**
 * Get a single student's risk profile from managedStudents/{studentId}
 */
export async function getStudentRiskProfile(
  studentId: string,
): Promise<StudentRiskProfile | null> {
  const docRef = doc(db, 'managedStudents', studentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data() as Record<string, unknown>;
  return {
    wri: (data.wri as number) ?? null,
    riskStatus: (data.riskStatus as StudentRiskProfile['riskStatus']) ?? null,
    riskUpdatedAt: data.riskUpdatedAt
      ? (data.riskUpdatedAt as Timestamp).toDate()
      : null,
    weights: (data.weights as WRIWeights) ?? DEFAULT_WEIGHTS,
    diagnosticScore: (data.diagnosticScore as number) ?? null,
    externalGradesAvg: (data.externalGradesAvg as number) ?? null,
    systemPerformanceAvg: (data.systemPerformanceAvg as number) ?? null,
    riskHistory: (data.riskHistory as RiskHistoryEntry[]) ?? [],
    riskRecalcNeeded: (data.riskRecalcNeeded as boolean) ?? false,
  };
}

// ─── Firestore: Write ─────────────────────────────────────────────

/**
 * Write (or merge) a student's risk profile into managedStudents/{studentId}.
 * Appends a new entry to the riskHistory array with the current timestamp.
 */
export async function updateStudentRiskProfile(
  studentId: string,
  profile: StudentRiskProfile,
): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);

  const historyEntry: RiskHistoryEntry = {
    wri: profile.wri ?? 0,
    riskStatus: profile.riskStatus ?? 'at_risk',
    computedAt: new Date(),
    trigger: 'manual',
  };

  await setDoc(
    docRef,
    {
      ...profile,
      riskUpdatedAt: serverTimestamp(),
      riskHistory: arrayUnion(historyEntry),
    },
    { merge: true },
  );
}

/**
 * Flag a student for WRI recalculation.
 */
export async function flagStudentForRecalc(studentId: string): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);
  await updateDoc(docRef, { riskRecalcNeeded: true });
}

/**
 * Update just the weights on a student's risk document.
 */
export async function updateStudentWRIWeights(
  studentId: string,
  weights: WRIWeights,
): Promise<void> {
  const docRef = doc(db, 'managedStudents', studentId);
  await updateDoc(docRef, { weights });
}

// ─── Batch / Recalc ───────────────────────────────────────────────

/**
 * Batch-compute WRI for a list of student UIDs.
 * Each student's profile is read from Firestore; scores are extracted
 * and the local formula is applied.
 */
export async function computeWRIBatch(
  uidList: string[],
  weights: WRIWeights = DEFAULT_WEIGHTS,
): Promise<WRIBatchItem[]> {
  const results: WRIBatchItem[] = [];

  for (const id of uidList) {
    const profile = await getStudentRiskProfile(id);
    if (!profile) {
      results.push({ id, wri: 0, riskStatus: 'at_risk' });
      continue;
    }
    const { wri, riskStatus } = computeWRI(
      profile.diagnosticScore ?? null,
      profile.externalGradesAvg ?? null,
      profile.systemPerformanceAvg ?? null,
      profile.weights ?? weights,
    );
    results.push({ id, wri, riskStatus });
  }

  return results;
}

/**
 * Recalculate a single student's WRI from their saved scores and
 * persist the result back to Firestore.
 */
export async function recalculateStudentWRI(studentId: string): Promise<void> {
  const profile = await getStudentRiskProfile(studentId);
  if (!profile) throw new Error(`Student ${studentId} not found`);

  const { wri, riskStatus } = computeWRI(
    profile.diagnosticScore ?? null,
    profile.externalGradesAvg ?? null,
    profile.systemPerformanceAvg ?? null,
    profile.weights ?? DEFAULT_WEIGHTS,
  );

  await updateStudentRiskProfile(studentId, {
    ...profile,
    wri,
    riskStatus,
    riskUpdatedAt: new Date(),
  });
}

// ─── Real-time Subscription ───────────────────────────────────────

/**
 * Subscribe to real-time updates of a student's risk profile.
 * Returns an unsubscribe function.
 */
export function subscribeToStudentRisk(
  studentId: string,
  callback: (profile: StudentRiskProfile | null) => void,
): () => void {
  const docRef = doc(db, 'managedStudents', studentId);
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data() as Record<string, unknown>;
    callback({
      wri: (data.wri as number) ?? null,
      riskStatus: (data.riskStatus as StudentRiskProfile['riskStatus']) ?? null,
      riskUpdatedAt: data.riskUpdatedAt
        ? (data.riskUpdatedAt as Timestamp).toDate()
        : null,
      weights: (data.weights as WRIWeights) ?? DEFAULT_WEIGHTS,
      diagnosticScore: (data.diagnosticScore as number) ?? null,
      externalGradesAvg: (data.externalGradesAvg as number) ?? null,
      systemPerformanceAvg: (data.systemPerformanceAvg as number) ?? null,
      riskHistory: (data.riskHistory as RiskHistoryEntry[]) ?? [],
      riskRecalcNeeded: (data.riskRecalcNeeded as boolean) ?? false,
    });
  });
}
