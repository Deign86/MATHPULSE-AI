// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingTour } from './useOnboardingTour';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe('student tour lifecycle', () => {
  it('waits for a safe screen before first-use launch', async () => {
    const { result: tour, rerender } = renderHook((blocked: boolean) => useOnboardingTour('student', 'student-a', true, blocked), { initialProps: true });
    expect(tour.current.isOpen).toBe(false);
    rerender(false);
    await waitFor(() => expect(tour.current.isOpen).toBe(true), { timeout: 3000 });
  });
  it('remembers dismissal per student while allowing Settings replay', async () => {
    const first = renderHook(() => useOnboardingTour('student', 'student-a', true, false));
    await waitFor(() => expect(first.result.current.isOpen).toBe(true), { timeout: 3000 });
    act(() => first.result.current.dismiss());
    first.unmount();
    const returning = renderHook(() => useOnboardingTour('student', 'student-a', true, false));
    expect(returning.result.current.isOpen).toBe(false);
    act(() => returning.result.current.start());
    expect(returning.result.current.isOpen).toBe(true);
    returning.unmount();
    const other = renderHook(() => useOnboardingTour('student', 'student-b', true, false));
    await waitFor(() => expect(other.result.current.isOpen).toBe(true), { timeout: 3000 });
  });
  it('never launches without an eligible student identity', () => {
    const { result: tour } = renderHook(() => useOnboardingTour('student', null, false, false));
    act(() => tour.current.start());
    expect(tour.current.isOpen).toBe(false);
  });
  it('closes an active tour when a blocking workflow opens', async () => {
    const { result: tour, rerender } = renderHook((blocked: boolean) => useOnboardingTour('student', 'student-a', true, blocked), { initialProps: false });
    await waitFor(() => expect(tour.current.isOpen).toBe(true), { timeout: 3000 });
    rerender(true);
    expect(tour.current.isOpen).toBe(false);
  });
});

describe('student tour recovery', () => {
  it('waits for independently owned dialogs to close before launching', async () => {
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    document.body.append(modal);
    const { result: tour } = renderHook(() => useOnboardingTour('student', 'dialog-recovery-student', true, false));
    await new Promise(resolve => setTimeout(resolve, 1700));
    expect(tour.current.isOpen).toBe(false);
    modal.remove();
    await waitFor(() => expect(tour.current.isOpen).toBe(true));
  });

  it('keeps dismissal in session memory if browser storage is blocked', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    const first = renderHook(() => useOnboardingTour('student', 'storage-blocked-student', true, false));
    act(() => first.result.current.start());
    expect(first.result.current.isOpen).toBe(true);
    act(() => first.result.current.dismiss());
    first.unmount();
    storageWrite.mockRestore();
    const returning = renderHook(() => useOnboardingTour('student', 'storage-blocked-student', true, false));
    await new Promise(resolve => setTimeout(resolve, 1700));
    expect(returning.result.current.isOpen).toBe(false);
    act(() => returning.result.current.start());
    expect(returning.result.current.isOpen).toBe(true);
  });
});

it('ends the guide on browser history traversal without rewriting the destination', () => {
  const { result: tour } = renderHook(() => useOnboardingTour('student', 'history-student', true, false, false));
  act(() => tour.current.start());
  history.replaceState({}, '', '/modules');
  act(() => window.dispatchEvent(new PopStateEvent('popstate')));
  expect(tour.current.isOpen).toBe(false);
  expect(location.pathname).toBe('/modules');
});

it('plays a single page guide on request and the full guide on first use', async () => {
  const { result: tour } = renderHook(() => useOnboardingTour('student', 'page-guide-student', true, false));
  await waitFor(() => expect(tour.current.isOpen).toBe(true), { timeout: 3000 });
  expect(tour.current.page).toBeNull();
  act(() => tour.current.dismiss());
  act(() => tour.current.start('Quiz Battle'));
  expect(tour.current.isOpen).toBe(true);
  expect(tour.current.page).toBe('Quiz Battle');
  act(() => tour.current.dismiss());
  act(() => tour.current.start());
  expect(tour.current.page).toBeNull();
});

it('opens a guide requested while the profile is still loading once it is ready', () => {
  const { result: tour, rerender } = renderHook((ready: boolean) => useOnboardingTour('student', 'early-click-student', ready, false, false), { initialProps: false });
  act(() => tour.current.start('Leaderboard'));
  expect(tour.current.isOpen).toBe(false);
  rerender(true);
  expect(tour.current.isOpen).toBe(true);
  expect(tour.current.page).toBe('Leaderboard');
});
