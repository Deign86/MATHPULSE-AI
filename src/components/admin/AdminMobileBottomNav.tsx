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
  User,
  Settings,
  LogOut,
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

type ExpandableMenu = 'management' | 'academic' | 'insights' | 'account' | null;

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  profilePhoto,
  profileName,
  profileEmail,
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

  // Determine which parent category is active based on activeTab
  const isOverviewActive = activeTab === 'Overview';
  const isManagementActive = activeTab === 'User Management' || activeTab === 'Class Management';
  const isAcademicActive = activeTab === 'Subjects' || activeTab === 'Content' || activeTab === 'RAG Manager';
  const isInsightsActive = activeTab === 'Analytics' || activeTab === 'AI Monitoring' || activeTab === 'Audit Log';
  const isAccountActive = activeTab === 'Profile' || activeTab === 'Settings';

  return (
    <nav
      ref={navRef}
      aria-label="Admin mobile and tablet navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative">
        {/* Backdrop for open popup */}
        {openMenu !== null && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/15 backdrop-blur-[0.5px]"
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
              className="absolute bottom-[calc(100%+12px)] left-[12%] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-56"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-display">
                People & Rosters
              </div>

              {/* User Management */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('User Management')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'User Management'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'User Management' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
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
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Class Management'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Class Management' ? 'bg-white/20' : 'bg-sky-100 dark:bg-sky-900/50 text-sky-600'}`}>
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
              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 2. ACADEMIC & AI POPUP (Subjects + Content + RAG Manager) ─── */}
        <AnimatePresence>
          {openMenu === 'academic' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-60"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-display">
                Curriculum & Intelligence
              </div>

              {/* Subjects / Curriculum Control */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Subjects')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Subjects'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Subjects' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
                    <GraduationCap size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Curriculum</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Subjects' ? 'text-white/80' : 'text-slate-400'}`}>Subjects & Availability</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Content / PDF Uploads */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Content')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Content'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Content' ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'}`}>
                    <BookOpen size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Content PDFs</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Content' ? 'text-white/80' : 'text-slate-400'}`}>Upload Curriculum</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* RAG Manager */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('RAG Manager')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'RAG Manager'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'RAG Manager' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'}`}>
                    <Database size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">RAG Manager</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'RAG Manager' ? 'text-white/80' : 'text-slate-400'}`}>Vector Store & Pipeline</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 3. INSIGHTS POPUP (Analytics + AI Monitoring + Audit Log) ─── */}
        <AnimatePresence>
          {openMenu === 'insights' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] right-[12%] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-60"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-display">
                Telemetry & Security
              </div>

              {/* Analytics */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Analytics')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Analytics'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Analytics' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
                    <BarChart3 size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">Analytics</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'Analytics' ? 'text-white/80' : 'text-slate-400'}`}>Performance Trends</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* AI Monitoring */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('AI Monitoring')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'AI Monitoring'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'AI Monitoring' ? 'bg-white/20' : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600'}`}>
                    <Cpu size={15} aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="leading-tight">AI Monitoring</p>
                    <p className={`text-[10px] font-normal leading-none mt-0.5 ${activeTab === 'AI Monitoring' ? 'text-white/80' : 'text-slate-400'}`}>Model Health & Tokens</p>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Audit Log */}
              <button
                type="button"
                onClick={() => handleSelectTabAndClose('Audit Log')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Audit Log'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Audit Log' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'}`}>
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
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 4. ACCOUNT POPUP (Profile + Settings + Sign Out) ─── */}
        <AnimatePresence>
          {openMenu === 'account' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-[calc(100%+12px)] right-2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800/80 shadow-[0_12px_36px_rgba(124,58,237,0.18)] rounded-2xl p-1.5 flex flex-col gap-1 w-56"
            >
              {/* Profile Header Chip */}
              <div className="px-3 py-2 flex items-center gap-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={profileName || 'Administrator'}
                    className="w-8 h-8 rounded-full object-cover border border-purple-300 dark:border-purple-700 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-display font-black text-slate-800 dark:text-white truncate">
                    {profileName?.replace(/System Administrator/gi, 'Administrator') || 'Administrator'}
                  </p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate mt-0.5">
                    {profileEmail || 'Executive Portal'}
                  </p>
                </div>
              </div>

              {/* My Profile */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  if (onOpenProfile) {
                    onOpenProfile();
                  } else {
                    handleSelectTabAndClose('Profile');
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Profile'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Profile' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'}`}>
                    <User size={15} aria-hidden="true" />
                  </div>
                  <span>My Profile</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  if (onOpenSettings) {
                    onOpenSettings();
                  } else {
                    handleSelectTabAndClose('Settings');
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  activeTab === 'Settings'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'Settings' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Settings size={15} aria-hidden="true" />
                  </div>
                  <span>Settings</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onLogout?.();
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-display font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <LogOut size={15} aria-hidden="true" />
                  </div>
                  <span>Sign Out</span>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-purple-200 dark:border-purple-800/80 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 5 Main Mobile Bottom Bar Navigation Triggers ─── */}
        <div className="flex items-center justify-around max-w-lg mx-auto relative z-30">
          {/* 1. OVERVIEW */}
          <button
            type="button"
            onClick={() => handleSelectTabAndClose('Overview')}
            aria-label="Dashboard Overview"
            aria-current={isOverviewActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
              isOverviewActive
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Home size={20} className={isOverviewActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Overview</span>
          </button>

          {/* 2. MANAGEMENT */}
          <button
            type="button"
            onClick={() => toggleMenu('management')}
            aria-label="Management Menu"
            aria-expanded={openMenu === 'management'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative ${
              isManagementActive || openMenu === 'management'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={20} className={isManagementActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Manage</span>
            {isManagementActive && <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-purple-600" />}
          </button>

          {/* 3. ACADEMIC & AI (Elevated Center Button) */}
          <div className="flex-1 flex justify-center -mt-3.5">
            <button
              type="button"
              onClick={() => toggleMenu('academic')}
              aria-label="Curriculum and AI Tools"
              aria-expanded={openMenu === 'academic'}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all active:scale-95 ${
                isAcademicActive || openMenu === 'academic'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/30 scale-105 ring-2 ring-purple-300 dark:ring-purple-700'
                  : 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 shadow-slate-200/50'
              }`}
            >
              <div className="relative">
                <BookOpen size={21} className="stroke-[2.2]" aria-hidden="true" />
                <Sparkles size={11} className="absolute -top-1 -right-1 text-amber-400 animate-pulse fill-amber-400" />
              </div>
              <span className="text-[9px] font-black tracking-tight leading-none mt-0.5">AI/Docs</span>
            </button>
          </div>

          {/* 4. INSIGHTS */}
          <button
            type="button"
            onClick={() => toggleMenu('insights')}
            aria-label="Insights & Telemetry Menu"
            aria-expanded={openMenu === 'insights'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative ${
              isInsightsActive || openMenu === 'insights'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 size={20} className={isInsightsActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Insights</span>
            {isInsightsActive && <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-purple-600" />}
          </button>

          {/* 5. PROFILE / ACCOUNT */}
          <button
            type="button"
            onClick={() => toggleMenu('account')}
            aria-label="Admin Profile and Account Menu"
            aria-expanded={openMenu === 'account'}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 relative ${
              isAccountActive || openMenu === 'account'
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User size={20} className={isAccountActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} aria-hidden="true" />
            <span className="text-[10px] mt-1 leading-none truncate font-display">Account</span>
            {isAccountActive && <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-purple-600" />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminMobileBottomNav;
