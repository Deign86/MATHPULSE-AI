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
    <div className="h-full bg-[#f7f9fc] rounded-3xl p-5 flex flex-col justify-between border border-[#dde3eb] shadow-sm">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-12 h-12 bg-gradient-to-r from-sky-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-md">
            <img src="/avatar/avatar_icon.png" alt="MathPulse AI" className="w-10 h-10 object-contain drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-[#0a1628]">MathPulse AI</h2>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && (
                <p className="px-4 mb-2 text-[10px] font-bold text-[#5a6578] uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.label)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      activeTab === item.label
                        ? 'bg-sky-50 border-sky-200 shadow-sm text-sky-700'
                        : 'bg-transparent border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
                    }`}
                  >
                    <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 2} />
                    <span className="font-body font-bold text-xs">{item.displayLabel || item.label}</span>
                    {activeTab === item.label && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="ml-auto w-2 h-2 rounded-full bg-sky-500"
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

      <div className="space-y-2 border-t border-[#dde3eb] pt-4">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#5a6578] font-bold border border-transparent hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628] transition-all duration-200"
          onClick={onOpenSettings}
        >
          <Settings size={18} strokeWidth={2} />
          <span className="font-body text-xs">Settings</span>
        </button>

        {onLogout && (
          <div className="px-1 text-[#5a6578]">
            <LogoutActionButton onClick={onLogout} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

