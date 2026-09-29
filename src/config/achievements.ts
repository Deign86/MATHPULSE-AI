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
  // ─── LEARNING (10) ────────────────────────────────────────────────────────
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
    icon: BookOpen,
    iconColor: 'text-blue-500',
    xpReward: 200,
    condition: 'lesson_complete',
    threshold: 10,
    category: 'learning',
  },
  {
    id: 'lesson_50',
    title: 'Knowledge Seeker',
    description: 'Complete 50 lessons',
    icon: GraduationCap,
    iconColor: 'text-purple-500',
    xpReward: 500,
    condition: 'lesson_complete',
    threshold: 50,
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
    id: 'no_mistakes',
    title: 'Flawless',
    description: 'Complete a quiz with zero wrong answers',
    icon: Target,
    iconColor: 'text-emerald-500',
    xpReward: 100,
    condition: 'quiz_no_mistakes',
    category: 'learning',
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a quiz in under 2 minutes',
    icon: Zap,
    iconColor: 'text-orange-500',
    xpReward: 100,
    condition: 'speed_quiz',
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
  {
    id: 'quiz_50',
    title: 'Quiz Champion',
    description: 'Complete 50 quizzes',
    icon: BookOpen,
    iconColor: 'text-indigo-500',
    xpReward: 500,
    condition: 'quiz_complete',
    threshold: 50,
    category: 'learning',
  },
  {
    id: 'quiz_perfect',
    title: 'Perfectionist',
    description: 'Get 5 perfect quiz scores',
    icon: Star,
    iconColor: 'text-amber-400',
    xpReward: 300,
    condition: 'perfect_score',
    threshold: 5,
    category: 'learning',
  },
  {
    id: 'study_streak',
    title: 'Study Streak',
    description: 'Maintain a 7-day lesson completion streak',
    icon: Flame,
    iconColor: 'text-red-500',
    xpReward: 300,
    condition: 'mastery_10',
    threshold: 7,
    category: 'learning',
  },

  // ─── BATTLE (10) ──────────────────────────────────────────────────────────
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
    icon: Swords,
    iconColor: 'text-orange-400',
    xpReward: 300,
    condition: 'battle_win',
    threshold: 10,
    category: 'battle',
  },
  {
    id: 'battle_50',
    title: 'Battle Legend',
    description: 'Win 50 Quiz Battles',
    icon: Swords,
    iconColor: 'text-red-500',
    xpReward: 1000,
    condition: 'battle_win',
    threshold: 50,
    category: 'battle',
  },
  {
    id: 'undefeated',
    title: 'Undefeated',
    description: 'Win 5 battles in a row without losing',
    icon: Shield,
    iconColor: 'text-blue-500',
    xpReward: 500,
    condition: 'battle_undefeated',
    threshold: 5,
    category: 'battle',
  },
  {
    id: 'quick_win',
    title: 'Speed Battle',
    description: 'Win a battle by answering all questions first',
    icon: Zap,
    iconColor: 'text-yellow-500',
    xpReward: 150,
    condition: 'speed_quiz',
    category: 'battle',
  },
  {
    id: 'comeback',
    title: 'The Comeback',
    description: 'Win a battle after being behind in score',
    icon: RefreshCw,
    iconColor: 'text-teal-500',
    xpReward: 200,
    condition: 'battle_comeback',
    category: 'battle',
  },
  {
    id: 'battle_master',
    title: 'Battle Master',
    description: 'Win 3 battles in a single day',
    icon: Crown,
    iconColor: 'text-yellow-500',
    xpReward: 400,
    condition: 'battle_win',
    threshold: 3,
    category: 'battle',
  },
  {
    id: 'invincible',
    title: 'Invincible',
    description: 'Win 10 battles in a row',
    icon: Shield,
    iconColor: 'text-violet-500',
    xpReward: 1000,
    condition: 'battle_undefeated',
    threshold: 10,
    category: 'battle',
  },
  {
    id: 'first_blood_daily',
    title: 'Early Bird',
    description: 'Win your first battle of the day',
    icon: Sun,
    iconColor: 'text-amber-500',
    xpReward: 50,
    condition: 'battle_win',
    threshold: 1,
    category: 'battle',
  },
  {
    id: 'rival_crusher',
    title: 'Rival Crusher',
    description: 'Win 25 battles total',
    icon: Swords,
    iconColor: 'text-rose-500',
    xpReward: 750,
    condition: 'battle_win',
    threshold: 25,
    category: 'battle',
  },

  // ─── MASTERY (8) ──────────────────────────────────────────────────────────
  {
    id: 'mastery_10',
    title: 'Week Warrior',
    description: 'Maintain a 10-day learning streak',
    icon: Flame,
    iconColor: 'text-orange-500',
    xpReward: 500,
    condition: 'mastery_10',
    threshold: 10,
    category: 'mastery',
  },
  {
    id: 'mastery_level',
    title: 'Rising Star',
    description: 'Reach level 5',
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
    description: 'Earn a total of 5,000 XP',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    xpReward: 400,
    condition: 'mastery_xp',
    threshold: 5000,
    category: 'mastery',
  },
  {
    id: 'mastery_all_lessons',
    title: 'Curriculum Complete',
    description: 'Complete all available lessons',
    icon: GraduationCap,
    iconColor: 'text-purple-500',
    xpReward: 1000,
    condition: 'mastery_all_lessons',
    category: 'mastery',
  },
  {
    id: 'mastery_all_subjects',
    title: 'Polymath',
    description: 'Complete at least one lesson in every subject',
    icon: Globe,
    iconColor: 'text-cyan-500',
    xpReward: 500,
    condition: 'mastery_all_subjects',
    category: 'mastery',
  },
  {
    id: 'mastery_assessment_perfect',
    title: 'Assessment Perfect',
    description: 'Score 100% on a diagnostic assessment',
    icon: Target,
    iconColor: 'text-amber-500',
    xpReward: 400,
    condition: 'mastery_assessment_perfect',
    category: 'mastery',
  },
  {
    id: 'mastery_max_level',
    title: 'Max Level',
    description: 'Reach the maximum player level',
    icon: Crown,
    iconColor: 'text-yellow-500',
    xpReward: 2000,
    condition: 'mastery_max_level',
    category: 'mastery',
  },
  {
    id: 'mastery_top_10',
    title: 'Leaderboard Elite',
    description: 'Reach the top 10 on the global leaderboard',
    icon: Award,
    iconColor: 'text-amber-400',
    xpReward: 1000,
    condition: 'social_xp',
    category: 'mastery',
  },

  // ─── EXPLORATION (7) ───────────────────────────────────────────────────────
  {
    id: 'explore_profile',
    title: 'Identity Set',
    description: 'Complete your user profile',
    icon: User,
    iconColor: 'text-blue-400',
    xpReward: 50,
    condition: 'explore_profile_complete',
    category: 'exploration',
  },
  {
    id: 'explore_first_friend',
    title: 'Socialite',
    description: 'Add your first friend',
    icon: UserPlus,
    iconColor: 'text-green-500',
    xpReward: 50,
    condition: 'explore_friend_added',
    threshold: 1,
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
    id: 'explore_10_friends',
    title: 'Popular',
    description: 'Have 10 friends on the platform',
    icon: Users,
    iconColor: 'text-teal-500',
    xpReward: 300,
    condition: 'explore_friend_added',
    threshold: 10,
    category: 'exploration',
  },
  {
    id: 'explore_all_features',
    title: 'Explorer',
    description: 'Use all major app features',
    icon: Compass,
    iconColor: 'text-orange-400',
    xpReward: 200,
    condition: 'explore_profile_complete',
    category: 'exploration',
  },
  {
    id: 'explore_25_friends',
    title: 'Social Butterfly',
    description: 'Have 25 friends on the platform',
    icon: Heart,
    iconColor: 'text-pink-500',
    xpReward: 500,
    condition: 'explore_social',
    threshold: 25,
    category: 'exploration',
  },
  {
    id: 'explore_xp_1000',
    title: 'XP Milestone',
    description: 'Earn your first 1,000 XP',
    icon: TrendingUp,
    iconColor: 'text-blue-500',
    xpReward: 100,
    condition: 'mastery_xp',
    threshold: 1000,
    category: 'exploration',
  },

  // ─── SOCIAL (5) ───────────────────────────────────────────────────────────
  {
    id: 'social_first_friend',
    title: 'Friendship Starter',
    description: 'Send your first friend request',
    icon: UserPlus,
    iconColor: 'text-green-400',
    xpReward: 25,
    condition: 'social_friend',
    threshold: 1,
    category: 'social',
  },
  {
    id: 'social_helper',
    title: 'Helpful Hand',
    description: 'Contribute to the community',
    icon: Award,
    iconColor: 'text-cyan-500',
    xpReward: 150,
    condition: 'social_contribution',
    category: 'social',
  },
  {
    id: 'social_top_10',
    title: 'Elite Status',
    description: 'Reach the top 10 on the leaderboard',
    icon: Trophy,
    iconColor: 'text-yellow-400',
    xpReward: 500,
    condition: 'social_xp',
    category: 'social',
  },
  {
    id: 'social_streak_30',
    title: 'Dedicated Member',
    description: 'Maintain a 30-day activity streak',
    icon: Flame,
    iconColor: 'text-red-400',
    xpReward: 1000,
    condition: 'mastery_10',
    threshold: 30,
    category: 'social',
  },
  {
    id: 'social_daily_7',
    title: 'Weekly Visitor',
    description: 'Return to the app 7 days in a row',
    icon: Calendar,
    iconColor: 'text-violet-400',
    xpReward: 200,
    condition: 'social_daily_return',
    threshold: 7,
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