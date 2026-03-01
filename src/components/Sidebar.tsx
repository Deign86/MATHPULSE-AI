import React from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, GraduationCap, Settings, LogOut, Users, BarChart3, Shield, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole = 'student', onOpenSettings, onLogout }) => {
  // Different nav items for different user roles
  const getNavItems = () => {
    if (userRole === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Overview' },
        { icon: Users, label: 'User Management' },
        { icon: BarChart3, label: 'Analytics' },
        { icon: BookOpen, label: 'Content' },
        { icon: Settings, label: 'Settings' },
        { icon: Shield, label: 'Audit Log' },
      ];
    } else if (userRole === 'teacher') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard' },
        { icon: Users, label: 'My Students' },
        { icon: BookOpen, label: 'Classes' },
        { icon: BarChart3, label: 'Analytics' },
      ];
    } else {
      // Student nav items
      return [
        { icon: LayoutDashboard, label: 'Dashboard' },
        { icon: BookOpen, label: 'Modules' },
        { icon: Trophy, label: 'Leaderboard' },
        { icon: MessageSquare, label: 'AI Chat' },
        { icon: GraduationCap, label: 'Grades' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="h-full bg-[#1a1625] rounded-2xl p-5 flex flex-col justify-between border border-white/[0.04] card-elevated-lg">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-white font-display font-extrabold text-lg">M</span>
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">MathPulse</span>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeTab === item.label
                  ? 'bg-violet-600/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 1.5} />
              <span className="font-body font-medium text-sm">{item.label}</span>
              {activeTab === item.label && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
            </motion.div>
          ))}
        </nav>
      </div>

      <div className="space-y-1 border-t border-white/[0.06] pt-4">
        <button
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-violet-300 transition-colors"
          onClick={onOpenSettings}
        >
          <Settings size={18} strokeWidth={1.5} />
          <span className="font-body font-medium text-sm">Settings</span>
        </button>

        {onLogout && (
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            onClick={onLogout}
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span className="font-body font-medium text-sm">Log Out</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;