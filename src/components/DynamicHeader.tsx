import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { NotificationBell } from '@/features/notifications';

interface DynamicHeaderProps {
  title: string;
  subtitle?: string;
  userRole: 'student' | 'teacher' | 'admin';
  userName: string;
  userAvatar: string;
  onOpenProfile?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const DynamicHeader: React.FC<DynamicHeaderProps> = ({
  title,
  subtitle,
  userRole,
  userName,
  userAvatar,
  onOpenProfile,
  scrollContainerRef
}) => {
  const [scrollY, setScrollY] = useState(0);
  const firstName = userName
    .trim()
    .split(/\s+/)
    .find((part) => /\p{L}/u.test(part)) || userName.trim() || 'User';

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef?.current) {
        setScrollY(scrollContainerRef.current.scrollTop);
      }
    };

    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [scrollContainerRef]);

  // Calculate dynamic styles based on scroll position
  const opacity = Math.max(0.92, 1 - scrollY / 600);
  const blur = Math.min(scrollY / 15, 12);
  const shadow = scrollY > 10 ? '0 4px 24px rgba(26, 22, 37, 0.12)' : '0 1px 3px rgba(26, 22, 37, 0.04)';

  return (
    <motion.header
      style={{ ['--bg' as any]: `rgba(248, 247, 244, ${opacity})`, ['--blur' as any]: `${blur}px`, ['--shadow' as any]: shadow }}
      className="w-full border-b border-[#dde3eb] px-6 py-4 flex items-center justify-between transition-all duration-200 dynamic-header"
    >
      <div>
        <h1 className="text-xl font-display font-bold text-[#0a1628] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#5a6578] mt-0.5 font-body">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        
        <button 
          onClick={onOpenProfile}
          className="flex items-center gap-3 w-[168px] h-11 shrink-0 bg-white/60 hover:bg-white p-1.5 pr-4 rounded-lg cursor-pointer transition-all group border border-[#dde3eb] card-elevated"
        >
          <img 
            src={userAvatar}
            alt={userName}
            className="w-9 h-9 rounded-lg object-cover ring-2 ring-sky-500/10"
          />
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-body font-semibold text-[#0a1628] leading-none group-hover:text-sky-600 transition-colors truncate">
              {firstName}
            </p>
            <p className="text-xs text-[#5a6578] mt-0.5 capitalize font-body truncate">{userRole}</p>
          </div>
        </button>
      </div>
    </motion.header>
  );
};

export default DynamicHeader;