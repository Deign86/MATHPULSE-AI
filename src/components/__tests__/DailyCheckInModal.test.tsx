/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DailyCheckInModal from '../DailyCheckInModal';
import { RewardDefinition } from '../../types/rewards';

const mockWeekRewards: RewardDefinition[] = [
  { id: 'xp_50', label: '+50 XP Boost', description: 'Bonus XP', icon: 'zap', type: 'xp', value: 50, rarity: 'common', color: '#4ade80', day: 0 },
  { id: 'xp_100', label: '+100 XP Boost', description: 'Double bonus XP', icon: 'star', type: 'xp', value: 100, rarity: 'rare', color: '#facc15', day: 1 },
  { id: 'hint_x2', label: '2 Hint Tokens', description: 'Quick hint pack', icon: 'lightbulb', type: 'hint_token', value: 2, rarity: 'common', color: '#7c3aed', day: 2 },
  { id: 'streak_shield', label: 'Streak Shield', description: 'Protects streak', icon: 'shield', type: 'streak_shield', value: 1, rarity: 'rare', color: '#60a5fa', day: 3 },
  { id: 'xp_75', label: '+75 XP Boost', description: 'Solid XP reward', icon: 'sparkles', type: 'xp', value: 75, rarity: 'common', color: '#34d399', day: 4 },
  { id: 'hint_x3', label: '3 Hint Tokens', description: 'Use in-quiz hints', icon: 'lightbulb', type: 'hint_token', value: 3, rarity: 'common', color: '#a78bfa', day: 5 },
  { id: 'xp_200', label: '+200 XP Epic Boost', description: 'Massive XP surge', icon: 'sparkles', type: 'xp', value: 200, rarity: 'epic', color: '#f97316', day: 6 },
];

describe('DailyCheckInModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      closePath: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DailyCheckInModal
        isOpen={false}
        onClose={vi.fn()}
        onClaim={vi.fn()}
        weekRewards={mockWeekRewards}
        todayReward={mockWeekRewards[1]}
        canClaim={true}
        isClaiming={false}
        claimedDays={[0]}
        currentDayIndex={1}
        timeUntilReset="12:34:56"
      />
    );

    expect(screen.queryByText('Daily Rewards')).toBeNull();
  });

  it('renders into document.body with z-[100] when isOpen is true', () => {
    render(
      <div id="test-parent">
        <DailyCheckInModal
          isOpen={true}
          onClose={vi.fn()}
          onClaim={vi.fn()}
          weekRewards={mockWeekRewards}
          todayReward={mockWeekRewards[1]}
          canClaim={true}
          isClaiming={false}
          claimedDays={[0]}
          currentDayIndex={1}
          timeUntilReset="12:34:56"
        />
      </div>
    );

    const heading = screen.getByText('Daily Rewards');
    expect(heading).toBeInTheDocument();

    const testParent = document.getElementById('test-parent');
    expect(testParent?.contains(heading)).toBe(false);
    expect(document.body.contains(heading)).toBe(true);

    const portalWrapper = document.querySelector('.z-\\[100\\]');
    expect(portalWrapper).not.toBeNull();
  });

  it('renders all 7 days with day labels, grand finale card, and reset timer', () => {
    render(
      <DailyCheckInModal
        isOpen={true}
        onClose={vi.fn()}
        onClaim={vi.fn()}
        weekRewards={mockWeekRewards}
        todayReward={mockWeekRewards[1]}
        canClaim={true}
        isClaiming={false}
        claimedDays={[0]}
        currentDayIndex={1}
        timeUntilReset="12:34:56"
      />
    );

    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Day 3')).toBeInTheDocument();
    expect(screen.getByText('Day 4')).toBeInTheDocument();
    expect(screen.getByText('Day 5')).toBeInTheDocument();
    expect(screen.getByText('Day 6')).toBeInTheDocument();
    expect(screen.getByText('Day 7 • Epic Reward')).toBeInTheDocument();
    expect(screen.getByText('12:34:56')).toBeInTheDocument();
  });

  it('triggers onClaim when the Claim button is clicked', async () => {
    vi.useFakeTimers();
    const handleClaim = vi.fn();

    render(
      <DailyCheckInModal
        isOpen={true}
        onClose={vi.fn()}
        onClaim={handleClaim}
        weekRewards={mockWeekRewards}
        todayReward={mockWeekRewards[1]}
        canClaim={true}
        isClaiming={false}
        claimedDays={[0]}
        currentDayIndex={1}
        timeUntilReset="12:34:56"
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Claim!/i });
    fireEvent.click(claimBtn);

    vi.advanceTimersByTime(1000);
    expect(handleClaim).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('renders completed state when canClaim is false', () => {
    render(
      <DailyCheckInModal
        isOpen={true}
        onClose={vi.fn()}
        onClaim={vi.fn()}
        weekRewards={mockWeekRewards}
        todayReward={mockWeekRewards[1]}
        canClaim={false}
        isClaiming={false}
        claimedDays={[0, 1]}
        currentDayIndex={1}
        timeUntilReset="12:34:56"
      />
    );

    expect(screen.getByText(/Claimed for today/i)).toBeInTheDocument();
  });
});
