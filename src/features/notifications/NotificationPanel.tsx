/**
 * @file NotificationPanel.tsx
 * Dropdown panel listing notifications.
 */
import React, { useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-[#f7f9fc] rounded-xl shadow-2xl border border-[#dde3eb] max-h-96 overflow-y-auto z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#dde3eb] flex items-center justify-between bg-gradient-to-r from-sky-600 to-sky-500">
        <div>
          <h3 className="font-display font-bold text-white text-sm">Notifications</h3>
          <p className="text-xs text-sky-100 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'No new alerts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-sky-200 hover:text-white font-bold transition-colors flex items-center gap-1"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-sky-200 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-[#dde3eb] rounded h-12" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="text-[#d1cec6] mx-auto mb-3" />
            <p className="text-[#5a6578] text-sm font-body">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))
        )}
      </div>
    </div>
  );
};
