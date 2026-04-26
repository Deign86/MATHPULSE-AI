import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Users } from 'lucide-react';
import CompositeAvatar from '../CompositeAvatar';

interface BattleFooterProps {
  studentProfile: any;
  activeMatch: any;
  scorePulseTarget: 'player' | 'opponent' | null;
  quizBattleAvatar: string;
}

export const BattleFooter: React.FC<BattleFooterProps> = React.memo(({
  studentProfile,
  activeMatch,
  scorePulseTarget,
  quizBattleAvatar,
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 w-full xl:max-w-[1400px] mx-auto px-4 md:px-8 shrink-0 h-32 md:h-48 flex justify-between items-end pb-0 pointer-events-none z-30">
      {/* Left: Player Avatar */}
      <div className="flex items-end gap-3 sm:gap-6 relative pointer-events-auto">
          <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-t-[40px] flex items-end">
            <CompositeAvatar layers={studentProfile?.avatarLayers || {}} className="w-full h-full object-contain origin-bottom scale-[1.15]" />
          </div>
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 md:px-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 md:gap-4 mb-4 max-w-[220px] md:max-w-[280px]">
            <div className="flex flex-col flex-1 min-w-0">
               <span className="text-white font-black text-base md:text-lg truncate tracking-wide">{studentProfile?.name || 'Player'}</span>
               <span className="text-xs md:text-sm text-white/50 font-bold uppercase tracking-wider">Level {studentProfile?.level || 1}</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="flex flex-col items-center justify-center shrink-0 w-10 md:w-12">
               <motion.span 
                 animate={scorePulseTarget === 'player' ? { scale: [1, 1.4, 1], color: ['#fff', '#34d399', '#fff'] } : {}}
                 transition={{ duration: 0.5 }}
                 className="text-2xl md:text-3xl font-black text-white leading-none"
               >
                 {activeMatch.scoreFor}
               </motion.span>
               <span className="text-[9px] md:text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1 leading-none">Score</span>
            </div>
         </div>
      </div>

      {/* Right: Opponent */}
      <div className="flex items-end gap-3 sm:gap-6 relative flex-row-reverse pointer-events-auto">
          <div className="relative w-28 h-28 md:w-40 md:h-40 bg-[#1a2030] rounded-t-[40px] flex items-end justify-center border-t-4 border-slate-700/50 shadow-inner">
            {activeMatch.mode === 'bot' ? (
              <Bot className="h-16 w-16 md:h-20 md:w-20 text-rose-400 mb-6 drop-shadow-xl" strokeWidth={1.5} />
            ) : (
              <Users className="h-16 w-16 md:h-20 md:w-20 text-slate-500 mb-6 drop-shadow-xl" strokeWidth={1.5} />
            )}
         </div>
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 md:px-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 md:gap-4 mb-4 flex-row-reverse text-right max-w-[220px] md:max-w-[280px]">
            <div className="flex flex-col flex-1 min-w-0">
               <span className="text-white font-black text-base md:text-lg truncate tracking-wide">{activeMatch.opponentName || 'Anonymous'}</span>
               <span className="text-xs md:text-sm text-rose-400 font-bold uppercase tracking-wider">{activeMatch.mode === 'bot' ? 'System Bot' : 'Challenger'}</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="flex flex-col items-center justify-center shrink-0 w-10 md:w-12">
               <motion.span 
                 animate={scorePulseTarget === 'opponent' ? { scale: [1, 1.4, 1], color: ['#fff', '#fb7185', '#fff'] } : {}}
                 transition={{ duration: 0.5 }}
                 className="text-2xl md:text-3xl font-black text-white leading-none"
               >
                 {activeMatch.scoreAgainst}
               </motion.span>
               <span className="text-[9px] md:text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1 leading-none">Score</span>
            </div>
         </div>
      </div>
    </div>
  );
});

BattleFooter.displayName = 'BattleFooter';
