import React from 'react';
import { ChevronRight, Trophy, Flame, Star, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import TasksBoard from './TasksBoard';

interface RightSidebarProps {
  onOpenRewards: () => void;
  userLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  streak: number;
  showConnectedTaskBoard?: boolean;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  userName?: string;
  userRole?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  onOpenRewards, 
  userLevel, 
  currentXP, 
  xpToNextLevel,
  streak,
  showConnectedTaskBoard = false,
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
        className="bg-white p-3 rounded-xl border border-slate-200/80 cursor-pointer hover:border-sky-300/50 hover:shadow-md transition-all group relative overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-200/60">
              <Trophy size={16} className="text-rose-500" />
            </div>
            <h3 className="font-display font-bold text-sm text-[#0a1628]">Rewards</h3>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Compact inline stats */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-body">
            <Crown size={12} className="text-rose-500" />
            <span className="font-bold text-[#0a1628]">Lv {userLevel}</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs font-body">
            <Star size={12} className="text-sky-500" />
            <span className="font-bold text-[#0a1628]">{currentXP} XP</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs font-body">
            <Flame size={12} className="text-orange-500" />
            <span className="font-bold text-[#0a1628]">{streak}d</span>
          </div>
        </div>

        {/* Progress to next level */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-body text-slate-500">Level {userLevel + 1}</span>
            <span className="text-[11px] font-body font-semibold text-sky-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {showConnectedTaskBoard && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <TasksBoard />
        </motion.div>
      )}
    </div>
  );
};

export default RightSidebar;