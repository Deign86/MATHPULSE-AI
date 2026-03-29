import * as functions from "firebase-functions";

export type MasteryStatus =
  | "mastered"
  | "needs_review"
  | "critical_gap"
  | "insufficient_evidence";

export interface RuntimeTopicDiagnosticPolicy {
  topicGroupId: string;
  minItemCount: number;
  confidence?: "high" | "medium" | "low";
  difficultyMix: {
    basic: number;
    proficient: number;
    advanced: number;
  };
  masteredThreshold: number;
  needsReviewThreshold: number;
}

export interface RuntimeDiagnosticPolicy {
  id: string;
  versionSetId: string;
  gradeLevel: "Grade 11" | "Grade 12";
  confidence?: "high" | "medium" | "low";
  sourceRefs?: string[];
  thresholds: {
    mastered: number;
    needsReview: number;
    criticalGap: number;
  };
  byTopicGroup: RuntimeTopicDiagnosticPolicy[];
}

export interface TopicMasteryScore {
  topicGroupId: string;
  score: number;
  evidenceCount: number;
  minItemCount: number;
  status: MasteryStatus;
  sourceKeys: string[];
  thresholds: {
    mastered: number;
    needsReview: number;
  };
}

export interface DiagnosticPolicyCheckResult {
  isValid: boolean;
  errors: string[];
}

export interface DiagnosticPolicyEvaluation {
  policyId: string;
  versionSetId: string;
  gradeLevel: "Grade 11" | "Grade 12";
  byTopicGroup: Record<string, TopicMasteryScore>;
  summary: {
    mastered: number;
    needsReview: number;
    criticalGap: number;
    insufficientEvidence: number;
    evaluatedTopicCount: number;
  };
}

export const CURRICULUM_VERSION_SET_BY_GRADE: Record<string, string> = {
  "Grade 11": "g11-core-genmath-legacy-detail-strengthened-structure",
  "Grade 12": "g12-math-electives-strengthened-template",
};

export function resolveCurriculumVersionSetId(gradeLevel: string): string {
  return CURRICULUM_VERSION_SET_BY_GRADE[gradeLevel] || CURRICULUM_VERSION_SET_BY_GRADE["Grade 11"];
}

export const TOPIC_GROUP_ALIASES: Record<string, string[]> = {
  "g11-q1-functions-foundations": ["g11-q1-functions-foundations", "functions_foundations"],
  "g11-q1-rational-functions": ["g11-q1-rational-functions", "rational_functions"],
  "g11-q2-inverse-functions": ["g11-q2-inverse-functions", "inverse_functions"],
  "g11-q2-exponential-functions": ["g11-q2-exponential-functions", "exponential_functions"],
  "g11-q2-logarithmic-functions": ["g11-q2-logarithmic-functions", "logarithmic_functions"],
  "g11-q3-interest-annuities": [
    "g11-q3-interest-annuities",
    "business_interest_annuities",
    "stats-prob",
  ],
  "g11-q3-stocks-bonds-loans": [
    "g11-q3-stocks-bonds-loans",
    "business_stocks_bonds_loans",
  ],
  "g11-q4-logic-propositions": ["g11-q4-logic-propositions", "logic_propositions", "basic-calc"],
  "g11-q4-syllogisms-proof-disproof": [
    "g11-q4-syllogisms-proof-disproof",
    "logic_syllogisms_proof",
  ],
  "g12-fm1-q1-counting": ["g12-fm1-q1-counting", "g12_fm1_q1_counting", "finite-math-1"],
  "g12-fm1-q2-probability": ["g12-fm1-q2-probability", "g12_fm1_q2_probability"],
  "g12-fm1-q3-decision": ["g12-fm1-q3-decision", "g12_fm1_q3_decision"],
  "g12-fm1-q4-project": ["g12-fm1-q4-project", "g12_fm1_q4_project"],
  "g12-fm2-q1-matrices": ["g12-fm2-q1-matrices", "g12_fm2_q1_matrices", "finite-math-2"],
  "g12-fm2-q2-linear-programming": ["g12-fm2-q2-linear-programming", "g12_fm2_q2_linear_programming"],
  "g12-fm2-q3-networks": ["g12-fm2-q3-networks", "g12_fm2_q3_networks"],
  "g12-fm2-q4-capstone": ["g12-fm2-q4-capstone", "g12_fm2_q4_capstone"],
  "g12-advstat-q1-probability-review": [
    "g12-advstat-q1-probability-review",
    "g12_advstat_q1_probability_review",
    "advanced-statistics",
    "stats-prob",
  ],
  "g12-advstat-q2-inference": ["g12-advstat-q2-inference", "g12_advstat_q2_inference"],
  "g12-advstat-q3-regression": ["g12-advstat-q3-regression", "g12_advstat_q3_regression"],
  "g12-advstat-q4-data-storytelling": [
    "g12-advstat-q4-data-storytelling",
    "g12_advstat_q4_data_storytelling",
  ],
};

export const RUNTIME_DIAGNOSTIC_POLICIES: RuntimeDiagnosticPolicy[] = [
  {
    id: "diag-policy-g11-general-math-v1",
    versionSetId: "g11-core-genmath-legacy-detail-strengthened-structure",
    gradeLevel: "Grade 11",
    confidence: "high",
    sourceRefs: ["deped-k12-general-math-cg", "deped-strengthened-shs-structure"],
    thresholds: {
      mastered: 0.8,
      needsReview: 0.6,
      criticalGap: 0,
    },
    byTopicGroup: [
      {
        topicGroupId: "g11-q1-functions-foundations",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 50, proficient: 35, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q1-rational-functions",
        minItemCount: 10,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q2-inverse-functions",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q2-exponential-functions",
        minItemCount: 10,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q2-logarithmic-functions",
        minItemCount: 10,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q3-interest-annuities",
        minItemCount: 10,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q3-stocks-bonds-loans",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 50, proficient: 35, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q4-logic-propositions",
        minItemCount: 9,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
      {
        topicGroupId: "g11-q4-syllogisms-proof-disproof",
        minItemCount: 9,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
        masteredThreshold: 0.8,
        needsReviewThreshold: 0.6,
      },
    ],
  },
  {
    id: "diag-policy-g12-electives-explicit-v1",
    versionSetId: "g12-math-electives-strengthened-template",
    gradeLevel: "Grade 12",
    confidence: "high",
    sourceRefs: [
      "g12-finite-mathematics-1-template",
      "g12-finite-mathematics-2-template",
    ],
    thresholds: {
      mastered: 0.78,
      needsReview: 0.58,
      criticalGap: 0,
    },
    byTopicGroup: [
      {
        topicGroupId: "g12-fm1-q1-counting",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 50, proficient: 35, advanced: 15 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm1-q2-probability",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm1-q3-decision",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 45, advanced: 15 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm1-q4-project",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 35, proficient: 45, advanced: 20 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm2-q1-matrices",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 45, proficient: 40, advanced: 15 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm2-q2-linear-programming",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 45, advanced: 15 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm2-q3-networks",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 40, proficient: 40, advanced: 20 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
      {
        topicGroupId: "g12-fm2-q4-capstone",
        minItemCount: 8,
        confidence: "high",
        difficultyMix: { basic: 35, proficient: 45, advanced: 20 },
        masteredThreshold: 0.78,
        needsReviewThreshold: 0.58,
      },
    ],
  },
];

function isFiniteRatio(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function approxEqual(value: number, expected: number, tolerance = 0.001): boolean {
  return Math.abs(value - expected) <= tolerance;
}

export function validateDiagnosticPolicy(policy: RuntimeDiagnosticPolicy): DiagnosticPolicyCheckResult {
  const errors: string[] = [];

  if (!isFiniteRatio(policy.thresholds.mastered)) {
    errors.push("thresholds.mastered must be within [0, 1]");
  }
  if (!isFiniteRatio(policy.thresholds.needsReview)) {
    errors.push("thresholds.needsReview must be within [0, 1]");
  }
  if (!isFiniteRatio(policy.thresholds.criticalGap)) {
    errors.push("thresholds.criticalGap must be within [0, 1]");
  }
  if (policy.thresholds.mastered <= policy.thresholds.needsReview) {
    errors.push("thresholds.mastered must be strictly greater than thresholds.needsReview");
  }
  if (policy.thresholds.needsReview < policy.thresholds.criticalGap) {
    errors.push("thresholds.needsReview must be >= thresholds.criticalGap");
  }

  const seen = new Set<string>();
  for (const topicPolicy of policy.byTopicGroup) {
    if (seen.has(topicPolicy.topicGroupId)) {
      errors.push(`duplicate topicGroupId detected: ${topicPolicy.topicGroupId}`);
    }
    seen.add(topicPolicy.topicGroupId);

    if (!Number.isInteger(topicPolicy.minItemCount) || topicPolicy.minItemCount <= 0) {
      errors.push(`minItemCount must be a positive integer for ${topicPolicy.topicGroupId}`);
    }

    if (!isFiniteRatio(topicPolicy.masteredThreshold)) {
      errors.push(`masteredThreshold must be within [0, 1] for ${topicPolicy.topicGroupId}`);
    }
    if (!isFiniteRatio(topicPolicy.needsReviewThreshold)) {
      errors.push(`needsReviewThreshold must be within [0, 1] for ${topicPolicy.topicGroupId}`);
    }
    if (topicPolicy.masteredThreshold <= topicPolicy.needsReviewThreshold) {
      errors.push(`masteredThreshold must be strictly greater than needsReviewThreshold for ${topicPolicy.topicGroupId}`);
    }

    const mix = topicPolicy.difficultyMix;
    const mixTotal = mix.basic + mix.proficient + mix.advanced;
    if (mix.basic < 0 || mix.proficient < 0 || mix.advanced < 0) {
      errors.push(`difficultyMix values must be non-negative for ${topicPolicy.topicGroupId}`);
    }
    if (!approxEqual(mixTotal, 100)) {
      errors.push(`difficultyMix must total 100 for ${topicPolicy.topicGroupId} (received ${mixTotal})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function resolveDiagnosticPolicy(gradeLevel: string): RuntimeDiagnosticPolicy | null {
  const policy = RUNTIME_DIAGNOSTIC_POLICIES.find((item) => item.gradeLevel === gradeLevel);
  if (!policy) return null;

  const validation = validateDiagnosticPolicy(policy);
  if (!validation.isValid) {
    const details = validation.errors.join("; ");
    throw new Error(`Invalid diagnostic policy for ${gradeLevel}: ${details}`);
  }

  return policy;
}

function classifyStatus(
  score: number,
  evidenceCount: number,
  minItemCount: number,
  masteredThreshold: number,
  needsReviewThreshold: number,
): MasteryStatus {
  if (evidenceCount < minItemCount) return "insufficient_evidence";
  if (score >= masteredThreshold) return "mastered";
  if (score >= needsReviewThreshold) return "needs_review";
  return "critical_gap";
}

export function evaluateDiagnosticPolicy(
  gradeLevel: string,
  questionBreakdown?: Record<string, { correct: boolean }[]>,
): DiagnosticPolicyEvaluation | null {
  const policy = resolveDiagnosticPolicy(gradeLevel);
  if (!policy) {
    functions.logger.info("[POLICY] No diagnostic policy configured for grade level", { gradeLevel });
    return null;
  }

  const aliasToTopic = new Map<string, string>();
  for (const topicPolicy of policy.byTopicGroup) {
    const aliases = TOPIC_GROUP_ALIASES[topicPolicy.topicGroupId] || [topicPolicy.topicGroupId];
    for (const alias of aliases) {
      aliasToTopic.set(alias, topicPolicy.topicGroupId);
    }
  }

  const bucket = new Map<string, { attempted: number; correct: number; sourceKeys: Set<string> }>();

  if (questionBreakdown) {
    for (const [rawKey, items] of Object.entries(questionBreakdown)) {
      const topicGroupId = aliasToTopic.get(rawKey) || aliasToTopic.get(rawKey.toLowerCase());
      if (!topicGroupId || !Array.isArray(items) || items.length === 0) continue;

      const current = bucket.get(topicGroupId) || {
        attempted: 0,
        correct: 0,
        sourceKeys: new Set<string>(),
      };
      current.attempted += items.length;
      current.correct += items.filter((item) => item.correct).length;
      current.sourceKeys.add(rawKey);
      bucket.set(topicGroupId, current);
    }
  }

  const byTopicGroup: Record<string, TopicMasteryScore> = {};
  let mastered = 0;
  let needsReview = 0;
  let criticalGap = 0;
  let insufficientEvidence = 0;

  for (const topicPolicy of policy.byTopicGroup) {
    const evidence = bucket.get(topicPolicy.topicGroupId);
    const attempted = evidence?.attempted || 0;
    const correct = evidence?.correct || 0;
    const score = attempted > 0 ? Math.round((correct / attempted) * 10000) / 10000 : 0;

    const status = classifyStatus(
      score,
      attempted,
      topicPolicy.minItemCount,
      topicPolicy.masteredThreshold,
      topicPolicy.needsReviewThreshold,
    );

    if (status === "mastered") mastered += 1;
    if (status === "needs_review") needsReview += 1;
    if (status === "critical_gap") criticalGap += 1;
    if (status === "insufficient_evidence") insufficientEvidence += 1;

    byTopicGroup[topicPolicy.topicGroupId] = {
      topicGroupId: topicPolicy.topicGroupId,
      score,
      evidenceCount: attempted,
      minItemCount: topicPolicy.minItemCount,
      status,
      sourceKeys: Array.from(evidence?.sourceKeys || []),
      thresholds: {
        mastered: topicPolicy.masteredThreshold,
        needsReview: topicPolicy.needsReviewThreshold,
      },
    };
  }

  return {
    policyId: policy.id,
    versionSetId: policy.versionSetId,
    gradeLevel: policy.gradeLevel,
    byTopicGroup,
    summary: {
      mastered,
      needsReview,
      criticalGap,
      insufficientEvidence,
      evaluatedTopicCount: policy.byTopicGroup.length,
    },
  };
}

export function runDiagnosticPolicySanityChecks(): DiagnosticPolicyCheckResult {
  const errors: string[] = [];

  for (const policy of RUNTIME_DIAGNOSTIC_POLICIES) {
    const result = validateDiagnosticPolicy(policy);
    if (!result.isValid) {
      errors.push(...result.errors.map((error) => `${policy.id}: ${error}`));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
