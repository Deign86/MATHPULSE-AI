import { normalizeDiagnosticTopic, type DiagnosticTopicKey } from '../lib/diagnosticTopics';

interface CompetencyAccuracy {
  correct: number;
  attempted: number;
}

export function getWeakestDiagnosticTopics(
  competencies: Record<string, CompetencyAccuracy>,
): DiagnosticTopicKey[] {
  const rankedTopics = Object.entries(competencies)
    .filter(([, accuracy]) => accuracy.attempted > 0)
    .sort(([leftName, left], [rightName, right]) => {
      const accuracyDifference = left.correct / left.attempted - right.correct / right.attempted;
      return accuracyDifference || leftName.localeCompare(rightName);
    })
    .map(([name]) => normalizeDiagnosticTopic(name))
    .filter((topic): topic is DiagnosticTopicKey => topic !== null);

  return [...new Set(rankedTopics)];
}
