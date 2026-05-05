import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToSubjectAvailability,
  getSubjectAvailability,
  type PlatformSubjectsConfig,
  type SubjectAvailabilityEntry,
} from '../services/platformConfigService';

// ─────────────────────────────────────────────────────────────────────────────
// useSubjectAvailability — React hook for dynamic subject availability
// ─────────────────────────────────────────────────────────────────────────────

export interface UseSubjectAvailabilityResult {
  /** Map of subjectId → availability entry (real-time from Firestore) */
  availability: Record<string, SubjectAvailabilityEntry>;
  /** Raw full config including updatedAt/updatedBy */
  config: PlatformSubjectsConfig | null;
  /** Whether the initial fetch is still in progress */
  loading: boolean;
  /** Any error that occurred during fetch/subscribe */
  error: string | null;
  /** Check if a specific subject is available (safe accessor) */
  isSubjectAvailable: (subjectId: string) => boolean;
  /** Get the availability entry for a specific subject */
  getSubjectEntry: (subjectId: string) => SubjectAvailabilityEntry | undefined;
}

/**
 * Hook that subscribes to real-time subject availability from Firestore.
 * Falls back to hardcoded defaults when Firestore is unavailable.
 *
 * Usage:
 *   const { availability, isSubjectAvailable, loading } = useSubjectAvailability();
 *   const canAccess = isSubjectAvailable('pre-calc');
 */
export function useSubjectAvailability(): UseSubjectAvailabilityResult {
  const [config, setConfig] = useState<PlatformSubjectsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribed = false;

    // Start with a one-shot fetch so we have data immediately
    getSubjectAvailability()
      .then((initialConfig) => {
        if (!unsubscribed) {
          setConfig(initialConfig);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!unsubscribed) {
          console.error('[useSubjectAvailability] initial fetch error:', err);
          setError('Failed to load subject availability');
          setLoading(false);
        }
      });

    // Then subscribe to real-time updates
    const unsubscribe = subscribeToSubjectAvailability((liveConfig) => {
      if (!unsubscribed) {
        setConfig(liveConfig);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, []);

  const isSubjectAvailable = useCallback(
    (subjectId: string): boolean => {
      return config?.subjects[subjectId]?.available ?? true;
    },
    [config],
  );

  const getSubjectEntry = useCallback(
    (subjectId: string): SubjectAvailabilityEntry | undefined => {
      return config?.subjects[subjectId];
    },
    [config],
  );

  return {
    availability: config?.subjects ?? {},
    config,
    loading,
    error,
    isSubjectAvailable,
    getSubjectEntry,
  };
}
