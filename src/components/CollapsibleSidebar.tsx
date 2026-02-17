import React from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, GraduationCap, Settings, Users, BarChart3, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollapsibleSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userRole = 'student',
  isCollapsed,
  setIsCollapsed
}) => {
  // Different nav items for different user roles
  const getNavItems = () => {
    if (userRole === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard' },
        { icon: Users, label: 'Users' },
        { icon: BarChart3, label: 'Analytics' },
        { icon: Shield, label: 'Security' },
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
        { icon: MessageSquare, label: 'AI Chat' },
        { icon: GraduationCap, label: 'Grades' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <motion.div 
      animate={{ width: isCollapsed ? '80px' : '240px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col justify-between overflow-hidden relative"
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-10 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-6">
        {/* Logo */}
        <div className={`flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-xl text-slate-800 whitespace-nowrap overflow-hidden"
              >
                MathPulse
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 relative group ${
                activeTab === item.label
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-slate-800"></div>
                </div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings */}
      <div className="p-6 space-y-2">
        <button 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors relative group ${
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
            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
              Settings
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-slate-800"></div>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default CollapsibleSidebar;