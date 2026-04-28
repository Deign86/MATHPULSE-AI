# AdminAIMonitoring — Hugging Face Billing API Revision

> **Scope:** Replace the component's internal backend (`apiService.getInferenceMetrics()`) data source with live data pulled directly from the **Hugging Face Account Billing & Usage API**. Distill the raw HF data into clear, admin-friendly stats that non-technical co-admins can read at a glance. Include a full Playwright E2E testing workflow that iterates until the implementation is bug-free.

---

## 1. Why This Revision

| Current State | Target State |
|---|---|
| Pulls from FastAPI backend `/metrics` endpoint | Pulls directly from HF API — `https://huggingface.co/api/billing/usage` |
| Internal counters reset on server restart | Real billing data persists on HF's side — always accurate |
| Shows raw system metrics (uptime, error counts) | Shows human-readable summaries (cost this period, requests breakdown by provider, storage used) |
| 0ms avg response time shown when server cold | Actual HF Spaces inference stats per model/space |
| No provider breakdown | Full breakdown: Groq, HF Inference API, Together AI, Cerebras, etc. |

---

## 2. Hugging Face API Reference

### Endpoints Used

```
GET https://huggingface.co/api/billing/usage
Authorization: Bearer {HF_TOKEN}

GET https://huggingface.co/api/whoami
Authorization: Bearer {HF_TOKEN}

GET https://huggingface.co/api/spaces/{username}/{space_id}
Authorization: Bearer {HF_TOKEN}
```

### Sample Billing Response Shape

```json
{
  "period": {
    "from": "2026-04-01",
    "to": "2026-05-01"
  },
  "usage": {
    "total": 0.26,
    "details": {
      "inference": {
        "total": 0.26,
        "breakdown": [
          { "provider": "groq", "requests": 700, "cost": 0.00 },
          { "provider": "hf-inference", "requests": 456, "cost": 0.00 },
          { "provider": "together-ai", "requests": 169, "cost": 0.26 },
          { "provider": "cerebras", "requests": 51, "cost": 0.00 },
          { "provider": "sambanova", "requests": 30, "cost": 0.00 },
          { "provider": "featherless-ai", "requests": 10, "cost": 0.00 },
          { "provider": "novita", "requests": 6, "cost": 0.00 }
        ],
        "totalRequests": 1422
      },
      "storage": {
        "private_gb": 0.02,
        "public_gb": 20.48,
        "limit_private_gb": 1024,
        "limit_public_gb": 11468.8
      }
    }
  },
  "rateLimits": {
    "hub_apis": { "used": 18, "limit": 2500 },
    "resolvers": { "used": 0, "limit": 12000 },
    "pages": { "used": 5, "limit": 400 }
  }
}
```

---

## 3. Environment Variables Required

Add to your `.env` and Hugging Face Space secrets:

```env
# Existing
VITE_HF_MATH_MODEL_ID=Qwen/Qwen3-32B

# NEW — Required for billing API
VITE_HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_HF_USERNAME=Deign86
VITE_HF_SPACE_ID=mathpulse-ai
```

> ⚠️ **Security Note:** `VITE_HF_TOKEN` will be bundled in the frontend. This is acceptable for a **private admin-only dashboard** where the token only has `read` scope on your own account. Never expose a token with `write` permissions client-side.
>
> For production hardening, proxy this through your FastAPI backend at `/api/hf-usage` so the token stays server-side.

---

## 4. New Service: `huggingFaceService.ts`

Create `src/services/huggingFaceService.ts`:

```typescript
// src/services/huggingFaceService.ts

const HF_BASE = 'https://huggingface.co/api';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;
const HF_USERNAME = import.meta.env.VITE_HF_USERNAME || 'Deign86';
const HF_SPACE_ID = import.meta.env.VITE_HF_SPACE_ID || 'mathpulse-ai';

function hfHeaders() {
  return {
    Authorization: `Bearer ${HF_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export interface HFProviderBreakdown {
  provider: string;
  requests: number;
  cost: number;
}

export interface HFBillingData {
  periodFrom: string;
  periodTo: string;
  totalCost: number;
  totalRequests: number;
  inferenceBreakdown: HFProviderBreakdown[];
  storagePrivateGB: number;
  storagePublicGB: number;
  storagePrivateLimitGB: number;
  storagePublicLimitGB: number;
  rateLimits: {
    hubApis: { used: number; limit: number };
    resolvers: { used: number; limit: number };
    pages: { used: number; limit: number };
  };
  spaceStatus: 'running' | 'stopped' | 'building' | 'error' | 'unknown';
  activeModel: string;
}

// Normalize provider names for display
const PROVIDER_LABELS: Record<string, string> = {
  'groq': 'Groq',
  'hf-inference': 'HF Inference API',
  'together-ai': 'Together AI',
  'cerebras': 'Cerebras',
  'sambanova': 'SambaNova',
  'featherless-ai': 'Featherless AI',
  'novita': 'Novita',
};

export function formatProviderName(raw: string): string {
  return PROVIDER_LABELS[raw.toLowerCase()] ?? raw;
}

export async function fetchHFBillingData(): Promise<HFBillingData> {
  // Fetch billing usage
  const billingRes = await fetch(`${HF_BASE}/billing/usage`, {
    headers: hfHeaders(),
  });

  if (!billingRes.ok) {
    throw new Error(`HF Billing API error: ${billingRes.status} ${billingRes.statusText}`);
  }

  const billing = await billingRes.json();

  // Fetch space status
  let spaceStatus: HFBillingData['spaceStatus'] = 'unknown';
  let activeModel = import.meta.env.VITE_HF_MATH_MODEL_ID || 'Qwen/Qwen3-32B';

  try {
    const spaceRes = await fetch(
      `${HF_BASE}/spaces/${HF_USERNAME}/${HF_SPACE_ID}`,
      { headers: hfHeaders() }
    );
    if (spaceRes.ok) {
      const space = await spaceRes.json();
      spaceStatus = space.runtime?.stage?.toLowerCase() ?? 'unknown';
      // Extract active model from space SDK/config if available
      if (space.cardData?.['pipeline_tag']) {
        activeModel = space.cardData['pipeline_tag'];
      }
    }
  } catch (_) {
    // Space fetch is non-critical
  }

  const inference = billing.usage?.details?.inference ?? {};
  const storage = billing.usage?.details?.storage ?? {};
  const rateLimits = billing.rateLimits ?? {};

  return {
    periodFrom: billing.period?.from ?? '',
    periodTo: billing.period?.to ?? '',
    totalCost: billing.usage?.total ?? 0,
    totalRequests: inference.totalRequests ?? 0,
    inferenceBreakdown: (inference.breakdown ?? []).map((b: any) => ({
      provider: formatProviderName(b.provider),
      requests: b.requests ?? 0,
      cost: b.cost ?? 0,
    })),
    storagePrivateGB: storage.private_gb ?? 0,
    storagePublicGB: storage.public_gb ?? 0,
    storagePrivateLimitGB: storage.limit_private_gb ?? 1024,
    storagePublicLimitGB: storage.limit_public_gb ?? 11468.8,
    rateLimits: {
      hubApis: { used: rateLimits.hub_apis?.used ?? 0, limit: rateLimits.hub_apis?.limit ?? 2500 },
      resolvers: { used: rateLimits.resolvers?.used ?? 0, limit: rateLimits.resolvers?.limit ?? 12000 },
      pages: { used: rateLimits.pages?.used ?? 0, limit: rateLimits.pages?.limit ?? 400 },
    },
    spaceStatus,
    activeModel,
  };
}
```

---

## 5. Revised `AdminAIMonitoring.tsx`

### Key Changes from Current Version

1. **Remove** `apiService.getInferenceMetrics()` dependency
2. **Import** `fetchHFBillingData` from the new service
3. **Replace** `AIMonitoringStats` type with `HFBillingData`
4. **Add** Provider Breakdown table (replacing mock activity log)
5. **Add** Storage & Rate Limits section (mirrors actual HF dashboard)
6. **Keep** the same motion/framer-motion animation patterns
7. **Keep** the same Lucide icons + Tailwind class conventions

### Component Skeleton

```tsx
// src/components/AdminAIMonitoring.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Brain, Activity, Zap, Clock, CheckCircle, AlertTriangle,
  ServerCrash, TrendingUp, Cpu, Database, RefreshCw, DollarSign,
  BarChart2, HardDrive
} from 'lucide-react';
import { Button } from './ui/button';
import { fetchHFBillingData, type HFBillingData } from '../services/huggingFaceService';

// Health status derived from space runtime
function deriveHealthStatus(spaceStatus: string): 'healthy' | 'degraded' | 'offline' {
  if (spaceStatus === 'running') return 'healthy';
  if (spaceStatus === 'building') return 'degraded';
  return 'offline';
}

const AdminAIMonitoring: React.FC = () => {
  const [data, setData] = useState<HFBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHFBillingData();
      setData(result);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Hugging Face usage data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const healthStatus = data ? deriveHealthStatus(data.spaceStatus) : 'offline';

  /* ── Render helpers ─────────────────────────────────── */
  // (keep existing getHealthColor, getHealthIcon from original)

  /* ── Top metrics for the 4-card grid ───────────────── */
  const topMetrics = [
    {
      label: 'Total Requests',
      value: data?.totalRequests.toLocaleString() ?? '—',
      icon: Brain,
      color: 'from-sky-500 to-blue-600',
    },
    {
      label: `Cost (${data?.periodFrom ?? '...'} – ${data?.periodTo ?? '...'})`,
      value: `$${(data?.totalCost ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-teal-500 to-emerald-600',
    },
    {
      label: 'Storage Used',
      value: `${(data?.storagePublicGB ?? 0).toFixed(2)} GB`,
      icon: HardDrive,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Hub API Calls',
      value: `${data?.rateLimits.hubApis.used ?? 0} / ${data?.rateLimits.hubApis.limit ?? 2500}`,
      icon: Activity,
      color: 'from-rose-500 to-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Health badge + Refresh */}
      {/* ... */}

      {/* Info banner */}
      {/* Replace "Live Metrics from backend server" with
          "Powered by Hugging Face Billing API — data reflects your HF account (Deign86)" */}

      {/* 4-card metric grid */}
      {/* ... */}

      {/* Bottom split: Provider Breakdown (left) + Storage & Rate Limits (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Provider Breakdown Table */}
        {/* Displays inference.breakdown sorted by requests desc */}
        {/* Columns: Provider | Requests | Cost | % of Total */}

        {/* Storage & Rate Limits */}
        {/* Private storage bar, Public storage bar, Hub APIs bar, Resolvers bar, Pages bar */}
        
      </div>
    </div>
  );
};

export default AdminAIMonitoring;
```

### Provider Breakdown Table Design

```
| Provider         | Requests | Cost   | Share  |
|------------------|----------|--------|--------|
| Groq             | 700      | $0.00  | 49.2%  |
| HF Inference API | 456      | $0.00  | 32.1%  |
| Together AI      | 169      | $0.26  | 11.9%  |
| Cerebras         | 51       | $0.00  | 3.6%   |
| SambaNova        | 30       | $0.00  | 2.1%   |
| Featherless AI   | 10       | $0.00  | 0.7%   |
| Novita           | 6        | $0.00  | 0.4%   |
```

Render each row as a `div` with a colored left border based on provider index (matching Tailwind palette). Sort descending by `requests`. Show total row at bottom.

### Storage Bar Component

```tsx
// Reusable storage bar — show used/limit with colored fill
function StorageBar({ label, usedGB, limitGB, color }: {
  label: string;
  usedGB: number;
  limitGB: number;
  color: string; // Tailwind bg- class
}) {
  const pct = Math.min((usedGB / limitGB) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-[#5a6578]">
        <span>{label}</span>
        <span>{usedGB.toFixed(2)} GB / {limitGB >= 1000 ? `${(limitGB/1024).toFixed(1)} TB` : `${limitGB} GB`}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

---

## 6. Playwright E2E Test Plan

### Setup

```bash
# Install Playwright if not already present
npm install -D @playwright/test
npx playwright install chromium

# Add test script to package.json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

### `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test File: `e2e/admin-ai-monitoring.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// Shared login helper — reuse across tests
async function loginAsAdmin(page: any) {
  await page.goto('/');
  await page.fill('[data-testid="email-input"]', 'testadmin@mathpulse.dev');
  await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD ?? 'AdminTest123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
  // Navigate to AI Monitoring
  await page.click('text=AI Monitoring');
  await page.waitForSelector('[data-testid="ai-monitoring-page"]');
}

test.describe('AdminAIMonitoring — HF Billing Integration', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── TC-01: Page renders without crashing ───────────────────────────────
  test('TC-01: page renders the monitoring header', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'AI Platform Monitoring' })).toBeVisible();
  });

  // ── TC-02: Loading skeleton appears then resolves ─────────────────────
  test('TC-02: shows loading skeletons then real data', async ({ page }) => {
    // Immediately after navigation, pulse skeletons should be visible
    // (this may be very brief — use a fresh navigation to catch it)
    await page.goto('/');
    await page.click('text=AI Monitoring');
    const skeleton = page.locator('.animate-pulse').first();
    // Either skeleton is visible OR data already loaded (fast network)
    const dataLoaded = page.locator('[data-testid="total-requests-value"]');
    await expect(skeleton.or(dataLoaded)).toBeVisible({ timeout: 5000 });
    // Eventually data must load
    await expect(dataLoaded).toBeVisible({ timeout: 15000 });
  });

  // ── TC-03: Total Requests shows numeric value from HF ─────────────────
  test('TC-03: total requests card shows a number', async ({ page }) => {
    const card = page.locator('[data-testid="total-requests-value"]');
    await expect(card).toBeVisible({ timeout: 15000 });
    const text = await card.textContent();
    expect(text).toMatch(/[\d,]+/); // must be a formatted number
  });

  // ── TC-04: Cost card reflects HF billing period ───────────────────────
  test('TC-04: cost card shows dollar amount with period', async ({ page }) => {
    const costCard = page.locator('[data-testid="cost-value"]');
    await expect(costCard).toBeVisible({ timeout: 15000 });
    const text = await costCard.textContent();
    expect(text).toMatch(/^\$\d+\.\d{2}$/);
  });

  // ── TC-05: Provider breakdown table renders rows ──────────────────────
  test('TC-05: provider breakdown table has at least one row', async ({ page }) => {
    await expect(page.locator('[data-testid="provider-breakdown-table"]')).toBeVisible({ timeout: 15000 });
    const rows = page.locator('[data-testid="provider-row"]');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── TC-06: Provider names are human-readable ──────────────────────────
  test('TC-06: provider names are formatted (not raw slugs)', async ({ page }) => {
    await page.waitForSelector('[data-testid="provider-row"]', { timeout: 15000 });
    const firstProvider = await page.locator('[data-testid="provider-name"]').first().textContent();
    // Should not contain raw slugs like "hf-inference" or "together-ai"
    expect(firstProvider).not.toMatch(/^[a-z]+-[a-z]+$/);
    // Should be title-cased
    expect(firstProvider?.charAt(0)).toMatch(/[A-Z]/);
  });

  // ── TC-07: Storage bars render with non-zero widths ───────────────────
  test('TC-07: storage progress bars are visible', async ({ page }) => {
    const publicBar = page.locator('[data-testid="storage-bar-public"]');
    await expect(publicBar).toBeVisible({ timeout: 15000 });
    // Bar fill div should have a style width > 0
    const fill = publicBar.locator('.rounded-full').nth(1);
    const width = await fill.getAttribute('style');
    expect(width).toMatch(/width:\s*[1-9]/); // > 0%
  });

  // ── TC-08: Health badge reflects space status ─────────────────────────
  test('TC-08: health badge shows Healthy, Degraded, or Offline', async ({ page }) => {
    const badge = page.locator('[data-testid="health-badge"]');
    await expect(badge).toBeVisible({ timeout: 15000 });
    const text = (await badge.textContent())?.toLowerCase();
    expect(['healthy', 'degraded', 'offline'].some(s => text?.includes(s))).toBeTruthy();
  });

  // ── TC-09: Refresh button reloads data ────────────────────────────────
  test('TC-09: refresh button triggers a reload', async ({ page }) => {
    await page.waitForSelector('[data-testid="refresh-button"]', { timeout: 15000 });
    // Intercept the HF API call to verify it fires on refresh
    let hfCallCount = 0;
    await page.route('**/huggingface.co/api/billing/usage**', route => {
      hfCallCount++;
      route.continue();
    });
    await page.click('[data-testid="refresh-button"]');
    await page.waitForTimeout(1000);
    expect(hfCallCount).toBeGreaterThanOrEqual(1);
  });

  // ── TC-10: Error state shows message when HF API fails ───────────────
  test('TC-10: shows error message when HF API is unreachable', async ({ page }) => {
    // Mock a failed response
    await page.route('**/huggingface.co/api/billing/usage**', route =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) })
    );
    await page.goto('/');
    await page.click('text=AI Monitoring');
    const errorMsg = page.locator('[data-testid="error-message"]');
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
    await expect(errorMsg).toContainText(/failed|error|unauthorized/i);
  });

  // ── TC-11: Rate limit bars are within bounds ──────────────────────────
  test('TC-11: rate limit usage values are within their limits', async ({ page }) => {
    await page.waitForSelector('[data-testid="rate-limit-hub-apis"]', { timeout: 15000 });
    const text = await page.locator('[data-testid="rate-limit-hub-apis"]').textContent();
    const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const [, used, limit] = match.map(Number);
      expect(used).toBeLessThanOrEqual(limit);
    }
  });

  // ── TC-12: Period dates are formatted and logical ─────────────────────
  test('TC-12: billing period shows valid date range', async ({ page }) => {
    const costCard = page.locator('[data-testid="cost-period"]');
    await expect(costCard).toBeVisible({ timeout: 15000 });
    const text = await costCard.textContent();
    // Should match "Apr 1 – May 1" or ISO date pattern
    expect(text).toMatch(/\d{4}|\w+\s\d+/);
  });

});
```

### Adding `data-testid` Attributes

Add these attributes to the revised component JSX. Every testable element needs one:

```
data-testid="ai-monitoring-page"       → root <div className="space-y-6">
data-testid="health-badge"             → health status badge
data-testid="refresh-button"           → manual refresh Button
data-testid="total-requests-value"     → total requests metric value <p>
data-testid="cost-value"               → cost metric value <p>
data-testid="cost-period"              → period label inside cost card
data-testid="provider-breakdown-table" → table/div wrapper
data-testid="provider-row"             → each provider row div
data-testid="provider-name"            → provider name <span>
data-testid="storage-bar-public"       → public storage StorageBar wrapper
data-testid="storage-bar-private"      → private storage StorageBar wrapper
data-testid="rate-limit-hub-apis"      → Hub APIs rate limit display
data-testid="error-message"            → error state paragraph
```

---

## 7. Bug-Fix Iteration Workflow

Run this cycle after each implementation change until all tests pass green:

```bash
# Step 1 — Start dev server (separate terminal)
npm run dev

# Step 2 — Run full E2E suite
npx playwright test e2e/admin-ai-monitoring.spec.ts --reporter=list

# Step 3 — On failure, open UI mode for visual debugging
npx playwright test --ui

# Step 4 — View trace on failed test
npx playwright show-trace test-results/*/trace.zip
```

### Common Bug Patterns & Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| TC-03 fails — value shows `—` | HF_TOKEN env var not set in Vite | Add `VITE_HF_TOKEN` to `.env.local` |
| TC-06 fails — raw slug shown | `formatProviderName()` missing entry | Add entry to `PROVIDER_LABELS` map |
| TC-07 fails — bar width is `0%` | `storagePublicGB` parsed as string | Cast `billing.usage.details.storage.public_gb` with `Number(...)` |
| TC-09 fails — route not intercepted | `page.route()` called after navigation | Move `page.route()` before `page.goto()` |
| TC-10 fails — no error shown | Error state not wired to `data-testid` | Add `data-testid="error-message"` to error `<p>` |
| CORS error on HF API | Browser blocks direct fetch | Proxy through FastAPI `/api/hf-usage` endpoint |

### CORS Proxy Fallback (if needed)

If the browser blocks direct calls to `huggingface.co`:

```python
# In FastAPI (mathpulse-api)
@app.get("/api/hf-usage")
async def hf_usage():
    import httpx
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://huggingface.co/api/billing/usage",
            headers={"Authorization": f"Bearer {os.getenv('HF_TOKEN')}"}
        )
    return r.json()
```

Then in `huggingFaceService.ts`, point to:
```ts
const BILLING_URL = import.meta.env.DEV
  ? 'https://huggingface.co/api/billing/usage'           // direct in dev (HF token in .env)
  : `${import.meta.env.VITE_API_BASE_URL}/api/hf-usage`; // proxied in prod
```

---

## 8. Admin UX Copy Guidelines

Replace all technical jargon with plain language for co-admins:

| Raw/Technical Label | Admin-Friendly Label |
|---|---|
| `requests_total` | Total AI Requests |
| `requests_error` | Failed Requests |
| `avg_latency_ms` | Average Response Time |
| `hf-inference` | HF Inference API |
| `together-ai` | Together AI |
| `uptime_sec` | System Uptime |
| `fallback_attempts` | Provider Switches |
| `token_usage` | Tokens Processed |
| `private_gb / limit_private_gb` | Private Storage Used |
| `hub_apis.used / hub_apis.limit` | Hub API Calls This Period |

All cost values display as `$X.XX`. Zero costs display as `$0.00` (never blank). Storage over 1 TB shows as TB, under as GB.

---

## 9. Files to Create / Modify

```
MATHPULSE-AI/
├── src/
│   ├── components/
│   │   └── AdminAIMonitoring.tsx        ← MODIFY (replace data source)
│   └── services/
│       └── huggingFaceService.ts        ← CREATE
├── e2e/
│   ├── admin-ai-monitoring.spec.ts      ← CREATE
│   └── helpers/
│       └── auth.ts                      ← CREATE (login helper)
├── playwright.config.ts                 ← CREATE
├── .env.local                           ← ADD: VITE_HF_TOKEN, VITE_HF_USERNAME
└── src/components/AdminAIMonitoring.md  ← THIS FILE
```

---

## 10. Acceptance Criteria

- [ ] All 12 Playwright tests pass with `0 failed`
- [ ] Component shows real HF billing period dates (e.g., "Apr 1 – May 1")  
- [ ] Total requests matches HF dashboard (1,422 for current period)
- [ ] Provider breakdown table lists all providers from your HF account
- [ ] Cost shows `$0.26` (current period actual billing)
- [ ] Refresh button re-fetches data from HF API (verifiable via network tab)
- [ ] Error state shows a readable message if token is missing or invalid
- [ ] No TypeScript errors (`npm run type-check` passes)
- [ ] No console errors in browser during normal operation
