/**
 * @file NotificationBell.tsx
 * Bell icon with unread badge and panel toggle.
 */
import React, { useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationPanel } from './NotificationPanel';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer group active:scale-95 border ${
          isOpen
            ? 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/40 text-amber-500 dark:text-amber-400 shadow-md shadow-amber-500/25'
            : 'bg-white/70 dark:bg-slate-900/60 border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-white/95 dark:hover:bg-slate-800/80 hover:border-amber-300/80 dark:hover:border-amber-500/50 hover:shadow-[0_6px_20px_rgba(245,158,11,0.22)] text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400'
        } focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notifications"
      >
        <Bell
          size={18}
          className={`transition-transform duration-200 stroke-[2.2] group-hover:rotate-12 ${
            isOpen ? 'rotate-12 text-amber-500 dark:text-amber-400' : ''
          }`}
          aria-hidden="true"
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 tabular-nums border-2 border-white dark:border-slate-900 shadow-sm shadow-rose-500/30 animate-pulse">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          panelRef={panelRef}
          triggerRef={containerRef}
        />
      )}
    </div>
  );
};

