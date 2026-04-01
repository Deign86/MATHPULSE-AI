import React, { useState, useEffect } from 'react';
import { ChevronRight, Trophy, Flame, Star, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import DailyChallengeWidget from './DailyChallengeWidget';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { subscribeToLeaderboard } from '../services/gamificationService';
import { LeaderboardEntry } from '../types/models';
import { useAuth } from '../contexts/AuthContext';

interface RightSidebarProps {
  onOpenRewards: () => void;
  onOpenLeaderboard?: () => void;
  onNavigateToModules?: () => void;
  userLevel: number;
  currentXP: number;
  overallXP?: number;
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
  onNavigateToModules,
  userLevel, 
  currentXP, 
  xpToNextLevel,
  streak,
  streakHistory = [],
}) => {
  const progressPercentage = (currentXP / xpToNextLevel) * 100;
  const { currentUser } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (currentUser?.uid) {
      try {
        unsubscribe = subscribeToLeaderboard(
          (users: LeaderboardEntry[]) => {
            setTopUsers(users);
          },
          currentUser?.uid,
          false,
          'all',
          3
        );
      } catch (err) {
        console.error('Error subscribing to leaderboard preview:', err);
      }
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.uid]);

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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onNavigateToModules}
                className="flex items-center gap-1.5 text-xs font-body px-2 py-1 rounded-md bg-white/14 border border-white/25 text-white cursor-pointer hover:bg-white/20 transition-colors active:scale-95"
              >
                <Star size={12} className="text-[#6ED1CF]" />
                <span className="font-bold">{currentXP} XP</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border border-slate-700">
              Review more lessons to earn more XP!
            </TooltipContent>
          </Tooltip>
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

      {/* Leaderboard Preview with Miniature Stage (Light Theme) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenLeaderboard}
        className="bg-gradient-to-br from-white via-white to-purple-50 rounded-[24px] border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group overflow-hidden cursor-pointer relative mt-1"
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#f3e8ff_0%,transparent_70%)] opacity-80 pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 transition-colors group-hover:bg-purple-100">
              <Trophy size={16} className="text-purple-500" />
            </div>
            <h3 className="font-display font-bold text-[15px] text-slate-800">Leaderboards</h3>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-purple-500 transition-transform" />
        </div>
        
        {/* Miniature Stage Podium (Updated Style) */}
        <div className="pt-8 pb-5 px-1 flex items-end justify-center gap-1.5 min-h-[190px] relative z-10 perspective-1000">
          
          {/* Yellow Spotlight Effect for Top 1 (Entirely at the back of all podiums) */}
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '210px', opacity: 0.85 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[65%] bg-gradient-to-t from-yellow-300/80 via-yellow-200/40 to-transparent blur-[4px] z-0 pointer-events-none"
            style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
          />

          {/* Rank 2 (Left) */}
          <div className="flex flex-col items-center relative z-10 w-[30%]">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="relative mb-2 z-40 flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-sm overflow-hidden z-10">
                <img src={topUsers[1]?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[1]?.name || 'Player2'}`} alt={topUsers[1]?.name || "Player 2"} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-slate-700 mt-1 text-[11px] w-full text-center leading-tight truncate px-1">{topUsers[1] ? topUsers[1].name.split(' ')[0] : '...'}</h3>
            </motion.div>
            {/* Miniature 3D Cylinder */}
            <div className="w-[85%] relative mt-1">
              <div className="w-full h-6 absolute -bottom-3 bg-[#D96C6A] rounded-[50%] shadow-sm z-0"></div>
              <motion.div 
                initial={{ height: 0 }} animate={{ height: '45px' }} transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                className="w-full bg-[#D96C6A] relative z-10 flex flex-col items-center overflow-hidden"
              >
                <span className="absolute top-1 text-[28px] font-black text-white/30">2</span>
              </motion.div>
              <div className="w-full h-6 absolute -top-3 bg-[#FF8B8B] rounded-[50%] z-20 shadow-sm flex items-center justify-center">
                 <div className="text-white font-black text-[9px] transform scale-y-75 uppercase tracking-widest z-30 drop-shadow-sm">
                   {topUsers[1] ? (topUsers[1].xp >= 1000 ? (topUsers[1].xp / 1000).toFixed(1) + 'k' : topUsers[1].xp.toString()) : '-'}
                 </div>
              </div>
            </div>
          </div>

          {/* Rank 1 (Center) */}
          <div className="flex flex-col items-center relative z-20 w-[36%] -mx-1">
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
              className="relative mb-3 z-40 flex flex-col items-center"
            >
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="mb-[-8px] z-30">
                <Crown size={20} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />
              </motion.div>
              <div className="w-12 h-12 rounded-full border-[2.5px] border-white bg-white flex items-center justify-center shadow-md overflow-hidden z-10">
                <img src={topUsers[0]?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[0]?.name || 'Player1'}`} alt={topUsers[0]?.name || "Player 1"} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-slate-800 mt-1.5 text-[12px] w-full text-center leading-tight truncate px-1">{topUsers[0] ? topUsers[0].name.split(' ')[0] : '...'}</h3>
            </motion.div>
            {/* Miniature 3D Cylinder */}
            <div className="w-[90%] relative mt-1">
              <div className="w-full h-8 absolute -bottom-4 bg-[#6F2BAF] rounded-[50%] shadow-md z-0"></div>
              <motion.div 
                initial={{ height: 0 }} animate={{ height: '65px' }} transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                className="w-full bg-[#6F2BAF] relative z-10 flex flex-col items-center overflow-hidden"
              >
                <span className="absolute top-1 text-[38px] font-black text-white/30">1</span>
              </motion.div>
              <div className="w-full h-8 absolute -top-4 bg-[#9956DE] rounded-[50%] z-20 shadow-md flex items-center justify-center">
                 <div className="text-white font-black text-[11px] transform scale-y-75 uppercase tracking-widest z-30 drop-shadow-sm">
                   {topUsers[0] ? (topUsers[0].xp >= 1000 ? (topUsers[0].xp / 1000).toFixed(1) + 'k' : topUsers[0].xp.toString()) : '-'}
                 </div>
              </div>
            </div>
          </div>

          {/* Rank 3 (Right) */}
          <div className="flex flex-col items-center relative z-10 w-[30%]">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="relative mb-2 z-40 flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-sm overflow-hidden z-10">
                <img src={topUsers[2]?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[2]?.name || 'Player3'}`} alt={topUsers[2]?.name || "Player 3"} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-slate-700 mt-1 text-[11px] w-full text-center leading-tight truncate px-1">{topUsers[2] ? topUsers[2].name.split(' ')[0] : '...'}</h3>
            </motion.div>
            {/* Miniature 3D Cylinder */}
            <div className="w-[85%] relative mt-1">
              <div className="w-full h-6 absolute -bottom-3 bg-[#CC8F45] rounded-[50%] shadow-sm z-0"></div>
              <motion.div 
                initial={{ height: 0 }} animate={{ height: '35px' }} transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="w-full bg-[#CC8F45] relative z-10 flex flex-col items-center overflow-hidden"
              >
                <span className="absolute top-0.5 text-[24px] font-black text-white/30">3</span>
              </motion.div>
              <div className="w-full h-6 absolute -top-3 bg-[#FFB356] rounded-[50%] z-20 shadow-sm flex items-center justify-center">
                 <div className="text-white font-black text-[9px] transform scale-y-75 uppercase tracking-widest z-30 drop-shadow-sm">
                   {topUsers[2] ? (topUsers[2].xp >= 1000 ? (topUsers[2].xp / 1000).toFixed(1) + 'k' : topUsers[2].xp.toString()) : '-'}
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </motion.div>

    </div>
  );
};

export default RightSidebar;