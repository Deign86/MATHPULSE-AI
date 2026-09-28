import {
  LucideIcon,
  BookOpen,
  GraduationCap,
  Trophy,
  Target,
  Zap,
  Brain,
  Star,
  Flame,
  Swords,
  Shield,
  RefreshCw,
  Crown,
  Sun,
  TrendingUp,
  Globe,
  User,
  UserPlus,
  Calendar,
  Users,
  Compass,
  Heart,
  Award,
} from 'lucide-react';

/**
 * Achievement condition types used in the condition field.
 * These correspond to the event types tracked by gamificationService.
 */
export type AchievementConditionType =
  | 'first_lesson'
  | 'lesson_complete'
  | 'quiz_complete'
  | 'perfect_score'
  | 'quiz_no_mistakes'
  | 'speed_quiz'
  | 'battle_win'
  | 'battle_undefeated'
  | 'battle_comeback'
  | 'mastery_10'
  | 'mastery_level'
  | 'mastery_xp'
  | 'mastery_all_lessons'
  | 'mastery_all_subjects'
  | 'mastery_assessment_perfect'
  | 'mastery_max_level'
  | 'explore_profile_complete'
  | 'explore_friend_added'
  | 'explore_social'
  | 'social_friend'
  | 'social_contribution'
  | 'social_xp'
  | 'social_daily_return'
  | 'social_streak_30';

/** Categories for grouping achievements */
export type AchievementCategory =
  | 'learning'
  | 'battle'
  | 'mastery'
  | 'exploration'
  | 'social';

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  /** Lucide icon component — rendered as <Icon size={24} /> */
  icon: LucideIcon;
  /** Tailwind color class for the icon, e.g. "text-yellow-500" */
  iconColor: string;
  /** XP awarded when achievement is unlocked */
  xpReward: number;
  /** Event type that triggers this achievement */
  condition: AchievementConditionType;
  /** Threshold value when condition is a count comparison */
  threshold?: number;
  /** Category for grouping */
  category: AchievementCategory;
}

/**
 * Full 40-achievement pool.
 * - 10 Learning achievements
 * - 10 Battle achievements
 * - 8 Mastery achievements
 * - 7 Exploration achievements
 * - 5 Social achievements
 *
 * Icon colors use Tailwind utility classes matching the achievement's theme.
 */
export const ACHIEVEMENTS: AchievementConfig[] = [
  // ─── LEARNING (4) ─────────────────────────────────────────────────────────
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: BookOpen,
    iconColor: 'text-yellow-500',
    xpReward: 50,
    condition: 'lesson_complete',
    threshold: 1,
    category: 'learning',
  },
  {
    id: 'lesson_10',
    title: 'Dedicated Learner',
    description: 'Complete 10 lessons',
    icon: GraduationCap,
    iconColor: 'text-blue-500',
    xpReward: 200,
    condition: 'lesson_complete',
    threshold: 10,
    category: 'learning',
  },
  {
    id: 'perfect_score',
    title: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: Trophy,
    iconColor: 'text-yellow-400',
    xpReward: 150,
    condition: 'perfect_score',
    category: 'learning',
  },
  {
    id: 'quiz_10',
    title: 'Quiz Enthusiast',
    description: 'Complete 10 quizzes',
    icon: Brain,
    iconColor: 'text-cyan-500',
    xpReward: 200,
    condition: 'quiz_complete',
    threshold: 10,
    category: 'learning',
  },

  // ─── BATTLE (3) ───────────────────────────────────────────────────────────
  {
    id: 'first_battle',
    title: 'First Blood',
    description: 'Win your first Quiz Battle',
    icon: Swords,
    iconColor: 'text-red-400',
    xpReward: 100,
    condition: 'battle_win',
    threshold: 1,
    category: 'battle',
  },
  {
    id: 'battle_10',
    title: 'Battle Veteran',
    description: 'Win 10 Quiz Battles',
    icon: Shield,
    iconColor: 'text-orange-400',
    xpReward: 300,
    condition: 'battle_win',
    threshold: 10,
    category: 'battle',
  },
  {
    id: 'undefeated',
    title: 'Undefeated',
    description: 'Win 5 battles in a row without losing',
    icon: Crown,
    iconColor: 'text-amber-500',
    xpReward: 500,
    condition: 'battle_undefeated',
    threshold: 5,
    category: 'battle',
  },

  // ─── MASTERY (3) ──────────────────────────────────────────────────────────
  {
    id: 'mastery_level',
    title: 'Rising Star',
    description: 'Reach player level 5',
    icon: Crown,
    iconColor: 'text-yellow-400',
    xpReward: 250,
    condition: 'mastery_level',
    threshold: 5,
    category: 'mastery',
  },
  {
    id: 'mastery_xp',
    title: 'XP Hunter',
    description: 'Earn a total of 5,000 career XP',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    xpReward: 400,
    condition: 'mastery_xp',
    threshold: 5000,
    category: 'mastery',
  },
  {
    id: 'mastery_10',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: Flame,
    iconColor: 'text-orange-500',
    xpReward: 300,
    condition: 'mastery_10',
    threshold: 7,
    category: 'mastery',
  },

  // ─── EXPLORATION (3) ──────────────────────────────────────────────────────
  {
    id: 'explore_profile',
    title: 'Identity Set',
    description: 'Complete your user profile & avatar setup',
    icon: User,
    iconColor: 'text-blue-400',
    xpReward: 50,
    condition: 'explore_profile_complete',
    category: 'exploration',
  },
  {
    id: 'explore_daily_return',
    title: 'Daily Visitor',
    description: 'Return to the app 3 days in a row',
    icon: Calendar,
    iconColor: 'text-indigo-400',
    xpReward: 100,
    condition: 'social_daily_return',
    threshold: 3,
    category: 'exploration',
  },
  {
    id: 'explore_all_features',
    title: 'STEM Explorer',
    description: 'Engage with lessons, quizzes, and arena battles',
    icon: Compass,
    iconColor: 'text-purple-400',
    xpReward: 200,
    condition: 'explore_profile_complete',
    category: 'exploration',
  },

  // ─── SOCIAL (2) ───────────────────────────────────────────────────────────
  {
    id: 'social_first_friend',
    title: 'Friendship Starter',
    description: 'Connect with your first classmate or friend',
    icon: UserPlus,
    iconColor: 'text-green-400',
    xpReward: 50,
    condition: 'social_friend',
    threshold: 1,
    category: 'social',
  },
  {
    id: 'social_top_10',
    title: 'Leaderboard Elite',
    description: 'Reach the top 10 on your section or school leaderboard',
    icon: Star,
    iconColor: 'text-amber-400',
    xpReward: 500,
    condition: 'social_xp',
    category: 'social',
  },
];

/** Lookup map: achievement id → config */
export const ACHIEVEMENT_MAP = new Map<string, AchievementConfig>(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/** All unique LucideIcon components used across achievements — for tree-shaking */
export const ACHIEVEMENT_ICONS = [
  BookOpen,
  GraduationCap,
  Trophy,
  Target,
  Zap,
  Brain,
  Star,
  Flame,
  Swords,
  Shield,
  RefreshCw,
  Crown,
  Sun,
  TrendingUp,
  Globe,
  User,
  UserPlus,
  Calendar,
  Users,
  Compass,
  Heart,
  Award,
] as const;