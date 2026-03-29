import React from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, GraduationCap, Settings, Users, BarChart3, Shield, Trophy, Shirt } from 'lucide-react';
import { motion } from 'motion/react';
import LogoutActionButton from './LogoutActionButton';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

interface NavSection {
  label?: string;
  items: { icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string; displayLabel?: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole = 'student', onOpenSettings, onLogout }) => {
  // Grouped nav items for each role
  const getNavSections = (): NavSection[] => {
    if (userRole === 'admin') {
      return [
        {
          label: 'Management',
          items: [
            { icon: LayoutDashboard, label: 'Overview' },
            { icon: Users, label: 'User Management' },
            { icon: BookOpen, label: 'Content' },
          ],
        },
        {
          label: 'Insights',
          items: [
            { icon: BarChart3, label: 'Analytics' },
            { icon: Shield, label: 'Audit Log' },
          ],
        },
      ];
    } else if (userRole === 'teacher') {
      return [
        {
          label: 'Teaching',
          items: [
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: Users, label: 'My Students' },
            { icon: BookOpen, label: 'Classes' },
          ],
        },
        {
          label: 'Insights',
          items: [
            { icon: BarChart3, label: 'Analytics' },
          ],
        },
      ];
    } else {
      // Student nav — grouped for clarity
      return [
        {
          label: 'Learn',
          items: [
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: BookOpen, label: 'Modules' },
            { icon: MessageSquare, label: 'AI Chat' },
          ],
        },
        {
          label: 'Progress',
          items: [
            { icon: GraduationCap, label: 'Grades', displayLabel: 'Assessment' },
            { icon: Trophy, label: 'Leaderboard', displayLabel: 'Leadership Board' },
          ],
        },
        {
          label: 'Customization',
          items: [
            { icon: Shirt, label: 'Avatar Studio', displayLabel: 'Avatar Studio' },
          ],
        },
      ];
    }
  };

  const sections = getNavSections();

  return (
    <div className="h-full bg-white rounded-2xl p-5 flex flex-col justify-between border border-slate-200/80 card-elevated-lg">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-600 to-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
            <span className="text-white font-display font-extrabold text-lg">M</span>
          </div>
          <span className="font-display font-bold text-lg text-[#0a1628] tracking-tight">MathPulse</span>
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && (
                <p className="px-4 mb-2 text-[10px] font-body font-semibold text-slate-400 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.label)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeTab === item.label
                        ? 'bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.15)]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 1.5} />
                    <span className="font-body font-medium text-sm">{item.displayLabel || item.label}</span>
                    {activeTab === item.label && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500"
                        transition={{ type: 'spring', duration: 0.4 }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="space-y-1 border-t border-slate-200 pt-4">
        <button
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 transition-colors"
          onClick={onOpenSettings}
        >
          <Settings size={18} strokeWidth={1.5} />
          <span className="font-body font-medium text-sm">Settings</span>
        </button>

        {onLogout && (
          <LogoutActionButton onClick={onLogout} />
        )}
      </div>
    </div>
  );
};

export default Sidebar;

