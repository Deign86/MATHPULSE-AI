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
    <div className="h-full bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="font-bold text-xl text-slate-800">MathPulse</span>
        </div>

        <nav className="space-y-4">
          {navItems.map((item, index) => (
            <motion.div
              key={item.label}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                activeTab === item.label
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </motion.div>
          ))}
        </nav>
      </div>

      <div className="space-y-2">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          onClick={onOpenSettings}
        >
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </button>

        {onLogout && (
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={onLogout}
          >
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;