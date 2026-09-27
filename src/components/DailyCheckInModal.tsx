import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Zap,
  Coins,
  Lightbulb,
  Shield,
  Timer,
  CheckCircle2,
  Gift,
  Star,
  Sparkles,
  Rocket,
  Flame,
  Sprout,
  Search,
  BookOpen,
  Castle,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RewardDefinition } from '../types/rewards';
import { recordGet } from '../utils/memberOf';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  weekRewards: RewardDefinition[];
  todayReward: RewardDefinition | null;
  canClaim: boolean;
  isClaiming: boolean;
  claimedDays: number[];
  currentDayIndex: number; // 0-6 (Mon-Sun)
  timeUntilReset: string;
}

const rewardIconMap = {
  zap: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
  star: <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />,
  sparkles: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
  shield: <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
  lightbulb: <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />,
  flashlight: <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />,
  timer: <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />,
  rocket: <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />,
  flame: <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />,
  sprout: <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
  search: <Search className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />,
  castle: <Castle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
  'book-open': <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />,
};

const rewardTypeIconMap = {
  xp: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
  coins: <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />,
  hint_token: <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />,
  streak_shield: <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
  xp_multiplier: <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />,
  badge_unlock: <Star className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
};

const renderRewardIcon = (reward: RewardDefinition) => {
  return (
    recordGet(rewardIconMap, reward.icon) ??
    recordGet(rewardTypeIconMap, reward.type) ?? (
      <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
    )
  );
};

const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onClaim,
  weekRewards,
  todayReward,
  canClaim,
  isClaiming,
  claimedDays,
  currentDayIndex,
  timeUntilReset,
}) => {
  const [localClaiming, setLocalClaiming] = useState(false);

  if (!isOpen) return null;

  const handleClaim = () => {
    if (!canClaim || localClaiming || isClaiming) return;
    setLocalClaiming(true);

    const isEpic = todayReward?.rarity === 'epic';

    if (isEpic) {
      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#9956DE', '#7274ED', '#10B981'],
      });
    } else {
      confetti({
        particleCount: 85,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#10B981'],
      });
    }

    setTimeout(() => {
      setLocalClaiming(false);
      onClaim();
    }, 900);
  };

  const days1to6 = weekRewards.slice(0, 6);
  const day7 = weekRewards[6];

  const modalElement = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-6 py-10 sm:py-12 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-rewards-modal-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-[420px] bg-[#f7f9fc] dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] border border-[#dde3eb] dark:border-slate-800 shadow-2xl flex flex-col items-center p-4 sm:p-5 pt-7 sm:pt-8 overflow-visible"
      >
        {/* Creative Top Floating Banner (User favorite) */}
        <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 w-[82%] sm:w-[78%] h-11 sm:h-12 bg-gradient-to-r from-[#9956DE] via-[#7274ED] to-[#1FA7E1] rounded-2xl shadow-xl flex items-center justify-center gap-2 border border-white/30 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          <Sparkles size={16} className="text-amber-300 drop-shadow-sm animate-pulse" />
          <h2
            id="daily-rewards-modal-title"
            className="text-white font-black text-sm sm:text-base tracking-wider uppercase drop-shadow-sm font-display leading-none"
          >
            Daily Rewards
          </h2>
          <Sparkles size={16} className="text-amber-300 drop-shadow-sm animate-pulse" />
        </div>

        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close daily rewards"
          className="absolute -right-2 sm:-right-3 -top-2 sm:-top-3 w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-full flex items-center justify-center z-30 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Header Greeting */}
        <div className="mt-3 sm:mt-4 mb-2 text-center w-full">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white font-display leading-tight">
            Welcome Back!
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">
            Claim your daily reward to keep your streak alive.
          </p>
        </div>

        {/* Rewards Grid: Days 1 to 6 (3 Columns) */}
        <div className="grid grid-cols-3 gap-2 w-full mb-3 relative z-10">
          {days1to6.map((reward, idx) => {
            const dayNum = idx + 1;
            const isClaimed = claimedDays.includes(idx);
            const isToday = idx === currentDayIndex;
            const isLocked = idx > currentDayIndex;
            const canClaimToday = isToday && canClaim;

            return (
              <div
                key={reward.id || `day-${dayNum}`}
                className={`rounded-2xl flex flex-col overflow-hidden border transition-all ${
                  canClaimToday
                    ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/15 scale-[1.03] z-10 bg-amber-50/90 dark:bg-amber-950/40'
                    : isClaimed
                    ? 'border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20'
                    : 'border-[#dde3eb] dark:border-slate-700/80 bg-white dark:bg-slate-800/80'
                }`}
              >
                {/* Day Header Strip */}
                <div
                  className={`py-0.5 text-center font-black text-[9.5px] uppercase tracking-wider ${
                    canClaimToday
                      ? 'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white shadow-xs'
                      : isClaimed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {canClaimToday ? 'Today' : `Day ${dayNum}`}
                </div>

                {/* Reward Card Body */}
                <div className="p-2 flex flex-col items-center justify-between text-center min-h-[76px] sm:min-h-[82px] relative">
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center my-0.5 transition-transform ${
                      canClaimToday
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 scale-105'
                        : isClaimed
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {renderRewardIcon(reward)}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10.5px] font-bold line-clamp-1 leading-tight ${
                      canClaimToday
                        ? 'text-amber-950 dark:text-amber-100 font-black'
                        : isClaimed
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {reward.label}
                  </span>

                  {/* Status */}
                  <div className="mt-0.5">
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={10} className="stroke-[3]" />
                        Claimed
                      </span>
                    ) : canClaimToday ? (
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 animate-pulse">
                        Ready!
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-400">
                        <Lock size={8} />
                        Locked
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-400">Available</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day 7: Grand Finale Reward Card (Full Width) */}
          {day7 && (
            <div
              className={`col-span-3 rounded-2xl flex flex-col overflow-hidden border transition-all mt-0.5 ${
                currentDayIndex === 6 && canClaim
                  ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/15 scale-[1.01] bg-amber-50/90 dark:bg-amber-950/40'
                  : claimedDays.includes(6)
                  ? 'border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20'
                  : 'border-purple-200/70 dark:border-purple-900/40 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-sky-50/40 dark:from-purple-950/25 dark:via-slate-800/50 dark:to-slate-800/50'
              }`}
            >
              {/* Day 7 Header Strip */}
              <div
                className={`py-1 text-center font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 ${
                  currentDayIndex === 6 && canClaim
                    ? 'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white shadow-xs'
                    : claimedDays.includes(6)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-[#9956DE] via-[#7274ED] to-[#1FA7E1] text-white'
                }`}
              >
                <Sparkles size={11} className="text-amber-300" />
                <span>Day 7 • Epic Reward</span>
                <Sparkles size={11} className="text-amber-300" />
              </div>

              {/* Day 7 Body */}
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      claimedDays.includes(6)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gradient-to-br from-[#9956DE] via-[#7274ED] to-[#1FA7E1] text-white'
                    }`}
                  >
                    {claimedDays.includes(6) ? (
                      <CheckCircle2 size={20} className="stroke-[2.5]" />
                    ) : (
                      <Gift size={20} className="text-amber-200" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate leading-tight">
                      {day7.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {day7.description || 'Weekly streak completion bonus'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {claimedDays.includes(6) ? (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
                      <CheckCircle2 size={11} className="stroke-[3]" />
                      Claimed
                    </span>
                  ) : currentDayIndex === 6 && canClaim ? (
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl animate-pulse">
                      Ready!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                      <Lock size={9} />
                      Final Goal
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Timer size={13} />
          <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
            {timeUntilReset}
          </span>
          <span>until next reset</span>
        </div>

        {/* Tactile Claim Button */}
        {canClaim ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClaim}
            disabled={localClaiming || isClaiming}
            className="w-full sm:w-[90%] py-3 sm:py-3.5 rounded-full font-black font-display text-sm sm:text-base tracking-wide uppercase shadow-lg shadow-amber-500/25 bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white hover:from-[#FFA500] hover:to-[#FF7F00] border-b-4 border-[#e67e00] active:border-b-0 active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {localClaiming || isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <span>Claim!</span>
                <Sparkles size={16} />
              </>
            )}
          </motion.button>
        ) : (
          <div className="w-full sm:w-[90%] py-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Claimed for today</span>
          </div>
        )}
      </motion.div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};

export default DailyCheckInModal;
