export type HFHealthStatus = 'Operational' | 'Loading' | 'Degraded' | 'Unknown';

export interface HFMonitoringData {
  modelId: string;
  modelStatus: HFHealthStatus;
  avgResponseTimeMs: number;

  embeddingModelId: string;
  embeddingModelStatus: HFHealthStatus;

  inferenceBalance: number;
  totalPeriodCost: number;
  hubApiCallsUsed: number;
  hubApiCallsLimit: number;
  zeroGpuMinutesUsed: number;
  zeroGpuMinutesLimit: number;
  publicStorageUsedTB: number;
  publicStorageLimitTB: number;
  lastChecked: string;
  periodStart: string;
  periodEnd: string;

  activeProfile: string;
  runtimeOverridesActive: boolean;
  resolvedModels: Record<string, string>;
}

export interface HFMonitoringResponse {
  success: boolean;
  data: HFMonitoringData;
}