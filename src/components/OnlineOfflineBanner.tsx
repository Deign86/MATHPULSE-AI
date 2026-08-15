/**
 * @file OnlineOfflineBanner.tsx
 *
 * Global connectivity banner. Shows a persistent amber bar while the browser
 * reports offline, and a brief green "back online" confirmation after
 * reconnecting.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const RECONNECT_NOTICE_MS = 4000;

const OnlineOfflineBanner: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const previousOnlineRef = useRef<boolean>(isOnline);

  useEffect(() => {
    const wasOffline = previousOnlineRef.current === false;
    previousOnlineRef.current = isOnline;

    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = window.setTimeout(() => setShowReconnected(false), RECONNECT_NOTICE_MS);
      return () => window.clearTimeout(timer);
    }

    if (!isOnline) {
      setShowReconnected(false);
    }

    return undefined;
  }, [isOnline]);

  if (isOnline && !showReconnected) return null;

  const isOffline = !isOnline;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-bold text-white shadow-lg ${
        isOffline ? 'bg-amber-500' : 'bg-emerald-600'
      }`}
    >
      {isOffline ? (
        <WifiOff size={18} aria-hidden="true" />
      ) : (
        <Wifi size={18} aria-hidden="true" />
      )}
      <span>
        {isOffline
          ? "You're offline — some features may be unavailable."
          : "You're back online."}
      </span>
    </div>
  );
};

export default OnlineOfflineBanner;
