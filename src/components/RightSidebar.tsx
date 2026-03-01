import React from 'react';
import { Bell, AlertCircle, ChevronRight, CheckCircle2, Flame, Clock, CalendarDays, CheckSquare, Square, Trophy, Star, Crown, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import CircularProgress from './CircularProgress';
import TasksBoard from './TasksBoard';

interface RightSidebarProps {
  onOpenRewards: () => void;
  userLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  streak: number;
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
  onLogout,
  onOpenProfile,
  userName = 'Alex M.',
  userRole = 'Student'
}) => {
  const progressPercentage = (currentXP / xpToNextLevel) * 100;

  return (
    <div className="space-y-5">
      {/* Combined Rewards, XP & Streak Card */}
      <div 
        onClick={onOpenRewards}
        className="bg-[#1a1625] p-5 rounded-2xl border border-white/[0.06] card-elevated-lg text-white cursor-pointer hover:border-violet-500/20 transition-all group relative overflow-hidden"
      >
        {/* Accent line */}
        <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/8 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Trophy size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">Rewards & Progress</h3>
                <p className="text-zinc-500 text-xs font-body">Your achievements</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[10px] font-body font-semibold text-zinc-500 uppercase tracking-wider">Level</span>
              </div>
              <p className="text-2xl font-display font-bold">{userLevel}</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Star size={12} className="text-violet-400" />
                <span className="text-[10px] font-body font-semibold text-zinc-500 uppercase tracking-wider">XP</span>
              </div>
              <p className="text-2xl font-display font-bold">{currentXP}</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame size={12} className="text-orange-400" />
                <span className="text-[10px] font-body font-semibold text-zinc-500 uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-2xl font-display font-bold">{streak}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-body font-medium text-zinc-500">To Level {userLevel + 1}</span>
              <span className="text-xs font-body font-semibold text-violet-300">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(124,58,237,0.4)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Board */}
      <TasksBoard />
    </div>
  );
};

export default RightSidebar;