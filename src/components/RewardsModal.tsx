import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Crown, Star, Flame, Trophy, BookOpen, Target, Zap, Award, Users, Calendar, TrendingUp,
  GraduationCap, Brain, Swords, Shield, RefreshCw, Sun, Globe, User, UserPlus, Compass, Heart,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserAchievements } from '../services/gamificationService';
import { ACHIEVEMENTS, AchievementConfig } from '../config/achievements';
import { recordGet } from '../utils/memberOf';

// Lucide icon name → component lookup (must be exhaustive for ACHIEVEMENT icons)
const LUCIDE_ICON_MAP = {
  BookOpen, GraduationCap, Trophy, Target, Zap, Brain, Star, Flame,
  Swords, Shield, RefreshCw, Crown, Sun, TrendingUp, Globe, User,
  UserPlus, Calendar, Users, Compass, Heart, Award,
};

// Modal-level achievement type (keeps icon as React component for rendering)
interface AchievementItem {
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
  /** Firebase user ID — used to load achievement state from Firestore */
  userId: string;
}

interface ProgressDoc {
  totalLessonsCompleted?: number;
  totalQuizzesCompleted?: number;
  battleWins?: number;
  dailyStreak?: number;
  friendsAdded?: number;
  consecutiveDaysActive?: number;
  quizAttempts?: Array<{ score: number }>;
}

const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  userLevel,
  currentXP,
  xpToNextLevel,
  totalXP,
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [progressData, setProgressData] = useState<ProgressDoc>({});

  // ── Load achievement state + progress data ───────────────────────────────
  useEffect(() => {
    if (!isOpen || !userId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Load already-unlocked achievement IDs
        const achievements = await getUserAchievements(userId);
        setUnlockedIds(new Set(achievements.map((a) => a.id)));

        // Load progress counters for progress display
        const progressDoc = await getDoc(doc(db, 'progress', userId));
        if (progressDoc.exists()) {
          // SAFETY: trusted internal value already conforms to the asserted type.
          setProgressData(progressDoc.data() as ProgressDoc);
        }
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, userId]);

  // ── Progress tracker for locked achievements ──────────────────────────────
  const getProgress = (achievement: AchievementConfig): { progress: number; total: number } | undefined => {
    const { condition, threshold } = achievement;

    let current = 0;
    let target = threshold ?? 1;

    switch (condition) {
      case 'lesson_complete':
        current = progressData.totalLessonsCompleted || 0;
        break;
      case 'quiz_complete':
        current = progressData.totalQuizzesCompleted || 0;
        break;
      case 'battle_win':
      case 'battle_undefeated':
        current = progressData.battleWins || 0;
        break;
      case 'mastery_10':
      case 'social_streak_30':
      case 'social_daily_return':
        // using consecutiveDaysActive as proxy for streak since dailyStreak was part of loginStreak which was removed
        current = progressData.consecutiveDaysActive || 0;
        break;
      case 'mastery_xp':
        current = totalXP;
        break;
      case 'explore_friend_added':
      case 'social_friend':
      case 'explore_social':
        current = progressData.friendsAdded || 0;
        break;
      case 'perfect_score': {
        const attempts = progressData.quizAttempts || [];
        current = attempts.filter((q) => q.score === 100).length;
        break;
      }
      default:
        return undefined;
    }

    return { progress: Math.min(current, target), total: target };
  };

  // ── Build achievement items from ACHIEVEMENTS config ───────────────────────
  const achievementItems: AchievementItem[] = ACHIEVEMENTS.map((a) => {
    const Icon = recordGet(LUCIDE_ICON_MAP, a.icon.name) ?? Award;
    const unlocked = unlockedIds.has(a.id);
    const progressInfo = getProgress(a);

    return {
      id: a.id,
      icon: Icon,
      title: a.title,
      description: a.description,
      progress: progressInfo?.progress,
      total: progressInfo?.total,
      unlocked,
      color: unlocked ? a.iconColor : 'text-slate-500',
      bgColor: unlocked
        ? a.iconColor.replace('text-', 'bg-').replace('-500', '/10').replace('-400', '/10').replace('-600', '/10')
        : 'bg-slate-100',
    };
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'in_progress'>('all');

  const filteredItems = useMemo(() => {
    if (activeFilter === 'unlocked') return achievementItems.filter((a) => a.unlocked);
    if (activeFilter === 'in_progress') return achievementItems.filter((a) => !a.unlocked);
    return achievementItems;
  }, [achievementItems, activeFilter]);

  const unlockedCount = achievementItems.filter((a) => a.unlocked).length;
  const inProgressCount = achievementItems.length - unlockedCount;
  const currentLevelPct = Math.min(100, Math.max(0, (currentXP / Math.max(1, xpToNextLevel)) * 100));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-[#f8faff] dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-100/80 dark:border-purple-900/40 w-full max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9956DE] via-[#7274ED] to-[#1FA7E1] p-5 sm:p-6 text-white relative flex-shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(251,150,187,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(117,208,106,0.25),transparent_38%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white drop-shadow-xs">
                Rewards & Achievements
              </h2>
              <p className="text-white/90 text-xs sm:text-sm font-medium">
                {unlockedCount} of {ACHIEVEMENTS.length} Achievements Unlocked
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all active:scale-95 cursor-pointer"
              aria-label="Close rewards modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 relative z-10">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-white/25 shadow-inner">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                <Crown size={14} className="text-amber-300 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate">Level</span>
              </div>
              <p className="text-base sm:text-2xl font-black font-display text-white tabular-nums">{userLevel}</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-white/25 shadow-inner">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                <Star size={14} className="text-[#6ED1CF] shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate">Total XP</span>
              </div>
              <p className="text-base sm:text-2xl font-black font-display text-white tabular-nums">{totalXP.toLocaleString()}</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-white/25 shadow-inner">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                <Flame size={14} className="text-[#FF8B8B] shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate">Daily Goal</span>
              </div>
              <p className="text-sm sm:text-2xl font-black font-display text-white truncate">Active</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-white">Level {userLevel}</span>
              <span className="text-xs font-mono font-bold text-white/90">
                {currentXP} / {xpToNextLevel} XP
              </span>
              <span className="text-xs font-bold text-white">Level {userLevel + 1}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/25 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#6ED1CF] via-[#75D06A] to-[#FFB356] rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${currentLevelPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
              <p className="text-xs font-bold text-slate-400">Loading achievements…</p>
            </div>
          ) : (
            <>
              {/* Filter Tabs */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                  Achievement Badges
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full xs:w-auto overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    All ({achievementItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('unlocked')}
                    className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeFilter === 'unlocked'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Unlocked ({unlockedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('in_progress')}
                    className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeFilter === 'in_progress'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    In Progress ({inProgressCount})
                  </button>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((achievement: AchievementItem) => {
                  const Icon = achievement.icon;
                  const itemPct =
                    achievement.progress !== undefined && achievement.total !== undefined && achievement.total > 0
                      ? Math.min(100, Math.max(0, (achievement.progress / achievement.total) * 100))
                      : 0;

                  return (
                    <div
                      key={achievement.id}
                      className={`border rounded-2xl p-4 transition-all ${
                        achievement.unlocked
                          ? 'bg-white dark:bg-slate-800/90 border-purple-200/90 dark:border-purple-800/50 shadow-sm hover:shadow-md'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 ${achievement.bgColor} dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          <Icon size={22} className={achievement.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4
                              className={`text-xs font-bold truncate ${
                                achievement.unlocked
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {achievement.title}
                            </h4>
                            {achievement.unlocked && (
                              <span className="px-2 py-0.5 bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[9px] font-black rounded-full border border-emerald-500/30 shrink-0 whitespace-nowrap">
                                Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2 line-clamp-2">
                            {achievement.description}
                          </p>
                          {achievement.progress !== undefined &&
                            achievement.total !== undefined &&
                            !achievement.unlocked && (
                              <div className="pt-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Progress
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                    {achievement.progress} / {achievement.total}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#7274ED] to-[#1FA7E1] rounded-full transition-all"
                                    style={{ width: `${itemPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* How to Earn XP Card */}
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-purple-100/80 dark:border-purple-900/40 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7274ED] to-[#1FA7E1] rounded-xl flex items-center justify-center text-white shadow-xs">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-display font-bold text-slate-900 dark:text-white">
                      Ways to Earn XP in MathPulse AI
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Level up your rank by completing STEM practice activities
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { activity: 'Complete a video lesson', xp: 50 },
                    { activity: 'Complete interactive exercises', xp: 100 },
                    { activity: 'Achieve perfect quiz score', xp: 150 },
                    { activity: 'Complete a diagnostic or quiz', xp: 75 },
                    { activity: 'Daily streak check-in', xp: '20-100' },
                  ].map((method, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                    >
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {method.activity}
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0 whitespace-nowrap">
                        +{method.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardsModal;

