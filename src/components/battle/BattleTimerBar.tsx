import React from 'react';
import { motion } from 'framer-motion';
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
  return (
    <div className="shrink-0 w-full max-w-4xl mx-auto mt-6 mb-4 space-y-2">
      <div className={cn('h-2 bg-white/10 rounded-full overflow-hidden', roundSecondsLeft <= 3 && 'animate-pulse')}>
        <motion.div
          className="h-full"
          animate={{
            width: `${Math.max(0, (roundSecondsLeft / timePerQuestionSec) * 100)}%`,
            backgroundColor: roundSecondsLeft > Math.floor(timePerQuestionSec / 2)
              ? '#10b981'
              : roundSecondsLeft > 3
                ? '#f59e0b'
                : '#ef4444'
          }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
      <div className="flex items-center justify-between px-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65 font-bold">
        <span>Round {currentRound} / {totalRounds}</span>
        <span className={cn('tabular-nums', roundSecondsLeft <= 3 && 'text-rose-300')}>{roundSecondsLeft}s</span>
      </div>
    </div>
  );
});

BattleTimerBar.displayName = 'BattleTimerBar';
