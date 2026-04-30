import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (reward: any) => void;
  currentDay: number; // 1-7
  claimedDays: number[]; // e.g., [1, 2] if they already claimed days 1 and 2
}

const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onClaim,
  currentDay,
  claimedDays,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);

  if (!isOpen) return null;

  const handleClaim = () => {
    setIsClaiming(true);
    
    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF8C00']
    });

    const reward = rewards.find(r => r.day === currentDay);

    setTimeout(() => {
      setIsClaiming(false);
      onClaim(reward);
    }, 1500);
  };

  const rewards = [
    { day: 1, type: 'xp', amount: 20, label: '20', headerColor: 'bg-[#1FA7E1]/80 text-white' },
    { day: 2, type: 'xp', amount: 30, label: '30', headerColor: 'bg-[#9956DE]/80 text-white' },
    { day: 3, type: 'chest', amount: 40, label: '40', asset: '/avatar/blue_cap_thumbnail.png', chest: 'small', headerColor: 'bg-[#FFB356]/90 text-white' },
    { day: 4, type: 'xp', amount: 50, label: '50', headerColor: 'bg-[#7274ED]/80 text-white' },
    { day: 5, type: 'xp', amount: 60, label: '60', headerColor: 'bg-[#1FA7E1]/80 text-white' },
    { day: 6, type: 'xp', amount: 70, label: '70', headerColor: 'bg-[#9956DE]/80 text-white' },
    { day: 7, type: 'epic_chest', amount: 100, label: '100', asset: '/avatar/crown_thumbnail.png', chest: 'epic', headerColor: 'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

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

        <div className="mt-6 mb-4 text-center w-full">
          <h3 className="text-xl font-bold text-slate-800 font-display mt-2">Welcome Back!</h3>
          <p className="text-slate-500 font-medium text-xs mt-0.5">Claim your daily reward to keep the streak going.</p>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mb-5 relative z-10">
          {rewards.slice(0, 6).map((reward) => {
            const isClaimed = claimedDays.includes(reward.day);
            const isToday = currentDay === reward.day && !isClaimed;
            const isLocked = reward.day > currentDay;

            return (
              <div 
                key={reward.day}
                className={`relative rounded-xl flex flex-col overflow-hidden border-[1.5px] transition-all ${
                  isToday ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)] scale-105 z-10 bg-amber-50' : 
                  isClaimed ? 'border-[#dde3eb] bg-slate-200/50' : 
                  'border-[#dde3eb] bg-white'
                }`}
              >
                {/* Day Header */}
                <div className={`py-0.5 text-center font-black text-[10px] uppercase tracking-wider ${
                  isToday ? 'bg-amber-400 text-amber-900' :
                  reward.headerColor
                }`}>
                  Day {reward.day}
                </div>

                {/* Reward Content */}
                <div className="flex-1 p-2 flex flex-col items-center justify-center relative min-h-[75px]">
                  
                  {/* Claimed Stamp Overlay */}
                  {isClaimed && (
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

                  {isLocked && (
                    <div className="absolute top-1 right-1 bg-slate-200 rounded-full p-0.5 z-10">
                      <Lock size={8} className="text-slate-400" />
                    </div>
                  )}

                  {/* Faded background content if claimed */}
                  <div className={`flex flex-col items-center transition-all w-full ${isClaimed ? 'opacity-30 grayscale' : ''}`}>
                    {/* Icon */}
                    {reward.type === 'xp' ? (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1.5 ${
                          isClaimed ? 'bg-amber-50 border-amber-200' : 'bg-amber-100 border-amber-300'
                      }`}>
                         <span className={`font-black text-sm drop-shadow-sm ${isClaimed ? 'text-amber-400' : 'text-amber-500'}`}>XP</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mb-1.5 relative mt-1">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200 shadow-sm">
                          <span className="text-2xl drop-shadow-sm">📦</span>
                        </div>
                        {reward.asset && (
                          <div className="absolute -right-5 -bottom-3 w-12 h-12 bg-white rounded-lg p-1 border-2 border-amber-300 shadow-md transform rotate-[10deg]">
                            <img src={reward.asset} alt="Reward Item" className="w-full h-full object-contain drop-shadow-sm" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`font-black text-sm leading-none mt-1 ${isToday ? 'text-amber-600' : isClaimed ? 'text-slate-500' : 'text-slate-400'}`}>
                      {reward.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day 7 (Full Width) */}
          <div className={`col-span-3 relative rounded-xl flex flex-col overflow-hidden border-[1.5px] transition-all mt-1 ${
              currentDay === 7 && !claimedDays.includes(7) ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.02] z-10 bg-amber-50' : 
              claimedDays.includes(7) ? 'border-[#dde3eb] bg-slate-200/50' : 
              'border-[#dde3eb] bg-white'
            }`}
          >
              <div className={`py-1 text-center font-black text-[10px] uppercase tracking-widest ${
                currentDay === 7 && !claimedDays.includes(7) ? 'bg-amber-400 text-amber-900' :
                rewards[6].headerColor
              }`}>
                Day 7 • Epic Reward
              </div>
              <div className="flex items-center justify-center gap-5 p-3 relative">
                 
                 {/* Claimed Stamp Overlay for Day 7 */}
                 {claimedDays.includes(7) && (
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

                 <div className={`flex items-center justify-center gap-5 w-full transition-all ${claimedDays.includes(7) ? 'opacity-30 grayscale' : ''}`}>
                   <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-300 shadow-sm mb-0.5">
                         <span className="text-amber-500 font-black text-xl drop-shadow-sm">XP</span>
                      </div>
                      <span className={`font-black text-lg ${currentDay === 7 ? 'text-amber-600' : 'text-slate-500'}`}>100</span>
                   </div>
                   
                   <div className="text-slate-300 font-black text-xl">+</div>
                   
                   <div className="relative mt-1">
                      <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center border-2 border-purple-200 shadow-sm">
                        <span className="text-4xl drop-shadow-md">🧰</span>
                      </div>
                      <div className="absolute -right-6 -bottom-5 w-16 h-16 bg-white rounded-xl p-1.5 border-2 border-amber-300 shadow-lg transform rotate-[-5deg]">
                          <img src="/avatar/crown_thumbnail.png" alt="Crown" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                   </div>
                 </div>
              </div>
          </div>
        </div>

        {/* Claim Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClaim}
          disabled={claimedDays.includes(currentDay) || isClaiming}
          className={`w-[85%] py-3 rounded-full font-black text-base tracking-wide uppercase shadow-lg transition-all mt-2 ${
            claimedDays.includes(currentDay)
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-gradient-to-r from-[#FFB356] to-[#FF8C00] text-white hover:from-[#FFA500] hover:to-[#FF7F00] border-b-4 border-[#e67e00]'
          }`}
        >
          {isClaiming ? 'Claiming...' : claimedDays.includes(currentDay) ? 'Claimed' : 'Claim!'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default DailyCheckInModal;
