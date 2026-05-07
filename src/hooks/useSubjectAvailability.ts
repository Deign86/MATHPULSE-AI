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
// Singleton store to share subscription across all hook instances (prevents N listeners)
let _sharedConfig: PlatformSubjectsConfig | null = null;
let _sharedLoading = true;
let _sharedError: string | null = null;
let _sharedUnsubscribers: Array<() => void> = [];

function _broadcastToAll() {
  // Force all hook instances to re-render with shared state
  _sharedUnsubscribers.forEach(fn => fn());
}

export function useSubjectAvailability(): UseSubjectAvailabilityResult {
  const [localConfig, setLocalConfig] = useState<PlatformSubjectsConfig | null>(_sharedConfig);
  const [loading, setLoading] = useState(_sharedLoading);
  const [error, setError] = useState<string | null>(_sharedError);

  useEffect(() => {
    // Register this instance for broadcasts
    const broadcaster = () => {
      setLocalConfig(_sharedConfig);
      setLoading(_sharedLoading);
      setError(_sharedError);
    };
    _sharedUnsubscribers.push(broadcaster);

    // If no subscription exists yet, start one
    if (!_sharedConfig && _sharedLoading) {
      getSubjectAvailability()
        .then((initialConfig) => {
          _sharedConfig = initialConfig;
          _sharedLoading = false;
          _broadcastToAll();
        })
        .catch((err) => {
          console.error('[useSubjectAvailability] initial fetch error:', err);
          _sharedError = 'Failed to load subject availability';
          _sharedLoading = false;
          _broadcastToAll();
        });

      const unsubscribe = subscribeToSubjectAvailability((liveConfig) => {
        _sharedConfig = liveConfig;
        _sharedLoading = false;
        _sharedError = null;
        _broadcastToAll();
      });
      _sharedUnsubscribers.push(unsubscribe);
    }

    return () => {
      const idx = _sharedUnsubscribers.indexOf(broadcaster);
      if (idx > -1) _sharedUnsubscribers.splice(idx, 1);
    };
  }, []);

  const isSubjectAvailable = useCallback(
    (subjectId: string): boolean => {
      // Use shared config with fallback
      const cfg = localConfig || _sharedConfig;
      return cfg?.subjects[subjectId]?.available ?? true;
    },
    [localConfig],
  );

  const getSubjectEntry = useCallback(
    (subjectId: string): SubjectAvailabilityEntry | undefined => {
      const cfg = localConfig || _sharedConfig;
      return cfg?.subjects[subjectId];
    },
    [localConfig],
  );

  return {
    availability: (localConfig || _sharedConfig)?.subjects ?? {},
    config: localConfig || _sharedConfig,
    loading: loading || _sharedLoading,
    error: error || _sharedError,
    isSubjectAvailable,
    getSubjectEntry,
  };
}
