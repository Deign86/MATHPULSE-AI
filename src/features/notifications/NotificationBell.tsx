/**
 * @file NotificationBell.tsx
 * Bell icon with unread badge and panel toggle.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationPanel } from './NotificationPanel';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // SAFETY: pointer events outside the bell always carry a DOM event target Node.
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-white/90 hover:shadow-[0_6px_20px_rgba(245,158,11,0.18)] hover:border-amber-200/80 text-slate-700 hover:text-amber-500 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer group active:scale-95"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={19} className="transition-transform group-hover:rotate-12 stroke-[2.2]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 tabular-nums border-2 border-white shadow-sm animate-pulse">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};
