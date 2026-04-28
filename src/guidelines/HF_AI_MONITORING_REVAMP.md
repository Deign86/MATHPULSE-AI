# HF AI Monitoring Revamp — Implementation Guide

> **Scope:** Replace the current `AI Platform Monitoring` admin component (which pulls unreliable data from the internal system backend) with a live integration to the **Hugging Face (HF) Inference API** — surfacing real, distilled metrics that non-technical admins can understand at a glance.
>
> **Repo:** `Deign86/MATHPULSE-AI`
> **Active Provider shown on dashboard:** `Qwen/Qwen3-32B`
> **HF Account:** `Deign86`

---

## 1. Problem Statement

The current `AI Platform Monitoring` page (located in the admin dashboard) displays metrics sourced from the internal FastAPI backend. As observed:

- **Total AI Requests:** 153 — but **0 successful**, indicating all 153 are failures
- **Avg Response Time:** 0ms — clearly inaccurate/not tracked
- **Failed Requests:** 202 — exceeds total request count, showing data inconsistency
- **Usage Breakdown:** AI Tutoring Sessions and Quiz Generations both show `0` despite token usage of `130,050`
- **Status badge:** `Degraded` — system health is untrustworthy

The **Hugging Face Billing dashboard** (attached) shows the real picture:
- Current period usage: **$0.26**
- Inference due balance: **$0.25**
- ZeroGPU usage: `0/25 minutes`
- Public storage: `0.02 TB / 11.2 TB`
- Hub API calls: `2 / 2.5k requests`

This is far more accurate and should be the **source of truth** for the monitoring dashboard.

---

## 2. Goal

Revamp the `AI Platform Monitoring` component (`src/features/` or equivalent admin panel page) to:

1. **Pull live data from the Hugging Face API** instead of the broken internal backend
2. **Distill complex HF billing/inference data** into plain, readable metrics for admin users
3. **Show a meaningful system health status** based on real HF inference availability
4. **Expose admin-friendly panels** that mirror the current layout but with trustworthy data
5. **Be fully tested via Playwright E2E** with iterative bug fixing until stable

---

## 3. Data Sources (Hugging Face APIs)

### 3.1 Required API Endpoints

| Data Point | HF API Endpoint | Notes |
|---|---|---|
| Inference usage / billing | `GET https://huggingface.co/api/billing/usage` | Requires HF token with `read` scope |
| Model info & status | `GET https://api-inference.huggingface.co/models/Qwen/Qwen3-32B` | Returns model load status, pipeline tag |
| Inference health ping | `POST https://api-inference.huggingface.co/models/Qwen/Qwen3-32B` | Latency probe — send a minimal test payload |
| Account info | `GET https://huggingface.co/api/whoami-v2` | Confirms org/user context |

### 3.2 Environment Variable Setup

Add the following to `.env` (and `.env.example`):

```env
VITE_HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_HF_MODEL_ID=Qwen/Qwen3-32B
VITE_HF_USERNAME=Deign86
```

> ⚠️ **NEVER expose `VITE_HF_TOKEN` client-side in production.** Route all HF API calls through a Firebase Cloud Function or the existing FastAPI backend (`mathpulse-api`) as a secure proxy.

---

## 4. New Service Layer

### `src/services/huggingfaceMonitoringService.ts`

Create a dedicated service that:

```ts
// Pseudo-structure
export interface HFMonitoringData {
  modelId: string;
  modelStatus: 'Operational' | 'Loading' | 'Degraded' | 'Unknown';
  avgResponseTimeMs: number;
  inferenceBalance: number;      // USD due this period
  totalPeriodCost: number;       // USD this billing period
  hubApiCallsUsed: number;       // e.g. 2
  hubApiCallsLimit: number;      // e.g. 2500
  zeroGpuMinutesUsed: number;
  zeroGpuMinutesLimit: number;
  publicStorageUsedTB: number;
  publicStorageLimitTB: number;
  lastChecked: string;           // ISO timestamp
  periodStart: string;
  periodEnd: string;
}

export async function fetchHFMonitoringData(): Promise<HFMonitoringData>
export async function probeModelLatency(modelId: string): Promise<number>  // returns ms
export function mapHFStatusToHealth(modelLoaded: boolean, errorRate: number): string
```

All calls must go through the **backend proxy** (`/api/hf/monitoring`) to keep the token server-side.

---

## 5. Backend Proxy (FastAPI — `mathpulse-api`)

### New route: `GET /api/hf/monitoring`

```python
@router.get("/api/hf/monitoring")
async def get_hf_monitoring():
    """
    Aggregates HF billing, model status, and latency probe.
    Returns distilled data safe for frontend consumption.
    """
```

This endpoint should:
1. Call `huggingface.co/api/billing/usage` with the stored HF token
2. Call `api-inference.huggingface.co/models/{MODEL_ID}` to get model state
3. Send a minimal inference probe to measure real latency
4. Return a clean JSON matching `HFMonitoringData` interface

---

## 6. Frontend Component Revamp

### Target file(s):
- `src/features/admin/AIMonitoring.tsx` (or wherever the current monitoring page lives)
- `src/services/huggingfaceMonitoringService.ts` (new)
- `src/types/hfMonitoring.ts` (new types)

### New UI Panels (replacing broken stats)

| Old Panel | New Panel | Data Source |
|---|---|---|
| Total AI Requests (153) | **Hub API Calls Used** (e.g., `2 / 2,500`) | HF Hub rate limits |
| Requests Today (153) | **Inference Balance Due** (e.g., `$0.25`) | HF Billing |
| Avg Response Time (0ms) | **Live Model Latency** (probed on load) | Inference ping |
| Failed Requests (202) | **ZeroGPU Minutes** (e.g., `0 / 25 min`) | HF Compute |
| Usage Breakdown — Token Usage | **Billing Period Cost** (`$0.26`, Apr 1–May 1) | HF Billing |
| AI Tutoring Sessions (0) | **Public Storage Used** (`0.02 TB / 11.2 TB`) | HF Storage |
| System Uptime | **Model Status** (Operational/Loading/Degraded) | Model API |
| Success Rate (0/153) | **Period Dates** + last refreshed timestamp | HF Billing |

### Status Badge Logic

Replace the hardcoded `Degraded` badge with:

```ts
function resolveHealthStatus(data: HFMonitoringData): 'Operational' | 'Degraded' | 'Loading' {
  if (data.modelStatus === 'Loading') return 'Loading';
  if (data.avgResponseTimeMs > 5000 || data.modelStatus === 'Degraded') return 'Degraded';
  return 'Operational';
}
```

### Admin-Friendly Labels

Non-technical admins should see **plain English** — not raw API jargon:

- ❌ `inferenceBalance: 0.25` → ✅ **"AI Usage Cost This Month: $0.25"**
- ❌ `hubApiCallsUsed: 2` → ✅ **"Platform API Calls: 2 of 2,500 used"**
- ❌ `zeroGpuMinutesUsed: 0` → ✅ **"Free GPU Time Used: 0 of 25 minutes"**
- ❌ `modelStatus: 'Loading'` → ✅ **"AI Model: Starting up, please wait…"**

---

## 7. Playwright E2E Testing Plan

> Use the `@playwright/test` MCP server for iterative, bug-fixing-driven E2E tests. Each test stage must pass before proceeding to the next.

### Setup

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Add `playwright.config.ts` at project root if not present:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
});
```

---

### Test Suite: `e2e/aiMonitoring.spec.ts`

#### Stage 1 — Page Load & Layout

```ts
test('AI Monitoring page loads without errors', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  await expect(page).toHaveTitle(/MathPulse/);
  await expect(page.locator('h1, h2').filter({ hasText: /AI.*Monitor/i })).toBeVisible();
});

test('All 4 metric cards are visible', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  const cards = page.locator('[data-testid="metric-card"]');
  await expect(cards).toHaveCount(4);
});
```

#### Stage 2 — HF Data Integration

```ts
test('HF model status badge renders a valid status', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  const badge = page.locator('[data-testid="health-badge"]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/Operational|Loading|Degraded/i);
});

test('Inference balance card shows dollar amount', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  const balanceCard = page.locator('[data-testid="metric-inference-balance"]');
  await expect(balanceCard).toContainText(/\$\d+\.\d{2}/);
});

test('Hub API calls card shows usage out of limit', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  const apiCard = page.locator('[data-testid="metric-hub-api-calls"]');
  await expect(apiCard).toContainText(/\d+ of \d+/i);
});
```

#### Stage 3 — Loading & Error States

```ts
test('Loading skeleton appears while fetching HF data', async ({ page }) => {
  // Intercept the /api/hf/monitoring request and delay it
  await page.route('**/api/hf/monitoring', async route => {
    await new Promise(r => setTimeout(r, 2000));
    await route.continue();
  });
  await page.goto('/admin/ai-monitoring');
  await expect(page.locator('[data-testid="monitoring-skeleton"]')).toBeVisible();
});

test('Error state shown when HF API fails', async ({ page }) => {
  await page.route('**/api/hf/monitoring', route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  );
  await page.goto('/admin/ai-monitoring');
  await expect(page.locator('[data-testid="monitoring-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="monitoring-error"]')).toContainText(/unable to load/i);
});
```

#### Stage 4 — Admin Readability

```ts
test('All metric cards show plain English labels, not raw API keys', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  // Ensure no raw camelCase/snake_case labels are rendered to the user
  const cardLabels = page.locator('[data-testid="metric-label"]');
  for (const label of await cardLabels.all()) {
    const text = await label.innerText();
    expect(text).not.toMatch(/[a-z][A-Z]|_/); // no camelCase or snake_case
  }
});

test('Recent activity shows last refreshed timestamp', async ({ page }) => {
  await page.goto('/admin/ai-monitoring');
  await expect(page.locator('[data-testid="last-refreshed"]')).toContainText(/Last updated/i);
});
```

#### Stage 5 — Refresh Behavior

```ts
test('Manual refresh button re-fetches HF data', async ({ page }) => {
  let callCount = 0;
  await page.route('**/api/hf/monitoring', async route => {
    callCount++;
    await route.continue();
  });
  await page.goto('/admin/ai-monitoring');
  await page.locator('[data-testid="refresh-btn"]').click();
  await expect(() => expect(callCount).toBeGreaterThanOrEqual(2)).toPass({ timeout: 3000 });
});
```

---

### Running Tests

```bash
# Run all monitoring tests
npx playwright test e2e/aiMonitoring.spec.ts

# Run with UI for debugging
npx playwright test e2e/aiMonitoring.spec.ts --ui

# Run with headed browser to watch
npx playwright test e2e/aiMonitoring.spec.ts --headed
```

**Fix bugs and iterate** — run after every implementation change until all 5 stages pass green.

---

## 8. `data-testid` Attributes Required

Add these to the component JSX so Playwright selectors work:

| Attribute | Element |
|---|---|
| `data-testid="metric-card"` | Each of the 4 stat cards |
| `data-testid="metric-label"` | The label text inside each card |
| `data-testid="metric-inference-balance"` | Inference cost card |
| `data-testid="metric-hub-api-calls"` | Hub API usage card |
| `data-testid="health-badge"` | The `Operational/Degraded/Loading` badge |
| `data-testid="monitoring-skeleton"` | Loading skeleton wrapper |
| `data-testid="monitoring-error"` | Error state container |
| `data-testid="last-refreshed"` | Timestamp in Recent Activity |
| `data-testid="refresh-btn"` | Manual refresh button |

---

## 9. Implementation Checklist

- [ ] Add `VITE_HF_TOKEN`, `VITE_HF_MODEL_ID`, `VITE_HF_USERNAME` to `.env` and `.env.example`
- [ ] Create `/api/hf/monitoring` proxy route in `mathpulse-api` (FastAPI)
- [ ] Create `src/services/huggingfaceMonitoringService.ts`
- [ ] Create `src/types/hfMonitoring.ts` with `HFMonitoringData` interface
- [ ] Revamp the `AIMonitoring.tsx` component with new panels and labels
- [ ] Add `data-testid` attributes to all relevant elements
- [ ] Add loading skeleton and error state components
- [ ] Add manual refresh button with last-updated timestamp
- [ ] Write `e2e/aiMonitoring.spec.ts` with all 5 test stages
- [ ] Run Playwright tests; fix bugs iteratively until all stages pass
- [ ] Remove or comment out old internal backend calls in the monitoring component
- [ ] Update `src/Attributions.md` to note HF API as data source

---

## 10. Notes for Other Admins

Once implemented, the AI Monitoring dashboard will show:

> **"AI Usage Cost This Month"** — how much the platform has spent on AI inference (from Hugging Face billing). Anything over $0 means the AI is actively being used and billed.

> **"Platform API Calls"** — how many times the system has talked to Hugging Face's servers. The limit is 2,500 per 5-minute window — if this gets close, AI responses may slow down.

> **"Free GPU Time Used"** — MathPulse uses free compute credits from Hugging Face. Once 25 minutes are used up, the AI may run slower or cost more.

> **"AI Model Status"** — shows whether the Qwen AI model is ready (`Operational`), starting up (`Loading`), or having issues (`Degraded`).

No technical background needed to interpret these — the dashboard is designed to give a clear, honest snapshot of AI health.
