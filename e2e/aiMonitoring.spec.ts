import { test, expect } from '@playwright/test';

test.describe('AI Monitoring — Hugging Face Integration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Stage 1 — Page Load & Layout', () => {

    test('AI Monitoring page loads without errors', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(1500);
      const heading = page.getByRole('heading', { name: /AI Platform Monitoring/i });
      await expect(heading).toBeVisible();
    });

    test('All 4 metric cards are visible', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(2000);
      const cards = page.locator('[data-testid="metric-card"]');
      await expect(cards).toHaveCount(4);
    });

  });

  test.describe('Stage 2 — HF Data Integration', () => {

    test('HF model status badge renders a valid status', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(3000);
      const badge = page.locator('[data-testid="health-badge"]');
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(/Operational|Loading|Degraded|Unknown/i);
    });

    test('Inference balance card shows dollar amount', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(3000);
      const cards = page.locator('[data-testid="metric-card"]');
      const firstCard = cards.first();
      await expect(firstCard).toContainText(/\$/);
    });

    test('Hub API calls card shows usage out of limit', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(3000);
      const cards = page.locator('[data-testid="metric-card"]');
      const secondCard = cards.nth(1);
      await expect(secondCard).toContainText(/\d+ of \d+/i);
    });

  });

  test.describe('Stage 3 — Loading & Error States', () => {

    test('Loading skeleton appears while fetching HF data', async ({ page }) => {
      await page.route('**/api/hf/monitoring', async route => {
        await new Promise(r => setTimeout(r, 2000));
        await route.continue();
      });
      await page.goto('/#/admin');
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(500);
      const skeleton = page.locator('[data-testid="monitoring-skeleton"]');
      await expect(skeleton.first()).toBeVisible();
    });

    test('Error state shown when HF API fails', async ({ page }) => {
      await page.route('**/api/hf/monitoring', route =>
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(2000);
      const errorBanner = page.locator('[data-testid="monitoring-error"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText(/unable to load/i);
    });

  });

  test.describe('Stage 4 — Admin Readability', () => {

    test('All metric cards show plain English labels, not raw API keys', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(3000);
      const labels = page.locator('[data-testid="metric-label"]');
      const count = await labels.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const text = await labels.nth(i).innerText();
        expect(text).not.toMatch(/[a-z][A-Z]|_/);
      }
    });

    test('Recent activity shows last refreshed timestamp', async ({ page }) => {
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(3000);
      const refreshed = page.locator('[data-testid="last-refreshed"]');
      await expect(refreshed.first()).toBeVisible();
      await expect(refreshed.first()).toContainText(/Last updated|Last refreshed/i);
    });

  });

  test.describe('Stage 5 — Refresh Behavior', () => {

    test('Manual refresh button re-fetches HF data', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/hf/monitoring', async route => {
        callCount++;
        await route.continue();
      });
      await page.goto('/#/admin');
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /AI Monitoring/i }).click();
      await page.waitForTimeout(2000);
      const initialCount = callCount;
      const refreshBtn = page.locator('[data-testid="refresh-btn"]');
      await refreshBtn.click();
      await page.waitForTimeout(2000);
      expect(callCount).toBeGreaterThan(initialCount);
    });

  });

});