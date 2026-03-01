import React from 'react';
import { X, Crown, Star, Flame, Trophy, BookOpen, Target, Zap, Award, Users, Calendar, TrendingUp } from 'lucide-react';
import { Progress } from './ui/progress';

interface Achievement {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  progress?: number;
  total?: number;
  unlocked: boolean;
  color: string;
  bgColor: string;
}

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  streak: number;
}

const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  userLevel,
  currentXP,
  xpToNextLevel,
  totalXP,
  streak
}) => {
  if (!isOpen) return null;

  const achievements: Achievement[] = [
    {
      id: '1',
      icon: Star,
      title: 'First Steps',
      description: 'Complete your first video lesson',
      unlocked: true,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: '2',
      icon: Trophy,
      title: 'Quiz Master',
      description: 'Score 100% on any quiz',
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
    {
      id: '3',
      icon: Flame,
      title: 'Week Warrior',
      description: 'Maintain a 7-day login streak',
      progress: 2,
      total: 7,
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
    {
      id: '4',
      icon: Target,
      title: 'Practice Makes Perfect',
      description: 'Complete 10 practice sets',
      progress: 2,
      total: 10,
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
    {
      id: '5',
      icon: BookOpen,
      title: 'Knowledge Seeker',
      description: 'Watch 20 video lessons',
      unlocked: true,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: '6',
      icon: Zap,
      title: 'Speed Learner',
      description: 'Complete 5 lessons in one day',
      unlocked: true,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: '7',
      icon: Crown,
      title: 'Crown Achiever',
      description: 'Reach Level 10',
      progress: 4,
      total: 10,
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
    {
      id: '8',
      icon: Award,
      title: 'XP Hunter',
      description: 'Earn 1000 XP',
      unlocked: true,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: '9',
      icon: Calendar,
      title: 'Dedicated Learner',
      description: 'Maintain a 14-day streak',
      progress: 2,
      total: 14,
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
    {
      id: '10',
      icon: Users,
      title: 'Monthly Champion',
      description: 'Maintain a 30-day streak',
      progress: 2,
      total: 30,
      unlocked: false,
      color: 'text-[#a8a5b3]',
      bgColor: 'bg-[#f0eeea]'
    },
  ];

  const xpEarningMethods = [
    { activity: 'Complete a video lesson', xp: 50 },
    { activity: 'Complete exercises', xp: 100 },
    { activity: 'Perfect quiz score', xp: 150 },
    { activity: 'Finish a quiz', xp: 75 },
    { activity: 'Daily login streak', xp: 25 },
    { activity: 'Help a classmate', xp: 50 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#f8f7f4] rounded-2xl shadow-2xl border border-[#e8e5de] w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1625] p-6 text-white relative overflow-hidden">
          <div className="accent-line absolute top-0 left-0 right-0"></div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-display font-bold">Rewards & Achievements</h2>
              <p className="text-[#a8a5b3] text-sm font-body">Track your learning progress and unlock badges</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={18} className="text-amber-400" />
                <span className="text-xs font-medium text-[#a8a5b3] font-body">Level</span>
              </div>
              <p className="text-2xl font-bold">{userLevel}</p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-1">
                <Star size={18} className="text-amber-400" />
                <span className="text-xs font-medium text-[#a8a5b3] font-body">Total XP</span>
              </div>
              <p className="text-2xl font-bold">{totalXP.toLocaleString()}</p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={18} className="text-orange-400" />
                <span className="text-xs font-medium text-[#a8a5b3] font-body">Day Streak</span>
              </div>
              <p className="text-2xl font-bold">{streak} days</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white font-body">Level {userLevel}</span>
              <span className="text-sm font-bold text-white font-body">Level {userLevel + 1}</span>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#a8a5b3]">{currentXP} / {xpToNextLevel} XP</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentXP / xpToNextLevel) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-280px)]">
          {/* Achievements Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-display font-bold text-[#1a1625] mb-4">Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`${achievement.unlocked ? 'bg-white border-amber-200' : 'bg-[#f0eeea] border-[#e8e5de]'} border-2 rounded-xl p-4 transition-all ${
                      achievement.unlocked ? 'shadow-md' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 ${achievement.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={24} className={achievement.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-bold ${achievement.unlocked ? 'text-[#1a1625]' : 'text-[#a8a5b3]'} font-body`}>
                            {achievement.title}
                          </h4>
                          {achievement.unlocked && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${achievement.unlocked ? 'text-[#6b687a]' : 'text-[#a8a5b3]'} mb-2`}>
                          {achievement.description}
                        </p>
                        {achievement.progress !== undefined && achievement.total !== undefined && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] text-[#a8a5b3]">Progress</span>
                              <span className="text-[10px] font-bold text-[#6b687a]">
                                {achievement.progress} / {achievement.total}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#e8e5de] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full transition-all"
                                style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How to Earn XP */}
          <div className="bg-white rounded-xl p-5 border border-[#e8e5de]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <h3 className="text-base font-display font-bold text-[#1a1625]">How to Earn XP</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {xpEarningMethods.map((method, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-600 rounded-full"></div>
                  <span className="text-xs text-[#6b687a] font-body">{method.activity}:</span>
                  <span className="text-xs font-bold text-violet-600">+{method.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsModal;
