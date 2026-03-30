import { WeakTopic } from "./riskAnalyzer";

interface LearningPathDecisionInput {
  gradeLevel: string;
  atRiskSubjects: string[];
  weakTopics: WeakTopic[];
}

interface LearningPathDecision {
  nextTopicGroupId: string;
  rationale: string;
  reasonCode: string;
}

const SUBJECT_TO_G11_TOPIC: Record<string, string> = {
  "gen-math": "g11-q1-functions-foundations",
  "stats-prob": "g11-q3-interest-annuities",
  "pre-calc": "g11-q2-inverse-functions",
  "basic-calc": "g11-q4-logic-propositions",
  Functions: "g11-q1-functions-foundations",
  BusinessMath: "g11-q3-interest-annuities",
  Logic: "g11-q4-logic-propositions",
};

const LEGACY_TOPIC_TO_CANONICAL: Record<string, string> = {
  functions_foundations: "g11-q1-functions-foundations",
  rational_functions: "g11-q1-rational-functions",
  inverse_functions: "g11-q2-inverse-functions",
  exponential_functions: "g11-q2-exponential-functions",
  logarithmic_functions: "g11-q2-logarithmic-functions",
  inverse_exponential_logarithmic: "g11-q2-inverse-functions",
  business_interest_annuities: "g11-q3-interest-annuities",
  business_stocks_bonds_loans: "g11-q3-stocks-bonds-loans",
  logic_propositions: "g11-q4-logic-propositions",
  logic_syllogisms_proof: "g11-q4-syllogisms-proof-disproof",
};

const G11_TOPIC_SEQUENCE_CANONICAL: string[] = [
  "g11-q1-functions-foundations",
  "g11-q1-rational-functions",
  "g11-q2-inverse-functions",
  "g11-q2-exponential-functions",
  "g11-q2-logarithmic-functions",
  "g11-q3-interest-annuities",
  "g11-q3-stocks-bonds-loans",
  "g11-q4-logic-propositions",
  "g11-q4-syllogisms-proof-disproof",
];

const SUBJECT_TO_G12_TOPIC: Record<string, string> = {
  "finite-math-1": "g12-fm1-q1-counting",
  "finite_math_1": "g12-fm1-q1-counting",
  "finite-math-2": "g12-fm2-q1-matrices",
  "finite_math_2": "g12-fm2-q1-matrices",
  "advanced-statistics": "g12-advstat-q1-probability-review",
  "advanced-statistics-and-data-analysis": "g12-advstat-q1-probability-review",
  "stats-prob": "g12-advstat-q1-probability-review",
  "adv-stat": "g12-advstat-q1-probability-review",
};

const LEGACY_TOPIC_TO_G12_CANONICAL: Record<string, string> = {
  g12_fm1_q1_counting: "g12-fm1-q1-counting",
  g12_fm1_q2_probability: "g12-fm1-q2-probability",
  g12_fm1_q3_decision: "g12-fm1-q3-decision",
  g12_fm1_q4_project: "g12-fm1-q4-project",
  g12_fm2_q1_matrices: "g12-fm2-q1-matrices",
  g12_fm2_q2_linear_programming: "g12-fm2-q2-linear-programming",
  g12_fm2_q3_networks: "g12-fm2-q3-networks",
  g12_fm2_q4_capstone: "g12-fm2-q4-capstone",
  g12_advstat_q1_probability_review: "g12-advstat-q1-probability-review",
  g12_advstat_q2_inference: "g12-advstat-q2-inference",
  g12_advstat_q3_regression: "g12-advstat-q3-regression",
  g12_advstat_q4_data_storytelling: "g12-advstat-q4-data-storytelling",
};

const G12_TOPIC_SEQUENCE_CANONICAL: string[] = [
  "g12-fm1-q1-counting",
  "g12-fm1-q2-probability",
  "g12-fm1-q3-decision",
  "g12-fm1-q4-project",
  "g12-fm2-q1-matrices",
  "g12-fm2-q2-linear-programming",
  "g12-fm2-q3-networks",
  "g12-fm2-q4-capstone",
  "g12-advstat-q1-probability-review",
  "g12-advstat-q2-inference",
  "g12-advstat-q3-regression",
  "g12-advstat-q4-data-storytelling",
];

const G12_PREREQUISITES: Record<string, string[]> = {
  "g12-fm1-q2-probability": ["g12-fm1-q1-counting"],
  "g12-fm1-q3-decision": ["g12-fm1-q2-probability"],
  "g12-fm1-q4-project": ["g12-fm1-q3-decision"],
  "g12-fm2-q2-linear-programming": ["g12-fm2-q1-matrices"],
  "g12-fm2-q3-networks": ["g12-fm2-q2-linear-programming"],
  "g12-fm2-q4-capstone": ["g12-fm2-q3-networks"],
  "g12-advstat-q2-inference": ["g12-advstat-q1-probability-review"],
  "g12-advstat-q3-regression": ["g12-advstat-q2-inference"],
  "g12-advstat-q4-data-storytelling": ["g12-advstat-q3-regression"],
};

function normalizeGrade12Topic(raw: string): string {
  return (
    SUBJECT_TO_G12_TOPIC[raw] ||
    LEGACY_TOPIC_TO_G12_CANONICAL[raw] ||
    raw
  );
}

function resolveFirstPrerequisite(topicId: string): string {
  const visited = new Set<string>();
  let current = topicId;

  while (true) {
    if (visited.has(current)) return topicId;
    visited.add(current);
    const prereqs = G12_PREREQUISITES[current];
    if (!prereqs || prereqs.length === 0) return current;
    current = prereqs[0];
  }
}

/**
 * Rule-based next-topic selector that prioritizes prerequisite gaps.
 */
export function recommendNextTopicGroup(
  input: LearningPathDecisionInput,
): LearningPathDecision {
  const { gradeLevel, atRiskSubjects, weakTopics } = input;

  if (gradeLevel === "Grade 12") {
    const weakCandidates = weakTopics
      .map((t) => normalizeGrade12Topic(t.topic))
      .filter(Boolean);

    const riskCandidates = atRiskSubjects
      .map((s) => normalizeGrade12Topic(s))
      .filter(Boolean);

    const orderedCandidates = [...new Set([...weakCandidates, ...riskCandidates])];

    const canonicalCandidates = orderedCandidates
      .map((topic) => resolveFirstPrerequisite(topic))
      .filter((topic) => G12_TOPIC_SEQUENCE_CANONICAL.includes(topic));

    for (const candidate of G12_TOPIC_SEQUENCE_CANONICAL) {
      if (canonicalCandidates.includes(candidate)) {
        return {
          nextTopicGroupId: candidate,
          rationale:
            "Prerequisite-first rule selected the earliest mapped weak or at-risk topic in the Grade 12 elective progression.",
          reasonCode: "g12_prerequisite_first",
        };
      }
    }

    for (const candidate of orderedCandidates) {
      if (G12_TOPIC_SEQUENCE_CANONICAL.includes(candidate)) {
        return {
          nextTopicGroupId: candidate,
          rationale:
            "Grade 12 recommendation used the earliest direct candidate when no prerequisite remap was needed.",
          reasonCode: "g12_direct_match",
        };
      }
    }

    if (orderedCandidates.length > 0) {
      return {
        nextTopicGroupId: G12_TOPIC_SEQUENCE_CANONICAL[0],
        rationale:
          "Grade 12 signals were detected but did not map to configured elective topics; defaulted to the elective foundations entrypoint.",
        reasonCode: "g12_fallback_unmapped_signal",
      };
    }

    return {
      nextTopicGroupId: G12_TOPIC_SEQUENCE_CANONICAL[0],
      rationale:
        "No Grade 12 weak-topic signal detected; defaulted to elective foundations for safe progression.",
      reasonCode: "g12_default_foundation",
    };
  }

  if (gradeLevel !== "Grade 11") {
    const fallback = atRiskSubjects[0] || weakTopics[0]?.topic || "elective_foundations";
    return {
      nextTopicGroupId: fallback,
      rationale:
        "Recommendation defaulted to first detected risk area; no grade-specific graph is configured for this level.",
      reasonCode: "generic_fallback_risk_area",
    };
  }

  const weakCandidates = weakTopics
    .map((t) => SUBJECT_TO_G11_TOPIC[t.topic] || LEGACY_TOPIC_TO_CANONICAL[t.topic] || t.topic)
    .filter(Boolean);

  const riskCandidates = atRiskSubjects
    .map((s) => SUBJECT_TO_G11_TOPIC[s] || LEGACY_TOPIC_TO_CANONICAL[s] || s)
    .filter(Boolean);

  const ordered = [...new Set([...weakCandidates, ...riskCandidates])];

  for (const prerequisiteTopic of G11_TOPIC_SEQUENCE_CANONICAL) {
    if (ordered.includes(prerequisiteTopic)) {
      return {
        nextTopicGroupId: prerequisiteTopic,
        rationale:
          "Prerequisite-first rule selected the earliest weak or at-risk topic in the Grade 11 progression.",
        reasonCode: "g11_prerequisite_first",
      };
    }
  }

  return {
    nextTopicGroupId: G11_TOPIC_SEQUENCE_CANONICAL[0],
    rationale:
      "No explicit weak-topic match detected; defaulted to foundational topic for safe progression.",
    reasonCode: "g11_default_foundation",
  };
}
