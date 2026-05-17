import React, { useEffect, useState } from 'react';
import {
  X, Crown, Star, Flame, Trophy, BookOpen, Target, Zap, Award, Users, Calendar, TrendingUp,
  GraduationCap, Brain, Swords, Shield, RefreshCw, Sun, Globe, User, UserPlus, Compass, Heart,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserAchievements } from '../services/gamificationService';
import { ACHIEVEMENTS, AchievementConfig } from '../config/achievements';

// Lucide icon name → component lookup (must be exhaustive for ACHIEVEMENT icons)
const LUCIDE_ICON_MAP: Record<string, React.ElementType> = {
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
    const prog = progressData as Record<string, unknown>;

    let current = 0;
    let target = threshold ?? 1;

    switch (condition) {
      case 'lesson_complete':
        current = (prog.totalLessonsCompleted as number) || 0;
        break;
      case 'quiz_complete':
        current = (prog.totalQuizzesCompleted as number) || 0;
        break;
      case 'battle_win':
      case 'battle_undefeated':
        current = (prog.battleWins as number) || 0;
        break;
      case 'mastery_10':
      case 'social_streak_30':
      case 'social_daily_return':
        // using consecutiveDaysActive as proxy for streak since dailyStreak was part of loginStreak which was removed
        current = (prog.consecutiveDaysActive as number) || 0;
        break;
      case 'mastery_xp':
        current = totalXP;
        break;
      case 'explore_friend_added':
      case 'social_friend':
      case 'explore_social':
        current = (prog.friendsAdded as number) || 0;
        break;
      case 'perfect_score': {
        const attempts = (prog.quizAttempts as Array<{ score: number }>) || [];
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
    const Icon = LUCIDE_ICON_MAP[a.icon.name] ?? Award;
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

  const unlockedCount = achievementItems.filter((a) => a.unlocked).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl border border-[#dde3eb] w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9956DE] via-[#7274ED] to-[#1FA7E1] p-4 md:p-6 text-white relative flex-shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(251,150,187,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(117,208,106,0.25),transparent_38%)]" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold">Rewards & Achievements</h2>
              <p className="text-white/90 text-sm font-body">
                {unlockedCount} / {ACHIEVEMENTS.length} Achievements Unlocked
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 relative z-10">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/25">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Crown size={16} className="text-[#FFB356]" />
                <span className="text-[10px] md:text-xs font-medium text-white/90 font-body">Level</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{userLevel}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/25">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Star size={16} className="text-[#6ED1CF]" />
                <span className="text-[10px] md:text-xs font-medium text-white/90 font-body">Total XP</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{totalXP.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/25">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Flame size={16} className="text-[#FF8B8B]" />
                <span className="text-[10px] md:text-xs font-medium text-white/90 font-body">Daily Rewards</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">Check-in</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-white font-body">Level {userLevel}</span>
              <span className="text-sm font-bold text-white font-body">Level {userLevel + 1}</span>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/90">{currentXP} / {xpToNextLevel} XP</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-[#6ED1CF] via-[#75D06A] to-[#FFB356] rounded-full transition-all duration-500 e-w"
                  style={{ ['--w' as any]: `${(currentXP / xpToNextLevel) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-[#9956DE] border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Achievements Grid */}
              <div className="mb-6">
                <h3 className="text-lg font-display font-bold text-[#0a1628] mb-4">Achievements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievementItems.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <div
                        key={achievement.id}
                        className={`${achievement.unlocked ? 'bg-white border-[#9956DE]/25' : 'bg-[#edf1f7] border-[#dde3eb]'} border-2 rounded-xl p-4 transition-all ${
                          achievement.unlocked ? 'shadow-md' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 ${achievement.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon size={24} className={achievement.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-bold ${achievement.unlocked ? 'text-[#0a1628]' : 'text-slate-500'} font-body`}>
                                {achievement.title}
                              </h4>
                              {achievement.unlocked && (
                                <span className="px-2 py-0.5 bg-[#75D06A] text-white text-[9px] font-bold rounded-full">
                                  Unlocked
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${achievement.unlocked ? 'text-[#5a6578]' : 'text-slate-500'} mb-2`}>
                              {achievement.description}
                            </p>
                            {achievement.progress !== undefined && achievement.total !== undefined && !achievement.unlocked && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] text-slate-500">Progress</span>
                                  <span className="text-[10px] font-bold text-[#5a6578]">
                                    {achievement.progress} / {achievement.total}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-[#dde3eb] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#7274ED] to-[#1FA7E1] rounded-full transition-all e-w"
                                    style={{ ['--w' as any]: `${(achievement.progress / achievement.total) * 100}%` }}
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
              <div className="bg-white rounded-xl p-5 border border-[#dde3eb]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7274ED] to-[#1FA7E1] rounded-lg flex items-center justify-center">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <h3 className="text-base font-display font-bold text-[#0a1628]">How to Earn XP</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { activity: 'Complete a video lesson', xp: 50 },
                    { activity: 'Complete exercises', xp: 100 },
                    { activity: 'Perfect quiz score', xp: 150 },
                    { activity: 'Finish a quiz', xp: 75 },
                    { activity: 'Daily check-in', xp: '20-100' },
                  ].map((method, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#1FA7E1] rounded-full"></div>
                      <span className="text-xs text-[#5a6578] font-body">{method.activity}:</span>
                      <span className="text-xs font-bold text-[#7274ED]">+{method.xp} XP</span>
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
