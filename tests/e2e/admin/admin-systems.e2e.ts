import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const requestCountLabel = /^\([\d,]+ reqs\)$/;
const cacheRateLabel = /^\d+% cached$/;
const costLabel = /^\$\d+\.\d{4}$/;
const pricingTitle = /^(Standard Pricing|Promotional Pricing \(75% OFF\))$/;
const promoBannerTitle = 'DeepSeek Reasoning Engine — 75% Promotional Rate Active';

const isDescending = (values: number[]) => values.every((value, index) => index === 0 || values[index - 1] >= value);

// Promo pricing ended 2026-05-31, so the real summary never renders the banner; this mocked summary has it active.
const promoEndsAt = new Date(Date.now() + 5 * 86_400_000).toISOString();
const promoSummary = {
  systemStatus: 'healthy',
  actionRequired: false,
  hasPerformanceIssues: false,
  monthlyCost: 12.5,
  projectedMonthlyCost: 13.75,
  billingCycleLabel: 'Current Billable Cycle',
  costBreakdown: { cacheHitCost: 0.5, cacheMissCost: 4, outputCost: 8 },
  costTrackingNote: 'Mocked e2e summary with cost figures supplied.',
  totalUsage: 100,
  totalInputTokens: 1000,
  totalOutputTokens: 500,
  cacheHitRate: 0.5,
  activeEngine: 'DeepSeek-V4 Pro',
  activeEngineModelId: 'deepseek-v4-pro',
  engineTier: 'High-Performance LLM',
  promotionalPricingActive: true,
  promotionalPriceExpiresUtc: promoEndsAt,
  estimatedCostAfterPromo: 50,
  lastUpdated: new Date().toISOString(),
  features: [
    {
      featureId: 'e2e_feature',
      featureName: 'E2E Feature',
      modelId: 'deepseek-v4-pro',
      monthlyCost: 12.5,
      requestShare: 100,
      totalRequests: 100,
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      cacheHitRate: 0.5,
      isMostActive: true,
      isTopSpending: true,
      icon: 'Zap',
    },
  ],
  pricingMeta: {
    activeModel: 'deepseek-v4-pro',
    isPromotional: true,
    promoExpiresUtc: promoEndsAt,
    daysUntilPromoEnds: 5,
    currentInputCacheMissRate: 0.435,
    currentOutputRate: 0.87,
    fullPriceInputRate: 1.74,
    fullPriceOutputRate: 3.48,
  },
  telemetry: {
    requestsByTaskType: { e2e_feature: 100 },
    dailyMetrics: [
      {
        date: new Date().toISOString().slice(0, 10),
        totalAttempts: 4,
        successfulAttempts: 3,
        completedRequests: 3,
        averageLatencyMs: 900,
        successRate: 75,
      },
    ],
    totalAttempts: 4,
    successfulAttempts: 3,
    completedRequests: 3,
    averageLatencyMs: 900,
    successRate: 75,
    latencyDefinition: 'Mean generation time in milliseconds across completed requests only.',
    successRateDefinition: 'Successful attempts divided by all attempts, as a percentage.',
    dayTimezone: 'Asia/Manila',
  },
};

describe('admin AI monitoring', { tags: ['admin', 'ai-monitoring'] }, () => {
  test('AI Monitoring shows the KPI cards, spending cards, cost tiers, daily attempts and feature ranking', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Platform AI usage and system health.')).toBeVisible();
    await expect(screen.getByRole('button', 'System Directory')).toBeVisible({ timeout: 45_000 });

    await expect(screen.getByText('Live Sync Active')).toBeVisible();
    await expect(screen.getByText(/^Updated \d/)).toBeVisible();
    for (const title of ['Monthly Cost', 'Active Model', 'AI Attempts (30 days)', 'Cache Hit Efficiency', 'Average Generation Time', 'Success Rate']) {
      await expect(screen.getByText(title)).toBeVisible();
    }
    for (const tier of ['Top Spending Feature', 'Most Active Feature', 'Inference Cost Tiers', 'Cached Answers', 'New Cache-Miss Input', 'Reasoning Output']) {
      await expect(screen.getByText(tier)).toBeVisible();
    }
    await expect(screen.getByText(/^\d+ attempts; \d+ successful$/).first()).toBeVisible();
    await expect(screen.getByRole('heading', 'Feature Inference & Cost Allocation')).toBeVisible();
    await expect(screen.getByText(requestCountLabel).first()).toBeVisible();
  });

  test('ranking rows are ordered by measured requests and the feature filter narrows the list', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    const requestLabels = screen.getByText(requestCountLabel);
    await expect(requestLabels.first()).toBeVisible({ timeout: 45_000 });
    const featureCount = await requestLabels.count();
    const requestCounts = async () => (await requestLabels.allTextContents()).map((label) => Number(label.replace(/\D/g, '')));

    // Token cost and cache hits are not logged (#246), so rows carry only measured request counts.
    await expect.poll(async () => isDescending(await requestCounts())).toBe(true);
    await expect(screen.getByText(costLabel)).toHaveCount(0);
    await expect(screen.getByText(cacheRateLabel)).toHaveCount(0);
    await expect(requestLabels).toHaveCount(featureCount);

    const filter = screen.getByPlaceholder('Filter features...');
    await filter.fill('zz-no-such-feature-e2e');
    await expect(requestLabels).toHaveCount(0);
    await filter.clear();
    await expect(requestLabels).toHaveCount(featureCount);
  });

  test('Refresh AI monitoring metrics re-aggregates the summary', { session: 'admin' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh AI monitoring metrics');
    await expect(refresh).toBeEnabled({ timeout: 45_000 });

    const [response] = await Promise.all([
      browser.waitForResponse('**/api/admin/ai-monitoring/refresh'),
      refresh.tap(),
    ]);
    expect(response.status).toBe(200);
    await expect(refresh).toBeEnabled();
    await expect(screen.getByText('Live Sync Active')).toBeVisible();
    await expect(screen.getByRole('heading', 'Feature Inference & Cost Allocation')).toBeVisible();
  });

  test('System Directory opens the AI Feature Directory and closes from the X and the backdrop', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    const openDirectory = screen.getByRole('button', 'System Directory');
    await expect(openDirectory).toBeVisible({ timeout: 45_000 });

    await openDirectory.tap();
    const directory = screen.getByRole('dialog', 'AI Feature Directory');
    await expect(directory).toBeVisible();
    await expect(directory.getByText('Live model deployment registry and cost metrics')).toBeVisible();
    for (const column of ['Feature', 'Model', 'Cost', 'Requests', 'Cache Hit']) {
      await expect(directory.getByRole('columnheader', column)).toBeVisible();
    }
    await expect(directory.getByRole('row').nth(1)).toBeVisible();
    await directory.getByRole('button', 'Close').tap();
    await expect(directory).toBeHidden();

    await openDirectory.tap();
    await expect(directory).toBeVisible();
    await directory.tap({ position: { x: 8, y: 8 } });
    await expect(directory).toBeHidden();
  });

  test('Pricing info shows the active pricing tooltip on hover and hides it on leave', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    const pricingInfo = screen.getByRole('button', 'Pricing info');
    await expect(pricingInfo).toBeVisible({ timeout: 45_000 });
    const tooltipTitle = screen.getByText(pricingTitle);
    await expect(tooltipTitle).toBeHidden();

    await pricingInfo.hover();
    await expect(tooltipTitle).toBeVisible();
    await expect(screen.getByText(/^Input \(cache miss\): \$[\d.]+\/1M$/)).toBeVisible();
    await expect(screen.getByText(/^Output: \$[\d.]+\/1M$/)).toBeVisible();

    await screen.getByRole('button', 'System Directory').hover();
    await expect(tooltipTitle).toBeHidden();
  });

  test('promotional pricing shows the banner, rate badge and promo tooltip, and the banner dismisses', { session: 'admin' }, async ({ app, browser, screen }) => {
    await browser.route('**/api/admin/ai-monitoring/summary', async (route) => {
      await route.fulfill({ json: promoSummary });
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'System Directory')).toBeVisible({ timeout: 45_000 });

    const banner = screen.getByText(promoBannerTitle);
    await expect(banner).toBeVisible();
    await expect(screen.getByText(/\d+ Days Left/)).toBeVisible();
    await expect(screen.getByText('75% OFF Promo')).toBeVisible();

    await screen.getByRole('button', 'Pricing info').hover();
    await expect(screen.getByText('Promotional Pricing (75% OFF)')).toBeVisible();
    await expect(screen.getByText(/^Full price: /)).toBeVisible();
    await screen.getByRole('button', 'System Directory').hover();
    await expect(screen.getByText('Promotional Pricing (75% OFF)')).toBeHidden();

    const dismiss = screen.getByRole('button', 'Dismiss promotional banner');
    await dismiss.tap();
    await expect(banner).toBeHidden();
    await expect(dismiss).toBeHidden();
  });

  test('a failed metrics request shows an error state instead of an endless skeleton', { session: 'admin', timeout: 120_000 }, async ({ app, agent, browser, screen }) => {
    await browser.route('**/api/admin/ai-monitoring/summary', async (route) => {
      await route.fulfill({ status: 403, json: { detail: 'Admin access required' } });
    });
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'AI Monitoring').tap();
    await expect(screen.getByRole('heading', 'AI Monitoring', { level: 1 })).toBeVisible();

    await agent.waitFor('the AI Monitoring page body shows an error message or a way to retry loading the metrics, not only grey loading placeholder blocks', { timeout: 30_000 });
  });
});
