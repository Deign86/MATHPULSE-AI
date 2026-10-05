// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as aiMonitoring from '../../hooks/useAIMonitoring';
import AIMonitoringPage from './AIMonitoringPage';

afterEach(cleanup);

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

  it('renders loaded nested Manila-day telemetry metrics', () => {
    // SAFETY: this fixture supplies the page's telemetry and required dashboard fields.
    vi.spyOn(aiMonitoring, 'useAIMonitoring').mockReturnValue({
      data: {
        systemStatus: 'healthy', actionRequired: false, hasPerformanceIssues: false,
        monthlyCost: 2.5, projectedMonthlyCost: 3, billingCycleLabel: 'Current cycle',
        costBreakdown: { cacheHitCost: 0, cacheMissCost: 0, outputCost: 0 }, totalUsage: 0,
        totalInputTokens: 0, totalOutputTokens: 0, cacheHitRate: 0.5, activeEngine: 'Model',
        activeEngineModelId: 'model', engineTier: 'Standard', promotionalPricingActive: false,
        promotionalPriceExpiresUtc: '', estimatedCostAfterPromo: 3, lastUpdated: '2025-02-01T00:00:00Z',
        features: [], pricingMeta: {
          activeModel: 'model', isPromotional: false, promoExpiresUtc: null, daysUntilPromoEnds: 0,
          currentInputCacheMissRate: 1, currentOutputRate: 1, fullPriceInputRate: 1, fullPriceOutputRate: 1,
        },
        telemetry: {
          dailyMetrics: [{ date: '2025-02-01', totalAttempts: 9, successfulAttempts: 8, completedRequests: 7, averageLatencyMs: 250, successRate: 88.9 }],
          totalAttempts: 9, successfulAttempts: 8, completedRequests: 7, averageLatencyMs: 250,
          successRate: 88.9, latencyDefinition: 'Completed requests only.',
          successRateDefinition: 'Successful attempts divided by all attempts.', dayTimezone: 'Asia/Manila',
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    render(<AIMonitoringPage />);

    expect(screen.getByText('Today: 9 attempts')).toBeTruthy();
    expect(screen.getByText('250 ms')).toBeTruthy();
    expect(screen.getByText('88.9%')).toBeTruthy();
    expect(screen.getByText('9 attempts; 8 successful')).toBeTruthy();
    expect(screen.getByLabelText('Daily AI attempts in Asia/Manila time')).toBeTruthy();
  });

});
