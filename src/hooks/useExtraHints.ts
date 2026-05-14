// src/hooks/useExtraHints.ts
// Reads extraHintsEnabled from user doc and merges with hint token currency

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ExtraHintsState {
  extraHintsEnabled: boolean;
  hintTokens: number;
  totalHintsAvailable: number;
  loading: boolean;
}

export function useExtraHints(userId: string | null): ExtraHintsState {
  const [state, setState] = useState<ExtraHintsState>({
    extraHintsEnabled: false,
    hintTokens: 0,
    totalHintsAvailable: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setState({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
          return;
        }

        const data = snap.data();
        const extraHints = data?.extraHintsEnabled === true;
        const tokens = data?.hintTokens || 0;

        // When extraHintsEnabled is true, student gets 3 bonus hints ON TOP of their tokens
        const total = extraHints ? tokens + 3 : tokens;

        setState({
          extraHintsEnabled: extraHints,
          hintTokens: tokens,
          totalHintsAvailable: total,
          loading: false,
        });
      },
      (err) => {
        console.error('[useExtraHints] snapshot error:', err);
        setState({ extraHintsEnabled: false, hintTokens: 0, totalHintsAvailable: 0, loading: false });
      }
    );

    return unsubscribe;
  }, [userId]);

  return state;
}
