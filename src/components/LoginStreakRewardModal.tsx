import * as React from 'react';
import { motion } from 'motion/react';
import { X, Lock } from 'lucide-react';
import * as confettiModule from 'canvas-confetti';

// Workaround for canvas-confetti import depending on tsconfig/esModuleInterop
const confetti = (typeof confettiModule === 'function' ? confettiModule : (confettiModule as any).default || confettiModule) as any;
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { LoginStreakState, LoginStreakReward } from '../types/loginStreakRewards';
import { STREAK_CATALOG } from '../data/loginStreakCatalog';

// Simple scaling function since we can't export it
const getScaledReward = (reward: LoginStreakReward, cycle: number): LoginStreakReward => {
  if (reward.isEpicPlaceholder) return reward;
  
  const scale = 1 + (cycle - 1) * 0.15;
  if (reward.category === 'xp') {
    return { ...reward, label: `+${Math.round(reward.baseValue * scale)} XP` };
  } else if (reward.category === 'hint_token') {
    return { ...reward, label: `${Math.ceil(reward.baseValue * scale)} Hints` };
  } else if (reward.category === 'lives') {
    return { ...reward, label: `+${reward.baseValue + (cycle - 1) * 2} Lives` };
  }
  return reward;
};

interface LoginStreakRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: LoginStreakState | null;
  currentReward: LoginStreakReward | null;
  currentRewardLives: number;
  canClaim: boolean;
  isClaiming: boolean;
  onClaim: () => void;
  todayPHT: string;
}

const rarityBadge: Record<string, string> = {
  common: 'bg-slate-100 text-slate-500',
  uncommon: 'bg-purple-50 text-purple-500',
  epic: 'bg-amber-50 text-amber-500',
};

const headerColors = [
  'bg-[#1FA7E1]/80',
  'bg-[#9956DE]/80',
  'bg-[#FFB356]/90',
  'bg-[#7274ED]/80',
  'bg-[#1FA7E1]/80',
  'bg-[#9956DE]/80',
  'bg-gradient-to-r from-[#FFB356] to-[#FF8C00]',
];

export const LoginStreakRewardModal: React.FC<LoginStreakRewardModalProps> = ({
  isOpen,
  onClose,
  state,
  currentReward,
  currentRewardLives,
  canClaim,
  isClaiming,
  onClaim,
  todayPHT,
}) => {
  if (!state || !currentReward) return null;

  const currentDay = state.currentStreakDay;
  const currentCycle = state.currentCycle;

  // Derive the 7 rewards for the current cycle
  const scaledRewards = STREAK_CATALOG.map((reward) => getScaledReward(reward, currentCycle));

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    
    if (currentReward.streakDay === 7) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF6B6B', '#4ade80'],
      });
    }
    onClaim();
  };

  const getDayStatus = (day: number) => {
    if (day < currentDay || (day === currentDay && !canClaim)) return 'claimed';
    if (day === currentDay && canClaim) return 'today';
    return 'locked';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Login Streak Rewards</DialogTitle>
        <DialogDescription className="sr-only">Claim your daily login streak rewards.</DialogDescription>

        <div className="relative">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="fire">🔥</span>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Login Streak</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold shadow-sm border border-indigo-100/50">
                Cycle {currentCycle} · Day {currentDay}/7
              </span>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* 7-Day Tracker */}
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-7 left-6 right-6 h-1 bg-slate-100 rounded-full" />
              <div 
                className="absolute top-7 left-6 h-1 bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `calc(${(Math.max(0, currentDay - (canClaim ? 1 : 0)) / 6) * 100}% - ${currentDay === 1 && canClaim ? '0px' : '24px'})` }} 
              />

              <div className="relative flex justify-between">
                {scaledRewards.map((reward, idx) => {
                  const status = getDayStatus(reward.streakDay);
                  const isClaimed = status === 'claimed';
                  const isToday = status === 'today';
                  const isLocked = status === 'locked';

                  return (
                    <div key={reward.id} className="flex flex-col items-center gap-2 z-10 w-16">
                      <div 
                        className={`
                          w-14 h-14 rounded-full flex items-center justify-center text-2xl relative
                          transition-all duration-300 border-4
                          ${isClaimed ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : ''}
                          ${isToday ? 'bg-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : ''}
                          ${isLocked ? 'bg-slate-50 border-slate-200 text-slate-400' : ''}
                        `}
                      >
                        {isToday && (
                          <motion.div
                            className="absolute -inset-2 rounded-full border-2 border-indigo-400/50"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        {isClaimed ? '✓' : reward.icon}
                      </div>
                      
                      <div className="flex flex-col items-center text-center">
                        <span className={`text-xs font-bold ${isClaimed || isToday ? 'text-slate-700' : 'text-slate-400'}`}>
                          {reward.streakDay === 7 ? 'Epic!' : reward.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${rarityBadge[reward.rarity]}`}>
                          {reward.rarity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day 7 Epic Placeholder */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4 flex items-center gap-4">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-inner">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  Exclusive Item <span className="text-xs bg-amber-200/50 text-amber-800 px-2 py-0.5 rounded-md">Coming Soon!</span>
                </h3>
                <p className="text-sm text-amber-700/80">Complete the 7-day cycle to unlock a mystery reward.</p>
              </div>
            </div>

            {/* Today Callout */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Today's Reward</span>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{currentReward.icon}</span>
                <span className="text-3xl font-black text-slate-800 tracking-tight">
                  {currentReward.label}
                </span>
              </div>
              
              <button
                onClick={handleClaim}
                disabled={!canClaim || isClaiming}
                className={`
                  w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-sm transition-all
                  ${canClaim && !isClaiming 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                `}
              >
                {isClaiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      ⏳
                    </motion.div>
                    Claiming...
                  </span>
                ) : canClaim ? (
                  `Claim ${currentReward.label}`
                ) : (
                  'Already Claimed Today ✓'
                )}
              </button>
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-sm font-medium text-slate-500 px-2">
              <span>Streak: Day {currentDay} of 7 — Cycle {currentCycle}</span>
              {currentRewardLives > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600">
                  <span role="img" aria-label="lives">💜</span> {currentRewardLives} Lives
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};