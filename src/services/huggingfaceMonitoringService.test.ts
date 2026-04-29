import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HFMonitoringData, HFMonitoringResponse } from '../types/hfMonitoring';

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}));

vi.mock('./apiService', () => ({
  apiFetch: mockApiFetch,
}));

import { fetchHFMonitoringData, mapHFStatusToHealth, resolveHealthStatus, probeModelLatency } from './huggingfaceMonitoringService';

const mockMonitoringData: HFMonitoringData = {
  modelId: 'Qwen/QwQ-32B',
  modelStatus: 'Operational',
  avgResponseTimeMs: 1200,
  embeddingModelId: 'BAAI/bge-small-en-v1.5',
  embeddingModelStatus: 'Operational',
  inferenceBalance: 2.34,
  totalPeriodCost: 5.67,
  hubApiCallsUsed: 1420,
  hubApiCallsLimit: 2500,
  zeroGpuMinutesUsed: 8,
  zeroGpuMinutesLimit: 25,
  publicStorageUsedTB: 0.5,
  publicStorageLimitTB: 11.2,
  lastChecked: '2026-04-30T00:00:00.000Z',
  periodStart: '2026-04-01T00:00:00.000Z',
  periodEnd: '2026-05-01T00:00:00.000Z',
  activeProfile: 'dev',
  runtimeOverridesActive: false,
  resolvedModels: {
    chat: 'Qwen/QwQ-32B',
    quiz_generation: 'Qwen/QwQ-32B',
    rag_lesson: 'Qwen/QwQ-32B',
    rag_problem: 'Qwen/QwQ-32B',
    rag_analysis_context: 'Qwen/QwQ-32B',
  },
};

describe('huggingfaceMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchHFMonitoringData', () => {
    it('returns parsed data on success', async () => {
      const mockResponse: HFMonitoringResponse = {
        success: true,
        data: mockMonitoringData,
      };
      mockApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchHFMonitoringData();
      expect(result.modelId).toBe('Qwen/QwQ-32B');
      expect(result.embeddingModelId).toBe('BAAI/bge-small-en-v1.5');
      expect(result.activeProfile).toBe('dev');
    });

    it('throws on non-success response', async () => {
      mockApiFetch.mockResolvedValueOnce({ success: false, data: mockMonitoringData });
      await expect(fetchHFMonitoringData()).rejects.toThrow('Failed to fetch HF monitoring data');
    });

    it('calls the correct endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce({ success: true, data: mockMonitoringData });
      await fetchHFMonitoringData();
      expect(mockApiFetch).toHaveBeenCalledWith('/api/hf/monitoring', { method: 'GET' });
    });
  });

  describe('probeModelLatency', () => {
    it('returns a positive round-trip time', async () => {
      mockApiFetch.mockResolvedValueOnce({ success: true });
      const latency = await probeModelLatency('Qwen/QwQ-32B');
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mapHFStatusToHealth', () => {
    it('returns Loading when model is not loaded', () => {
      expect(mapHFStatusToHealth(false, 0)).toBe('Loading');
    });

    it('returns Degraded when error rate exceeds threshold', () => {
      expect(mapHFStatusToHealth(true, 0.3)).toBe('Degraded');
    });

    it('returns Operational when model is loaded and error rate is low', () => {
      expect(mapHFStatusToHealth(true, 0.1)).toBe('Operational');
    });

    it('returns Operational when error rate is exactly at threshold', () => {
      expect(mapHFStatusToHealth(true, 0.2)).toBe('Operational');
    });
  });

  describe('resolveHealthStatus', () => {
    it('returns Loading when modelStatus is Loading', () => {
      const data: HFMonitoringData = { ...mockMonitoringData, modelStatus: 'Loading' };
      expect(resolveHealthStatus(data)).toBe('Loading');
    });

    it('returns Degraded when modelStatus is Degraded', () => {
      const data: HFMonitoringData = { ...mockMonitoringData, modelStatus: 'Degraded' };
      expect(resolveHealthStatus(data)).toBe('Degraded');
    });

    it('returns Degraded when avgResponseTimeMs exceeds 5000', () => {
      const data: HFMonitoringData = { ...mockMonitoringData, avgResponseTimeMs: 6000 };
      expect(resolveHealthStatus(data)).toBe('Degraded');
    });

    it('returns Operational for normal data', () => {
      const data: HFMonitoringData = { ...mockMonitoringData, modelStatus: 'Operational', avgResponseTimeMs: 1200 };
      expect(resolveHealthStatus(data)).toBe('Operational');
    });
  });
});