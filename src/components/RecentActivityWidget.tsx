import React, { memo, useEffect, useState } from 'react';
import { BookOpen, Award, Flame, Zap, Clock, Star, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getXPActivities } from '../services/gamificationService';
import { XPActivity } from '../types/models';
import { Skeleton } from './ui/skeleton';

const ACTIVITY_ICON_MAP = {
  lesson_complete: { icon: BookOpen, bg: 'bg-sky-100', color: 'text-sky-600' },
  quiz_complete: { icon: Award, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  streak_bonus: { icon: Flame, bg: 'bg-orange-100', color: 'text-orange-600' },
  achievement_unlocked: { icon: Star, bg: 'bg-amber-100', color: 'text-amber-600' },
  default: { icon: Zap, bg: 'bg-rose-100', color: 'text-rose-600' },
} satisfies Record<string, { icon: typeof Zap; bg: string; color: string }>;

type ActivityIcon = (typeof ACTIVITY_ICON_MAP)[keyof typeof ACTIVITY_ICON_MAP];

interface ActivityRowProps {
  activity: XPActivity;
  index: number;
  icon: ActivityIcon;
  timeAgo: string;
}

// Mount-only entrance: stable keys mean rows animate once, never on data refresh.
const ActivityRow = memo(function ActivityRow({ activity, index, icon: { icon: Icon, bg, color }, timeAgo }: ActivityRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index, 7) * 0.04, duration: 0.25 }}
      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon size={14} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-body font-medium text-[#0a1628] truncate">
          {activity.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-body text-slate-400 flex items-center gap-0.5">
            <Clock size={10} />
            {timeAgo}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Zap size={12} className="text-amber-500" />
        <span className="text-xs font-display font-bold text-amber-600">+{activity.xpEarned}</span>
      </div>
    </motion.div>
  );
});

const RecentActivityWidget: React.FC = () => {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<XPActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    setLoading(true);
    getXPActivities(userProfile.uid, 8)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  // SAFETY: `in` narrows the key at runtime; the assertion only recovers the static key union.
  const getActivityIcon = (type: string): ActivityIcon =>
    type in ACTIVITY_ICON_MAP
      ? ACTIVITY_ICON_MAP[type as keyof typeof ACTIVITY_ICON_MAP]
      : ACTIVITY_ICON_MAP.default;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl border border-slate-200/80 p-3 mt-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
          <Activity size={14} className="text-violet-600" />
        </div>
        <h3 className="font-display font-bold text-sm text-[#0a1628]">Recent Activity</h3>
      </div>

      {loading ? (
        <div className="space-y-1" aria-busy="true" aria-label="Loading recent activity">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-2.5 p-2 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-4 w-10 rounded shrink-0" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
            <Activity size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-body font-medium text-slate-500">No activity yet</p>
          <p className="text-xs font-body text-slate-400 mt-0.5">Complete lessons and quizzes to see your history</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity, index) => (
            <ActivityRow
              key={activity.activityId || index}
              activity={activity}
              index={index}
              icon={getActivityIcon(activity.type)}
              timeAgo={formatTimeAgo(activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp))}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RecentActivityWidget;
