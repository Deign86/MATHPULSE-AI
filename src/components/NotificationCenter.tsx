import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Trophy, AlertCircle, BookOpen, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';

interface Notification {
  id: string;
  type: 'achievement' | 'alert' | 'message' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationCenterProps {
  userRole?: 'student' | 'teacher' | 'admin';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userRole = 'student' }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Load notifications from Firebase
  useEffect(() => {
    const loadNotifications = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const firebaseNotifications = await getUserNotifications(currentUser.uid, 20);
        const mapped: Notification[] = firebaseNotifications.map(n => {
          // Map Firebase notification types to component types
          let type: Notification['type'] = 'info';
          if (n.type === 'achievement') type = 'achievement';
          else if (n.type === 'risk_alert' || n.type === 'reminder') type = 'alert';
          else if (n.type === 'message' || n.type === 'friend_request') type = 'message';
          else type = 'info';

          // Format time as relative
          const createdAt = n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt);
          const diffMs = Date.now() - createdAt.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          let time: string;
          if (diffMins < 1) time = 'Just now';
          else if (diffMins < 60) time = `${diffMins} min ago`;
          else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)} hours ago`;
          else time = `${Math.floor(diffMins / 1440)} days ago`;

          return {
            id: n.id,
            type,
            title: n.title,
            message: n.message,
            time,
            read: n.read,
          };
        });
        setNotifications(mapped);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    if (currentUser) {
      markAllNotificationsAsRead(currentUser.uid)
        .catch(err => console.error('Error marking all as read:', err));
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    markNotificationAsRead(id)
      .catch(err => console.error('Error marking as read:', err));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return Trophy;
      case 'alert': return AlertCircle;
      case 'message': return MessageSquare;
      case 'info': return BookOpen;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'bg-rose-500/10 text-rose-600';
      case 'alert': return 'bg-red-500/10 text-red-600';
      case 'message': return 'bg-sky-500/10 text-sky-600';
      case 'info': return 'bg-emerald-500/10 text-emerald-600';
      default: return 'bg-[#edf1f7] text-[#5a6578]';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-[#edf1f7] rounded-xl text-[#5a6578] hover:bg-[#dde3eb] transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-sky-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <div key="notification-panel">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-96 bg-[#f7f9fc] rounded-xl shadow-2xl border border-[#dde3eb] z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-[#dde3eb] flex items-center justify-between bg-gradient-to-r from-sky-600 to-sky-500">
                <div>
                  <h3 className="font-display font-bold text-white">Notifications</h3>
                  <p className="text-xs text-sky-100 mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={markAllAsRead}
                      className="text-xs text-sky-400 hover:text-sky-300 font-bold"
                    >
                      <CheckCheck size={18} />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(false)}
                    className="text-slate-500 hover:text-sky-700"
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={48} className="text-[#d1cec6] mx-auto mb-3" />
                    <p className="text-[#5a6578] text-sm font-body">No notifications yet</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => {
                      const Icon = getIcon(notification.type);
                      return (
                        <motion.div
                          key={notification.id}
                          whileHover={{ backgroundColor: 'rgba(241, 245, 249, 0.5)' }}
                          onClick={() => markAsRead(notification.id)}
                          className={`p-4 border-b border-[#dde3eb] cursor-pointer transition-colors ${
                            !notification.read ? 'bg-sky-50/40' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getColor(notification.type)}`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm font-bold text-[#0a1628] line-clamp-1 font-body">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="w-2 h-2 bg-sky-600 rounded-full flex-shrink-0 mt-1.5"></span>
                                )}
                              </div>
                              <p className="text-xs text-[#5a6578] mb-2 line-clamp-2 font-body">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500">{notification.time}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-[#dde3eb] text-center bg-[#edf1f7]">
                  <button className="text-xs text-sky-600 hover:text-sky-700 font-bold font-body">
                    View All Notifications
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
