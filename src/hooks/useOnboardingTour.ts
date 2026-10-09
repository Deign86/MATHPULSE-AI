import { useCallback, useEffect, useState } from 'react';

/** Each role has its own guide, so first-use and dismissal are tracked per role. */
export type TourScope = 'student' | 'teacher' | 'admin';

const dismissedThisSession = new Set<string>();
const storageKey = (scope: TourScope, uid: string) => `mathpulse:${scope}-tour:v1:${uid}`;

function hasSeenTour(scope: TourScope, uid: string): boolean {
  if (dismissedThisSession.has(storageKey(scope, uid))) return true;
  try {
    return localStorage.getItem(storageKey(scope, uid)) === 'seen';
  } catch {
    return false;
  }
}

/** Persistence is per account and browser; unavailable storage falls back to this session. */
export function useOnboardingTour(scope: TourScope, uid: string | null, ready: boolean, blocked: boolean, autoStart = true) {
  const [activeUid, setActiveUid] = useState<string | null>(null);
  // null = full guide; otherwise the tab whose page guide is playing.
  const [page, setPage] = useState<string | null>(null);
  const isOpen = Boolean(uid && activeUid === uid && ready && !blocked);

  useEffect(() => {
    if (!uid || blocked) {
      setActiveUid(null);
      return;
    }
    // An explicit request made while the profile is still loading stays queued and opens once ready.
    if (!ready) return;
    if (!autoStart || activeUid === uid || hasSeenTour(scope, uid)) return;
    let timer = 0;
    const attempt = () => {
      // Other feature dialogs have their own state outside App.
      if (!document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) {
        setPage(null);
        setActiveUid(uid);
      } else {
        timer = window.setTimeout(attempt, 500);
      }
    };
    timer = window.setTimeout(attempt, 1500);
    return () => window.clearTimeout(timer);
  }, [scope, uid, ready, blocked, activeUid, autoStart]);

  const start = useCallback((pageTab: string | null = null) => {
    if (!uid || blocked) return;
    setPage(pageTab);
    setActiveUid(uid);
  }, [uid, blocked]);

  const dismiss = useCallback(() => {
    if (uid) {
      try {
        localStorage.setItem(storageKey(scope, uid), 'seen');
      } catch {
        dismissedThisSession.add(storageKey(scope, uid));
      }
    }
    setActiveUid(null);
  }, [scope, uid]);

  // Tour steps replace history, so browser Back/Forward lands on the student's chosen page; keep it.
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('popstate', dismiss);
    return () => window.removeEventListener('popstate', dismiss);
  }, [isOpen, dismiss]);

  return { isOpen, page, start, dismiss };
}
