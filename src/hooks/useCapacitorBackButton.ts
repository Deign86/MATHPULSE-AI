import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useLocation } from 'react-router-dom';

export interface UseCapacitorBackButtonOptions {
  /** Array of active modal closers in priority order (innermost first) */
  activeModals?: Array<() => boolean>;
  /** Default fallback tab/route handler */
  onRootBack?: () => void;
}

/**
 * Handles Android hardware / gesture back button in Capacitor.
 *
 * Rules:
 * 1. If any modal, drawer, or sheet is open, close the topmost modal first.
 * 2. If navigating an internal route/tab (not at '/'), navigate back in history.
 * 3. If at the root route ('/'), exit the app cleanly.
 */
export function useCapacitorBackButton({
  activeModals = [],
  onRootBack,
}: UseCapacitorBackButtonOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModalsRef = useRef(activeModals);
  activeModalsRef.current = activeModals;
  const onRootBackRef = useRef(onRootBack);
  onRootBackRef.current = onRootBack;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const backListenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Try closing active modals first (returns true if a modal was handled)
      for (const closeModal of activeModalsRef.current) {
        if (closeModal()) {
          return;
        }
      }

      // 2. Navigate back if not at the root route
      const isRoot = location.pathname === '/' || location.pathname === '';
      if (!isRoot) {
        if (canGoBack || window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/');
        }
        return;
      }

      // 3. At root route
      if (onRootBackRef.current) {
        onRootBackRef.current();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [location.pathname, navigate]);
}
