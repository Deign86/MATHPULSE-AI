/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';

import * as gamificationService from '../services/gamificationService';
import type { UseDailyRewardResult } from '../hooks/useDailyReward';
import * as dailyRewardNs from '../hooks/useDailyReward';
import { RewardsModal } from './RewardsModal';

const baseProps = {
  isOpen: true,
  onClose: () => undefined,
  userLevel: 3,
  currentXP: 120,
  xpToNextLevel: 200,
  totalXP: 1120,
  userId: 'student-1',
  onViewAllRewards: () => undefined,
};

function stubReward(streak: number): UseDailyRewardResult {
  return {
    weekRewards: [],
    todayReward: null,
    canClaim: false,
    isClaiming: false,
    claimedDays: [],
    currentStreak: streak,
    longestStreak: streak,
    totalClaimed: 0,
    hintTokens: 0,
    streakShields: 0,
    activeMultiplier: null,
    timeUntilReset: '',
    showModal: false,
    lastClaimResult: null,
    error: null,
    claim: async () => null,
    dismissModal: () => {},
    refresh: async () => {},
  };
}

describe('RewardsModal streak display (STU-021)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderWithStreak(streak: number): void {
    vi.spyOn(dailyRewardNs, 'useDailyReward').mockReturnValue(stubReward(streak));
    vi.spyOn(gamificationService, 'getUserAchievements').mockResolvedValue([]);
    // SAFETY: opaque references returned by the Firestore boundary spies; consumed only by mocked IO.
    vi.spyOn(firestore, 'collection').mockReturnValue({} as CollectionReference);
    // SAFETY: tests only read the id off the returned reference.
    vi.spyOn(firestore, 'doc').mockReturnValue({ id: 'progress-1' } as DocumentReference);
    // SAFETY: boundary mock resolves a non-existing doc so progress stays empty.
    vi.spyOn(firestore, 'getDoc').mockResolvedValue({ exists: () => false } as never);
    render(<RewardsModal {...baseProps} />);
  }

  it('shows the live daily-reward streak instead of a hardcoded zero', async () => {
    renderWithStreak(7);
    expect(await screen.findByText('7d')).toBeInTheDocument();
  });

  it('shows zero honestly when the streak is zero', async () => {
    renderWithStreak(0);
    expect(await screen.findByText('0d')).toBeInTheDocument();
  });
});
