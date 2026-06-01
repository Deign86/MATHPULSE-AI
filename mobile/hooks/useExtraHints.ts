// mobile/hooks/useExtraHints.ts
// Extra-hint timer hook: surfaces a hint after 60 seconds on the same question.

import { useState, useEffect, useRef, useCallback } from 'react';

const EXTRA_HINT_THRESHOLD_SEC = 60;
const TICK_INTERVAL_MS = 1000;

export interface ExtraHintsState {
  /** Seconds elapsed on the current question */
  timeSpent: number;
  /** True when the time-spent threshold (60s) has been reached */
  shouldShowExtraHint: boolean;
  /** Reset the timer to 0 — call when moving to a new question */
  reset: () => void;
  /** Monotonic tick counter that increments every second */
  tick: number;
}

/**
 * Auto-starting timer that tracks time spent on a question and signals
 * when an extra hint should be surfaced.
 *
 * The timer starts on mount and runs at 1-second granularity. After
 * 60 seconds have elapsed, `shouldShowExtraHint` flips to `true`.
 *
 * Call `reset()` when the user moves to a new question to restart the
 * countdown.
 *
 * @returns Timer state with elapsed time, hint flag, reset function, and tick counter.
 */
export function useExtraHints(): ExtraHintsState {
  const [timeSpent, setTimeSpent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, TICK_INTERVAL_MS);
  }, [clearTimer]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  const shouldShowExtraHint = timeSpent >= EXTRA_HINT_THRESHOLD_SEC;

  const reset = useCallback(() => {
    setTimeSpent(0);
    startTimer();
  }, [startTimer]);

  return {
    timeSpent,
    shouldShowExtraHint,
    reset,
    tick: timeSpent,
  };
}
