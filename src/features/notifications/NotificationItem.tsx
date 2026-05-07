/**
 * @file NotificationItem.tsx
 * Single notification row.
 */
import React from 'react';
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

const badgeForType = (type: string): string => {
  switch (type) {
    case 'achievement_unlocked':
    case 'achievement':
      return 'bg-rose-500/10 text-rose-600';
    case 'xp_earned':
      return 'bg-amber-500/10 text-amber-600';
    case 'daily_checkin':
    case 'checkin':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'streak_milestone':
    case 'streak_reminder':
      return 'bg-orange-500/10 text-orange-600';
    case 'teacher_announcement':
      return 'bg-violet-500/10 text-violet-600';
    case 'new_assignment':
    case 'quiz_result':
      return 'bg-sky-500/10 text-sky-600';
    case 'level_up':
      return 'bg-indigo-500/10 text-indigo-600';
    case 'system_alert':
      return 'bg-red-500/10 text-red-600';
    default:
      return 'bg-[#edf1f7] text-[#5a6578]';
  }
};

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const Icon = iconMap[notification.type] || Bell;
  const badge = badgeForType(notification.type);

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.type === 'streak_reminder' || notification.type === 'daily_checkin') {
      window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Modules' } }));
      return;
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const timeAgo = formatDistanceToNow(notification.createdAt, { addSuffix: true });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={`group text-left p-4 border-b border-[#dde3eb] cursor-pointer transition-colors hover:bg-[#edf1f7]/50 ${
        notification.isRead
          ? ''
          : 'bg-sky-50/40'
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${badge}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold text-[#0a1628] line-clamp-1 font-body">{notification.title}</h4>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-sky-600 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-[#5a6578] mb-2 line-clamp-2 font-body">{notification.message}</p>
          <p className="text-xs text-slate-500">{timeAgo}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
          aria-label="Delete notification"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
