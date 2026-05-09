import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Zap, Coins, Lightbulb, Shield, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RewardDefinition } from '../types/rewards';

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

const typeIcons: Record<string, React.ReactNode> = {
  xp: <Zap size={18} className="text-amber-500" />,
  coins: <Coins size={18} className="text-yellow-500" />,
  hint_token: <Lightbulb size={18} className="text-violet-500" />,
  streak_shield: <Shield size={18} className="text-blue-500" />,
  xp_multiplier: <Timer size={18} className="text-pink-500" />,
  badge_unlock: <Zap size={18} className="text-emerald-500" />,
};

const rarityBadge: Record<string, string> = {
  common: 'bg-slate-100 text-slate-500',
  rare: 'bg-blue-50 text-blue-500',
  epic: 'bg-amber-50 text-amber-500',
};

const headerColors = [
  'bg-[#1FA7E1]/80 text-white',
  'bg-[#9956DE]/80 text-white',
  'bg-[#FFB356]/90 text-white',
  'bg-[#7274ED]/80 text-white',
  'bg-[#1FA7E1]/80 text-white',
  'bg-[#9956DE]/80 text-white',
  'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white',
];

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
    if (!canClaim || localClaiming) return;
    setLocalClaiming(true);

    const isEpic = todayReward?.rarity === 'epic';

    if (isEpic) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF6B6B', '#4ade80'],
      });
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
      });
    }

    setTimeout(() => {
      setLocalClaiming(false);
      onClaim();
    }, 1200);
  };

  const displayDay = (idx: number) => idx + 1;
  const isToday = (idx: number) => idx === currentDayIndex;
  const isClaimed = (idx: number) => claimedDays.includes(idx);
  const isLocked = (idx: number) => idx > currentDayIndex;

  const days1to6 = weekRewards.slice(0, 6);
  const day7 = weekRewards[6];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-[420px] bg-[#f7f9fc] rounded-3xl border border-[#dde3eb] shadow-2xl flex flex-col items-center p-5 overflow-visible"
      >
        {/* Header Ribbon Decoration */}
        <div className="absolute -top-6 w-[85%] h-12 bg-gradient-to-r from-[#9956DE] via-[#7274ED] to-[#1FA7E1] rounded-xl shadow-lg flex items-center justify-center z-20">
          <div className="absolute -left-2.5 -z-10 w-5 h-8 bg-[#633299] rounded-l-full rotate-12 top-1.5"></div>
          <div className="absolute -right-2.5 -z-10 w-5 h-8 bg-[#10709b] rounded-r-full -rotate-12 top-1.5"></div>
          <h2 className="text-white font-black text-lg tracking-wide uppercase drop-shadow-sm font-display">Daily Rewards</h2>
        </div>

        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 w-8 h-8 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center z-30 shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          <X size={16} strokeWidth={3} />
        </button>

        <div className="mt-6 mb-2 text-center w-full">
          <h3 className="text-xl font-bold text-slate-800 font-display mt-2">Welcome Back!</h3>
          <p className="text-slate-500 font-medium text-xs mt-0.5">Claim your daily reward for today.</p>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mb-5 relative z-10">
          {days1to6.map((reward, idx) => {
            const dayNum = displayDay(idx);
            const claimed = isClaimed(idx);
            const today = isToday(idx);
            const locked = isLocked(idx);

            return (
              <div
                key={reward.id}
                className={`relative rounded-xl flex flex-col overflow-hidden border-[1.5px] transition-all ${
                  today && !claimed ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)] scale-105 z-10 bg-amber-50' :
                  claimed ? 'border-[#dde3eb] bg-slate-200/50' :
                  'border-[#dde3eb] bg-white'
                }`}
              >
                {/* Day Header */}
                <div className={`py-0.5 text-center font-black text-[10px] uppercase tracking-wider ${
                  today && !claimed ? 'bg-amber-400 text-amber-900' :
                  headerColors[idx]
                }`}>
                  Day {dayNum}
                </div>

                {/* Rarity badge */}
                <div className="absolute top-5 right-1 z-10">
                  <span className={`text-[8px] font-bold uppercase px-1 rounded ${rarityBadge[reward.rarity]}`}>
                    {reward.rarity}
                  </span>
                </div>

                {/* Reward Content */}
                <div className="flex-1 p-2 flex flex-col items-center justify-center relative min-h-[75px]">
                  {/* Claimed Stamp Overlay */}
                  {claimed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                    >
                      <div className="relative w-14 h-14 rounded-full border-[3px] border-rose-500 bg-rose-50 flex items-center justify-center transform -rotate-12 shadow-sm opacity-90">
                        <img src="/avatar/avatar_icon.png" alt="Claimed" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div className="absolute -bottom-2 bg-rose-500 rounded px-1.5 py-0.5 border border-rose-200 shadow-sm">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">Claimed</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {locked && (
                    <div className="absolute top-1 right-1 bg-slate-200 rounded-full p-0.5 z-10">
                      <Lock size={8} className="text-slate-400" />
                    </div>
                  )}

                  {/* Faded background content if claimed */}
                  <div className={`flex flex-col items-center transition-all w-full ${claimed ? 'opacity-30 grayscale' : ''}`}>
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1"
                      style={{
                        backgroundColor: reward.color + '20',
                        borderColor: reward.color + '40',
                      }}
                    >
                      <span className="text-lg">{reward.icon}</span>
                    </div>

                    <div className={`font-black text-xs leading-none mt-0.5 text-center ${today ? 'text-amber-600' : claimed ? 'text-slate-500' : 'text-slate-600'}`}>
                      {reward.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day 7 (Full Width) */}
          {day7 && (
            <div className={`col-span-3 relative rounded-xl flex flex-col overflow-hidden border-[1.5px] transition-all mt-1 ${
                isToday(6) && !isClaimed(6) ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.02] z-10 bg-amber-50' :
                isClaimed(6) ? 'border-[#dde3eb] bg-slate-200/50' :
                'border-[#dde3eb] bg-white'
              }`}
            >
              <div className={`py-1 text-center font-black text-[10px] uppercase tracking-widest ${
                isToday(6) && !isClaimed(6) ? 'bg-amber-400 text-amber-900' :
                headerColors[6]
              }`}>
                Day 7 • Epic Reward
              </div>

              {/* Rarity badge */}
              <div className="absolute top-6 right-2 z-10">
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${rarityBadge[day7.rarity]}`}>
                  {day7.rarity}
                </span>
              </div>

              <div className="flex items-center justify-center gap-5 p-3 relative">
                {/* Claimed Stamp Overlay for Day 7 */}
                {isClaimed(6) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  >
                    <div className="relative w-20 h-20 rounded-full border-[4px] border-rose-500 bg-rose-50 flex items-center justify-center transform rotate-12 shadow-sm opacity-90">
                      <img src="/avatar/avatar_icon.png" alt="Claimed" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div className="absolute -bottom-2.5 bg-rose-500 rounded-md px-2 py-0.5 border border-rose-200 shadow-md">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Claimed</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className={`flex items-center justify-center gap-5 w-full transition-all ${isClaimed(6) ? 'opacity-30 grayscale' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm mb-0.5"
                      style={{
                        backgroundColor: day7.color + '20',
                        borderColor: day7.color + '40',
                      }}
                    >
                      <span className="text-2xl">{day7.icon}</span>
                    </div>
                    <span className={`font-black text-sm ${isToday(6) ? 'text-amber-600' : 'text-slate-600'}`}>{day7.label}</span>
                  </div>

                  {/* Avatar reward image for epic/legendary */}
                  {day7.rarity === 'epic' && (
                    <div className="relative mt-1">
                      <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center border-2 border-purple-200 shadow-sm">
                        <span className="text-3xl drop-shadow-md">🎁</span>
                      </div>
                      <div className="absolute -right-5 -bottom-4 w-14 h-14 bg-white rounded-xl p-1 border-2 border-amber-300 shadow-lg transform rotate-[-5deg]">
                        <img src="/avatar/crown_thumbnail.png" alt="Crown" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <Timer size={14} />
          <span className="font-mono font-medium">{timeUntilReset}</span>
          <span>until next reset</span>
        </div>

        {/* Claim Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClaim}
          disabled={!canClaim || isClaiming || localClaiming}
          className={`w-[85%] py-3 rounded-full font-black text-base tracking-wide uppercase shadow-lg transition-all mt-2 ${
            !canClaim || isClaiming || localClaiming
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white hover:from-[#FFA500] hover:to-[#FF7F00] border-b-4 border-[#e67e00]'
          }`}
        >
          {isClaiming || localClaiming ? 'Claiming...' : !canClaim ? 'Claimed' : 'Claim!'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default DailyCheckInModal;
