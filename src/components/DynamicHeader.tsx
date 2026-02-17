import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import SearchBar from './SearchBar';
import NotificationCenter from './NotificationCenter';

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

  // Calculate opacity based on scroll position
  // At 0px scroll: opacity 1 (fully opaque)
  // At 100px scroll: opacity 0.95 (slightly transparent)
  const opacity = Math.max(0.92, 1 - scrollY / 600);
  const blur = Math.min(scrollY / 15, 12);
  const shadow = scrollY > 10 ? '0 4px 24px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.05)';

  return (
    <motion.header
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
        backdropFilter: `blur(${blur}px)`,
        boxShadow: shadow,
      }}
      className="w-full border-b border-slate-200 px-6 py-4 flex items-center justify-between transition-all duration-200"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <SearchBar
          onSelect={(result) => {
            console.log('Selected:', result);
          }}
        />
        <NotificationCenter userRole={userRole} />
        
        <button 
          onClick={onOpenProfile}
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 p-1.5 pr-4 rounded-xl cursor-pointer transition-all group"
        >
          <img 
            src={userAvatar}
            alt={userName}
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">
              {userName}
            </p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{userRole}</p>
          </div>
        </button>
      </div>
    </motion.header>
  );
};

export default DynamicHeader;