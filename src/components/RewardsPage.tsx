import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Crown,
  Star,
  Flame,
  Trophy,
  BookOpen,
  Target,
  Zap,
  Award,
  Users,
  Calendar,
  TrendingUp,
  GraduationCap,
  Brain,
  Swords,
  Shield,
  Compass,
  CheckCircle2,
  Lock,
  Sparkles,
  Gift,
  Clock,
  ChevronRight,
  UserPlus,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserAchievements } from '../services/gamificationService';
import { ACHIEVEMENTS, AchievementConfig } from '../config/achievements';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface ProgressDoc {
  totalLessonsCompleted?: number;
  totalQuizzesCompleted?: number;
  battleWins?: number;
  dailyStreak?: number;
  friendsAdded?: number;
  consecutiveDaysActive?: number;
  quizAttempts?: Array<{ score: number }>;
}

export interface RewardsPageProps {
  onBack?: () => void;
  userId?: string;
  userLevel?: number;
  currentXP?: number;
  totalXP?: number;
  xpToNextLevel?: number;
  currentStreak: number;
}

interface DailyQuest {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  progress: number;
  target: number;
  rewardXP: number;
  completed: boolean;
  category: 'daily' | 'weekly';
}

export const RewardsPage: React.FC<RewardsPageProps> = ({
  onBack,
  userId = '',
  userLevel = 1,
  currentXP = 0,
  totalXP = 0,
  xpToNextLevel = 500,
  currentStreak,
}) => {
  const [loading, setLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [progressData, setProgressData] = useState<ProgressDoc>({});
  const [activeTab, setActiveTab] = useState<'badges' | 'quests' | 'roadmap'>('badges');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const userAchievements = await getUserAchievements(userId);
        setUnlockedIds(new Set(userAchievements.map((item) => item.id)));

        const progressDoc = await getDoc(doc(db, 'progress', userId));
        if (progressDoc.exists()) {
          // SAFETY: Firestore document data matches ProgressDoc shape
          setProgressData(progressDoc.data() as ProgressDoc);
        }
      } catch (err) {
        console.error('Failed to load user rewards state:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const getProgress = (item: AchievementConfig): { progress: number; total: number } | undefined => {
    const { condition, threshold = 1 } = item;
    let current = 0;

    switch (condition) {
      case 'lesson_complete':
      case 'first_lesson':
        current = progressData.totalLessonsCompleted || 0;
        break;
      case 'quiz_complete':
      case 'speed_quiz':
        current = progressData.totalQuizzesCompleted || 0;
        break;
      case 'battle_win':
      case 'battle_undefeated':
      case 'battle_comeback':
        current = progressData.battleWins || 0;
        break;
      case 'perfect_score':
      case 'quiz_no_mistakes':
        current = (progressData.quizAttempts || []).filter((q) => q.score === 100).length;
        break;
      case 'social_streak_30':
      case 'social_daily_return':
        current = progressData.dailyStreak || progressData.consecutiveDaysActive || 0;
        break;
      case 'social_friend':
      case 'explore_friend_added':
        current = progressData.friendsAdded || 0;
        break;
      default:
        return undefined;
    }

    return { progress: Math.min(current, threshold), total: threshold };
  };

  const allAchievements = useMemo(() => {
    return ACHIEVEMENTS.map((ach) => {
      const isUnlocked = unlockedIds.has(ach.id);
      const prog = getProgress(ach);
      // SAFETY: Fallback to Award if icon component is undefined
      const IconComponent = ach.icon || Award;
      return {
        ...ach,
        isUnlocked,
        iconComponent: IconComponent,
        progress: prog,
      };
    });
  }, [unlockedIds, progressData]);

  const unlockedCount = useMemo(() => allAchievements.filter((a) => a.isUnlocked).length, [allAchievements]);

  const filteredAchievements = useMemo(() => {
    return allAchievements.filter((ach) => {
      const matchesCategory = activeCategory === 'all' || ach.category === activeCategory;
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unlocked'
            ? ach.isUnlocked
            : !ach.isUnlocked;
      return matchesCategory && matchesStatus;
    });
  }, [allAchievements, activeCategory, statusFilter]);

  const levelProgressPct = Math.min(100, Math.round((currentXP / Math.max(1, xpToNextLevel)) * 100));

  const dailyQuests: DailyQuest[] = useMemo(() => {
    const lessonsDone = progressData.totalLessonsCompleted || 0;
    const quizzesDone = progressData.totalQuizzesCompleted || 0;
    const battlesWon = progressData.battleWins || 0;

    return [
      {
        id: 'dq_1',
        title: 'Master of Equations',
        desc: 'Complete 1 STEM math lesson today',
        icon: BookOpen,
        progress: Math.min(1, lessonsDone > 0 ? 1 : 0),
        target: 1,
        rewardXP: 100,
        completed: lessonsDone > 0,
        category: 'daily',
      },
      {
        id: 'dq_2',
        title: 'Sharpshooter Calculus',
        desc: 'Score at least 80% on any practice quiz',
        icon: Target,
        progress: Math.min(1, quizzesDone > 0 ? 1 : 0),
        target: 1,
        rewardXP: 150,
        completed: quizzesDone > 0,
        category: 'daily',
      },
      {
        id: 'dq_3',
        title: 'Arena Contender',
        desc: 'Challenge a peer or bot in Quiz Battle',
        icon: Swords,
        progress: Math.min(1, battlesWon > 0 ? 1 : 0),
        target: 1,
        rewardXP: 200,
        completed: battlesWon > 0,
        category: 'daily',
      },
      {
        id: 'wq_1',
        title: 'Weekly Math Prodigy',
        desc: 'Complete 5 learning activities this week',
        icon: Trophy,
        progress: Math.min(5, lessonsDone + quizzesDone),
        target: 5,
        rewardXP: 500,
        completed: lessonsDone + quizzesDone >= 5,
        category: 'weekly',
      },
    ];
  }, [progressData]);

  const roadmapMilestones = [
    { level: 1, rank: 'Math Novice', xp: '0 XP', reward: 'Starter Badge + Avatar Frame', unlocked: userLevel >= 1 },
    { level: 5, rank: 'Arithmetic Apprentice', xp: '2,500 XP', reward: 'Golden Chalk Avatar Border', unlocked: userLevel >= 5 },
    { level: 10, rank: 'Algebra Gladiator', xp: '7,500 XP', reward: 'Neon Aura Effect + Duelist Title', unlocked: userLevel >= 10 },
    { level: 20, rank: 'Trigonometry Champion', xp: '20,000 XP', reward: 'Cyber Compass Badge & Title', unlocked: userLevel >= 20 },
    { level: 35, rank: 'Calculus Titan', xp: '50,000 XP', reward: 'Exclusive Holographic Student ID Pass', unlocked: userLevel >= 35 },
    { level: 50, rank: 'MathPulse Archmage', xp: '100,000 XP', reward: 'Legendary Crown Icon + Hall of Immortals', unlocked: userLevel >= 50 },
  ];

  const totalDailyBounty = useMemo(() => {
    return dailyQuests.reduce((sum, q) => sum + (q.rewardXP || 0), 0);
  }, [dailyQuests]);

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-5 max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100">
      {/* Hero Header Bento Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#6b21a8] via-[#4f46e5] to-[#0284c7] p-5 sm:p-7 text-white shadow-[0_12px_32px_-8px_rgba(79,70,229,0.35)] border border-white/20">
        {/* Specular lighting effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.22),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(2,132,199,0.3),transparent_55%)]" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          {/* Header Title & Intro */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="relative p-2.5 sm:p-3 rounded-2xl pointer-coarse:after:absolute pointer-coarse:after:-inset-1 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 backdrop-blur-md transition-all text-white shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[11px] font-black uppercase tracking-widest">
                <Sparkles size={13} className="animate-spin" style={{ animationDuration: '6s' }} />
                Hall of Achievements
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white mt-1.5">
                Rewards & Trophy Room
              </h1>
              <p className="text-white/85 text-xs sm:text-sm font-medium mt-1 max-w-xl leading-relaxed">
                Track your mastery quests, unlock exclusive STEM titles, and showcase your learning journey.
              </p>
            </div>
          </div>

          {/* Level Crest & Quick XP Summary Card */}
          <div
            data-tour="rewards-level"
            className="flex items-center gap-3.5 bg-slate-900/30 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 shadow-inner shrink-0 lg:self-stretch justify-between sm:justify-start"
          >
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex flex-col items-center justify-center text-center">
                <Crown size={18} className="text-amber-400 drop-shadow-sm" />
                <span className="text-[9px] font-black text-white/70 uppercase leading-none mt-0.5">LVL</span>
                <span className="text-lg sm:text-xl font-black text-white leading-none tabular-nums">{userLevel}</span>
              </div>
            </div>

            <div className="min-w-[150px] sm:min-w-[180px] flex-1">
              <div className="flex justify-between items-center text-xs font-black text-white/95 mb-1.5">
                <span>Level Progress</span>
                <span className="tabular-nums text-amber-300">{levelProgressPct}%</span>
              </div>
              <div className="h-2.5 w-full bg-black/35 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-300 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${levelProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-white/75 font-bold mt-1.5 tabular-nums">
                <span>{currentXP.toLocaleString()} XP</span>
                <span>{xpToNextLevel.toLocaleString()} XP to Lvl {userLevel + 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Metrics Slabs */}
        <div
          data-tour="rewards-metrics"
          className="relative z-10 grid grid-cols-2 @4xl:grid-cols-4 gap-2.5 sm:gap-3.5 mt-5 sm:mt-6"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 flex items-center gap-3">
            <div className="max-[359px]:hidden p-2 sm:p-2.5 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-300 shrink-0">
              <Trophy size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/70 uppercase leading-tight">Badges Unlocked</p>
              <p className="text-base sm:text-lg font-black text-white tabular-nums leading-tight mt-0.5">
                {unlockedCount} <span className="text-xs text-white/60 font-semibold">/ {allAchievements.length}</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 flex items-center gap-3">
            <div className="max-[359px]:hidden p-2 sm:p-2.5 rounded-xl bg-cyan-400/20 border border-cyan-300/30 text-cyan-300 shrink-0">
              <Star size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/70 uppercase leading-tight">Total Career XP</p>
              <p className="text-base sm:text-lg font-black text-white tabular-nums leading-tight mt-0.5">
                {totalXP.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 flex items-center gap-3">
            <div className="max-[359px]:hidden p-2 sm:p-2.5 rounded-xl bg-rose-400/20 border border-rose-300/30 text-rose-300 shrink-0">
              <Flame size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/70 uppercase leading-tight">Active Streak</p>
              <p className="text-base sm:text-lg font-black text-white tabular-nums leading-tight mt-0.5">
                {currentStreak} <span className="text-xs text-white/60 font-semibold">Days</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 flex items-center gap-3">
            <div className="max-[359px]:hidden p-2 sm:p-2.5 rounded-xl bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 shrink-0">
              <Gift size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/70 uppercase leading-tight">Daily Quests</p>
              <p className="text-base sm:text-lg font-black text-white tabular-nums leading-tight mt-0.5">
                {dailyQuests.filter((q) => q.completed).length}{' '}
                <span className="text-xs text-white/60 font-semibold">/ {dailyQuests.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Navigation Tabs & Filter Bar */}
      <div data-tour-sticky="" className="sticky top-0 [@media(max-height:44rem)]:static z-30 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 px-4 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-2.5 bg-gradient-to-b from-[#f8faff]/95 via-[#f8faff]/90 to-[#f8faff]/60 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-950/60 backdrop-blur-md transition-all">
        <div
          data-tour="rewards-tabs"
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-md shadow-purple-500/5 border border-slate-200/90 dark:border-slate-800 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 sm:gap-2.5"
        >
          {/* Main Segmented Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className={cn(
                'flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl sm:rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'badges'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Trophy size={15} className="shrink-0" />
              <span>
                <span className="hidden sm:inline">All </span>Achievements ({allAchievements.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={cn(
                'flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl sm:rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'quests'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Sparkles size={15} className="shrink-0" />
              <span>
                <span className="hidden sm:inline">Daily </span>Quests ({dailyQuests.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roadmap')}
              className={cn(
                'flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl sm:rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'roadmap'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Crown size={15} className="shrink-0" />
              <span>
                Progression<span className="hidden md:inline"> Journey</span>
              </span>
            </button>
          </div>

          {/* Status Filters (when Badges tab is active) */}
          {activeTab === 'badges' && (
            <div className="flex items-center xl:justify-end shrink-0 pt-1 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl sm:rounded-2xl border border-slate-200/70 dark:border-slate-700/60 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap',
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unlocked')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap',
                    statusFilter === 'unlocked'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('locked')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap',
                    statusFilter === 'locked'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  Incomplete ({allAchievements.length - unlockedCount})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content Section */}
      <div data-tour="rewards-content">
        {loading ? (
          <div data-tour-loading="" className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading trophies and achievements…</p>
          </div>
        ) : activeTab === 'badges' ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Badges' },
                { id: 'learning', label: 'Learning & Lessons' },
                { id: 'battle', label: 'Combat & Duels' },
                { id: 'mastery', label: 'Mastery & Growth' },
                { id: 'exploration', label: 'Exploration' },
                { id: 'social', label: 'Social & Community' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-3.5 py-1.5 sm:py-2 pointer-coarse:min-h-11 rounded-xl sm:rounded-2xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer',
                    activeCategory === cat.id
                      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredAchievements.map((item) => {
                const Icon = item.iconComponent;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      'relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between group',
                      item.isUnlocked
                        ? 'bg-gradient-to-b from-white via-purple-50/40 to-indigo-50/20 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border-purple-200/80 dark:border-purple-800/60 shadow-md shadow-purple-500/5 hover:-translate-y-0.5'
                        : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    {item.isUnlocked && (
                      <div className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/20 transition-all" />
                    )}

                    <div>
                      {/* Top row: Icon + Badges */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div
                          className={cn(
                            'w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105',
                            item.isUnlocked
                              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-400/40 shadow-purple-500/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/80 dark:border-slate-700/80'
                          )}
                        >
                          {item.isUnlocked ? <Icon size={24} /> : <Lock size={22} />}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                              item.isUnlocked
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700'
                            )}
                          >
                            {item.isUnlocked ? 'Unlocked' : 'Locked'}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 tabular-nums">
                            +{item.xpReward} XP
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        className={cn(
                          'text-sm sm:text-base font-black font-display tracking-tight',
                          item.isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Progress / Status Bottom Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {item.isUnlocked ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} className="stroke-[2.5]" />
                          <span>Claimed & Active</span>
                        </div>
                      ) : item.progress && item.progress.total > 1 ? (
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            <span>Progress</span>
                            <span className="tabular-nums font-black">
                              {item.progress.progress} / {item.progress.total}
                            </span>
                          </div>
                          <Progress
                            value={(item.progress.progress / Math.max(1, item.progress.total)) * 100}
                            className="h-2 bg-slate-100 dark:bg-slate-800"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Lock size={12} /> Complete requirement to unlock
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'quests' ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Daily Reset Banner */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider mb-2">
                  <Clock size={13} /> Resets daily at midnight
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-display text-white">Daily Quests & Bounties</h2>
                <p className="text-white/85 text-xs sm:text-sm mt-0.5 max-w-xl">
                  Complete tasks to reinforce key STEM concepts, maintain streaks, and score major XP multipliers.
                </p>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0 w-full sm:w-auto relative z-10">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/75">Total Daily Bounty</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5">+{totalDailyBounty} XP</p>
              </div>
            </div>

            {/* Quests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {dailyQuests.map((quest) => {
                const Icon = quest.icon;
                return (
                  <div
                    key={quest.id}
                    className={cn(
                      'rounded-2xl sm:rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between',
                      quest.completed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                    )}
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4">
                      <div
                        className={cn(
                          'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner',
                          quest.completed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        )}
                      >
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-display truncate">
                            {quest.title}
                          </h3>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full tabular-nums shrink-0">
                            +{quest.rewardXP} XP
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                          {quest.desc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center text-xs font-black mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="tabular-nums font-black text-slate-800 dark:text-slate-200">
                          {quest.progress} / {quest.target}
                        </span>
                      </div>
                      <Progress
                        value={(quest.progress / quest.target) * 100}
                        className="h-2.5 bg-slate-100 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white">
                Level Journey & Rank Milestones
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Climb through the ranks by mastering mathematics and conquering the Senior High STEM curriculum.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-10 space-y-6 sm:space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {roadmapMilestones.map((milestone) => (
                <div
                  key={milestone.level}
                  className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                >
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      'absolute -left-3 sm:-left-5 top-5 w-5 h-5 rounded-full border-4 transition-all flex items-center justify-center -translate-x-1/2 z-10',
                      milestone.unlocked
                        ? 'bg-purple-600 border-purple-200 dark:border-purple-900 shadow-md shadow-purple-500/50'
                        : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-900'
                    )}
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                          milestone.unlocked
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        Level {milestone.level}
                      </span>
                      <span className="text-xs font-bold text-slate-400 tabular-nums">{milestone.xp}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white mt-1">
                      {milestone.rank}
                    </h3>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1.5">
                      <Gift size={13} /> Reward: {milestone.reward}
                    </p>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <span
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5',
                        milestone.unlocked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {milestone.unlocked ? <CheckCircle2 size={13} className="stroke-[2.5]" /> : <Lock size={13} />}
                      {milestone.unlocked ? 'Attained' : 'Locked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;
