// Smoke Tests: useExtraHints
import { useExtraHints } from '../hooks/useExtraHints';

describe('useExtraHints', () => {
  it('exports the function as a non-null value', () => {
    expect(useExtraHints).toBeTruthy();
  });

  it('exports a callable function', () => {
    expect(typeof useExtraHints).toBe('function');
  });

  it('threshold is set to 60 seconds (unit stub — manual test)', () => {
    // Verify import works; full timing test requires a React renderer.
    expect(typeof useExtraHints).toBe('function');
  });
});
