/**
 * @file NotificationItem.tsx
 * Single notification row.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Trophy,
  TrendingUp,
  ClipboardCheck,
  CheckCircle,
  Flame,
  Bell,
  Megaphone,
  BookOpen,
  Zap,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { Notification } from './types';
import { useNotifications } from './NotificationContext';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  achievement_unlocked: Trophy,
  level_up: TrendingUp,
  quiz_result: ClipboardCheck,
  daily_checkin: CheckCircle,
  streak_milestone: Flame,
  streak_reminder: Bell,
  teacher_announcement: Megaphone,
  new_assignment: BookOpen,
  xp_earned: Zap,
  system_alert: AlertCircle,
};

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotifications();
  const Icon = iconMap[notification.type] || Bell;

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const timeAgo = formatDistanceToNow(notification.createdAt, { addSuffix: true });

  return (
    <div
      onClick={handleClick}
      className={`group p-4 border-b border-gray-700 cursor-pointer transition-colors ${
        notification.isRead
          ? 'bg-gray-900 hover:bg-gray-800'
          : 'bg-gray-800 border-l-2 border-purple-500'
      }`}
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold text-white line-clamp-1">{notification.title}</h4>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-gray-400 mb-1 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-500">{timeAgo}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400"
          aria-label="Delete notification"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
