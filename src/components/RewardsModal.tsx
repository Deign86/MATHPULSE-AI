import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Crown, Star, Flame, Trophy, BookOpen, Target, Swords,
  CheckCircle2, ChevronRight, Sparkles, ArrowRight, Award,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserAchievements } from '../services/gamificationService';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  userId: string;
  onViewAllRewards?: () => void;
}

interface ProgressDoc {
  totalLessonsCompleted?: number;
  totalQuizzesCompleted?: number;
  battleWins?: number;
  dailyStreak?: number;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  userLevel,
  currentXP,
  xpToNextLevel,
  totalXP,
  userId,
  onViewAllRewards,
}) => {
  const [loading, setLoading] = useState(true);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [progressData, setProgressData] = useState<ProgressDoc>({});

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const achievements = await getUserAchievements(userId);
        setUnlockedCount(achievements.length);

        const progressDoc = await getDoc(doc(db, 'progress', userId));
        if (progressDoc.exists()) {
          // SAFETY: Firestore document data matches ProgressDoc shape
          setProgressData(progressDoc.data() as ProgressDoc);
        }
      } catch (err) {
        console.error('Error loading rewards modal summary:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const currentLevelPct = Math.min(100, Math.round((currentXP / Math.max(1, xpToNextLevel)) * 100));

  const lessonsCompleted = progressData.totalLessonsCompleted || 0;
  const quizzesCompleted = progressData.totalQuizzesCompleted || 0;
  const battleWins = progressData.battleWins || 0;

  const quickDailyTasks = [
    {
      id: 'task-lesson',
      title: 'Complete 1 Math Lesson',
      reward: '+100 XP',
      icon: BookOpen,
      completed: lessonsCompleted > 0,
      progress: lessonsCompleted > 0 ? 1 : 0,
      total: 1,
    },
    {
      id: 'task-quiz',
      title: 'Score 80%+ on Practice Quiz',
      reward: '+150 XP',
      icon: Target,
      completed: quizzesCompleted > 0,
      progress: quizzesCompleted > 0 ? 1 : 0,
      total: 1,
    },
    {
      id: 'task-battle',
      title: 'Duel in Quiz Battle Arena',
      reward: '+200 XP',
      icon: Swords,
      completed: battleWins > 0,
      progress: battleWins > 0 ? 1 : 0,
      total: 1,
    },
  ];

  const modalElement = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] w-[calc(100%-1rem)] max-w-[360px] sm:max-w-md overflow-hidden shadow-2xl border border-purple-200/60 dark:border-purple-900/40 flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-br from-purple-600 via-indigo-600 to-sky-600 p-4 sm:p-6 text-white overflow-hidden shrink-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="flex items-center justify-between relative z-10 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 rounded-xl bg-white/20 backdrop-blur-md text-amber-300">
                <Trophy size={16} />
              </span>
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/75">Quick Overview</span>
                <h2 className="text-base sm:text-xl font-black font-display text-white leading-tight">Daily Rewards & Goals</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
              aria-label="Close rewards summary"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Stats Pill Grid */}
          <div className="grid grid-cols-3 gap-2 relative z-10">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-white/80">
                <Crown size={12} className="text-amber-300" />
                <span>Level</span>
              </div>
              <p className="text-lg font-black text-white tabular-nums mt-0.5">{userLevel}</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-white/80">
                <Star size={12} className="text-cyan-300" />
                <span>Total XP</span>
              </div>
              <p className="text-lg font-black text-white tabular-nums mt-0.5">{totalXP.toLocaleString()}</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-white/80">
                <Flame size={12} className="text-rose-300" />
                <span>Streak</span>
              </div>
              <p className="text-lg font-black text-white tabular-nums mt-0.5">{progressData.dailyStreak || 0}d</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center text-xs font-black text-white/90 mb-1">
              <span>Level {userLevel}</span>
              <span className="tabular-nums font-mono text-[11px]">{currentXP} / {xpToNextLevel} XP</span>
              <span>Level {userLevel + 1}</span>
            </div>
            <div className="h-2.5 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-amber-300 via-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
                style={{ width: `${currentLevelPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Body: 3 Daily Tasks */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              Today's Daily Tasks
            </h3>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
              {quickDailyTasks.filter((t) => t.completed).length} / {quickDailyTasks.length} Done
            </span>
          </div>

          <div className="space-y-2.5">
            {quickDailyTasks.map((task) => {
              const Icon = task.icon;
              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3',
                    task.completed
                      ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        task.completed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300'
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-xs font-black',
                          task.completed
                            ? 'text-emerald-900 dark:text-emerald-200 line-through'
                            : 'text-slate-900 dark:text-slate-100'
                        )}
                      >
                        {task.title}
                      </p>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {task.reward}
                      </span>
                    </div>
                  </div>

                  <div>
                    {task.completed ? (
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700">
                        Incomplete
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Badges Summary */}
          <div className="bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Achievements Unlocked
              </span>
            </div>
            <span className="text-xs font-black text-purple-700 dark:text-purple-300 tabular-nums">
              {unlockedCount} Badges
            </span>
          </div>
        </div>

        {/* Footer: Dedicated Page CTA */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Button
            type="button"
            onClick={() => {
              onClose();
              onViewAllRewards?.();
            }}
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Full Rewards & Trophy Hall</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};

export default RewardsModal;
