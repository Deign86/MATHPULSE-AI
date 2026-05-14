// src/hooks/useModuleDifficulty.ts
// Reads moduleDifficulty from user doc and filters curriculum accordingly

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type ModuleDifficulty = 'normal' | 'easier' | 'remedial';

export interface ModuleDifficultyState {
  difficulty: ModuleDifficulty;
  loading: boolean;
}

export function useModuleDifficulty(userId: string | null): ModuleDifficultyState {
  const [state, setState] = useState<ModuleDifficultyState>({
    difficulty: 'normal',
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState({ difficulty: 'normal', loading: false });
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setState({ difficulty: 'normal', loading: false });
          return;
        }

        const data = snap.data();
        const difficulty = (data?.moduleDifficulty as ModuleDifficulty) || 'normal';

        setState({
          difficulty: ['normal', 'easier', 'remedial'].includes(difficulty) ? difficulty : 'normal',
          loading: false,
        });
      },
      (err) => {
        console.error('[useModuleDifficulty] snapshot error:', err);
        setState({ difficulty: 'normal', loading: false });
      }
    );

    return unsubscribe;
  }, [userId]);

  return state;
}

/**
 * Filter curriculum modules based on difficulty setting.
 * - normal: return all modules
 * - easier: return only modules tagged as "foundation" or "basic", skip "advanced"
 * - remedial: return only modules tagged as "remedial" or "review"
 */
export function filterModulesByDifficulty<T extends { tags?: string[]; difficulty?: string }>(
  modules: T[],
  difficulty: ModuleDifficulty
): T[] {
  if (difficulty === 'normal') return modules;

  if (difficulty === 'easier') {
    return modules.filter((m) => {
      const tags = m.tags || [];
      const diff = m.difficulty || '';
      // Include foundation/basic, exclude advanced
      return tags.some((t) => ['foundation', 'basic', 'introductory'].includes(t.toLowerCase())) ||
        ['foundation', 'basic', 'introductory'].includes(diff.toLowerCase()) ||
        (!tags.includes('advanced') && !diff.toLowerCase().includes('advanced'));
    });
  }

  if (difficulty === 'remedial') {
    return modules.filter((m) => {
      const tags = m.tags || [];
      const diff = m.difficulty || '';
      return tags.some((t) => ['remedial', 'review', 'catch-up'].includes(t.toLowerCase())) ||
        ['remedial', 'review', 'catch-up'].includes(diff.toLowerCase());
    });
  }

  return modules;
}
