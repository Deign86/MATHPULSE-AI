// src/hooks/useAIMonitoring.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAIMonitoringSummary, triggerMonitoringRefresh } from '../services/aiMonitoringService';
import type { AIMonitoringSummary } from '../services/aiMonitoringService';

export function useAIMonitoring() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<AIMonitoringSummary>({
    queryKey: ['ai-monitoring'],
    queryFn: fetchAIMonitoringSummary,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const refetch = async () => {
    await triggerMonitoringRefresh();
    queryClient.invalidateQueries({ queryKey: ['ai-monitoring'] });
  };

  return { data, isLoading, isError, error, refetch };
}
