// src/services/aiMonitoringService.ts
// TODO: Review pricing after 2026-05-31
import { apiFetch } from './apiService';

export interface AIFeatureMetric {
  featureId: string;
  featureName: string;
  modelId: string;
  /** Null: token usage is not logged, so cost cannot be measured. */
  monthlyCost: number | null;
  /** Share of all measured attempts in the window, as a percentage. */
  requestShare: number;
  totalRequests: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  cacheHitRate: number | null;
  isMostActive: boolean;
  isTopSpending: boolean;
  icon: string;
}

export interface PricingMeta {
  activeModel: string;
  isPromotional: boolean;
  promoExpiresUtc: string | null;
  daysUntilPromoEnds: number;
  currentInputCacheMissRate: number;
  currentOutputRate: number;
  fullPriceInputRate: number;
  fullPriceOutputRate: number;
}

export interface AIDailyMetric {
  date: string;
  totalAttempts: number;
  successfulAttempts: number;
  completedRequests: number;
  averageLatencyMs: number | null;
  successRate: number | null;
}

export interface AIMonitoringTelemetry {
  dailyMetrics: AIDailyMetric[];
  /** Attempts per logged task type over the window. */
  requestsByTaskType: { [taskType: string]: number };
  totalAttempts: number;
  successfulAttempts: number;
  completedRequests: number;
  averageLatencyMs: number | null;
  successRate: number | null;
  latencyDefinition: string;
  successRateDefinition: string;
  dayTimezone: 'Asia/Manila';
}

export interface AIMonitoringSummary {
  systemStatus: 'healthy' | 'issues_found' | 'degraded';
  actionRequired: boolean;
  hasPerformanceIssues: boolean;
  monthlyCost: number | null;
  projectedMonthlyCost: number | null;
  billingCycleLabel: string;
  costBreakdown: {
    cacheHitCost: number;
    cacheMissCost: number;
    outputCost: number;
  } | null;
  /** Explains which figures are measured and which are not logged. */
  costTrackingNote: string;
  totalUsage: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  cacheHitRate: number | null;
  activeEngine: string;
  activeEngineModelId: string;
  engineTier: string;
  promotionalPricingActive: boolean;
  promotionalPriceExpiresUtc: string;
  estimatedCostAfterPromo: number | null;
  lastUpdated: string;
  features: AIFeatureMetric[];
  pricingMeta: PricingMeta;
  telemetry: AIMonitoringTelemetry;
}

export async function fetchAIMonitoringSummary(): Promise<AIMonitoringSummary> {
  return apiFetch<AIMonitoringSummary>('/api/admin/ai-monitoring/summary');
}

/** Refresh result reported by the AI monitoring admin endpoint. */
interface MonitoringRefreshResult {
  success: boolean;
  updatedAt: string;
  /** Pricing snapshot values keyed by model identifier. */
  pricingUsed: { [model: string]: string | number | boolean };
}

export async function triggerMonitoringRefresh(): Promise<MonitoringRefreshResult> {
  return apiFetch('/api/admin/ai-monitoring/refresh', { method: 'POST' });
}
