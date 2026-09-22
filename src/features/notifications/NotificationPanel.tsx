/**
 * @file NotificationPanel.tsx
 * Dropdown panel listing notifications.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, ChevronDown, X } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationItem } from './NotificationItem';
import { NOTIFICATION_PAGE_SIZE, paginateNotifications } from './types';

interface NotificationPanelProps {
  onClose: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
  panelRef: externalPanelRef,
  triggerRef,
}) => {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const localPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? localPanelRef;
  const [visibleCount, setVisibleCount] = useState(NOTIFICATION_PAGE_SIZE);
  const visibleNotifications = paginateNotifications(notifications, visibleCount);
  const hasMore = visibleCount < notifications.length;

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
  }, [onClose, triggerRef, panelRef]);

  const panel = (
    <>
      {/* Mobile Backdrop to click outside easily on small screens */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs sm:hidden z-[240]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        data-testid="notification-panel"
        className="fixed right-4 sm:right-6 top-16 sm:top-20 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-100/80 dark:border-purple-900/40 max-h-[85vh] sm:max-h-[32rem] overflow-hidden z-[250] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-purple-200/40 dark:border-purple-900/30 flex items-center justify-between bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#1FA7E1] text-white shrink-0">
          <div>
            <h3 className="font-display font-black text-white text-sm tracking-tight">Notifications</h3>
            <p className="text-xs text-white/85 mt-0.5 tabular-nums">
              {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-white/90 hover:text-white font-bold transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded-lg px-2 py-1 bg-white/15 hover:bg-white/25"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={14} aria-hidden="true" />
                <span>Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded-lg p-1"
              title="Close notifications"
              aria-label="Close notifications panel"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-14" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-400 mx-auto flex items-center justify-center">
                <Bell size={24} />
              </div>
              <p className="text-slate-800 dark:text-slate-200 text-sm font-bold font-display">You're all caught up!</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">No pending notifications at this moment.</p>
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

        {/* Pagination footer: header count stays global, the list pages 20 at a time */}
        {!isLoading && hasMore && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-center text-[11px] font-bold text-slate-400 tabular-nums mb-2">
              Showing {visibleNotifications.length} of {notifications.length}
            </p>
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + NOTIFICATION_PAGE_SIZE)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-950/70 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none cursor-pointer"
              aria-label={`Show more notifications, ${notifications.length - visibleNotifications.length} remaining`}
            >
              <ChevronDown size={14} aria-hidden="true" />
              <span>Show more ({notifications.length - visibleNotifications.length} remaining)</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(panel, document.body);
};
