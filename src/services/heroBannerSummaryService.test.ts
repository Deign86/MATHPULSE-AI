// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildHeroBannerModalSummary } from './heroBannerSummaryService';
import type { ProficiencyProfile } from '../types/assessment';

const baseInput = {
  assessmentId: 'test-123',
  overallScorePercent: 42,
  overallRisk: 'high',
  intervention: '',
};

describe('buildHeroBannerModalSummary — named weakness topics in recommendation', () => {
  const proficiencyHighWeaknesses: ProficiencyProfile = {
    strengths: ['Basic Arithmetic'],
    weaknesses: ['Functions and Relations', 'Sequences'],
    borderline: [],
    suggestedStartingModule: 'gen-math-q1',
    recommendedPace: 'support_intensive',
  };

  const proficiencyModerateWeaknesses: ProficiencyProfile = {
    strengths: [],
    weaknesses: ['Statistics and Probability'],
    borderline: ['Logic and Reasoning'],
    suggestedStartingModule: 'stats-q1',
    recommendedPace: 'normal',
  };

  const proficiencyNoWeaknesses: ProficiencyProfile = {
    strengths: ['Algebra'],
    weaknesses: [],
    borderline: [],
    suggestedStartingModule: 'gen-math-q1',
    recommendedPace: 'accelerated',
  };

  it('names top weakness in critical/high risk fallback', () => {
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'critical',
      proficiencyProfile: proficiencyHighWeaknesses,
    });
    expect(summary.recommendation).toContain('Functions and Relations');
    expect(summary.recommendation).not.toContain('We recommend starting with foundational lessons and guided practice to build confidence');
  });

  it('names top weakness in moderate risk fallback', () => {
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'moderate',
      proficiencyProfile: proficiencyModerateWeaknesses,
    });
    expect(summary.recommendation).toContain('Statistics and Probability');
    expect(summary.recommendation).not.toContain('Start with guided review lessons to strengthen your foundation, then progressively tackle more challenging problems');
  });

  it('names top weakness in low risk (general) fallback', () => {
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'low',
      proficiencyProfile: proficiencyModerateWeaknesses,
    });
    expect(summary.recommendation).toContain('Statistics and Probability');
  });

  it('uses generic fallback when no weaknesses present', () => {
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'high',
      proficiencyProfile: proficiencyNoWeaknesses,
    });
    // Should not contain topic-specific text; falls back to general message
    expect(summary.recommendation).toContain('foundational lessons');
  });

  it('skips AI intervention path when intervention is provided', () => {
    const aiIntervention = 'Complete the Logic module before advancing.';
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'critical',
      intervention: aiIntervention,
      proficiencyProfile: proficiencyHighWeaknesses,
    });
    expect(summary.recommendation).toBe(aiIntervention);
    // Weakness names should NOT appear when AI intervention is present
    expect(summary.recommendation).not.toContain('Functions');
  });

  it('includes up to two weakness topics separated by "and"', () => {
    const summary = buildHeroBannerModalSummary({
      ...baseInput,
      overallRisk: 'high',
      proficiencyProfile: proficiencyHighWeaknesses,
    });
    // Should mention both Functions and Relations AND Sequences (first two)
    expect(summary.recommendation).toMatch(/Functions and Relations.*Sequences|Sequences.*Functions and Relations/);
  });
});
