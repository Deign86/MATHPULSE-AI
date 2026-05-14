import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, CheckCircle2, Bell, Users, ArrowRight, CheckCheck, Clock } from 'lucide-react';
import { useNotifications } from '@/features/notifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewAll: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onViewAll }) => {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const latestNotifications = notifications.slice(0, 5);

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
          <div className="fixed inset-0 z-[90]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
            className="fixed top-[80px] right-[24px] xl:right-[32px] w-[380px] bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white z-[100] flex flex-col overflow-hidden origin-top-right"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#f1f5f9] flex justify-between items-center bg-white/50">
              <h3 className="text-[16px] font-bold text-[#1e293b]">Notifications</h3>
              <button 
                onClick={() => markAllAsRead()} 
                disabled={unreadCount === 0}
                className="text-[12px] font-bold text-[#a855f7] hover:text-[#9333ea] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#a855f7]"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
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
                      // If there's an action URL, we could navigate there.
                    }}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.isRead ? getColors(notif.type).split(' ')[2] : 'opacity-70'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${getColors(notif.type).split(' ').slice(0, 2).join(' ')}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-[13px] font-bold text-[#1e293b]">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_4px_rgba(168,85,247,0.6)] mt-1"></span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#475569] line-clamp-2 leading-relaxed">{notif.message}</p>
                      <span className={`text-[10px] font-bold mt-1 block ${!notif.isRead ? 'text-[#a855f7]' : 'text-[#94a3b8]'}`}>
                        {formatDistanceToNow(notif.createdAt)} ago
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-[#94a3b8] mx-auto mb-2 opacity-20" />
                  <p className="text-[13px] font-medium text-[#64748b]">No new notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#f1f5f9] bg-white">
              <button 
                onClick={() => {
                  onViewAll();
                  onClose();
                }} 
                className="w-full py-2 bg-purple-50 text-[#9333ea] hover:bg-purple-100 transition-colors rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              >
                View All Notifications <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
