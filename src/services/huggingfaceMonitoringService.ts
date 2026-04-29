import { apiFetch } from './apiService';
import type { HFMonitoringData, HFMonitoringResponse } from '../types/hfMonitoring';

export async function fetchHFMonitoringData(): Promise<HFMonitoringData> {
  const response = await apiFetch<HFMonitoringResponse>('/api/hf/monitoring', {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error('Failed to fetch HF monitoring data');
  }

  return response.data;
}

export async function probeModelLatency(modelId: string): Promise<number> {
  const start = performance.now();
  await apiFetch<{ success: boolean }>(`/api/hf/monitoring?probe=true&model=${modelId}`, {
    method: 'GET',
  });
  return Math.round(performance.now() - start);
}

export function mapHFStatusToHealth(
  modelLoaded: boolean,
  errorRate: number,
): 'Operational' | 'Loading' | 'Degraded' {
  if (!modelLoaded) return 'Loading';
  if (errorRate > 0.2) return 'Degraded';
  return 'Operational';
}

export function resolveHealthStatus(data: HFMonitoringData): 'Operational' | 'Degraded' | 'Loading' {
  if (data.modelStatus === 'Loading') return 'Loading';
  if (data.avgResponseTimeMs > 5000 || data.modelStatus === 'Degraded') return 'Degraded';
  return 'Operational';
}