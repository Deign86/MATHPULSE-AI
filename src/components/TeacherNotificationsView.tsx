import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  Trophy,
  Sparkles,
  Users,
  History,
  MoreVertical,
} from 'lucide-react';
import { useNotifications, Notification } from '@/features/notifications';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';

interface TeacherNotificationsViewProps {
  liveActivity?: { id: string; student: string; action: string; topic: string; time: string; type: string }[];
  atRiskStudents?: { name: string; riskLevel: string; weakestTopic: string }[];
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  teacherName?: string;
}

const TeacherNotificationsView: React.FC<TeacherNotificationsViewProps> = () => {
  const { notifications, unreadCount: _rawUnreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  const STUDENT_ONLY_TYPES = ['streak_reminder', 'daily_checkin', 'streak_milestone', 'achievement_unlocked', 'level_up', 'xp_earned', 'quiz_result'];
  const unreadCount = notifications.filter(n => !n.isRead && !STUDENT_ONLY_TYPES.includes(n.type)).length;

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
      case 'daily_checkin':
        return Clock;
      case 'risk_alert':
        return AlertTriangle;
      case 'sparkles':
      case 'lesson_plan_ready':
        return Sparkles;
      case 'users':
      case 'student_import':
        return Users;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-slate-50 text-slate-500 border-slate-100 opacity-70';
    switch (type) {
      case 'risk_alert':
        return 'bg-rose-50/30 text-rose-500 border-rose-100';
      case 'sparkles':
      case 'lesson_plan_ready':
        return 'bg-purple-50/30 text-[#a855f7] border-purple-100';
      case 'daily_checkin':
        return 'bg-amber-50/20 text-amber-500 border-amber-100';
      case 'users':
      case 'student_import':
        return 'bg-blue-50/30 text-blue-500 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getGradientColor = (type: string) => {
    switch (type) {
      case 'risk_alert':
        return 'from-rose-400 to-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.3)]';
      case 'sparkles':
      case 'lesson_plan_ready':
        return 'from-[#a855f7] to-[#9333ea] shadow-[0_4px_12px_rgba(168,85,247,0.3)]';
      case 'daily_checkin':
        return 'from-amber-300 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.3)]';
      case 'users':
      case 'student_import':
        return 'from-blue-400 to-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.3)]';
      default:
        return 'from-slate-400 to-slate-600 shadow-[0_4px_12px_rgba(100,116,139,0.3)]';
    }
  };

  const filteredNotifications = useMemo(() => {
    let result = notifications.filter(n => !STUDENT_ONLY_TYPES.includes(n.type));
    if (filter === 'unread') result = result.filter(n => !n.isRead);
    if (filter === 'important') result = result.filter(n => n.type === 'risk_alert');
    return result;
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const groups: { title: string; icon: any; items: Notification[] }[] = [];
    const today = filteredNotifications.filter(n => isToday(n.createdAt));
    const yesterday = filteredNotifications.filter(n => isYesterday(n.createdAt));
    const older = filteredNotifications.filter(n => !isToday(n.createdAt) && !isYesterday(n.createdAt));
    if (today.length > 0) groups.push({ title: 'Today', icon: Clock, items: today });
    if (yesterday.length > 0) groups.push({ title: 'Yesterday', icon: History, items: yesterday });
    if (older.length > 0) groups.push({ title: 'Earlier', icon: History, items: older });
    return groups;
  }, [filteredNotifications]);

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc]/50">
      <div className="max-w-[900px] mx-auto w-full p-3.5 sm:p-6 xl:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto no-scrollbar pb-24 sm:pb-12">

        {/* Filters + controls row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filter tabs */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] rounded-full whitespace-nowrap transition-all duration-300 border ${
              filter === 'all'
                ? 'bg-[#f3e8ff] text-[#a855f7] border-[#d8b4fe] shadow-sm font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`font-body px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-[#f3e8ff] text-[#a855f7] border-[#d8b4fe] shadow-sm font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            Unread
            <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-[9.5px] font-bold flex items-center justify-center text-slate-500 tabular-nums">
              {unreadCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`font-body px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 ${
              filter === 'important'
                ? 'bg-[#f3e8ff] text-[#a855f7] border-[#d8b4fe] shadow-sm font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            Important
            {notifications.some(n => n.type === 'risk_alert' && !n.isRead) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            )}
          </button>

          {/* Right: unread count + mark all */}
          <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 mt-1 sm:mt-0 shrink-0 font-body">
            <span className="text-[11.5px] sm:text-xs font-bold text-[#64748b] tabular-nums">
              {unreadCount > 0 ? `${unreadCount} unread` : 'No unread'}
            </span>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full px-3 sm:px-4 py-1.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-emerald-500 transition-colors" />
              Mark all as read
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-6 sm:space-y-8">
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] sm:rounded-[24px] border border-white p-8 sm:p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
              <p className="font-body text-[13px] font-medium text-[#64748b]">Syncing notifications...</p>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] sm:rounded-[24px] border border-white p-10 sm:p-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 bg-slate-50 rounded-full flex items-center justify-center mb-4 sm:mb-5 border border-slate-100">
                <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300" />
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#1e293b] mb-1.5">All clear!</h3>
              <p className="font-body text-xs sm:text-[13px] text-[#64748b] max-w-sm">
                No notifications found for this filter. New alerts will appear here automatically.
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.title}>
                <h3 className="font-body text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2 ml-1.5 flex items-center gap-1.5">
                  <group.icon className="w-3.5 h-3.5" /> {group.title}
                </h3>
                <div className="bg-white/80 backdrop-blur-[12px] rounded-[18px] sm:rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-[#f1f5f9]">
                  {group.items.map((notification) => {
                    const Icon = iconForType(notification.type);
                    const isRisk = notification.type === 'risk_alert';
                    return (
                      <motion.div
                        layout
                        key={notification.id}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className={`relative p-3 sm:p-4.5 flex gap-2.5 sm:gap-4 group cursor-pointer hover:bg-white transition-all duration-300 ${
                          !notification.isRead ? getNotificationColor(notification.type, false) : 'opacity-80'
                        }`}
                      >
                        {/* Unread accent bar */}
                        <div className={`absolute left-0 top-0 w-1.5 h-full transition-colors ${
                          !notification.isRead
                            ? (isRisk ? 'bg-rose-500' : 'bg-[#a855f7]')
                            : 'bg-transparent'
                        }`} />

                        {/* Icon */}
                        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform bg-gradient-to-br ${getGradientColor(notification.type)}`}>
                          <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1e293b] flex items-center gap-1.5 truncate min-w-0">
                              <span className="truncate">{notification.title}</span>
                              {!notification.isRead && (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isRisk
                                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                    : 'bg-[#a855f7] shadow-[0_0_6px_rgba(168,85,247,0.8)]'
                                }`} />
                              )}
                            </h4>
                            <span className={`text-[10.5px] sm:text-[11.5px] font-medium whitespace-nowrap shrink-0 ml-auto ${
                              !notification.isRead
                                ? (isRisk ? 'text-rose-600 font-semibold' : 'text-[#a855f7] font-semibold')
                                : 'text-[#94a3b8]'
                            }`}>
                              {formatDistanceToNow(notification.createdAt)} ago
                            </span>
                          </div>
                          <p className="text-[12px] sm:text-[13px] text-[#475569] font-normal leading-relaxed">
                            {notification.message}
                          </p>
                          {!notification.isRead && notification.actionUrl && (
                            <div className="mt-2.5 flex gap-2">
                              <button className={`px-3.5 py-1.5 bg-white border rounded-full text-[11px] sm:text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 ${
                                isRisk
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-[#d8b4fe] text-[#a855f7] hover:bg-[#f3e8ff]'
                              }`}>
                                Review Plan
                              </button>
                            </div>
                          )}
                        </div>

                        {/* More button */}
                        <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 transition-all rounded-full hover:bg-slate-100 shrink-0 self-start">
                          <MoreVertical size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherNotificationsView;
