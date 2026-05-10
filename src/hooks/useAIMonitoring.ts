import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getSystemHealth,
  getTotalSpend,
  getHighestCostFeature,
  getMostActiveFeature,
} from '../services/aiMonitoringService';
import type { AIUsageLog } from '../types/hfMonitoring';

export interface UseAIMonitoringReturn {
  stats: AIUsageLog[];
  systemHealth: 'Healthy' | 'Degraded' | 'Down';
  totalSpend: number;
  highestCostFeature: AIUsageLog | null;
  mostActiveFeature: AIUsageLog | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAIMonitoring(month?: string): UseAIMonitoringReturn {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const [stats, setStats] = useState<AIUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, 'aiUsageLogs'),
      where('month', '==', targetMonth)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: AIUsageLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AIUsageLog;
          logs.push(data);
        });
        setStats(logs);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useAIMonitoring] Firestore error:', err);
        setError('Failed to load AI usage data. Please try again.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth, refreshKey]);

  return {
    stats,
    systemHealth: getSystemHealth(stats),
    totalSpend: getTotalSpend(stats),
    highestCostFeature: getHighestCostFeature(stats),
    mostActiveFeature: getMostActiveFeature(stats),
    isLoading,
    error,
    refresh,
  };
}
