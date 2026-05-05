/**
 * @file useDynamicModules.ts
 * React hook for real-time subscription to dynamic modules from Firestore.
 * Subscribes to `dynamic_modules` where status == 'published',
 * optionally filtered by subjectId.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToDynamicModules,
  type DynamicModule,
} from '../services/dynamicModuleService';

// ─────────────────────────────────────────────────────────────────────────────
// Result shape
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDynamicModulesResult {
  /** List of published dynamic modules (real-time from Firestore) */
  dynamicModules: DynamicModule[];
  /** Whether the initial snapshot is still being fetched */
  loading: boolean;
  /** Any error from the subscription */
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook that subscribes to real-time dynamic modules from Firestore.
 *
 * Usage:
 *   const { dynamicModules, loading, error } = useDynamicModules();
 *   // OR with subject filter:
 *   const { dynamicModules, loading } = useDynamicModules('gen-math');
 */
export function useDynamicModules(
  subjectId?: string,
): UseDynamicModulesResult {
  const [dynamicModules, setDynamicModules] = useState<DynamicModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribed = false;

    const unsubscribe = subscribeToDynamicModules(
      (modules) => {
        if (unsubscribed) return;
        setDynamicModules(modules);
        setLoading(false);
        setError(null);
      },
      subjectId,
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, [subjectId]);

  return {
    dynamicModules,
    loading,
    error,
  };
}
