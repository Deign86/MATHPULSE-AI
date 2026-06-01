// Ambient Jest type declarations (no @jest/globals needed in mobile)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeGreaterThan(expected: number): void;
};

// ── Smoke Tests: useExtraHints ─────────────────────────────────

describe('useExtraHints', () => {
  it('exports the function as a non-null value', () => {
    const mod = require('../hooks/useExtraHints');
    expect(mod.useExtraHints).toBeTruthy();
  });

  it('exports a callable function', () => {
    const mod = require('../hooks/useExtraHints');
    expect(typeof mod.useExtraHints).toBe('function');
  });

  it('threshold is set to 60 seconds (unit stub — manual test)', () => {
    const { useExtraHints } = require('../hooks/useExtraHints');
    // Verify import works; full timing test requires a React renderer.
    expect(typeof useExtraHints).toBe('function');
  });
});
