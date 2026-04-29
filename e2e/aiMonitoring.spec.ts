import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';

const navigateToMonitoring = async (page: import('@playwright/test').Page) => {
  await page.goto('/#/admin');
  await page.getByRole('button', { name: /AI Monitoring/i }).click();
  await page.waitForURL(/\#\/admin\/ai-monitoring/i, { timeout: 10000 }).catch(() => {});
  await page.waitForSelector('[data-testid="health-badge"], [data-testid="monitoring-skeleton"], [data-testid="monitoring-error"]', { timeout: 10000 });
};

test.describe('AI Monitoring — HF Integration', () => {

  test.describe('Page Load & Layout', () => {

    test('AI Monitoring page loads without errors', async ({ page }) => {
      await navigateToMonitoring(page);
      const heading = page.getByRole('heading', { name: /AI Platform Monitoring/i });
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test('All 4 metric cards are visible', async ({ page }) => {
      await navigateToMonitoring(page);
      const cards = page.locator('[data-testid="metric-card"]');
      await expect(cards).toHaveCount(4, { timeout: 10000 });
    });

  });

  test.describe('HF Data Integration', () => {

    test('HF model status badge renders a valid status', async ({ page }) => {
      await navigateToMonitoring(page);
      const badge = page.locator('[data-testid="health-badge"]');
      await expect(badge).toBeVisible({ timeout: 10000 });
      await expect(badge).toContainText(/Operational|Loading|Degraded|Unknown/i);
    });

    test('Inference balance card shows dollar amount', async ({ page }) => {
      await navigateToMonitoring(page);
      const cards = page.locator('[data-testid="metric-card"]');
      const firstCard = cards.first();
      await expect(firstCard).toContainText(/\$/, { timeout: 10000 });
    });

    test('Hub API calls card shows usage out of limit', async ({ page }) => {
      await navigateToMonitoring(page);
      const cards = page.locator('[data-testid="metric-card"]');
      const secondCard = cards.nth(1);
      await expect(secondCard).toContainText(/\d+ of \d+/i, { timeout: 10000 });
    });

    test('Generation model card shows model ID', async ({ page }) => {
      await navigateToMonitoring(page);
      const genCard = page.locator('[data-testid="generation-model-card"]');
      await expect(genCard).toBeVisible({ timeout: 10000 });
      const modelId = page.locator('[data-testid="generation-model-id"]');
      await expect(modelId).toBeVisible();
      await expect(modelId).not.toBeEmpty();
    });

    test('Embedding model card shows model ID', async ({ page }) => {
      await navigateToMonitoring(page);
      const embCard = page.locator('[data-testid="embedding-model-card"]');
      await expect(embCard).toBeVisible({ timeout: 10000 });
      const embId = page.locator('[data-testid="embedding-model-id"]');
      await expect(embId).toBeVisible();
      await expect(embId).not.toBeEmpty();
    });

    test('Active profile badge is visible and shows valid profile', async ({ page }) => {
      await navigateToMonitoring(page);
      const profileBadge = page.locator('[data-testid="active-profile-badge"]');
      await expect(profileBadge).toBeVisible({ timeout: 10000 });
      await expect(profileBadge).toContainText(/dev|budget|prod/i);
    });

  });

  test.describe('Loading & Error States', () => {

    test('Loading skeleton appears while fetching HF data', async ({ page }) => {
      await page.route('**/api/hf/monitoring', async route => {
        await new Promise(r => setTimeout(r, 2000));
        await route.continue();
      });
      await page.goto('/#/admin');
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(500);
      const skeleton = page.locator('[data-testid="monitoring-skeleton"]');
      await expect(skeleton.first()).toBeVisible({ timeout: 5000 });
    });

    test('Error state shown when HF API fails', async ({ page }) => {
      await page.route('**/api/hf/monitoring', route =>
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      await page.goto('/#/admin');
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      const errorBanner = page.locator('[data-testid="monitoring-error"]');
      await expect(errorBanner).toBeVisible({ timeout: 10000 });
      await expect(errorBanner).toContainText(/unable to load/i);
    });

  });

  test.describe('Admin Readability', () => {

    test('All metric cards show plain English labels, not raw API keys', async ({ page }) => {
      await navigateToMonitoring(page);
      const labels = page.locator('[data-testid="metric-label"]');
      const count = await labels.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const text = await labels.nth(i).innerText();
        expect(text).not.toMatch(/[a-z][A-Z]|_/);
      }
    });

    test('Recent activity shows last refreshed timestamp', async ({ page }) => {
      await navigateToMonitoring(page);
      const refreshed = page.locator('[data-testid="last-refreshed"]');
      await expect(refreshed.first()).toBeVisible({ timeout: 5000 });
      await expect(refreshed.first()).toContainText(/Last updated|Last refreshed/i);
    });

  });

  test.describe('Refresh Behavior', () => {

    test('Manual refresh button re-fetches HF data', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/hf/monitoring', async route => {
        callCount++;
        await route.continue();
      });
      await navigateToMonitoring(page);
      const initialCount = callCount;
      const refreshBtn = page.locator('[data-testid="refresh-btn"]');
      await refreshBtn.click();
      await page.waitForTimeout(2000);
      expect(callCount).toBeGreaterThan(initialCount);
    });

  });

});