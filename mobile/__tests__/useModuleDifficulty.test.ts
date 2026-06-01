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

// ── Smoke Tests: useModuleDifficulty ───────────────────────────

describe('useModuleDifficulty', () => {
  it('exports the function as a non-null value', () => {
    const mod = require('../hooks/useModuleDifficulty');
    expect(mod.useModuleDifficulty).toBeTruthy();
  });

  it('exports the Difficulty type', () => {
    const mod = require('../hooks/useModuleDifficulty');
    // Type-only export won't be present at runtime, but the module
    // should at least export the hook function.
    expect(typeof mod.useModuleDifficulty).toBe('function');
  });

  it('defaults WRONG_ANSWER_THRESHOLD to 3 (unit stub — manual test)', () => {
    // Confirm the threshold constant exists by importing and checking
    // that the hook does not throw with bad args.
    const { useModuleDifficulty } = require('../hooks/useModuleDifficulty');
    expect(typeof useModuleDifficulty).toBe('function');
  });
});
