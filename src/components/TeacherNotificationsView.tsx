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
  Zap,
  Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';
import { useNotifications } from '@/features/notifications';
import { useAuth } from '../contexts/AuthContext';

interface TeacherNotificationsViewProps {
  liveActivity?: { id: string; student: string; action: string; topic: string; time: string; type: string }[];
  atRiskStudents?: { name: string; riskLevel: string; weakestTopic: string }[];
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  teacherName?: string;
}

const TeacherNotificationsView: React.FC<TeacherNotificationsViewProps> = ({
  liveActivity,
  atRiskStudents,
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto,
  teacherName,
}) => {
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

  const { currentUser } = useAuth();

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
    <div className="w-full min-h-full flex flex-col bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
      {/* Standard Header */}
      <div className="w-full px-[24px] xl:px-[32px] pt-[24px] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-tight">Notifications</h1>
            <p className="text-[13px] text-[#64748b] mt-1">Classroom alerts and updates.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-2 mr-2">
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

            {/* AI Insights Button */}
            <button
              onClick={onOpenInsightModal}
              className="relative w-10 h-10 flex items-center justify-center bg-[#eef2ff]/80 hover:bg-[#e0e7ff] rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#a5b4fc]/60 text-[#4f46e5] hover:border-[#818cf8] transition-colors cursor-pointer hover:scale-[1.02]"
              aria-label="View AI Insight"
            >
              <Sparkles className="w-4 h-4" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 border border-white animate-pulse" />
            </button>
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer hover:scale-[1.02]"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
            {/* Profile Pill */}
            <div
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors h-10 hover:scale-[1.02]"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                <img src={userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName || 'Teacher')}&background=e0e7ff&color=4f46e5`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold text-[#1e293b]">{teacherName || 'Test Teacher'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-[24px] xl:px-[32px] pb-[32px] space-y-[24px]">

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
            {liveActivity && liveActivity.length > 0 && (
              <div>
                {liveActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="w-full text-left px-4 py-4 border-b border-border transition-colors hover:bg-accent/40"
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'success' ? 'bg-[#75D06A]/15 text-[#4D9F46]' :
                        activity.type === 'warning' ? 'bg-[#F08386]/15 text-[#C65E63]' :
                        'bg-[#9956DE]/15 text-[#9956DE]'
                      }`}>
                        <Zap size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-body font-bold text-foreground line-clamp-1">{activity.student} — {activity.action}</h4>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground font-body leading-relaxed line-clamp-2">Topic: {activity.topic}</p>
                          </div>
                          <div className="text-xs text-muted-foreground font-body flex-shrink-0">{activity.time}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      </div>
    </div>
  );
};

export default TeacherNotificationsView;
