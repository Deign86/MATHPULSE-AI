import React from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, GraduationCap, Settings, Users, BarChart3, Shield, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollapsibleSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavSection {
  label?: string;
  items: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }[];
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userRole = 'student',
  isCollapsed,
  setIsCollapsed
}) => {
  const getNavSections = (): NavSection[] => {
    if (userRole === 'admin') {
      return [
        { label: 'Management', items: [
          { icon: LayoutDashboard, label: 'Dashboard' },
          { icon: Users, label: 'Users' },
        ]},
        { label: 'Insights', items: [
          { icon: BarChart3, label: 'Analytics' },
          { icon: Shield, label: 'Security' },
        ]},
      ];
    } else if (userRole === 'teacher') {
      return [
        { label: 'Teaching', items: [
          { icon: LayoutDashboard, label: 'Dashboard' },
          { icon: Users, label: 'My Students' },
          { icon: BookOpen, label: 'Classes' },
        ]},
        { label: 'Insights', items: [
          { icon: BarChart3, label: 'Analytics' },
        ]},
      ];
    } else {
      return [
        { label: 'Learn', items: [
          { icon: LayoutDashboard, label: 'Dashboard' },
          { icon: BookOpen, label: 'Modules' },
          { icon: MessageSquare, label: 'AI Chat' },
        ]},
        { label: 'Progress', items: [
          { icon: GraduationCap, label: 'Grades' },
          { icon: Trophy, label: 'Leaderboard' },
        ]},
      ];
    }
  };

  const sections = getNavSections();

  return (
    <motion.div 
      animate={{ width: isCollapsed ? '80px' : '240px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full bg-white rounded-2xl border border-slate-200/80 flex flex-col justify-between overflow-hidden relative"
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-10 w-6 h-6 bg-sky-600 hover:bg-sky-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-6">
        {/* Logo */}
        <div className={`flex items-center gap-3 mb-8 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-display font-bold text-xl text-[#0a1628] whitespace-nowrap overflow-hidden"
              >
                MathPulse AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && !isCollapsed && (
                <p className="px-4 mb-2 text-[10px] font-body font-semibold text-slate-400 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              {section.label && isCollapsed && sIdx > 0 && (
                <div className="mx-4 mb-2 border-t border-slate-200" />
              )}
              <div className="space-y-1">
                {section.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(item.label)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative group ${
                      activeTab === item.label
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-sky-700'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-medium text-sm whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-1.5 bg-[#0a1628] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-[#0a1628]"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Settings */}
      <div className="p-6 space-y-2">
        <button 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-sky-700 transition-colors relative group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Settings' : ''}
        >
          <Settings size={20} className="flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-medium whitespace-nowrap overflow-hidden"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-100 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
              Settings
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-[#2a2535]"></div>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default CollapsibleSidebar;