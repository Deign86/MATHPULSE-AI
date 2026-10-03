// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import * as onlineStatus from '../hooks/useOnlineStatus';
import OnlineOfflineBanner from './OnlineOfflineBanner';

afterEach(cleanup);

describe('online/offline banner regressions', () => {
  it('announces offline state and returns to the transient reconnect message', () => {
    vi.spyOn(onlineStatus, 'useOnlineStatus').mockReturnValue({ isOnline: false });
    const { rerender } = render(<OnlineOfflineBanner />);
    expect(screen.getByRole('status').textContent).toContain("You're offline");
    vi.spyOn(onlineStatus, 'useOnlineStatus').mockReturnValue({ isOnline: true });
    rerender(<OnlineOfflineBanner />);
    expect(screen.getByRole('status').textContent).toContain("You're back online");
  });

  it('removes the reconnect notice after the display interval', () => {
    vi.useFakeTimers();
    vi.spyOn(onlineStatus, 'useOnlineStatus').mockReturnValue({ isOnline: false });
    const { rerender } = render(<OnlineOfflineBanner />);
    vi.spyOn(onlineStatus, 'useOnlineStatus').mockReturnValue({ isOnline: true });
    rerender(<OnlineOfflineBanner />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByRole('status')).toBeNull();
    vi.useRealTimers();
  });
});
