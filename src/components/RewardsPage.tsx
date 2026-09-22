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
  RefreshCw,
  Sun,
  Globe,
  User,
  UserPlus,
  Compass,
  Heart,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserAchievements } from '../services/gamificationService';
import { ACHIEVEMENTS, AchievementConfig, AchievementCategory } from '../config/achievements';
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
      // SAFETY: Fallback to Award if icon component is somehow undefined
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
        desc: 'Complete 5 total learning activities this week',
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
    { level: 1, rank: 'Math Novice', xp: '0 XP', reward: 'Starter Badge + Avatar Ribbon', unlocked: userLevel >= 1 },
    { level: 5, rank: 'Arithmetic Apprentice', xp: '2,500 XP', reward: 'Golden Chalk Avatar Frame', unlocked: userLevel >= 5 },
    { level: 10, rank: 'Algebra Gladiator', xp: '7,500 XP', reward: 'Neon Aura Effect + Duelist Title', unlocked: userLevel >= 10 },
    { level: 20, rank: 'Trigonometry Champion', xp: '20,000 XP', reward: 'Cyber Compass Badge & Title', unlocked: userLevel >= 20 },
    { level: 35, rank: 'Calculus Titan', xp: '50,000 XP', reward: 'Exclusive Holographic Student ID Pass', unlocked: userLevel >= 35 },
    { level: 50, rank: 'MathPulse Archmage', xp: '100,000 XP', reward: 'Legendary Crown Icon + Hall of Immortals', unlocked: userLevel >= 50 },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#f8faff] via-[#f0f4ff] to-[#eef2ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 pb-20">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-sky-600 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all text-white shadow-sm flex items-center justify-center shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft size={22} />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 text-xs font-black uppercase tracking-widest">
                    <Sparkles size={13} className="animate-spin" style={{ animationDuration: '6s' }} />
                    Hall of Achievements
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mt-2">
                  Rewards & Trophy Room
                </h1>
                <p className="text-white/80 text-sm sm:text-base font-medium mt-1">
                  Track your mastery quests, unlock exclusive titles, and showcase your STEM journey.
                </p>
              </div>
            </div>

            {/* Level Crest & Quick XP Summary */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl shrink-0">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex flex-col items-center justify-center text-center">
                  <Crown size={20} className="text-amber-400 drop-shadow-sm" />
                  <span className="text-[10px] font-black text-white/70 uppercase leading-none mt-0.5">LVL</span>
                  <span className="text-xl font-black text-white leading-none tabular-nums">{userLevel}</span>
                </div>
              </div>

              <div className="min-w-[160px] sm:min-w-[200px]">
                <div className="flex justify-between items-center text-xs font-black text-white/90 mb-1">
                  <span>Level Progress</span>
                  <span className="tabular-nums text-amber-300">{levelProgressPct}%</span>
                </div>
                <div className="h-3 w-full bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-300 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${levelProgressPct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold mt-1 tabular-nums">
                  <span>{currentXP.toLocaleString()} XP</span>
                  <span>{xpToNextLevel.toLocaleString()} XP to Lvl {userLevel + 1}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase">Badges Unlocked</p>
                <p className="text-lg font-black text-white tabular-nums">
                  {unlockedCount} <span className="text-xs text-white/60">/ {allAchievements.length}</span>
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                <Star size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase">Total Career XP</p>
                <p className="text-lg font-black text-white tabular-nums">{totalXP.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300">
                <Flame size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase">Active Streak</p>
                <p className="text-lg font-black text-white tabular-nums">
                  {progressData.dailyStreak || 0} <span className="text-xs text-white/60">Days</span>
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Gift size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase">Daily Quests</p>
                <p className="text-lg font-black text-white tabular-nums">
                  {dailyQuests.filter((q) => q.completed).length} <span className="text-xs text-white/60">/ {dailyQuests.length}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] px-4 sm:px-6 lg:px-8 -mt-5">
        {/* Navigation Tabs Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-2 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'badges'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Trophy size={16} />
              All Achievements ({allAchievements.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'quests'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Sparkles size={16} />
              Daily Quests & Bounties ({dailyQuests.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roadmap')}
              className={cn(
                'px-4 py-2.5 rounded-2xl font-display font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'roadmap'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Crown size={16} />
              Level Progression Journey
            </button>
          </div>

          {activeTab === 'badges' && (
            <div className="flex items-center gap-2 pl-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unlocked')}
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                    statusFilter === 'unlocked'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('locked')}
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                    statusFilter === 'locked'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  Incomplete ({allAchievements.length - unlockedCount})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-500">Loading trophies and bounties…</p>
            </div>
          ) : activeTab === 'badges' ? (
            <div className="space-y-6">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'all', label: 'All Badges' },
                  { id: 'learning', label: 'Learning & Lessons' },
                  { id: 'battle', label: 'Combat & Duels' },
                  { id: 'mastery', label: 'Mastery & Perfection' },
                  { id: 'social', label: 'Social & Community' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer',
                      activeCategory === cat.id
                        ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAchievements.map((item) => {
                  const Icon = item.iconComponent;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'relative overflow-hidden rounded-3xl p-5 border transition-all flex flex-col justify-between group',
                        item.isUnlocked
                          ? 'bg-gradient-to-b from-white to-purple-50/50 dark:from-slate-900 dark:to-purple-950/20 border-purple-200 dark:border-purple-800/60 shadow-lg shadow-purple-500/5 hover:-translate-y-1'
                          : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-90'
                      )}
                    >
                      {item.isUnlocked && (
                        <div className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/20 transition-all" />
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={cn(
                              'w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105',
                              item.isUnlocked
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-400/40 shadow-purple-500/25'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {item.isUnlocked ? <Icon size={26} /> : <Lock size={24} />}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider',
                                item.isUnlocked
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              {item.isUnlocked ? 'Unlocked' : 'Locked'}
                            </span>
                            <span className="text-[11px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 tabular-nums">
                              +{item.xpReward} XP
                            </span>
                          </div>
                        </div>

                        <h3
                          className={cn(
                            'text-base font-black font-display tracking-tight',
                            item.isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        {item.isUnlocked ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span>Claimed & Active</span>
                          </div>
                        ) : item.progress ? (
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                              <span>Progress</span>
                              <span className="tabular-nums">
                                {item.progress.progress} / {item.progress.total}
                              </span>
                            </div>
                            <Progress
                              value={(item.progress.progress / Math.max(1, item.progress.total)) * 100}
                              className="h-2 bg-slate-100 dark:bg-slate-800"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock size={12} /> Complete requirements to unlock
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'quests' ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider mb-2">
                    <Sparkles size={13} /> Resetting daily in 6 hours
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-display">Daily Bounties & Missions</h2>
                  <p className="text-white/80 text-sm mt-1 max-w-xl">
                    Complete tasks to boost your STEM proficiency, maintain your streak, and earn massive XP bonuses.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Bounty Bonus</p>
                  <p className="text-3xl font-black text-amber-300 mt-0.5">+950 XP</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyQuests.map((quest) => {
                  const Icon = quest.icon;
                  return (
                    <div
                      key={quest.id}
                      className={cn(
                        'rounded-3xl p-6 border transition-all flex flex-col justify-between',
                        quest.completed
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner',
                            quest.completed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                          )}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                              {quest.title}
                            </h3>
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full tabular-nums shrink-0">
                              +{quest.rewardXP} XP
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {quest.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center text-xs font-black mb-1.5">
                          <span className="text-slate-500">Progress</span>
                          <span className="tabular-nums">
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
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
                    Level Journey & Rank Milestones
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Climb through the ranks by mastering mathematics and conquer the senior high curriculum.
                  </p>
                </div>

                <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-1 before:bg-slate-200 dark:before:bg-slate-800">
                  {roadmapMilestones.map((milestone) => (
                    <div key={milestone.level} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Timeline Dot */}
                      <div
                        className={cn(
                          'absolute -left-6 sm:-left-10 top-1 w-6 h-6 rounded-full border-4 transition-all flex items-center justify-center',
                          milestone.unlocked
                            ? 'bg-purple-600 border-purple-200 dark:border-purple-900 shadow-md shadow-purple-500/50'
                            : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-900'
                        )}
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest',
                              milestone.unlocked
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            )}
                          >
                            Level {milestone.level}
                          </span>
                          <span className="text-xs font-bold text-slate-400 tabular-nums">{milestone.xp}</span>
                        </div>
                        <h3 className="text-lg font-black font-display text-slate-900 dark:text-white mt-1">
                          {milestone.rank}
                        </h3>
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1.5">
                          <Gift size={14} /> Reward: {milestone.reward}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={cn(
                            'px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5',
                            milestone.unlocked
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          )}
                        >
                          {milestone.unlocked ? <CheckCircle2 size={14} /> : <Lock size={14} />}
                          {milestone.unlocked ? 'Attained' : 'Locked'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
