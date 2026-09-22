import type { QuizAttempt } from '../types/models';

const CHECKPOINT_SCORE = 75;
const SHELVED_SUBJECT_IDS = new Set(['stats-prob', 'business-math']);

export interface ModuleUnlockInput {
  subjectId: string;
  moduleIndex: number;
  quizAttempts: readonly QuizAttempt[];
  checkpointQuizId: string;
}

export interface UnlockedModuleIdsInput {
  subjectId: string;
  moduleIds: readonly string[];
  checkpointQuizIds: readonly string[];
  quizAttempts: readonly QuizAttempt[];
}

export function isModuleUnlocked({
  subjectId,
  moduleIndex,
  quizAttempts,
  checkpointQuizId,
}: ModuleUnlockInput): boolean {
  if (SHELVED_SUBJECT_IDS.has(subjectId)) return false;
  if (moduleIndex === 0) return true;

  return quizAttempts.some(
    (attempt) => attempt.quizId === checkpointQuizId && attempt.score >= CHECKPOINT_SCORE,
  );
}

export function getUnlockedModuleIds({
  subjectId,
  moduleIds,
  checkpointQuizIds,
  quizAttempts,
}: UnlockedModuleIdsInput): string[] {
  const unlockedModuleIds: string[] = [];

  for (const [moduleIndex, moduleId] of moduleIds.entries()) {
    const checkpointQuizId = checkpointQuizIds[moduleIndex] ?? '';
    if (!isModuleUnlocked({ subjectId, moduleIndex, quizAttempts, checkpointQuizId })) break;
    unlockedModuleIds.push(moduleId);
  }

  return unlockedModuleIds;
}
