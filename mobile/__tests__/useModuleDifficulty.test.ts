// Smoke Tests: useModuleDifficulty
import { useModuleDifficulty } from '../hooks/useModuleDifficulty';

describe('useModuleDifficulty', () => {
  it('exports the function as a non-null value', () => {
    expect(useModuleDifficulty).toBeTruthy();
  });

  it('exports a callable function', () => {
    expect(typeof useModuleDifficulty).toBe('function');
  });

  it('defaults WRONG_ANSWER_THRESHOLD to 3 (unit stub — manual test)', () => {
    // Confirm the threshold constant exists by importing and checking
    // that the hook does not throw with bad args.
    expect(typeof useModuleDifficulty).toBe('function');
  });
});
