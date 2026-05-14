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
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
      {/* Standard Header */}
      <div className="w-full px-[24px] xl:px-[32px] pt-[24px] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
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
        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
          <button className="px-6 py-2.5 text-[13px] font-bold rounded-full whitespace-nowrap transition-all duration-300 bg-purple-50 text-[#9333ea] border border-purple-200 shadow-md">
            All
          </button>
          <button className="px-6 py-2.5 text-[13px] font-medium rounded-full whitespace-nowrap transition-all duration-300 bg-white/80 text-[#64748b] border border-white hover:border-[#e2e8f0] shadow-sm flex items-center gap-2">
            Unread <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500">{unreadCount}</span>
          </button>
          <button className="px-6 py-2.5 text-[13px] font-medium rounded-full whitespace-nowrap transition-all duration-300 bg-white/80 text-[#64748b] border border-white hover:border-[#e2e8f0] shadow-sm flex items-center gap-2">
            Important <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          </button>
        </div>

        {/* Notification List */}
        <div className="space-y-8 pb-8">
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
              <p className="text-[14px] font-medium text-[#64748b]">Loading your alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-[18px] font-bold text-[#1e293b] mb-2">No notifications yet</h3>
              <p className="text-[14px] text-[#64748b] max-w-sm">Teacher alerts and classroom updates will appear here when they occur.</p>
            </div>
          ) : (
            <>
              {/* Today Section */}
              <div>
                <h3 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3 ml-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Today
                </h3>
                <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-[#f1f5f9]">
                  {notifications.map((notification) => {
                    const Icon = iconForType(notification.type);
                    const time = formatRelativeTime(notification.createdAt);
                    const isImportant = notification.type === 'risk_alert';
                    
                    return (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`relative p-5 flex gap-5 group cursor-pointer hover:bg-white transition-all ${
                          !notification.isRead 
                            ? (isImportant ? 'bg-rose-50/30' : 'bg-purple-50/30') 
                            : 'opacity-80'
                        }`}
                      >
                        <div className={`absolute left-0 top-0 w-1.5 h-full transition-colors ${
                          !notification.isRead 
                            ? (isImportant ? 'bg-rose-500' : 'bg-[#a855f7]') 
                            : 'bg-transparent'
                        }`} />
                        
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform ${
                          isImportant 
                            ? 'bg-gradient-to-br from-rose-400 to-rose-600' 
                            : 'bg-gradient-to-br from-[#a855f7] to-[#9333ea]'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-[15px] font-bold text-[#1e293b] flex items-center gap-2`}>
                              {notification.title}
                              {!notification.isRead && (
                                <span className={`w-2 h-2 rounded-full ${isImportant ? 'bg-rose-500' : 'bg-[#a855f7]'} shadow-lg`} />
                              )}
                            </h4>
                            <span className={`text-[12px] font-bold ${isImportant ? 'text-rose-600' : 'text-[#a855f7]'}`}>
                              {time}
                            </span>
                          </div>
                          <p className="text-[14px] text-[#475569] font-medium leading-relaxed">{notification.message}</p>
                          
                          {!notification.isRead && notification.actionUrl && (
                            <div className="mt-3 flex gap-2">
                              <button className={`px-5 py-2 bg-white border rounded-full text-[12px] font-bold shadow-sm transition-colors ${
                                isImportant ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-purple-200 text-[#9333ea] hover:bg-purple-50'
                              }`}>
                                Take Action
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherNotificationsView;
