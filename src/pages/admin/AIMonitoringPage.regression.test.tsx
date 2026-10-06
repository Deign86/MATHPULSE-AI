// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as aiMonitoring from '../../hooks/useAIMonitoring';
import AIMonitoringPage from './AIMonitoringPage';

afterEach(cleanup);

describe('AI monitoring page regressions', () => {
  it('shows its loading skeleton while metrics are loading', () => {
    // SAFETY: loading state consumes only these three hook fields.
    vi.spyOn(aiMonitoring, 'useAIMonitoring').mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() } as never);
    const { container } = render(<AIMonitoringPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('keeps the safe loading state when metrics are absent after loading', () => {
    // SAFETY: missing-data state consumes only these three hook fields.
    vi.spyOn(aiMonitoring, 'useAIMonitoring').mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as never);
    const { container } = render(<AIMonitoringPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText(/live sync active/i)).toBeNull();
  });

});
