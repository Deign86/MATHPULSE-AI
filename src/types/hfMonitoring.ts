import type { Timestamp } from 'firebase/firestore';

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

export interface AIUsageLog {
  featureId: string;
  featureName: string;
  month: string;
  requestCount: number;
  estimatedCostUSD: number;
  lastUpdated: Timestamp | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Healthy' | 'Degraded' | 'Down';
}

export interface AIUsageStats {
  totalRequests: number;
  totalCost: number;
  featureBreakdown: AIUsageLog[];
}

export type HFMonitoringData = DeepSeekMonitoringData;
export type HFMonitoringResponse = DeepSeekMonitoringResponse;
export type HFHealthStatus = AIHealthStatus;