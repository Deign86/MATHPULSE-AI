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
        className="relative p-3 bg-[#edf1f7] rounded-xl text-[#5a6578] hover:bg-[#dde3eb] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
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
