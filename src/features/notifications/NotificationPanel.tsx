/**
 * @file NotificationPanel.tsx
 * Dropdown panel listing notifications.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, triggerRef }) => {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  const INITIAL_VISIBLE_COUNT = 3;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // SAFETY: pointer events outside the panel always carry a DOM event target Node.
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef?.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const visibleNotifications = showAll ? notifications : notifications.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMoreNotifications = notifications.length > INITIAL_VISIBLE_COUNT;

  const panel = (
    <div
      ref={panelRef}
      data-testid="notification-panel"
      className="fixed right-2 sm:right-6 top-14 sm:top-18 w-[calc(100vw-1.25rem)] max-w-[340px] sm:w-[380px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-purple-200/80 dark:border-purple-800/60 max-h-[22rem] sm:max-h-[26rem] overflow-hidden z-50 flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-2.5 sm:py-3 border-b border-purple-200/40 dark:border-purple-900/30 flex items-center justify-between bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#1FA7E1] text-white shrink-0">
        <div>
          <h3 className="font-display font-black text-white text-xs sm:text-sm tracking-tight">Notifications</h3>
          <p className="text-[10px] sm:text-[11px] text-white/85 tabular-nums font-medium">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] sm:text-xs text-white font-bold transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded-lg px-2 py-1 bg-white/15 hover:bg-white/25 active:scale-95 cursor-pointer"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck size={13} aria-hidden="true" />
            <span>Mark read</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 overscroll-contain">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-12" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-400 mx-auto flex items-center justify-center">
              <Bell size={20} />
            </div>
            <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold font-display">You're all caught up!</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">No pending alerts right now.</p>
          </div>
        ) : (
          visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))
        )}
      </div>

      {/* Footer: View All / Show Less Toggle if more than 3 */}
      {hasMoreNotifications && !isLoading && (
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {showAll ? (
              <>
                <span>Show less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>View all ({notifications.length}) notifications</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
};
