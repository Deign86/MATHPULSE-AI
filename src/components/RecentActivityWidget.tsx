import React, { useEffect, useState } from 'react';
import { BookOpen, Award, Flame, Zap, Clock, Star, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getXPActivities } from '../services/gamificationService';
import { XPActivity } from '../types/models';

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson_complete':
        return { icon: BookOpen, bg: 'bg-sky-100', color: 'text-sky-600' };
      case 'quiz_complete':
        return { icon: Award, bg: 'bg-emerald-100', color: 'text-emerald-600' };
      case 'streak_bonus':
        return { icon: Flame, bg: 'bg-orange-100', color: 'text-orange-600' };
      case 'achievement_unlocked':
        return { icon: Star, bg: 'bg-amber-100', color: 'text-amber-600' };
      default:
        return { icon: Zap, bg: 'bg-rose-100', color: 'text-rose-600' };
    }
  };

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
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
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
          {activities.map((activity, index) => {
            const { icon: Icon, bg, color } = getActivityIcon(activity.type);
            return (
              <motion.div
                key={activity.activityId || index}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04,  ease: [0.22, 1, 0.36, 1] }}
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
                      {formatTimeAgo(activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Zap size={12} className="text-amber-500" />
                  <span className="text-xs font-display font-bold text-amber-600">+{activity.xpEarned}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default RecentActivityWidget;
