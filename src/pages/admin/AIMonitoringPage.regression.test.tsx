// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as aiMonitoring from '../../hooks/useAIMonitoring';
import AIMonitoringPage from './AIMonitoringPage';
import type { AIMonitoringSummary } from '../../services/aiMonitoringService';

afterEach(cleanup);

const monitoringSummary: AIMonitoringSummary = {
  systemStatus: 'healthy',
  actionRequired: false,
  hasPerformanceIssues: false,
  monthlyCost: 0,
  projectedMonthlyCost: 0,
  billingCycleLabel: 'Current cycle',
  costBreakdown: { cacheHitCost: 0, cacheMissCost: 0, outputCost: 0 },
  totalUsage: 20,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  cacheHitRate: 0,
  activeEngine: 'DeepSeek',
  activeEngineModelId: 'deepseek-chat',
  engineTier: 'standard',
  promotionalPricingActive: false,
  promotionalPriceExpiresUtc: '',
  estimatedCostAfterPromo: 0,
  lastUpdated: '2026-10-05T00:00:00.000Z',
  features: [],
  pricingMeta: {
    activeModel: 'deepseek-chat',
    isPromotional: false,
    promoExpiresUtc: null,
    daysUntilPromoEnds: 0,
    currentInputCacheMissRate: 0,
    currentOutputRate: 0,
    fullPriceInputRate: 0,
    fullPriceOutputRate: 0,
  },
};

describe('AI monitoring page regressions', () => {
  it('shows its loading skeleton while metrics are loading', () => {
    // SAFETY: loading state consumes only these three hook fields.
    vi.spyOn(aiMonitoring, 'useAIMonitoring').mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() } as never);
    const { container } = render(<AIMonitoringPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('keeps the safe loading state when metrics are absent after loading', () => {
    // SAFETY: missing-data state consumes only these three hook fields.
    vi.spyOn(aiMonitoring, 'useAIMonitoring').mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as never);
    const { container } = render(<AIMonitoringPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText(/live sync active/i)).toBeNull();
  });

});
