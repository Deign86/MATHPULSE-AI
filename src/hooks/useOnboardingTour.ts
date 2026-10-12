import { useCallback, useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// The loaded profile keeps its guideOfferPending value until the next login, so answers are remembered here.
const answeredOffers = new Set<string>();

async function clearGuideOffer(uid: string) {
  try {
    await updateDoc(doc(db, 'users', uid), { guideOfferPending: false });
  } catch (error) {
    // The flag stays set, so the offer comes back on the next login.
    console.error('[onboarding] Could not clear the first-use guide offer:', error);
  }
}

/**
 * A new account (users/{uid}.guideOfferPending) is asked once whether to play the full guide;
 * every account can play it from the ? button or Settings with `start`.
 * `offerPending` is true while that flag is set and the role's home page is showing.
 */
export function useOnboardingTour(uid: string | null, ready: boolean, blocked: boolean, offerPending: boolean) {
  const [activeUid, setActiveUid] = useState<string | null>(null);
  // null = full guide; otherwise the tab whose page guide is playing.
  const [page, setPage] = useState<string | null>(null);
  const [offerUid, setOfferUid] = useState<string | null>(null);
  const isOpen = Boolean(uid && activeUid === uid && ready && !blocked);
  // offerPending also carries "on the home page", so a re-armed offer never surfaces elsewhere.
  const offerOpen = Boolean(uid && offerUid === uid && ready && !blocked && offerPending);

  useEffect(() => {
    if (!uid || blocked) {
      setActiveUid(null);
      setOfferUid(null);
      return;
    }
    // An explicit request made while the profile is still loading stays queued and opens once ready.
    if (!ready) return;
    if (!offerPending || activeUid === uid || offerUid === uid || answeredOffers.has(uid)) return;
    let timer = 0;
    const attempt = () => {
      // Other feature dialogs have their own state outside App.
      if (!document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) {
        setOfferUid(uid);
      } else {
        timer = window.setTimeout(attempt, 500);
      }
    };
    timer = window.setTimeout(attempt, 1500);
    return () => window.clearTimeout(timer);
  }, [uid, ready, blocked, activeUid, offerUid, offerPending]);

  const start = useCallback((pageTab: string | null = null) => {
    if (!uid || blocked) return;
    setPage(pageTab);
    setActiveUid(uid);
  }, [uid, blocked]);

  const dismiss = useCallback(() => setActiveUid(null), []);

  const answerOffer = useCallback(() => {
    if (!uid) return;
    answeredOffers.add(uid);
    setOfferUid(null);
    void clearGuideOffer(uid);
  }, [uid]);

  const acceptOffer = useCallback(() => {
    answerOffer();
    start();
  }, [answerOffer, start]);

  // Tour steps replace history, so browser Back/Forward lands on the student's chosen page; keep it.
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('popstate', dismiss);
    return () => window.removeEventListener('popstate', dismiss);
  }, [isOpen, dismiss]);

  return { isOpen, page, start, dismiss, offerOpen, acceptOffer, declineOffer: answerOffer };
}
