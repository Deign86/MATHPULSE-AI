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
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[240]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        data-testid="notification-panel"
        className="fixed right-2.5 sm:right-6 top-14 sm:top-18 w-[calc(100vw-1.25rem)] max-w-sm sm:w-[390px] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-h-[min(82dvh,560px)] overflow-hidden z-[250] flex flex-col animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
      >
        {/* Brand Accent Top Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0" />

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-purple-100/70 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 dark:from-purple-950/40 dark:via-slate-800 dark:to-slate-800/90 shrink-0">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9956DE]/15 dark:bg-[#9956DE]/30 text-[#9956DE] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Bell size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-sm tracking-tight leading-tight">Notifications</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white font-bold transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#9956DE] focus-visible:outline-none rounded-lg px-2.5 py-1 bg-purple-100/70 dark:bg-purple-950/60 hover:bg-purple-200/80 active:scale-95 cursor-pointer shadow-2xs"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={13} aria-hidden="true" />
                <span>Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
              aria-label="Close notification panel"
            >
              <X size={15} />
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
            <div className="p-10 text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] dark:text-purple-300 mx-auto flex items-center justify-center shadow-xs">
                <Bell size={26} />
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-900 dark:text-slate-100 text-sm font-bold font-display">You're all caught up!</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">No pending notifications at this moment.</p>
              </div>
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
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
            <p className="text-center text-[10.5px] font-bold text-slate-400 tabular-nums mb-2">
              Showing {visibleNotifications.length} of {notifications.length}
            </p>
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + NOTIFICATION_PAGE_SIZE)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-950/80 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none cursor-pointer border border-purple-200/60 dark:border-purple-800/50 shadow-2xs active:scale-98"
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

