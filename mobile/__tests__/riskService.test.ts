// Ambient Jest type declarations (no @jest/globals installed in mobile)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: unknown): void;
};

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

describe('computeWRI', () => {
  // ── Test 1: Exact math ──────────────────────────────────────────
  it('computes WRI = 80.0 for (75, 80, 85) with default weights -> watch', () => {
    const result = computeWRI(75, 80, 85, DEFAULT);
    // 0.30*75 + 0.40*80 + 0.30*85 = 22.5 + 32 + 25.5 = 80.0
    expect(result.wri).toBe(80.0);
    expect(result.riskStatus).toBe('watch');
  });

  // ── Test 2: Perfect scores -> safe ──────────────────────────────
  it('returns 100, safe for all-100 inputs', () => {
    const result = computeWRI(100, 100, 100, DEFAULT);
    expect(result.wri).toBe(100);
    expect(result.riskStatus).toBe('safe');
  });

  // ── Test 3: Low scores -> at_risk ───────────────────────────────
  it('returns 50, at_risk for all-50 inputs', () => {
    const result = computeWRI(50, 50, 50, DEFAULT);
    expect(result.wri).toBe(50);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Test 4: Boundary — 87.99 vs 88.00 (safe/watch) ──────────────
  it('classifies 87.99 as watch, 88.00 as safe', () => {
    // floor(87.991 * 100) / 100 = 87.99
    const watchResult = computeWRI(88, 88, 87.97, DEFAULT);
    expect(watchResult.wri).toBe(87.99);
    expect(watchResult.riskStatus).toBe('watch');

    // 0.30*88*3 = 88.0
    const safeResult = computeWRI(88, 88, 88, DEFAULT);
    expect(safeResult.wri).toBe(88);
    expect(safeResult.riskStatus).toBe('safe');
  });

  // ── Test 5: Boundary — 68 vs 75 (critical/intervene) ────────────
  it('classifies 68 as critical, 75 as intervene', () => {
    const critical = computeWRI(68, 68, 68, DEFAULT);
    expect(critical.wri).toBe(68);
    expect(critical.riskStatus).toBe('critical');

    const intervene = computeWRI(75, 75, 75, DEFAULT);
    expect(intervene.wri).toBe(75);
    expect(intervene.riskStatus).toBe('intervene');
  });

  // ── Test 6: Null diagnostic -> at_risk with wri=0 ───────────────
  it('returns wri=0, at_risk when diagnosticScore is null', () => {
    const result = computeWRI(null, 90, 90, DEFAULT);
    expect(result.wri).toBe(0);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Test 7: Missing G/P fallback to D ───────────────────────────
  it('fallbacks null G and P to D value', () => {
    const result = computeWRI(80, null, null, DEFAULT);
    // 0.30*80 + 0.40*80 + 0.30*80 = 80.0
    expect(result.wri).toBe(80);
    expect(result.riskStatus).toBe('watch');
  });

  // ── Test 8: Custom weights ──────────────────────────────────────
  it('applies custom weights correctly', () => {
    const customWeight: WRIWeights = { w1: 0.5, w2: 0.3, w3: 0.2 };
    const result = computeWRI(100, 0, 0, customWeight);
    // 0.50*100 + 0.30*0 + 0.20*0 = 50.0
    expect(result.wri).toBe(50);
    expect(result.riskStatus).toBe('at_risk');
  });

  // ── Test 9: Sub-68 (at_risk threshold) ──────────────────────────
  it('classifies 67.99 as at_risk', () => {
    // floor(67.99 * 100) / 100 = 67.99 — needs a raw sum that floors to 67.99
    // 0.30*67 + 0.40*69 + 0.30*67 = 20.1 + 27.6 + 20.1 = 67.8
    // 0.30*68 + 0.40*68 + 0.30*67.97 = 20.4 + 27.2 + 20.391 = 67.991 -> floor -> 67.99
    const result = computeWRI(68, 68, 67.97, DEFAULT);
    expect(result.wri).toBe(67.99);
    expect(result.riskStatus).toBe('at_risk');
  });
});
