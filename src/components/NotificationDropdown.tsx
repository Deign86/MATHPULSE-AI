import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, CheckCircle2, Bell, Users, ArrowRight, CheckCheck, Clock } from 'lucide-react';
import { useNotifications } from '@/features/notifications';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const STUDENT_ONLY_TYPES = ['streak_reminder', 'daily_checkin', 'streak_milestone', 'achievement_unlocked', 'level_up', 'xp_earned', 'quiz_result'];

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewAll: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onViewAll }) => {
  const { notifications, markAsRead, markAllAsRead, unreadCount: _rawUnreadCount } = useNotifications();
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  const filteredNotifications = useMemo(() => {
    if (role === 'student') return notifications;
    return notifications.filter((n) => !STUDENT_ONLY_TYPES.includes(n.type));
  }, [notifications, role]);

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;
  const latestNotifications = filteredNotifications.slice(0, 5);

  const getIcon = (type: string) => {
    switch (type) {
      case 'sparkles':
      case 'achievement_unlocked':
      case 'level_up':
        return <Sparkles className="w-4 h-4" />;
      case 'alert-circle':
      case 'risk_alert':
      case 'system_alert':
        return <AlertCircle className="w-4 h-4" />;
      case 'check-circle-2':
      case 'quiz_result':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'users':
      case 'new_assignment':
        return <Users className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'sparkles':
      case 'achievement_unlocked':
      case 'level_up':
        return 'from-[#a855f7] to-[#9333ea] text-white bg-purple-50/30';
      case 'alert-circle':
      case 'risk_alert':
      case 'system_alert':
        return 'from-[#f43f5e] to-[#e11d48] text-white bg-rose-50/30';
      case 'check-circle-2':
      case 'quiz_result':
        return 'bg-emerald-50 text-emerald-500 border border-emerald-100';
      case 'users':
      case 'new_assignment':
        return 'bg-blue-50 text-blue-500 border border-blue-100';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
            className="fixed top-[62px] sm:top-[76px] right-3 sm:right-6 xl:right-8 w-[calc(100vw-24px)] sm:w-[380px] max-w-[380px] bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-slate-200/80 z-50 flex flex-col overflow-hidden origin-top-right"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-white/60">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-[15px] font-bold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button 
                onClick={() => markAllAsRead()} 
                disabled={unreadCount === 0}
                aria-label="Mark all notifications as read"
                className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer rounded px-1"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" /> Mark all read
              </button>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto no-scrollbar flex flex-col divide-y divide-[#f1f5f9]">
              {latestNotifications.length > 0 ? (
                latestNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.type === 'class_assigned') {
                        window.dispatchEvent(new CustomEvent('mathpulse:navigate', {
                          detail: { tab: 'Modules' },
                        }));
                        onClose();
                      } else if (notif.type === 'quiz_assigned') {
                        window.dispatchEvent(new CustomEvent('mathpulse:navigate', {
                          detail: { tab: 'Modules', section: 'assigned-quizzes', quizId: notif.metadata?.quizId },
                        }));
                        onClose();
                      } else if (notif.actionUrl) {
                        window.location.href = notif.actionUrl;
                        onClose();
                      }
                    }}
                    className={`p-3.5 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.isRead ? getColors(notif.type).split(' ')[2] : 'opacity-70'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${getColors(notif.type).split(' ').slice(0, 2).join(' ')}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5 gap-2">
                        <h4 className="text-[13px] font-bold text-slate-800 truncate">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-violet-600 shadow-[0_0_4px_rgba(168,85,247,0.6)] mt-1 shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed">{notif.message}</p>
                      <span className={`text-[10px] font-bold mt-1 block tabular-nums ${!notif.isRead ? 'text-violet-600' : 'text-slate-400'}`}>
                        {formatDistanceToNow(notif.createdAt)} ago
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-30" />
                  <p className="text-[13px] font-medium text-slate-500">No new notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white">
              <button 
                onClick={() => {
                  onViewAll();
                  onClose();
                }} 
                className="w-full py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/60 transition-colors rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>View All Notifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
