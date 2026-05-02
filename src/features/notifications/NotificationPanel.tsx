/**
 * @file NotificationPanel.tsx
 * Dropdown panel listing notifications.
 */
import React, { useEffect, useRef } from 'react';
import { CheckCheck } from 'lucide-react';
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
      className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-white">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-700 rounded h-12" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">You're all caught up! 🎉</p>
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
