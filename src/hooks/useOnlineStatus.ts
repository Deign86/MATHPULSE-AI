/**
 * @file useOnlineStatus.ts
 *
 * Minimal online/offline hook backed by `navigator.onLine` and the window
 * `online`/`offline` events. The browser's `onLine` flag can lag behind a real
 * network drop, but it is the standard, dependency-free signal for offline
 * banner UX in a PWA.
 */

import { useEffect, useState } from 'react';

export interface UseOnlineStatusResult {
  /** True when the browser reports a network connection is available. */
  isOnline: boolean;
}

const getInitialOnlineState = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

export function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineState);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
