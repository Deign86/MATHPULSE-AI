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
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

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
    let result = notifications;
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
      <div className="max-w-[900px] mx-auto w-full p-[24px] xl:p-[32px] space-y-[24px] flex-1 overflow-y-auto no-scrollbar pb-12">

        {/* Filters + controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 text-[13px] rounded-full whitespace-nowrap transition-all duration-300 border ${
              filter === 'all'
                ? 'bg-purple-50 text-[#9333ea] border-purple-200 shadow-md font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-6 py-2.5 text-[13px] rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-purple-50 text-[#9333ea] border-purple-200 shadow-md font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            Unread
            <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500">
              {unreadCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`px-6 py-2.5 text-[13px] rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-2 ${
              filter === 'important'
                ? 'bg-purple-50 text-[#9333ea] border-purple-200 shadow-md font-bold'
                : 'bg-white/80 text-[#64748b] border-white hover:border-[#e2e8f0] shadow-sm font-medium'
            }`}
          >
            Important
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          </button>

          {/* Right: unread count + mark all */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-[13px] font-bold text-[#64748b]">
              {unreadCount > 0 ? `${unreadCount} unread` : 'No unread'}
            </span>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] text-[13px] font-bold rounded-full px-5 py-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-[#94a3b8] group-hover:text-emerald-500 transition-colors" />
              Mark all as read
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
              <p className="text-[14px] font-medium text-[#64748b]">Syncing notifications...</p>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-[18px] font-bold text-[#1e293b] mb-2">All clear!</h3>
              <p className="text-[14px] text-[#64748b] max-w-sm">
                No notifications found for this filter. New alerts will appear here automatically.
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.title}>
                <h3 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3 ml-2 flex items-center gap-2">
                  <group.icon className="w-4 h-4" /> {group.title}
                </h3>
                <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-[#f1f5f9]">
                  {group.items.map((notification) => {
                    const Icon = iconForType(notification.type);
                    const isRisk = notification.type === 'risk_alert';
                    return (
                      <motion.div
                        layout
                        key={notification.id}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className={`relative p-5 flex gap-5 group cursor-pointer hover:bg-white transition-all duration-300 ${
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform bg-gradient-to-br ${getGradientColor(notification.type)}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-[15px] font-bold text-[#1e293b] flex items-center gap-2 truncate pr-4">
                              {notification.title}
                              {!notification.isRead && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  isRisk
                                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                    : 'bg-[#a855f7] shadow-[0_0_6px_rgba(168,85,247,0.8)]'
                                }`} />
                              )}
                            </h4>
                            <span className={`text-[12px] font-bold whitespace-nowrap ${
                              !notification.isRead
                                ? (isRisk ? 'text-rose-600' : 'text-[#a855f7]')
                                : 'text-[#94a3b8]'
                            }`}>
                              {formatDistanceToNow(notification.createdAt)} ago
                            </span>
                          </div>
                          <p className="text-[14px] text-[#475569] font-medium leading-relaxed">
                            {notification.message}
                          </p>
                          {!notification.isRead && notification.actionUrl && (
                            <div className="mt-3 flex gap-2">
                              <button className={`px-5 py-2 bg-white border rounded-full text-[12px] font-bold shadow-sm transition-all hover:-translate-y-0.5 ${
                                isRisk
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-purple-200 text-[#9333ea] hover:bg-purple-50'
                              }`}>
                                Review Plan
                              </button>
                            </div>
                          )}
                        </div>

                        {/* More button */}
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-slate-600 transition-all rounded-full hover:bg-slate-100 shrink-0 self-start">
                          <MoreVertical size={18} />
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
