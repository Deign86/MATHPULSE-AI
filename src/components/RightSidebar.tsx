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
        className="bg-gradient-to-br from-white via-sky-50/30 to-white p-5 rounded-2xl border border-slate-200/80 card-elevated-lg cursor-pointer hover:border-sky-300/50 transition-all group relative overflow-hidden"
      >
        {/* Accent line */}
        <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-sky-100/40 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-100/30 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200/60">
                <Trophy size={20} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#0a1628]">Rewards & Progress</h3>
                <p className="text-slate-500 text-xs font-body">Your achievements</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Crown size={12} className="text-amber-500" />
                <span className="text-[10px] font-body font-semibold text-slate-500 uppercase tracking-wider">Level</span>
              </div>
              <p className="text-2xl font-display font-bold text-[#0a1628]">{userLevel}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Star size={12} className="text-sky-500" />
                <span className="text-[10px] font-body font-semibold text-slate-500 uppercase tracking-wider">XP</span>
              </div>
              <p className="text-2xl font-display font-bold text-[#0a1628]">{currentXP}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame size={12} className="text-orange-500" />
                <span className="text-[10px] font-body font-semibold text-slate-500 uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-2xl font-display font-bold text-[#0a1628]">{streak}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-body font-medium text-slate-500">To Level {userLevel + 1}</span>
              <span className="text-xs font-body font-semibold text-sky-600">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full shadow-[0_0_8px_rgba(2,132,199,0.3)]"
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