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

interface TopicMap { [key: string]: string; }

const SUBJECT_TO_G11_TOPIC: TopicMap = {
  "gen-math": "g11-q1-functions-foundations",
  "stats-prob": "g11-q3-interest-annuities",
  "business-math": "g11-q3-interest-annuities",
  "finite-math": "g11-q4-logic-propositions",
  Functions: "g11-q1-functions-foundations",
  BusinessMath: "g11-q3-interest-annuities",
  Logic: "g11-q4-logic-propositions",
};

const LEGACY_TOPIC_TO_CANONICAL: TopicMap = {
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

// Grade 11 only: no elective transition tables.

/**
 * Rule-based next-topic selector that prioritizes prerequisite gaps.
 */
export function recommendNextTopicGroup(
  input: LearningPathDecisionInput,
): LearningPathDecision {
  const { gradeLevel, atRiskSubjects, weakTopics } = input;

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
