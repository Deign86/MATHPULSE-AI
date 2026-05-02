import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCheck,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import { Button } from './ui/button';
import { useNotifications } from '@/features/notifications';

const TeacherNotificationsView: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  const formatRelativeTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'achievement_unlocked':
      case 'achievement':
        return Trophy;
      case 'message':
        return MessageSquare;
      case 'grade':
      case 'quiz_result':
        return GraduationCap;
      case 'reminder':
      case 'streak_reminder':
        return Clock;
      case 'risk_alert':
        return AlertTriangle;
      case 'automation':
      case 'system_alert':
        return Bot;
      default:
        return Bell;
    }
  };

  const badgeForType = (type: string) => {
    switch (type) {
      case 'risk_alert':
        return 'bg-destructive/10 text-destructive';
      case 'achievement_unlocked':
      case 'achievement':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'message':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-400';
      case 'grade':
      case 'quiz_result':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'reminder':
      case 'streak_reminder':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'automation':
      case 'system_alert':
        return 'bg-violet-500/10 text-violet-700 dark:text-violet-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="p-4 sm:p-6 space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center flex-shrink-0">
              <Bell size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground font-body">Classroom alerts and updates</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground font-body">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-body">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10">
            <div className="max-w-xl">
              <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
                <Bell size={22} />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground font-body">Teacher alerts and classroom updates will appear here.</p>
            </div>
          </div>
        )         : (
          <div>
            {notifications.map((notification) => {
              const Icon = iconForType(notification.type);
              const badge = badgeForType(notification.type);
              const time = formatRelativeTime(notification.createdAt);

              return (
                <button
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`w-full text-left px-4 py-4 border-b border-border last:border-b-0 transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    notification.isRead ? '' : 'bg-sky-50/40 dark:bg-sky-500/5'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${badge}`}>
                      <Icon size={18} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-body font-bold text-foreground line-clamp-1">{notification.title}</h4>
                            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground font-body leading-relaxed line-clamp-2">{notification.message}</p>
                        </div>
                        <div className="text-xs text-muted-foreground font-body flex-shrink-0">{time}</div>
                      </div>
                      
                      {notification.actionUrl && (
                        <div className="mt-2 text-xs text-sky-600 dark:text-sky-400 font-body">
                          Opens link
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TeacherNotificationsView;
