/**
 * useProgress.ts
 *
 * Custom hook encapsulating XP-activity and progress queries.
 * Fetches the last 7 days of XP activities, aggregates them by
 * day-of-week, and computes the current level from lifetime XP
 * stored in useGamificationStore.
 *
 * Returns:
 * ```ts
 * {
 *   activities: XPActivity[],
 *   aggregated: Record<string, number>,  // e.g. { Mon: 150, Tue: 300, ... }
 *   currentLevel: number,
 *   totalXP: number,
 *   currentXP: number,
 *   isLoading: boolean,
 *   error: string | null,
 *   refresh: () => Promise<void>,
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useGamificationStore } from '../stores/useGamificationStore';
import { getXPActivities, computeLevel } from '../services/gamificationService';
import type { XPActivity } from '../types/models';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Aggregate an array of XPActivities by day-of-week label.
 * @returns A record mapping short day names (Mon, Tue, …) to total XP earned.
 */
function aggregateByDay(activities: XPActivity[], timeZone: string = 'Asia/Manila'): Record<string, number> {
  const map: Record<string, number> = {};

  for (const activity of activities) {
    const date =
      typeof activity.timestamp === 'string'
        ? new Date(activity.timestamp)
        : activity.timestamp;

    // Build the date string in the target timezone to determine the correct day
    const dayIndex = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    }).format(date);

    map[dayIndex] = (map[dayIndex] ?? 0) + activity.xpEarned;
  }

  return map;
}

interface UseProgressReturn {
  activities: XPActivity[];
  aggregated: Record<string, number>;
  currentLevel: number;
  totalXP: number;
  currentXP: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProgress(): UseProgressReturn {
  const uid = useAuthStore((s) => s.user?.uid);
  const totalXP = useGamificationStore((s) => s.xp);

  const currentXP = useGamificationStore((s) => s.currentXP);

  const [activities, setActivities] = useState<XPActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getXPActivities(uid, 7);
      setActivities(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load progress';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const aggregated = aggregateByDay(activities);
  const currentLevel = computeLevel(totalXP);

  return {
    activities,
    aggregated,
    currentLevel,
    totalXP,
    currentXP,
    isLoading,
    error,
    refresh: load,
  };
}
