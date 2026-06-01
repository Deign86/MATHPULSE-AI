/**
 * @file riskService.computeWRI.critical.test.ts
 * Critical tests for the computeWRI formula.
 *
 * Formula: WRI = floor((w1*D + w2*G + w3*P) * 100) / 100
 * Default weights: w1=0.30 (diagnostic), w2=0.40 (external), w3=0.30 (system perf.)
 *
 * Risk thresholds:
 *   >= 88  -> safe
 *   >= 80  -> watch
 *   >= 75  -> intervene
 *   >= 68  -> critical
 *   < 68   -> at_risk
 */

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
  doc: vi.fn(),
  collection: vi.fn(),
  firestoreQuery: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
  increment: (n: number) => ({ __inc: n }),
  arrayUnion: (...items: unknown[]) => items,
  onSnapshot: vi.fn(() => vi.fn()),
}));

import { computeWRI } from '../services/riskService';
import type { WRIWeights } from '../types/models';

const DEFAULT: WRIWeights = { w1: 0.30, w2: 0.40, w3: 0.30 };

describe('computeWRI - critical formula', () => {
  it('computeWRI(75, 80, 85, default) -> { wri: 80.00, riskStatus: watch }', () => {
    // 0.30*75 + 0.40*80 + 0.30*85 = 22.5 + 32.0 + 25.5 = 80.00
    const result = computeWRI(75, 80, 85, DEFAULT);
    expect(result.wri).toBe(80.0);
    expect(result.riskStatus).toBe('watch');
  });

  // ── All edge thresholds ──────────────────────────────────────
  it('WRI >= 88 -> safe', () => {
    // 0.30*88 + 0.40*88 + 0.30*88 = 88.0
    const result = computeWRI(88, 88, 88, DEFAULT);
    expect(result.wri).toBe(88);
    expect(result.riskStatus).toBe('safe');
  });

  it('WRI 87.99 -> watch (just below safe threshold)', () => {
    // Need exactly 87.99 raw
    // 0.30*88 + 0.40*88 + 0.30*87.97 = 26.4 + 35.2 + 26.391 = 87.991 -> floor -> 87.99
    const result = computeWRI(88, 88, 87.97, DEFAULT);
    expect(result.wri).toBe(87.99);
    expect(result.riskStatus).toBe('watch');
  });

  it('WRI 80.00 -> watch', () => {
    // 0.30*80 + 0.40*80 + 0.30*80 = 80.0
    const result = computeWRI(80, 80, 80, DEFAULT);
    expect(result.wri).toBe(80);
    expect(result.riskStatus).toBe('watch');
  });

  it('WRI 79.99 -> intervene (just below watch threshold)', () => {
    // 0.30*80 + 0.40*80 + 0.30*79.97 = 24 + 32 + 23.991 = 79.991 -> floor -> 79.99
    const result = computeWRI(80, 80, 79.97, DEFAULT);
    expect(result.wri).toBe(79.99);
    expect(result.riskStatus).toBe('intervene');
  });

  it('WRI 75.00 -> intervene', () => {
    const result = computeWRI(75, 75, 75, DEFAULT);
    expect(result.wri).toBe(75);
    expect(result.riskStatus).toBe('intervene');
  });

  it('WRI 74.99 -> critical (just below intervene threshold)', () => {
    // Floor(74.991) = 74.99
    const result = computeWRI(75, 75, 74.97, DEFAULT);
    expect(result.wri).toBeLessThan(75);
    expect(result.riskStatus).toBe('critical');
  });

  it('WRI 68.00 -> critical', () => {
    const result = computeWRI(68, 68, 68, DEFAULT);
    expect(result.wri).toBe(68);
    expect(result.riskStatus).toBe('critical');
  });

  it('WRI 67.99 -> at_risk (just below critical threshold)', () => {
    const result = computeWRI(68, 68, 67.97, DEFAULT);
    expect(result.wri).toBe(67.99);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Null diagnostic ──────────────────────────────────────────
  it('returns wri=0, at_risk when diagnosticScore is null', () => {
    const result = computeWRI(null, 95, 95, DEFAULT);
    expect(result.wri).toBe(0);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Fallback on missing values ───────────────────────────────
  it('fallbacks null G and P to D value', () => {
    const result = computeWRI(85, null, null, DEFAULT);
    // 0.30*85 + 0.40*85 + 0.30*85 = 85.0
    expect(result.wri).toBe(85);
    expect(result.riskStatus).toBe('watch');
  });

  it('fallbacks null P to D, keeps G as-is', () => {
    const result = computeWRI(80, 90, null, DEFAULT);
    // 0.30*80 + 0.40*90 + 0.30*80 = 24 + 36 + 24 = 84.0
    expect(result.wri).toBe(84);
    expect(result.riskStatus).toBe('watch');
  });

  // ── Custom weights ───────────────────────────────────────────
  it('applies custom weights correctly', () => {
    const custom: WRIWeights = { w1: 0.50, w2: 0.30, w3: 0.20 };
    // 0.50*100 + 0.30*0 + 0.20*0 = 50.0
    const result = computeWRI(100, 0, 0, custom);
    expect(result.wri).toBe(50);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Perfect and zero scores ──────────────────────────────────
  it('returns 100, safe for all-100 inputs', () => {
    const result = computeWRI(100, 100, 100, DEFAULT);
    expect(result.wri).toBe(100);
    expect(result.riskStatus).toBe('safe');
  });

  it('returns 0, at_risk for all-0 inputs', () => {
    const result = computeWRI(0, 0, 0, DEFAULT);
    expect(result.wri).toBe(0);
    expect(result.riskStatus).toBe('at_risk');
  });
});
