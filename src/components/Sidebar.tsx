import React, { useEffect, useState } from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, GraduationCap, Settings, Users, BarChart3, Shield, Trophy, Shirt, Swords, ChevronLeft, ChevronRight, X, Cpu } from 'lucide-react';
import { motion } from 'motion/react';
import LogoutActionButton from './LogoutActionButton';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  onOpenSettings?: () => void;
  onLogout?: () => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  mode?: 'desktop' | 'mobile';
  onRequestClose?: () => void;
  forceCollapsed?: boolean;
}

interface NavSection {
  label?: string;
  items: { icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string; displayLabel?: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userRole = 'student', 
  onOpenSettings, 
  onLogout,
  sidebarCollapsed = false,
  setSidebarCollapsed,
  mode = 'desktop',
  onRequestClose,
  forceCollapsed = false,
}) => {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const isMobile = mode === 'mobile';
  const isHoverExpanded = !forceCollapsed && sidebarHovered;
  const canOpenSettings = typeof onOpenSettings === 'function';
  
  // Helper to determine if sidebar should show collapsed state
  const isCollapsed = !isMobile && (forceCollapsed || (sidebarCollapsed && !isHoverExpanded));
  const shouldShowIconOnlyTooltips = isCollapsed;
  const canCollapse = !isMobile && !forceCollapsed;

  useEffect(() => {
    if (forceCollapsed) {
      setSidebarHovered(false);
      setHoveredTooltip(null);
    }
  }, [forceCollapsed]);

  useEffect(() => {
    if (!shouldShowIconOnlyTooltips) {
      setHoveredTooltip(null);
    }
  }, [shouldShowIconOnlyTooltips]);

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
            { icon: Cpu, label: 'AI Monitoring' },
            { icon: Shield, label: 'Audit Log' },
            { icon: Settings, label: 'Settings' },
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
            { icon: Swords, label: 'Quiz Battle', displayLabel: 'Quiz Battle' },
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
    <motion.aside
      initial={false}
      animate={isMobile ? { width: 280 } : { width: isCollapsed ? 80 : 280 }}
      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      onMouseEnter={() => canCollapse && sidebarCollapsed && setSidebarHovered(true)}
      onMouseLeave={() => {
        setSidebarHovered(false);
        setHoveredTooltip(null);
      }}
      className={cn(
        'h-full bg-[#f7f9fc] border border-[#dde3eb] shadow-sm flex flex-col',
        isMobile ? 'rounded-2xl p-4' : 'rounded-3xl p-5'
      )}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo & Toggle */}
        <div className={`mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <img src="/mathpulse_logo.png" alt="MathPulse AI" className="w-12 h-12 object-contain drop-shadow-md flex-shrink-0" />
            {(!isCollapsed || isHoverExpanded) && (
              <div>
                <h2 className="text-base font-bold font-display text-[#0a1628] whitespace-nowrap">MathPulse AI</h2>
              </div>
            )}
          </div>
          {isMobile && onRequestClose && (
            <button
              onClick={onRequestClose}
              className="p-2 hover:bg-[#dde3eb] rounded-lg transition-colors text-[#5a6578]"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
          {!isMobile && !forceCollapsed && setSidebarCollapsed && (!sidebarCollapsed || isHoverExpanded) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-[#dde3eb] rounded-lg transition-colors text-[#5a6578]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </motion.button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {isCollapsed ? (
                <div className="px-4 mb-2 flex items-center gap-2">
                  <div className="flex-1 h-[1px] bg-[#dde3eb]"></div>
                </div>
              ) : (
                section.label && (
                  <p className="px-4 mb-2 text-[10px] font-bold text-[#5a6578] uppercase tracking-widest">
                    {section.label}
                  </p>
                )
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Tooltip
                    key={item.label}
                    open={shouldShowIconOnlyTooltips && hoveredTooltip === item.label}
                  >
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onMouseEnter={() => {
                          if (shouldShowIconOnlyTooltips) {
                            setHoveredTooltip(item.label);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredTooltip((previous) => (previous === item.label ? null : previous));
                        }}
                        onFocus={() => setHoveredTooltip(null)}
                        onClick={() => setActiveTab(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border whitespace-nowrap ${
                          isCollapsed ? 'justify-center' : ''
                        } ${
                          activeTab === item.label
                            ? 'bg-sky-50 border-sky-200 shadow-sm text-sky-700'
                            : 'bg-transparent border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
                        }`}
                      >
                        <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 2} className="flex-shrink-0" />
                        {(!isCollapsed || isHoverExpanded) && (
                          <span className="font-body font-bold text-xs">{item.displayLabel || item.label}</span>
                        )}
                        {activeTab === item.label && (!isCollapsed || isHoverExpanded) && (
                          <motion.div
                            layoutId="sidebar-active-indicator"
                            className="ml-auto w-2 h-2 rounded-full bg-sky-500"
                            transition={{ type: 'spring', duration: 0.4 }}
                          />
                        )}
                      </motion.button>
                    </TooltipTrigger>
                    {shouldShowIconOnlyTooltips && (
                      <TooltipContent side="right" sideOffset={16} className="font-bold text-xs">
                        {item.displayLabel || item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-4 space-y-2 border-t border-[#dde3eb] pt-4">
        {userRole !== 'admin' ? (
          <Tooltip open={shouldShowIconOnlyTooltips && hoveredTooltip === 'Settings'}>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => {
                  if (shouldShowIconOnlyTooltips) {
                    setHoveredTooltip('Settings');
                  }
                }}
                onMouseLeave={() => {
                  setHoveredTooltip((previous) => (previous === 'Settings' ? null : previous));
                }}
                onFocus={() => setHoveredTooltip(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold border transition-all duration-200 whitespace-nowrap ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  activeTab === 'Settings'
                    ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm'
                    : canOpenSettings
                    ? 'border-transparent text-[#5a6578] hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628]'
                    : 'border-transparent text-[#a0aec0] cursor-not-allowed opacity-60'
                }`}
                onClick={canOpenSettings ? onOpenSettings : undefined}
                disabled={!canOpenSettings}
                aria-disabled={!canOpenSettings}
                aria-label="Open settings"
              >
                <Settings size={18} strokeWidth={2} className="flex-shrink-0" />
                {(!isCollapsed || isHoverExpanded) && <span className="font-body text-xs">Settings</span>}
              </motion.button>
            </TooltipTrigger>
            {shouldShowIconOnlyTooltips && (
              <TooltipContent side="right" sideOffset={16} className="font-bold text-xs">
                Settings
              </TooltipContent>
            )}
          </Tooltip>
        ) : null}

        {onLogout && (
          <div className="text-[#5a6578]">
            <LogoutActionButton onClick={onLogout} collapsed={isCollapsed} />
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;

