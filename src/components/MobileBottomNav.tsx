import React from 'react';
import { Home, BookOpen, Bot, BarChart3, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

interface NavDestination {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  isCenter?: boolean;
}

const NAV_ITEMS: readonly NavDestination[] = [
  { id: 'Dashboard', label: 'Home', icon: Home },
  { id: 'Modules', label: 'Modules', icon: BookOpen },
  { id: 'AI Chat', label: 'AI Tutor', icon: Bot, isCenter: true },
  { id: 'Grades', label: 'Progress', icon: BarChart3 },
  { id: 'Avatar Studio', label: 'Qbit', icon: Sparkles },
] as const;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative -top-2 flex flex-col items-center justify-center min-w-[56px] min-h-[52px] px-2 rounded-2xl transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none active:scale-[0.94] motion-reduce:transition-none ${
                  isActive
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                <Icon size={22} aria-hidden="true" />
                <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-white' : 'text-purple-800 dark:text-purple-200'}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none active:scale-[0.95] motion-reduce:transition-none ${
                isActive
                  ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'} aria-hidden="true" />
              <span className={`text-[10px] mt-1 leading-none truncate ${isActive ? 'font-bold text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
