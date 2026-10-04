/** @vitest-environment jsdom */
import React, { act } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyLocalAvailability,
  resetSubjectAvailabilityForTests,
  useSubjectAvailability,
} from './useSubjectAvailability';
import * as platformConfigService from '../services/platformConfigService';

function Probe() {
  const { availability, error } = useSubjectAvailability();
  return (
    <div>
      <div data-testid="availability">{JSON.stringify(availability)}</div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function readAvailability(): Record<string, { available?: boolean }> {
  const raw = screen.getByTestId('availability').textContent || '{}';
  // SAFETY: the probe renders JSON.stringified availability records only.
  return JSON.parse(raw) as Record<string, { available?: boolean }>;
}

describe('useSubjectAvailability resilience (ADM-095)', () => {
  beforeEach(() => {
    resetSubjectAvailabilityForTests();
    vi.spyOn(platformConfigService, 'getSubjectAvailability').mockResolvedValue({
      subjects: {},
      updatedAt: new Date(),
      updatedBy: '',
    });
    vi.spyOn(platformConfigService, 'subscribeToSubjectAvailability').mockImplementation(() => vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('applies toggle updates instantly without waiting for the snapshot roundtrip', () => {
    render(<Probe />);
    act(() => {
      applyLocalAvailability('gen-math', false);
    });
    const availability = readAvailability();
    expect(availability['gen-math']?.available).toBe(false);
  });

  it('keeps toggles working when the initial fetch failed and no subscription exists', async () => {
    vi.spyOn(platformConfigService, 'getSubjectAvailability').mockReset().mockRejectedValueOnce(new Error('offline'));
    render(<Probe />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    act(() => {
      applyLocalAvailability('gen-math', true);
    });
    const availability = readAvailability();
    expect(availability['gen-math']?.available).toBe(true);
  });
});
