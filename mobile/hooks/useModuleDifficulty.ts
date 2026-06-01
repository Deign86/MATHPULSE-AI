// mobile/hooks/useModuleDifficulty.ts
// Adaptive difficulty hook: tracks consecutive wrong answers, drops difficulty
// after threshold is reached (3 wrong in a row).

import { useState, useEffect, useCallback, useMemo } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';

const WRONG_ANSWER_THRESHOLD = 3;

const dropOneLevel = (current: Difficulty): Difficulty => {
  if (current === 'hard') return 'medium';
  if (current === 'medium') return 'easy';
  return 'easy';
};

export interface ModuleDifficultyState {
  /** Current difficulty level for the active module */
  currentDifficulty: Difficulty;
  /** Call after each answer: pass `true` for correct, `false` for incorrect */
  recordAnswer: (isCorrect: boolean) => void;
  /** True when the threshold of consecutive wrong answers has been reached */
  shouldDropDifficulty: boolean;
  /** Reset difficulty to initial value and clear wrong-answer counter */
  resetDifficulty: () => void;
}

/**
 * Tracks consecutive wrong answers and drops the module difficulty
 * when the threshold (3 wrong in a row) is reached.
 *
 * Difficulty progression: hard -> medium -> easy. Once at 'easy', it stays
 * there until explicitly reset.
 *
 * @param initialDifficulty - Starting difficulty level (default: 'medium')
 * @returns State object with current difficulty, answer recording callback,
 *          drop flag, and reset function.
 */
export function useModuleDifficulty(
  initialDifficulty: Difficulty = 'medium'
): ModuleDifficultyState {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);

  const recordAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setConsecutiveWrong(0);
    } else {
      setConsecutiveWrong((prev) => prev + 1);
    }
  }, []);

  /** Drop one difficulty level when the threshold is crossed */
  useEffect(() => {
    if (consecutiveWrong >= WRONG_ANSWER_THRESHOLD) {
      setDifficulty((prev) => dropOneLevel(prev));
      setConsecutiveWrong(0);
    }
  }, [consecutiveWrong]);

  const shouldDropDifficulty = useMemo(
    () => consecutiveWrong >= WRONG_ANSWER_THRESHOLD,
    [consecutiveWrong]
  );

  const resetDifficulty = useCallback(() => {
    setDifficulty(initialDifficulty);
    setConsecutiveWrong(0);
  }, [initialDifficulty]);

  return {
    currentDifficulty: difficulty,
    recordAnswer,
    shouldDropDifficulty,
    resetDifficulty,
  };
}
