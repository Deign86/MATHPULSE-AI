import { DiagnosticPolicy } from '../types/models';

export const G11_GENERAL_MATH_DIAGNOSTIC_POLICY: DiagnosticPolicy = {
  id: 'diag-policy-g11-general-math-v1',
  versionSetId: 'g11-core-genmath-legacy-detail-strengthened-structure',
  gradeLevel: 'Grade 11',
  thresholds: {
    mastered: 0.8,
    needsReview: 0.6,
    criticalGap: 0.0,
  },
  byTopicGroup: [
    {
      topicGroupId: 'g11-q1-functions-foundations',
      minItemCount: 8,
      difficultyMix: { basic: 50, proficient: 35, advanced: 15 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q1-rational-functions',
      minItemCount: 10,
      difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q2-inverse-exponential-logarithmic',
      minItemCount: 12,
      difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q3-interest-annuities',
      minItemCount: 10,
      difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q3-stocks-bonds-loans',
      minItemCount: 8,
      difficultyMix: { basic: 50, proficient: 35, advanced: 15 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q4-logic-propositions',
      minItemCount: 9,
      difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
    {
      topicGroupId: 'g11-q4-syllogisms-proof-disproof',
      minItemCount: 9,
      difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
      masteredThreshold: 0.8,
      needsReviewThreshold: 0.6,
    },
  ],
};
