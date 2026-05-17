// src/services/aiMonitoringService.ts
// TODO: Review pricing after 2026-05-31
import { apiFetch } from './apiService';

export interface AIFeatureMetric {
  featureId: string;
  featureName: string;
  modelId: string;
  monthlyCost: number;
  costShare: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheHitRate: number;
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

export interface AIMonitoringSummary {
  systemStatus: 'healthy' | 'issues_found' | 'degraded';
  actionRequired: boolean;
  hasPerformanceIssues: boolean;
  monthlyCost: number;
  projectedMonthlyCost: number;
  billingCycleLabel: string;
  costBreakdown: {
    cacheHitCost: number;
    cacheMissCost: number;
    outputCost: number;
  };
  totalUsage: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheHitRate: number;
  activeEngine: string;
  activeEngineModelId: string;
  engineTier: string;
  promotionalPricingActive: boolean;
  promotionalPriceExpiresUtc: string;
  estimatedCostAfterPromo: number;
  lastUpdated: string;
  features: AIFeatureMetric[];
  pricingMeta: PricingMeta;
}

export async function fetchAIMonitoringSummary(): Promise<AIMonitoringSummary> {
  return apiFetch<AIMonitoringSummary>('/api/admin/ai-monitoring/summary');
}

export async function triggerMonitoringRefresh(): Promise<{ success: boolean; updatedAt: string; pricingUsed: Record<string, unknown> }> {
  return apiFetch('/api/admin/ai-monitoring/refresh', { method: 'POST' });
}
