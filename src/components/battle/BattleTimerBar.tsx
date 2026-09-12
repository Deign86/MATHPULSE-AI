import React from 'react';
import { cn } from '../ui/utils';

interface BattleTimerBarProps {
  roundSecondsLeft: number;
  timePerQuestionSec: number;
  currentRound: number;
  totalRounds: number;
}

export const BattleTimerBar: React.FC<BattleTimerBarProps> = React.memo(({
  roundSecondsLeft,
  timePerQuestionSec,
  currentRound,
  totalRounds,
}) => {
  const urgent = roundSecondsLeft <= 3;
  const barColor = roundSecondsLeft > Math.floor(timePerQuestionSec / 2)
    ? '#10b981'
    : roundSecondsLeft > 3
      ? '#f59e0b'
      : '#ef4444';
  return (
    <div className="shrink-0 w-full max-w-4xl mx-auto mt-6 mb-4 space-y-2">
      <div
        role="timer"
        aria-label={`Round ${currentRound} of ${totalRounds}: ${roundSecondsLeft} seconds left`}
        className="h-2 bg-white/10 rounded-full overflow-hidden"
      >
        <div
          className="h-full"
          style={{
            width: `${Math.max(0, (roundSecondsLeft / timePerQuestionSec) * 100)}%`,
            backgroundColor: barColor,
            transition: 'width 1s linear, background-color 0.3s ease-out',
          }}
        />
      </div>
      <div className="flex items-center justify-between px-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65 font-bold">
        <span>Round {currentRound} / {totalRounds}</span>
        <span className={cn('tabular-nums', urgent && 'text-rose-300')} aria-hidden="true">{roundSecondsLeft}s</span>
        <span className="sr-only" aria-live="polite">{urgent ? `${roundSecondsLeft} seconds left` : ''}</span>
      </div>
    </div>
  );
});

BattleTimerBar.displayName = 'BattleTimerBar';
