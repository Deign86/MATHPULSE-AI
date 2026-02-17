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
    <div className="space-y-6">
      {/* Combined Rewards, XP & Streak Card */}
      <div 
        onClick={onOpenRewards}
        className="bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-600 p-6 rounded-3xl shadow-lg text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Trophy size={24} className="text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Rewards & Progress</h3>
                <p className="text-cyan-100 text-xs">Your achievements</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={16} className="text-yellow-300" />
                <span className="text-xs font-bold text-cyan-100">Level</span>
              </div>
              <p className="text-3xl font-bold">{userLevel}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="text-yellow-300" />
                <span className="text-xs font-bold text-cyan-100">Total XP</span>
              </div>
              <p className="text-3xl font-bold">{currentXP}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-orange-300" />
                <span className="text-xs font-bold text-cyan-100">Streak</span>
              </div>
              <p className="text-3xl font-bold">{streak}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-cyan-100">Progress to Level {userLevel + 1}</span>
              <span className="text-sm font-bold text-white">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
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