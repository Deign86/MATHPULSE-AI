// src/utils/riskEngine.ts
// Centralized at-risk formula used by all dashboards.
// Single source of truth for risk classification.

export type RiskStatus = 'safe' | 'watch' | 'intervene' | 'critical' | 'at_risk';
export type OverallRisk = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiskWeights {
  w1: number; // Diagnostic weight (default 0.30)
  w2: number; // External grades weight (default 0.40)
  w3: number; // System performance weight (default 0.30)
}

export const DEFAULT_WEIGHTS: RiskWeights = { w1: 0.30, w2: 0.40, w3: 0.30 };

export interface RiskInput {
  diagnosticScore: number | null;   // D (0-100)
  externalGradesAvg: number | null; // G (0-100)
  systemPerformanceAvg: number | null; // P (0-100)
  weights?: RiskWeights;
}

export interface RiskResult {
  wri: number | null;
  riskStatus: RiskStatus | null;
  overallRisk: OverallRisk;
}

/**
 * Compute WRI and classify risk. Mirrors backend logic exactly.
 * Returns null WRI if diagnostic score is unavailable.
 */
export function computeRisk(input: RiskInput): RiskResult {
  const { diagnosticScore: d, externalGradesAvg: g, systemPerformanceAvg: p } = input;
  const weights = input.weights ?? DEFAULT_WEIGHTS;

  if (d === null) {
    return { wri: null, riskStatus: null, overallRisk: 'Low' };
  }

  const gVal = g ?? d;
  const pVal = p ?? d;
  const wri = Math.round((weights.w1 * d + weights.w2 * gVal + weights.w3 * pVal) * 100) / 100;

  const riskStatus = classifyWRI(wri);
  const overallRisk = riskStatusToOverallRisk(riskStatus);

  return { wri, riskStatus, overallRisk };
}

/** Classify WRI score into risk status */
export function classifyWRI(wri: number): RiskStatus {
  if (wri >= 88) return 'safe';
  if (wri >= 80) return 'watch';
  if (wri >= 75) return 'intervene';
  if (wri >= 68) return 'critical';
  return 'at_risk';
}

/** Map WRI risk status to the `overallRisk` field used by admin dashboard */
export function riskStatusToOverallRisk(status: RiskStatus): OverallRisk {
  switch (status) {
    case 'safe': return 'Low';
    case 'watch': return 'Moderate';
    case 'intervene': return 'High';
    case 'critical': return 'Critical';
    case 'at_risk': return 'Critical';
  }
}

/**
 * Simple at-risk check based on average score alone.
 * Used when WRI inputs are unavailable (e.g., no diagnostic taken).
 * Threshold: below 60% = at-risk.
 */
export function isAtRiskByScore(averageScore: number): boolean {
  return averageScore > 0 && averageScore < 60;
}

/**
 * Compute system performance average (P) from quiz attempts.
 * This is the "P" input to WRI — average of all quiz scores.
 */
export function computeSystemPerformance(quizScores: number[]): number | null {
  if (quizScores.length === 0) return null;
  return Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length);
}
