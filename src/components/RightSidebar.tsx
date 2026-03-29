import React from 'react';
import { ChevronRight, Trophy, Flame, Star, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import DailyChallengeWidget from './DailyChallengeWidget';

interface RightSidebarProps {
  onOpenRewards: () => void;
  onOpenLeaderboard?: () => void;
  userLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  streak: number;
  streakHistory?: string[];
  onLogout?: () => void;
  onOpenProfile?: () => void;
  userName?: string;
  userRole?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  onOpenRewards, 
  onOpenLeaderboard,
  userLevel, 
  currentXP, 
  xpToNextLevel,
  streak,
  streakHistory = [],
}) => {
  const progressPercentage = (currentXP / xpToNextLevel) * 100;

  return (
    <div className="space-y-2.5">
      {/* Compact Rewards Card — clickable, leads to full rewards modal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenRewards}
        className="rounded-2xl border border-[#9956DE]/25 cursor-pointer transition-all group relative overflow-hidden bg-gradient-to-br from-[#9956DE] via-[#7274ED] to-[#1FA7E1] hover:shadow-[0_16px_40px_rgba(114,116,237,0.28)] hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(251,150,187,0.32),transparent_42%),radial-gradient(circle_at_85%_84%,rgba(117,208,106,0.24),transparent_40%)]" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFB356] via-[#FB96BB] to-[#6ED1CF]" />
        
        <div className="relative z-10 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/35 backdrop-blur-sm">
              <Trophy size={16} className="text-white" />
            </div>
            <h3 className="font-display font-bold text-sm text-white tracking-wide">Rewards & Achievements</h3>
          </div>
          <ChevronRight size={16} className="text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Compact inline stats */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-body px-2 py-1 rounded-md bg-white/14 border border-white/25 text-white">
            <Crown size={12} className="text-[#FFB356]" />
            <span className="font-bold">Lv {userLevel}</span>
          </div>
          <div className="w-px h-3 bg-white/35" />
          <div className="flex items-center gap-1.5 text-xs font-body px-2 py-1 rounded-md bg-white/14 border border-white/25 text-white">
            <Star size={12} className="text-[#6ED1CF]" />
            <span className="font-bold">{currentXP} XP</span>
          </div>
          <div className="w-px h-3 bg-white/35" />
          <div className="flex items-center gap-1.5 text-xs font-body px-2 py-1 rounded-md bg-white/14 border border-white/25 text-white">
            <Flame size={12} className="text-[#FF8B8B]" />
            <span className="font-bold">{streak}d</span>
          </div>
        </div>

        {/* Progress to next level */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-body text-white/90">Next: Level {userLevel + 1}</span>
            <span className="text-[11px] font-body font-semibold text-white">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden border border-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#6ED1CF] via-[#75D06A] to-[#FFB356] rounded-full"
            />
          </div>
        </div>
        </div>
      </motion.div>

      {/* Daily Challenge & Streak Calendar Widget */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <DailyChallengeWidget streakHistory={streakHistory} />
      </motion.div>

      {/* Leaderboard Preview with Miniature Stage */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenLeaderboard}
        className="bg-white rounded-xl border border-slate-200/80 hover:shadow-md hover:border-amber-200/60 transition-all group overflow-hidden cursor-pointer"
      >
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200/60 transition-colors group-hover:bg-amber-100/50">
              <Crown size={14} className="text-amber-500" />
            </div>
            <h3 className="font-display font-bold text-sm text-[#0a1628]">Leaderboards</h3>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-amber-500 transition-transform" />
        </div>
        
        {/* Miniature Stage Podium */}
        <div className="pt-8 pb-3 px-2 bg-gradient-to-b from-slate-50/30 to-white flex items-end justify-center gap-1.5 min-h-[170px]">
          
          {/* Rank 2 (Left) */}
          <div className="flex flex-col items-center relative z-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="relative mb-2"
            >
              <img src="https://i.pravatar.cc/150?img=33" alt="You" className="w-10 h-10 rounded-full border-[3px] border-sky-400 z-10 relative object-cover shadow-sm bg-white" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-sm">2</div>
            </motion.div>
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '54px' }} transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
              className="w-[70px] bg-gradient-to-b from-slate-200 to-slate-100 rounded-t-xl rounded-b-md border-t-2 border-slate-50 flex items-center justify-center relative shadow-[inset_0_-4px_6px_rgba(0,0,0,0.05),0_4px_6px_rgba(0,0,0,0.05)]"
            >
               <span className="text-slate-400 font-black text-2xl opacity-40 translate-y-1">2</span>
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/70 rounded-t-xl"></div>
            </motion.div>
            <div className="mt-2 text-center">
              <span className="block text-[12px] font-bold text-[#0a1628]">You</span>
              <span className="block text-[10px] text-sky-600 font-bold">2.1k XP</span>
            </div>
          </div>

          {/* Rank 1 (Center) */}
          <div className="flex flex-col items-center relative z-20 -mx-2">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
              className="relative mb-2"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <Crown size={22} className="text-amber-400 drop-shadow-md mb-1" fill="#fbbf24" strokeWidth={1.5} />
              </div>
              <img src="https://i.pravatar.cc/150?img=68" alt="Alex" className="w-[52px] h-[52px] rounded-full border-[3px] border-amber-400 z-10 relative object-cover shadow-md bg-white" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-sm">1</div>
            </motion.div>
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '74px' }} transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
              className="w-[78px] bg-gradient-to-b from-amber-100 to-amber-50 rounded-t-xl rounded-b-md border-t-2 border-amber-50 flex items-center justify-center relative shadow-[inset_0_-4px_8px_rgba(251,191,36,0.1),0_6px_8px_rgba(0,0,0,0.05)]"
            >
               <span className="text-amber-400 font-black text-3xl opacity-50 translate-y-1">1</span>
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/80 rounded-t-xl"></div>
            </motion.div>
            <div className="mt-2 text-center">
              <span className="block text-[13px] font-black text-[#0a1628]">Alex M.</span>
              <span className="block text-[11px] text-amber-600 font-bold">2.4k XP</span>
            </div>
          </div>

          {/* Rank 3 (Right) */}
          <div className="flex flex-col items-center relative z-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="relative mb-2"
            >
              <img src="https://i.pravatar.cc/150?img=47" alt="Sarah" className="w-10 h-10 rounded-full border-[3px] border-orange-400 z-10 relative object-cover shadow-sm bg-white" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-sm">3</div>
            </motion.div>
            <motion.div 
              initial={{ height: 0 }} animate={{ height: '38px' }} transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
              className="w-[70px] bg-gradient-to-b from-orange-50 to-slate-50 rounded-t-xl rounded-b-md border-t-2 border-orange-100 flex items-center justify-center relative shadow-[inset_0_-4px_6px_rgba(249,115,22,0.05),0_4px_6px_rgba(0,0,0,0.02)]"
            >
               <span className="text-orange-400/60 font-black text-2xl opacity-60 translate-y-1">3</span>
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/70 rounded-t-xl"></div>
            </motion.div>
            <div className="mt-2 text-center">
              <span className="block text-[12px] font-bold text-[#0a1628]">Sarah K.</span>
              <span className="block text-[10px] text-orange-600 font-bold">1.9k XP</span>
            </div>
          </div>
          
        </div>
      </motion.div>

    </div>
  );
};

export default RightSidebar;