/**
 * heroBannerSummaryService
 *
 * Manages the Hero Banner modal summary persisted at:
 *   Firestore path: users/{uid}/dashboardSummary/heroBannerModal
 *
 * The summary is built from AssessmentPage.onComplete data and shown
 * in the Hero Banner's AssessmentResultsModal so students always see
 * meaningful content (never a blank modal).
 */

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { HeroBannerModalSummary } from '../types/models';
import type { ProficiencyProfile } from '../types/assessment';

// ── Builder ─────────────────────────────────────────────────────────────────

export interface BuildSummaryInput {
  assessmentId: string;
  overallScorePercent: number;
  overallRisk: string;
  intervention: string;
  proficiencyProfile?: ProficiencyProfile;
  previousSummary?: HeroBannerModalSummary | null;
}

/**
 * Build a friendly, student-facing HeroBannerModalSummary from assessment results.
 * All text is human-readable and encouraging — never raw JSON or technical jargon.
 */
export function buildHeroBannerModalSummary(input: BuildSummaryInput): HeroBannerModalSummary {
  const {
    assessmentId,
    overallScorePercent,
    overallRisk,
    intervention,
    proficiencyProfile,
    previousSummary,
  } = input;

  const headline = _buildHeadline(overallScorePercent);
  const summary = _buildSummary(overallScorePercent, overallRisk, proficiencyProfile);
  const recommendation = _buildRecommendation(overallRisk, intervention, proficiencyProfile);

  // Extract strengths and weaknesses from proficiencyProfile
  const strengths = proficiencyProfile?.strengths ?? [];
  const weaknesses = proficiencyProfile?.weaknesses ?? [];

  return {
    status: 'ready',
    headline,
    summary,
    strengths,
    weaknesses,
    recommendation,
    latestAssessmentId: assessmentId,
    latestScorePercent: overallScorePercent,
    latestRiskLevel: _capitalizeRisk(overallRisk),
    updatedAt: new Date(),
  };
}

// ── Firestore persistence ────────────────────────────────────────────────────

/** Persist the hero banner modal summary for a user. */
export async function saveHeroBannerModalSummary(
  uid: string,
  summary: HeroBannerModalSummary,
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'dashboardSummary', 'heroBannerModal');
  await setDoc(docRef, {
    ...summary,
    updatedAt: serverTimestamp(),
  });
}

/** Read the hero banner modal summary for a user (one-time read). */
export async function getHeroBannerModalSummary(
  uid: string,
): Promise<HeroBannerModalSummary | null> {
  const docRef = doc(db, 'users', uid, 'dashboardSummary', 'heroBannerModal');
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    status: data.status ?? 'not_started',
    headline: data.headline ?? '',
    summary: data.summary ?? '',
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    recommendation: data.recommendation ?? '',
    latestAssessmentId: data.latestAssessmentId ?? '',
    latestScorePercent: data.latestScorePercent ?? 0,
    latestRiskLevel: data.latestRiskLevel ?? '',
    updatedAt: _toDate(data.updatedAt),
  };
}

/** Subscribe to real-time hero banner modal summary changes. */
export function subscribeToHeroBannerModalSummary(
  uid: string,
  callback: (summary: HeroBannerModalSummary | null) => void,
): () => void {
  const docRef = doc(db, 'users', uid, 'dashboardSummary', 'heroBannerModal');
  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      status: data.status ?? 'not_started',
      headline: data.headline ?? '',
      summary: data.summary ?? '',
      strengths: data.strengths ?? [],
      weaknesses: data.weaknesses ?? [],
      recommendation: data.recommendation ?? '',
      latestAssessmentId: data.latestAssessmentId ?? '',
      latestScorePercent: data.latestScorePercent ?? 0,
      latestRiskLevel: data.latestRiskLevel ?? '',
      updatedAt: _toDate(data.updatedAt),
    });
  });
}

// ── Private helpers ────────────────────────────────────────────────────────────

function _buildHeadline(score: number): string {
  if (score >= 80) return 'Outstanding performance! 🎉';
  if (score >= 65) return 'Good job — keep it up!';
  if (score >= 50) return 'You\'re making progress!';
  return 'Let\'s build your foundation';
}

function _buildSummary(
  score: number,
  risk: string,
  proficiencyProfile?: ProficiencyProfile,
): string {
  const strengths = proficiencyProfile?.strengths ?? [];
  const weaknesses = proficiencyProfile?.weaknesses ?? [];

  if (strengths.length > 0 && weaknesses.length > 0) {
    const topStrength = strengths[0];
    const topWeakness = weaknesses[0];
    return `You show stronger understanding in ${topStrength}, while ${topWeakness} needs more attention. Keep practicing to strengthen your weaker areas!`;
  }

  if (strengths.length > 0) {
    return `Great work! You demonstrated strong understanding. Focus on maintaining your performance and expanding your skills.`;
  }

  if (weaknesses.length > 0) {
    return `You have some areas to work on. With guided practice and focused review, you can build a stronger foundation in the topics that need attention.`;
  }

  // Fallback when no proficiency profile
  if (score >= 70) {
    return `You performed well overall! You have a solid foundation. Continue practicing to maintain and expand your skills.`;
  }

  if (score >= 50) {
    return `You showed understanding in several areas. Keep practicing and review the topics where you lost points.`;
  }

  return `The diagnostic shows there are foundational topics to work on. Don't worry — with consistent practice, you'll build confidence and improve!`;
}

function _buildRecommendation(
  risk: string,
  intervention: string,
  proficiencyProfile?: ProficiencyProfile,
): string {
  // Use the AI-provided intervention when available
  if (intervention && intervention.trim().length > 0) {
    return intervention;
  }

  // Fallback based on risk level
  const riskCap = _capitalizeRisk(risk);

  if (risk === 'critical' || risk === 'high') {
    return `We recommend starting with foundational lessons and guided practice to build confidence. Focus on one topic at a time, and don't hesitate to review earlier material.`;
  }

  if (risk === 'moderate') {
    return `Start with guided review lessons to strengthen your foundation, then progressively tackle more challenging problems.`;
  }

  return `Continue practicing regularly and review topics you find challenging. Your personalized learning path will guide you to the right lessons.`;
}

function _capitalizeRisk(risk: string): string {
  switch (risk) {
    case 'low':    return 'Low';
    case 'moderate': return 'Moderate';
    case 'high':   return 'High';
    case 'critical': return 'Critical';
    default:        return risk.charAt(0).toUpperCase() + risk.slice(1);
  }
}

function _toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}