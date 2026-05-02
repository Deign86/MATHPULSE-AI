export type AIHealthStatus = 'Operational' | 'Loading' | 'Degraded' | 'Unknown';

export interface DeepSeekMonitoringData {
  modelId: string;
  modelStatus: AIHealthStatus;
  avgResponseTimeMs: number;

  embeddingModelId: string;
  embeddingModelStatus: AIHealthStatus;

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

  provider: string;
  apiBaseUrl: string;
}

export interface DeepSeekMonitoringResponse {
  success: boolean;
  data: DeepSeekMonitoringData;
}

export type HFMonitoringData = DeepSeekMonitoringData;
export type HFMonitoringResponse = DeepSeekMonitoringResponse;
export type HFHealthStatus = AIHealthStatus;