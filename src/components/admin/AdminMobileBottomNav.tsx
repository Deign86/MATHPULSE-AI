import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Users,
  School,
  GraduationCap,
  BookOpen,
  Database,
  BarChart3,
  Cpu,
  Shield,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminTab } from '../AdminDashboard';

interface AdminMobileBottomNavProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  profilePhoto?: string;
  profileName?: string;
  profileEmail?: string;
}

type ExpandableMenu = 'management' | 'ai' | 'curriculum' | 'insights' | null;

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [openMenu, setOpenMenu] = useState<ExpandableMenu>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close popup menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && event.target instanceof Node && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTabAndClose = (tab: AdminTab) => {
    onSelectTab(tab);
    setOpenMenu(null);
  };

  const toggleMenu = (menu: ExpandableMenu) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  // Determine active category
  const isOverviewActive = activeTab === 'Overview';
  const isManagementActive = activeTab === 'User Management' || activeTab === 'Class Management';
  const isAIActive = activeTab === 'RAG Manager' || activeTab === 'AI Monitoring';
  const isCurriculumActive = activeTab === 'Subjects' || activeTab === 'Content';
  const isInsightsActive = activeTab === 'Analytics' || activeTab === 'Audit Log';

  return (
    <nav
      ref={navRef}
      aria-label="Admin mobile and tablet navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative">
        {/* Invisible Click-Outside Backdrop */}
        {openMenu !== null && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-transparent"
            onClick={() => setOpenMenu(null)}
          />
        )}

        {/* ─── 1. MANAGEMENT POPUP (User Management + Class Management) ─── */}
        <AnimatePresence>
          {openMenu === 'management' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+14px)] left-[10%] z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-purple-200/80 dark:border-purple-800/80 shadow-[0_16px_40px_rgba(153,86,222,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-56"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#9956DE] dark:text-purple-400 font-display">
                People & Rosters
              </div>

              {/* User Management */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('User Management')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'User Management'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'User Management' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/50 text-[#9956DE]'}`}>
                    <Users size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Users</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'User Management' ? 'text-white/80' : 'text-slate-400'}`}>Accounts & Roles</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Class Management */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Class Management')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Class Management'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Class Management' ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-900/50 text-sky-600'}`}>
                    <School size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Classes</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Class Management' ? 'text-white/80' : 'text-slate-400'}`}>Sections & Faculty</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200/80 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 2. AI BRAIN POPUP (RAG Manager + AI Monitoring) ─── */}
        <AnimatePresence>
          {openMenu === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-purple-200/80 dark:border-purple-800/80 shadow-[0_16px_40px_rgba(153,86,222,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-60"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#9956DE] dark:text-purple-400 font-display">
                AI Intelligence & Pipeline
              </div>

              {/* RAG Manager */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('RAG Manager')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'RAG Manager'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'RAG Manager' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'}`}>
                    <Database size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">RAG Manager</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'RAG Manager' ? 'text-white/80' : 'text-slate-400'}`}>Vector Store & Health</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* AI Monitoring */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('AI Monitoring')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'AI Monitoring'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'AI Monitoring' ? 'bg-white/20 text-white' : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600'}`}>
                    <Cpu size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">AI Monitoring</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'AI Monitoring' ? 'text-white/80' : 'text-slate-400'}`}>Model Health & Tokens</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200/80 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 3. CURRICULUM POPUP (Subjects + Content) ─── */}
        <AnimatePresence>
          {openMenu === 'curriculum' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+14px)] right-[24%] z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-purple-200/80 dark:border-purple-800/80 shadow-[0_16px_40px_rgba(153,86,222,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-56"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#9956DE] dark:text-purple-400 font-display">
                Curriculum & Content
              </div>

              {/* Subjects */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Subjects')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Subjects'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Subjects' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/50 text-[#9956DE]'}`}>
                    <GraduationCap size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Subjects</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Subjects' ? 'text-white/80' : 'text-slate-400'}`}>Senior High Strands</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Content PDFs */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Content')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Content'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Content' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'}`}>
                    <BookOpen size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Content PDFs</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Content' ? 'text-white/80' : 'text-slate-400'}`}>Upload Modules</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200/80 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 4. INSIGHTS POPUP (Analytics + Audit Log) ─── */}
        <AnimatePresence>
          {openMenu === 'insights' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+14px)] right-[6%] z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-purple-200/80 dark:border-purple-800/80 shadow-[0_16px_40px_rgba(153,86,222,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-56"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#9956DE] dark:text-purple-400 font-display">
                Analytics & Logs
              </div>

              {/* Analytics */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Analytics')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Analytics'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Analytics' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/50 text-[#9956DE]'}`}>
                    <BarChart3 size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Analytics</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Analytics' ? 'text-white/80' : 'text-slate-400'}`}>Performance Trends</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Audit Log */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Audit Log')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Audit Log'
                    ? 'bg-gradient-to-r from-[#9956DE] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50/80 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Audit Log' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'}`}>
                    <Shield size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Audit Log</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Audit Log' ? 'text-white/80' : 'text-slate-400'}`}>Security Events</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200/80 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 5 Main Navigation Triggers ─── */}
        <div className="flex items-center justify-around max-w-lg mx-auto relative z-30">
          {/* 1. OVERVIEW */}
          <button
            type="button"
            onClick={() => handleSelectTabAndClose('Overview')}
            aria-label="Dashboard Overview"
            aria-current={isOverviewActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              isOverviewActive
                ? 'text-[#9956DE] dark:text-purple-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Home size={20} className={isOverviewActive ? 'stroke-[2.5] text-[#9956DE] dark:text-purple-400' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Overview</span>
            {isOverviewActive && <span className="w-1 h-1 rounded-full bg-[#9956DE] mt-1" />}
          </button>

          {/* 2. MANAGEMENT */}
          <button
            type="button"
            onClick={() => toggleMenu('management')}
            aria-label="Management Menu"
            aria-expanded={openMenu === 'management'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative cursor-pointer ${
              isManagementActive || openMenu === 'management'
                ? 'text-[#9956DE] dark:text-purple-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={20} className={isManagementActive ? 'stroke-[2.5] text-[#9956DE] dark:text-purple-400' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Manage</span>
            {isManagementActive && <span className="w-1 h-1 rounded-full bg-[#9956DE] mt-1" />}
          </button>

          {/* 3. AI BRAIN (Elevated Center Action) */}
          <div className="flex-1 flex justify-center -mt-3.5">
            <button
              type="button"
              onClick={() => toggleMenu('ai')}
              aria-label="AI and RAG Pipeline"
              aria-expanded={openMenu === 'ai'}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer ${
                isAIActive || openMenu === 'ai'
                  ? 'bg-gradient-to-tr from-[#9956DE] to-[#7274ED] text-white shadow-purple-500/30 scale-105 ring-2 ring-purple-300 dark:ring-purple-700'
                  : 'bg-white dark:bg-slate-800 text-[#9956DE] dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 shadow-slate-200/50 dark:shadow-none'
              }`}
            >
              <div className="relative">
                <Cpu size={21} className="stroke-[2.2]" aria-hidden="true" />
                <Sparkles size={11} className="absolute -top-1 -right-1 text-amber-400 animate-pulse fill-amber-400" />
              </div>
              <span className="text-[9px] font-black tracking-tight leading-none mt-0.5">AI</span>
            </button>
          </div>

          {/* 4. CURRICULUM */}
          <button
            type="button"
            onClick={() => toggleMenu('curriculum')}
            aria-label="Curriculum Menu"
            aria-expanded={openMenu === 'curriculum'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative cursor-pointer ${
              isCurriculumActive || openMenu === 'curriculum'
                ? 'text-[#9956DE] dark:text-purple-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={20} className={isCurriculumActive ? 'stroke-[2.5] text-[#9956DE] dark:text-purple-400' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Curriculum</span>
            {isCurriculumActive && <span className="w-1 h-1 rounded-full bg-[#9956DE] mt-1" />}
          </button>

          {/* 5. INSIGHTS */}
          <button
            type="button"
            onClick={() => toggleMenu('insights')}
            aria-label="Insights Menu"
            aria-expanded={openMenu === 'insights'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative cursor-pointer ${
              isInsightsActive || openMenu === 'insights'
                ? 'text-[#9956DE] dark:text-purple-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 size={20} className={isInsightsActive ? 'stroke-[2.5] text-[#9956DE] dark:text-purple-400' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Insights</span>
            {isInsightsActive && <span className="w-1 h-1 rounded-full bg-[#9956DE] mt-1" />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminMobileBottomNav;
