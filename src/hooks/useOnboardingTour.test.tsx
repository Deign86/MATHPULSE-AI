// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingTour } from './useOnboardingTour';

const clearOffer = vi.mocked(firestore.updateDoc);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  clearOffer.mockClear().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function expectFlagClearedOnce(uid: string) {
  expect(clearOffer).toHaveBeenCalledOnce();
  expect(clearOffer.mock.calls[0][1]).toEqual({ guideOfferPending: false });
  expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'users', uid);
}

/** Lets the hook's safe-screen wait run out. */
function waitForSafeScreen() {
  act(() => {
    vi.advanceTimersByTime(1600);
  });
}

describe('first-use guide offer', () => {
  it('never opens anything for an existing account, even in a browser with no saved guide state', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('existing-user', true, false, false));
    waitForSafeScreen();
    expect(tour.current.offerOpen).toBe(false);
    expect(tour.current.isOpen).toBe(false);
    expect(clearOffer).not.toHaveBeenCalled();
  });

  it('offers a new account the guide once the screen is safe, without starting it', () => {
    const { result: tour, rerender } = renderHook((blocked: boolean) => useOnboardingTour('new-user-wait', true, blocked, true), { initialProps: true });
    waitForSafeScreen();
    expect(tour.current.offerOpen).toBe(false);
    rerender(false);
    expect(tour.current.offerOpen).toBe(false);
    waitForSafeScreen();
    expect(tour.current.offerOpen).toBe(true);
    expect(tour.current.isOpen).toBe(false);
  });

  it('plays the full guide and clears the flag when the offer is accepted', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('new-user-play', true, false, true));
    waitForSafeScreen();
    act(() => tour.current.acceptOffer());
    expect(tour.current.offerOpen).toBe(false);
    expect(tour.current.isOpen).toBe(true);
    expect(tour.current.page).toBeNull();
    expectFlagClearedOnce('new-user-play');
  });

  it('clears the flag without playing when the offer is skipped', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('new-user-skip', true, false, true));
    waitForSafeScreen();
    act(() => tour.current.declineOffer());
    expect(tour.current.offerOpen).toBe(false);
    expect(tour.current.isOpen).toBe(false);
    expectFlagClearedOnce('new-user-skip');
  });

  it('never re-offers in the same session, even after a remount with a stale flag or a failed write', async () => {
    const failure = new Error('offline');
    clearOffer.mockRejectedValue(failure);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const first = renderHook(() => useOnboardingTour('new-user-once', true, false, true));
    waitForSafeScreen();
    await act(async () => first.result.current.declineOffer());
    expect(logged).toHaveBeenCalledWith(expect.any(String), failure);
    first.unmount();
    const returning = renderHook(() => useOnboardingTour('new-user-once', true, false, true));
    waitForSafeScreen();
    expect(returning.result.current.offerOpen).toBe(false);
    expect(returning.result.current.isOpen).toBe(false);
    expectFlagClearedOnce('new-user-once');
    logged.mockRestore();
  });

  it('shows the offer only while the home page is showing', () => {
    const { result: tour, rerender } = renderHook((onHome: boolean) => useOnboardingTour('new-user-home', true, false, onHome), { initialProps: true });
    waitForSafeScreen();
    expect(tour.current.offerOpen).toBe(true);
    rerender(false);
    expect(tour.current.offerOpen).toBe(false);
    rerender(true);
    expect(tour.current.offerOpen).toBe(true);
    expect(clearOffer).not.toHaveBeenCalled();
  });

  it('waits for independently owned dialogs to close before offering', () => {
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    document.body.append(modal);
    const { result: tour } = renderHook(() => useOnboardingTour('dialog-recovery-user', true, false, true));
    waitForSafeScreen();
    expect(tour.current.offerOpen).toBe(false);
    modal.remove();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(tour.current.offerOpen).toBe(true);
  });
});

describe('guide on request', () => {
  it('plays from the ? button or Settings for an existing account', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('existing-replay', true, false, false));
    act(() => tour.current.start());
    expect(tour.current.isOpen).toBe(true);
    expect(tour.current.page).toBeNull();
    act(() => tour.current.dismiss());
    expect(tour.current.isOpen).toBe(false);
    act(() => tour.current.start('Quiz Battle'));
    expect(tour.current.isOpen).toBe(true);
    expect(tour.current.page).toBe('Quiz Battle');
    expect(clearOffer).not.toHaveBeenCalled();
  });

  it('never launches without an eligible identity', () => {
    const { result: tour } = renderHook(() => useOnboardingTour(null, false, false, true));
    act(() => tour.current.start());
    waitForSafeScreen();
    expect(tour.current.isOpen).toBe(false);
    expect(tour.current.offerOpen).toBe(false);
  });

  it('closes an active guide when a blocking workflow opens', () => {
    const { result: tour, rerender } = renderHook((blocked: boolean) => useOnboardingTour('blocked-user', true, blocked, false), { initialProps: false });
    act(() => tour.current.start());
    expect(tour.current.isOpen).toBe(true);
    rerender(true);
    expect(tour.current.isOpen).toBe(false);
  });

  it('ends the guide on browser history traversal without rewriting the destination', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('history-user', true, false, false));
    act(() => tour.current.start());
    history.replaceState({}, '', '/modules');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(tour.current.isOpen).toBe(false);
    expect(location.pathname).toBe('/modules');
  });

  it('opens a guide requested while the profile is still loading once it is ready', () => {
    const { result: tour, rerender } = renderHook((ready: boolean) => useOnboardingTour('early-click-user', ready, false, false), { initialProps: false });
    act(() => tour.current.start('Leaderboard'));
    expect(tour.current.isOpen).toBe(false);
    rerender(true);
    expect(tour.current.isOpen).toBe(true);
    expect(tour.current.page).toBe('Leaderboard');
  });
});
