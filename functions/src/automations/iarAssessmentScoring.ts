import { IARWorkflowMode } from "../config/constants";
import { SubjectScore } from "./riskAnalyzer";

export type IARTopicArea = "Functions" | "BusinessMath" | "Logic";
export type TopicClassification = "Mastered" | "NeedsReview" | "HighRisk";
export type IARAssessmentState =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped_unassessed"
  | "deep_diagnostic_required"
  | "deep_diagnostic_in_progress"
  | "placed";

interface IARQuestionResult {
  correct: boolean;
  difficulty?: "basic" | "standard" | "challenge";
  gradeLevelTag?: "G11" | "G12Candidate";
}

interface DeriveIARInsightsInput {
  results: SubjectScore[];
  questionBreakdown?: Record<string, IARQuestionResult[]>;
}

interface RemediationSummaryInput {
  total: number;
  queued: number;
  inProgress: number;
  outstanding: number;
}

export interface IARAssessmentInsights {
  topicScores: Record<IARTopicArea, number>;
  topicClassifications: Record<IARTopicArea, TopicClassification>;
  priorityTopics: IARTopicArea[];
  deepDiagnosticTopics: IARTopicArea[];
  atRiskSubjectIds: IARTopicArea[];
  startingQuarterG11: "Q1" | "Q2" | "Q3" | "Q4";
  riskFlags: string[];
  g12ReadinessIndicators: {
    readyForFiniteMath: boolean;
    readyForAdvancedStats: boolean;
    readyForCalcIntro: boolean;
    needsStrongerFunctions: boolean;
    needsStrongerBusinessMath: boolean;
  };
  recommendedNextTopicGroupId: string;
  recommendationRationale: string;
  recommendationReasonCode: string;
}

const TOPIC_ORDER: IARTopicArea[] = ["Functions", "BusinessMath", "Logic"];

function classifyTopicScore(score: number): TopicClassification {
  if (score >= 75) return "Mastered";
  if (score >= 40) return "NeedsReview";
  return "HighRisk";
}

function classificationRank(value: TopicClassification): number {
  if (value === "HighRisk") return 0;
  if (value === "NeedsReview") return 1;
  return 2;
}

function inferScoreFromResults(topic: IARTopicArea, results: SubjectScore[]): number {
  const fallbackAliases: Record<IARTopicArea, string[]> = {
    Functions: ["Functions", "gen-math", "pre-calc"],
    BusinessMath: ["BusinessMath", "stats-prob"],
    Logic: ["Logic", "basic-calc"],
  };

  const aliasSet = new Set(fallbackAliases[topic]);
  const found = results.find((item) => aliasSet.has(item.subject));
  const raw = found?.score ?? 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getCanonicalRecommendationTopic(topic: IARTopicArea): string {
  if (topic === "Functions") return "g11-q1-functions-foundations";
  if (topic === "BusinessMath") return "g11-q3-interest-annuities";
  return "g11-q4-logic-propositions";
}

export function deriveIARAssessmentInsights(
  input: DeriveIARInsightsInput,
): IARAssessmentInsights {
  const { results, questionBreakdown } = input;

  const topicScores = TOPIC_ORDER.reduce<Record<IARTopicArea, number>>((acc, topic) => {
    const questions = questionBreakdown?.[topic] || [];
    if (questions.length === 0) {
      acc[topic] = inferScoreFromResults(topic, results);
      return acc;
    }

    const correct = questions.filter((entry) => entry.correct).length;
    acc[topic] = Math.round((correct / questions.length) * 100);
    return acc;
  }, {
    Functions: 0,
    BusinessMath: 0,
    Logic: 0,
  });

  const topicClassifications = TOPIC_ORDER.reduce<Record<IARTopicArea, TopicClassification>>((acc, topic) => {
    acc[topic] = classifyTopicScore(topicScores[topic]);
    return acc;
  }, {
    Functions: "HighRisk",
    BusinessMath: "HighRisk",
    Logic: "HighRisk",
  });

  const priorityTopics = [...TOPIC_ORDER].sort((left, right) => {
    const classificationDelta =
      classificationRank(topicClassifications[left]) - classificationRank(topicClassifications[right]);
    if (classificationDelta !== 0) return classificationDelta;

    const scoreDelta = topicScores[left] - topicScores[right];
    if (scoreDelta !== 0) return scoreDelta;

    return left.localeCompare(right);
  });

  const deepDiagnosticTopics = priorityTopics.filter(
    (topic) => topicClassifications[topic] !== "Mastered",
  );

  const riskFlags: string[] = [];
  for (const topic of TOPIC_ORDER) {
    const classification = topicClassifications[topic];
    if (classification === "HighRisk") riskFlags.push(`high_risk:${topic}`);
    if (classification === "NeedsReview") riskFlags.push(`needs_review:${topic}`);
  }

  const challengeItems = Object.values(questionBreakdown || {})
    .flat()
    .filter((entry) => entry.difficulty === "challenge" || entry.gradeLevelTag === "G12Candidate");
  const challengeCorrect = challengeItems.filter((entry) => entry.correct).length;
  const challengeRatio = challengeItems.length > 0 ? challengeCorrect / challengeItems.length : 1;

  const masteredCount = TOPIC_ORDER.filter(
    (topic) => topicClassifications[topic] === "Mastered",
  ).length;
  const overallG11MasteryRatio = masteredCount / TOPIC_ORDER.length;

  const g12ReadinessIndicators = {
    readyForFiniteMath:
      overallG11MasteryRatio >= 0.67 &&
      topicClassifications.Functions !== "HighRisk" &&
      topicClassifications.BusinessMath !== "HighRisk" &&
      challengeRatio >= 0.5,
    readyForAdvancedStats:
      topicClassifications.Logic === "Mastered" &&
      challengeRatio >= 0.67,
    readyForCalcIntro:
      topicClassifications.Functions === "Mastered" &&
      challengeRatio >= 0.67,
    needsStrongerFunctions: topicClassifications.Functions !== "Mastered",
    needsStrongerBusinessMath: topicClassifications.BusinessMath !== "Mastered",
  };

  const firstPriority = priorityTopics[0];
  const startingQuarterByTopic: Record<IARTopicArea, "Q1" | "Q2" | "Q3" | "Q4"> = {
    Functions: "Q1",
    BusinessMath: "Q3",
    Logic: "Q4",
  };

  const recommendationReasonCode = riskFlags.some((flag) => flag.startsWith("high_risk:"))
    ? "iar_high_risk_detected"
    : riskFlags.some((flag) => flag.startsWith("needs_review:"))
      ? "iar_needs_review_detected"
      : "iar_mastery_ready";

  const recommendationRationale = recommendationReasonCode === "iar_mastery_ready"
    ? "IAR indicates mastered baseline competencies; continue from Grade 11 foundations."
    : "IAR identified competency gaps; placement is ordered by severity then score.";

  return {
    topicScores,
    topicClassifications,
    priorityTopics,
    deepDiagnosticTopics,
    atRiskSubjectIds: deepDiagnosticTopics,
    startingQuarterG11: startingQuarterByTopic[firstPriority] || "Q1",
    riskFlags,
    g12ReadinessIndicators,
    recommendedNextTopicGroupId: getCanonicalRecommendationTopic(firstPriority),
    recommendationRationale,
    recommendationReasonCode,
  };
}

export function deriveIARAssessmentState(input: {
  assessmentType: "initial_assessment" | "followup_diagnostic";
  workflowMode: IARWorkflowMode;
  requiresDeepDiagnostic: boolean;
  learningPathState: "locked_pending_deep_diagnostic" | "unlocked";
  remediationSummary: RemediationSummaryInput;
}): IARAssessmentState {
  const {
    assessmentType,
    workflowMode,
    requiresDeepDiagnostic,
    learningPathState,
    remediationSummary,
  } = input;

  if (assessmentType === "followup_diagnostic") {
    if (learningPathState === "unlocked") return "placed";
    if (remediationSummary.inProgress > 0) return "deep_diagnostic_in_progress";
    if (remediationSummary.outstanding > 0) return "deep_diagnostic_required";
    return "completed";
  }

  if (workflowMode === "iar_only") {
    return learningPathState === "unlocked" ? "placed" : "completed";
  }

  if (requiresDeepDiagnostic) {
    if (learningPathState === "unlocked") return "placed";
    if (remediationSummary.inProgress > 0) return "deep_diagnostic_in_progress";
    if (remediationSummary.total > 0 || remediationSummary.outstanding > 0) {
      return "deep_diagnostic_required";
    }
    return "completed";
  }

  return learningPathState === "unlocked" ? "placed" : "completed";
}
