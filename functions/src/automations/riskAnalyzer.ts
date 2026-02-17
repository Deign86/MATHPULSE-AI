/**
 * MathPulse AI Cloud Functions - Risk Analyzer
 *
 * Pure-logic module that classifies subject-level and overall risk.
 * Mirrors the rule-based classification in backend/automation_engine.py.
 */

import {
  AT_RISK_THRESHOLD,
  WEAK_TOPIC_THRESHOLD,
  HIGH_RISK_RATIO,
  MEDIUM_RISK_RATIO,
} from "../config/constants";

// ─── Types ────────────────────────────────────────────────────

export interface SubjectScore {
  subject: string;
  score: number;
}

export interface SubjectRiskClassification {
  status: "At Risk" | "On Track";
  score: number;
  confidence: number;
  needsIntervention: boolean;
}

export interface WeakTopic {
  topic: string;
  accuracy: number;
  questionsAttempted: number;
  priority: "high" | "medium";
}

export type OverallRisk = "High" | "Medium" | "Low";

// ─── Subject Risk Classification ──────────────────────────────

/**
 * Classify each subject as "At Risk" or "On Track" based on score.
 */
export function classifySubjectRisks(
  results: SubjectScore[],
): Record<string, SubjectRiskClassification> {
  const classifications: Record<string, SubjectRiskClassification> = {};

  for (const { subject, score } of results) {
    if (score < AT_RISK_THRESHOLD) {
      const confidence = Math.round(
        ((AT_RISK_THRESHOLD - score) / AT_RISK_THRESHOLD) * 100,
      ) / 100;
      classifications[subject] = {
        status: "At Risk",
        score,
        confidence,
        needsIntervention: true,
      };
    } else {
      const confidence = Math.round(
        ((score - AT_RISK_THRESHOLD) / (100 - AT_RISK_THRESHOLD)) * 100,
      ) / 100;
      classifications[subject] = {
        status: "On Track",
        score,
        confidence,
        needsIntervention: false,
      };
    }
  }

  return classifications;
}

// ─── Weak Topics ──────────────────────────────────────────────

/**
 * Drill into per-topic accuracy from diagnostic question-level data.
 * Returns topics sorted weakest-first.
 */
export function identifyWeakTopics(
  questionBreakdown?: Record<string, { correct: boolean }[]>,
): WeakTopic[] {
  if (!questionBreakdown) return [];

  const weakTopics: WeakTopic[] = [];

  for (const [topic, questions] of Object.entries(questionBreakdown)) {
    if (!questions || questions.length === 0) continue;

    const correctCount = questions.filter((q) => q.correct).length;
    const accuracy = correctCount / questions.length;

    if (accuracy < WEAK_TOPIC_THRESHOLD) {
      weakTopics.push({
        topic,
        accuracy: Math.round(accuracy * 100) / 100,
        questionsAttempted: questions.length,
        priority: accuracy < 0.3 ? "high" : "medium",
      });
    }
  }

  // Sort weakest first
  weakTopics.sort((a, b) => a.accuracy - b.accuracy);
  return weakTopics;
}

// ─── Overall Risk ─────────────────────────────────────────────

/**
 * Compute overall risk level from the per-subject classifications.
 */
export function calculateOverallRisk(
  classifications: Record<string, SubjectRiskClassification>,
): OverallRisk {
  const total = Object.keys(classifications).length;
  if (total === 0) return "Low";

  const atRiskCount = Object.values(classifications).filter(
    (c) => c.status === "At Risk",
  ).length;

  const ratio = atRiskCount / total;

  if (ratio >= HIGH_RISK_RATIO) return "High";
  if (ratio >= MEDIUM_RISK_RATIO) return "Medium";
  return "Low";
}

// ─── Extract Badge Map ───────────────────────────────────────

/**
 * Build a simple { subject: "At Risk" | "On Track" } map for the
 * user profile `subjectBadges` field.
 */
export function extractBadges(
  classifications: Record<string, SubjectRiskClassification>,
): Record<string, string> {
  const badges: Record<string, string> = {};
  for (const [subject, data] of Object.entries(classifications)) {
    badges[subject] = data.status;
  }
  return badges;
}

// ─── Average Score Helper ────────────────────────────────────

export function calculateAvgScore(results: SubjectScore[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / results.length) * 100) / 100;
}
