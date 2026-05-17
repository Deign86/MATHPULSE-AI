// scripts/seed-ai-monitoring.ts
// Seeds Firestore ai_monitoring/summary with realistic DeepSeek V4 Pro pricing data
// TODO: Review pricing after 2026-05-31
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function initializeAdmin() {
  if (getApps().length > 0) return getApp();
  const secretsPath = path.resolve(process.cwd(), '.secrets/firebase-service-account.json');
  let serviceAccount;
  if (fs.existsSync(secretsPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    throw new Error('No Firebase service account found.');
  }
  return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || 'mathpulse-ai-2026' });
}

// DeepSeek V4 Pro promotional pricing (active until 2026-05-31)
const PRICING = {
  input_cache_hit_per_1m: 0.003625,
  input_cache_miss_per_1m: 0.435,
  output_per_1m: 0.87,
};
const FULL_PRICING = {
  input_cache_hit_per_1m: 0.0145,
  input_cache_miss_per_1m: 1.74,
  output_per_1m: 3.48,
};

function calcCost(cacheHit: number, cacheMiss: number, output: number, rates = PRICING) {
  return (cacheHit / 1e6) * rates.input_cache_hit_per_1m
    + (cacheMiss / 1e6) * rates.input_cache_miss_per_1m
    + (output / 1e6) * rates.output_per_1m;
}

const FEATURES = [
  { id: 'ai_chat_tutor', name: 'AI Chat Tutor', share: 0.35, cacheHitRate: 0.62, icon: 'MessageCircle' },
  { id: 'hint_generation', name: 'Hint Generation', share: 0.28, cacheHitRate: 0.58, icon: 'Lightbulb' },
  { id: 'lesson_generation', name: 'Lesson Generation', share: 0.18, cacheHitRate: 0.35, icon: 'GraduationCap' },
  { id: 'learning_paths', name: 'Learning Paths', share: 0.09, cacheHitRate: 0.40, icon: 'Target' },
  { id: 'quiz_generation', name: 'Quiz Generation', share: 0.09, cacheHitRate: 0.38, icon: 'PenTool' },
  { id: 'other', name: 'Other AI Features', share: 0.01, cacheHitRate: 0.50, icon: 'Zap' },
];

async function seed() {
  const app = initializeAdmin();
  const db = getFirestore(app);

  const totalRequests = 6900;
  const totalInputTokens = 8_500_000;
  const totalOutputTokens = 3_200_000;

  let monthlyCost = 0;
  let fullPriceCost = 0;
  let totalCacheHit = 0;
  let totalCacheMiss = 0;
  const features: Record<string, unknown>[] = [];

  for (const f of FEATURES) {
    const reqs = Math.round(totalRequests * f.share);
    const inputTokens = Math.round(totalInputTokens * f.share);
    const outputTokens = Math.round(totalOutputTokens * f.share);
    const cacheHit = Math.round(inputTokens * f.cacheHitRate);
    const cacheMiss = inputTokens - cacheHit;

    const cost = calcCost(cacheHit, cacheMiss, outputTokens);
    const fullCost = calcCost(cacheHit, cacheMiss, outputTokens, FULL_PRICING);
    monthlyCost += cost;
    fullPriceCost += fullCost;
    totalCacheHit += cacheHit;
    totalCacheMiss += cacheMiss;

    const isMostActive = f.id === 'ai_chat_tutor';
    features.push({
      featureId: f.id,
      featureName: f.name,
      modelId: 'deepseek-v4-pro',
      monthlyCost: +cost.toFixed(6),
      costShare: +(f.share * 100).toFixed(1),
      totalRequests: reqs,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      cacheHitRate: f.cacheHitRate,
      isMostActive,
      isTopSpending: isMostActive,
      icon: f.icon,
    });
  }

  const cacheHitRate = totalCacheHit / (totalCacheHit + totalCacheMiss);

  const summary = {
    systemStatus: 'healthy',
    actionRequired: false,
    hasPerformanceIssues: false,
    monthlyCost: +monthlyCost.toFixed(4),
    projectedMonthlyCost: +(monthlyCost * 1.1).toFixed(4),
    billingCycleLabel: 'Current Billable Cycle',
    costBreakdown: {
      cacheHitCost: +((totalCacheHit / 1e6) * PRICING.input_cache_hit_per_1m).toFixed(6),
      cacheMissCost: +((totalCacheMiss / 1e6) * PRICING.input_cache_miss_per_1m).toFixed(6),
      outputCost: +((totalOutputTokens / 1e6) * PRICING.output_per_1m).toFixed(6),
    },
    totalUsage: totalRequests,
    totalInputTokens: totalCacheHit + totalCacheMiss,
    totalOutputTokens,
    cacheHitRate: +cacheHitRate.toFixed(4),
    activeEngine: 'DeepSeek-V4 Pro',
    activeEngineModelId: 'deepseek-v4-pro',
    engineTier: 'High-Performance LLM',
    promotionalPricingActive: true,
    promotionalPriceExpiresUtc: '2026-05-31T15:59:00Z',
    estimatedCostAfterPromo: +fullPriceCost.toFixed(4),
    lastUpdated: new Date().toISOString(),
    features,
  };

  await db.doc('ai_monitoring/summary').set(summary);
  console.log('✅ Seeded ai_monitoring/summary');
  console.log(`   Monthly cost (promo): $${monthlyCost.toFixed(4)}`);
  console.log(`   Estimated full price: $${fullPriceCost.toFixed(4)}`);
  console.log(`   Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
