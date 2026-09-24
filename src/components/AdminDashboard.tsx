import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GraduationCap,
  BookOpen,
  AlertCircle,
  BarChart3,
  Target,
  Award,
  Shield,
  Loader2,
  BookMarked,
  Menu,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut as LogOutIcon,
  Zap,
  Activity,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Bell,
  HelpCircle,
  Medal,
  ArrowUpRight,
  Download,
  School,
  Clock,
  ChevronRight,
  Plus,
  FileUp,
  Filter,
} from 'lucide-react';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import UserAvatar from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import AdminPdfUpload from './admin/AdminPdfUpload';
import AdminAuditLog from './AdminAuditLog';
import AdminRagManager from './AdminRagManager';
import AdminUserManagement from './AdminUserManagement';
import AdminAnalytics from './AdminAnalytics';
import AIMonitoringPage from '../pages/admin/AIMonitoringPage';
import AdminSubjects from './admin/AdminSubjects';
import AdminClassManagement from './admin/AdminClassManagement';
import SubjectsHelpModal from './admin/SubjectsHelpModal';
import MasteryHeatmap from './MasteryHeatmap';
import AdminPriorityModules from './AdminPriorityModules';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/features/notifications';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie 
} from 'recharts';
import {
  getDashboardStats,
  getAuditLogs,
  getTopPerformers,
  getWeeklyActivity,
  getSubjectBreakdown,
  getPriorityAttention,
  getGlobalMastery,
  getDifficultyDistribution,
  type DashboardStats,
  type AuditLogEntry,
  type TopPerformer,
  type WeeklyActivityData,
  type SubjectBreakdownItem,
  type PriorityAttentionData,
  type GlobalMasteryData,
  type DifficultyDistribution,
} from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import type { ProfileData } from './SettingsPage';
import type { UserSettings } from '../types/models';
import AdminProfilePage from './admin/AdminProfilePage';
import AdminSettingsPage from './admin/AdminSettingsPage';

interface AdminDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  profileData?: ProfileData;
  onSaveProfile?: (data: ProfileData) => Promise<void> | void;
  userSettings?: UserSettings;
  onSaveSettings?: (settings: Partial<UserSettings>) => Promise<void>;
  onApplySettingsPreview?: (settings: UserSettings) => void;
  onExportData?: () => Promise<void>;
  onClearCache?: () => Promise<void>;
}

/** Everything the Overview tab renders, captured in one request. */
interface AdminOverviewSnapshot {
  dashStats: DashboardStats | null;
  recentActivity: AuditLogEntry[];
  topPerformers: TopPerformer[];
  weeklyActivity: WeeklyActivityData[];
  subjectBreakdown: SubjectBreakdownItem[];
  priorityAttention: PriorityAttentionData | null;
  globalMastery: GlobalMasteryData | null;
  difficultyDist: DifficultyDistribution | null;
}

/**
 * Atomic Overview request lifecycle. The `error` variant carries the last good
 * snapshot so a failed refresh keeps the previous cards instead of blanking
 * them, while still exposing a typed error.
 */
type AdminOverviewState =
  | { status: 'loading' }
  | { status: 'ready'; data: AdminOverviewSnapshot }
  | { status: 'error'; message: string; lastData: AdminOverviewSnapshot | null };

/**
 * Closed set of admin tabs. These literals are also the sidebar labels, which
 * arrive as plain strings, so they are decoded at the boundary in
 * `handleTabChange` instead of being trusted.
 */
const ADMIN_TABS = [
  'Overview',
  'User Management',
  'Class Management',
  'Subjects',
  'Content',
  'RAG Manager',
  'Analytics',
  'AI Monitoring',
  'Audit Log',
  'Profile',
  'Settings',
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

function isAdminTab(value: string): value is AdminTab {
  // SAFETY: ADMIN_TABS is a readonly tuple of literal strings; widening to readonly string[] permits includes check.
  return (ADMIN_TABS as readonly string[]).includes(value);
}

/**
 * Page heading per tab. A `Record` over the union rather than a comparison
 * chain, so a tab without copy is a compile error instead of a blank header.
 */
const ADMIN_TAB_META: Record<AdminTab, { title: string; subtitle: string }> = {
  Overview: { title: 'Admin Dashboard', subtitle: 'System Overview & Management' },
  'User Management': { title: 'User Management', subtitle: 'Manage all user accounts and roles.' },
  'Class Management': {
    title: 'Class Management',
    subtitle: 'Assign section managers and manage class rosters.',
  },
  Subjects: {
    title: 'Curriculum Control',
    subtitle: 'Manage academic subjects, availability, and RAG knowledge sources.',
  },
  Content: { title: 'Content', subtitle: 'Upload PDFs for AI-powered content.' },
  'RAG Manager': {
    title: 'RAG Manager',
    subtitle: 'Inspect, re-ingest, and verify curriculum knowledge sources.',
  },
  Analytics: { title: 'Analytics', subtitle: 'Detailed system performance metrics.' },
  'AI Monitoring': { title: 'AI Monitoring', subtitle: 'Platform AI usage and system health.' },
  'Audit Log': { title: 'Audit Log', subtitle: 'Monitor system activity and security.' },
  Profile: {
    title: 'Executive Profile',
    subtitle: 'Manage administrative credentials, verified pass, and contact information.',
  },
  Settings: {
    title: 'Admin Settings',
    subtitle: 'System preferences, security safeguards, and data governance.',
  },
};

// Stable identities so derived empty collections do not re-create props each render.
const EMPTY_ACTIVITY: AuditLogEntry[] = [];
const EMPTY_PERFORMERS: TopPerformer[] = [];
const EMPTY_WEEKLY_ACTIVITY: WeeklyActivityData[] = [];
const EMPTY_SUBJECT_BREAKDOWN: SubjectBreakdownItem[] = [];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onOpenProfile,
  onOpenSettings,
  profileData,
  onSaveProfile,
  userSettings,
  onSaveSettings,
  onApplySettingsPreview,
  onExportData,
  onClearCache,
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('Overview');

  const fallbackProfileData: ProfileData = {
    name: userProfile?.name || 'Administrator',
    email: userProfile?.email || '',
    phone: '',
    role: 'admin',
    school: 'DepEd Senior High School',
    grade: 'Grade 11-12',
    section: 'Curriculum Core',
    photo: userProfile?.photo || '',
    gender: userProfile?.gender || 'male',
  };
  const effectiveProfileData = profileData ?? fallbackProfileData;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [createIntentRole, setCreateIntentRole] = useState<'Teacher' | 'Student' | null>(null);
  const [overviewState, setOverviewState] = useState<AdminOverviewState>({ status: 'loading' });
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const [isSubjectsHelpModalOpen, setIsSubjectsHelpModalOpen] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [mobileOverviewTab, setMobileOverviewTab] = useState<'insights' | 'curriculum'>('insights');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState<'ALL' | 'STEM' | 'Core'>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<'7d' | '30d'>('7d');

  const getExecutiveGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleTabChange = (nextTab: string): boolean => {
    if (!isAdminTab(nextTab)) {
      // The generic sidebar hands back a bare label; an unknown one means the
      // two lists drifted, which previously rendered an empty page body.
      console.warn(`[AdminDashboard] Ignoring unknown admin tab: ${nextTab}`);
      return true;
    }
    if (activeTab === nextTab) {
      return true;
    }

    setActiveTab(nextTab);

    if (nextTab === 'Subjects') {
      setShowHelpTooltip(true);
      setTimeout(() => setShowHelpTooltip(false), 2000);
    }
    
    return true;
  };

  const handleSidebarTabChange = (nextTab: string) => {
    const didChange = handleTabChange(nextTab);
    if (didChange) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleQuickAddUser = (role: 'Teacher' | 'Student') => {
    setCreateIntentRole(role);
    handleTabChange('User Management');
  };

  useEffect(() => {
    if (activeTab !== 'Overview') return;
    if (!userProfile) return;
    const normalizedRole = String(userProfile.role || '').toLowerCase();
    const canReadAuditLogs = normalizedRole === 'admin' || normalizedRole === 'teacher';

    let cancelled = false;
    setOverviewState({ status: 'loading' });
    Promise.all([
      getDashboardStats(),
      canReadAuditLogs ? getAuditLogs() : Promise.resolve([]),
      getTopPerformers(3),
      getWeeklyActivity(),
      getSubjectBreakdown(),
      getPriorityAttention(),
      getGlobalMastery(),
      getDifficultyDistribution(),
    ]).then(([stats, logs, performers, weekly, subjects, priority, mastery, difficulty]) => {
      if (cancelled) return;
      setOverviewState({
        status: 'ready',
        data: {
          dashStats: stats,
          recentActivity: logs.slice(0, 4),
          topPerformers: performers,
          weeklyActivity: weekly,
          subjectBreakdown: subjects,
          priorityAttention: priority,
          globalMastery: mastery,
          difficultyDist: difficulty,
        },
      });
    }).catch((cause: unknown) => {
      if (cancelled) return;
      console.error('[AdminDashboard] Failed to load overview:', cause);
      // Keep the last good snapshot so a failed refresh does not blank the cards.
      setOverviewState((current) => ({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'Failed to load dashboard overview',
        lastData: current.status === 'ready' ? current.data : current.status === 'error' ? current.lastData : null,
      }));
    });
    return () => { cancelled = true; };
  }, [activeTab, userProfile]);

  // One atomic snapshot of the Overview tab. Previously eight independently
  // nullable cells plus a separate loading flag allowed the cards to show a
  // mixture of old and new values during a refresh or tab switch.
  const overview = overviewState.status === 'ready'
    ? overviewState.data
    : overviewState.status === 'error'
      ? overviewState.lastData
      : null;
  const loadingOverview = overviewState.status === 'loading';
  const dashStats = overview?.dashStats ?? null;
  const recentActivity = overview?.recentActivity ?? EMPTY_ACTIVITY;
  const topPerformers = overview?.topPerformers ?? EMPTY_PERFORMERS;
  const weeklyActivity = overview?.weeklyActivity ?? EMPTY_WEEKLY_ACTIVITY;
  const subjectBreakdown = overview?.subjectBreakdown ?? EMPTY_SUBJECT_BREAKDOWN;
  const priorityAttention = overview?.priorityAttention ?? null;
  const globalMastery = overview?.globalMastery ?? null;

  const atRiskCount = dashStats?.atRiskStudents ?? 0;

  const systemStats = [
    {
      label: 'Teaching Faculty',
      value: (dashStats?.activeTeachers ?? 0).toString(),
      subtext: 'Certified educators',
      icon: GraduationCap,
      badge: 'Faculty',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
      accentBar: 'from-emerald-500 to-teal-500',
      isPriority: false,
    },
    {
      label: 'Active Sections',
      value: (dashStats?.totalClasses ?? 0).toString(),
      subtext: 'STEM & Core cohorts',
      icon: BookOpen,
      badge: 'Cohorts',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
      accentBar: 'from-indigo-500 to-violet-500',
      isPriority: false,
    },
    {
      label: 'AI Tutor Sessions',
      value: (dashStats?.aiPredictions ?? 0).toLocaleString(),
      subtext: 'Interactive practice runs',
      icon: Zap,
      badge: 'AI Activity',
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
      accentBar: 'from-sky-500 to-indigo-500',
      isPriority: false,
    },
    {
      label: 'Academic Support Need',
      value: atRiskCount.toString(),
      subtext: atRiskCount > 0 ? 'Students requiring intervention' : 'All students on track',
      icon: atRiskCount > 0 ? AlertCircle : CheckCircle2,
      badge: atRiskCount > 0 ? 'Intervention' : 'Optimal',
      iconBg: atRiskCount > 0
        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      badgeBg: atRiskCount > 0
        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold'
        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      accentBar: atRiskCount > 0 ? 'from-rose-500 to-pink-500' : 'from-emerald-500 to-teal-500',
      isPriority: atRiskCount > 0,
    },
  ];


  const chartData = React.useMemo(() => {
    if (timeframeFilter === '7d') {
      return weeklyActivity;
    }
    const totalAi = weeklyActivity.reduce((acc, entry) => acc + entry.ai, 0);
    const totalMan = weeklyActivity.reduce((acc, entry) => acc + entry.man, 0);
    return [
      { name: 'W-3', ai: Math.round(totalAi * 0.7), man: Math.round(totalMan * 0.6) },
      { name: 'W-2', ai: Math.round(totalAi * 0.85), man: Math.round(totalMan * 0.8) },
      { name: 'W-1', ai: Math.round(totalAi * 0.95), man: Math.round(totalMan * 0.9) },
      { name: 'This Wk', ai: totalAi, man: totalMan },
    ];
  }, [weeklyActivity, timeframeFilter]);

  const filteredSubjects = React.useMemo(() => {
    if (subjectCategoryFilter === 'ALL') return subjectBreakdown;
    if (subjectCategoryFilter === 'STEM') return subjectBreakdown.filter((sub) => sub.type === 'STEM');
    return subjectBreakdown.filter((sub) => sub.type !== 'STEM');
  }, [subjectBreakdown, subjectCategoryFilter]);

  // Map audit severity to display colors
  const severityColor = (severityValue: string) => {
    if (severityValue === 'Error' || severityValue === 'Critical') return { text: 'text-red-600', bg: 'bg-red-50' };
    if (severityValue === 'Warning') return { text: 'text-rose-600', bg: 'bg-rose-50' };
    return { text: 'text-sky-600', bg: 'bg-sky-50' };
  };

  return (
    <div className="flex h-dvh w-full bg-[#f8fafc] overflow-hidden font-body">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSidebarTabChange}
          userRole="admin"
          onOpenSettings={() => onOpenSettings?.()}
          onLogout={() => setShowLogoutConfirm(true)}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 p-3 lg:hidden" style={{ paddingLeft: 'calc(0.75rem + env(safe-area-inset-left, 0px))' }}>
            <Sidebar
              mode="mobile"
              onRequestClose={() => setIsMobileSidebarOpen(false)}
              activeTab={activeTab}
              setActiveTab={handleSidebarTabChange}
              userRole="admin"
              onOpenSettings={() => onOpenSettings?.()}
              onLogout={() => {
                setShowLogoutConfirm(true);
                setIsMobileSidebarOpen(false);
              }}
              sidebarCollapsed={false}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 xl:px-8 py-3.5 sm:py-4 flex-shrink-0 z-30 w-full min-w-0">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-0 w-full min-w-0">
            <div className="flex-1 min-w-0 flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {ADMIN_TAB_META[activeTab].title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                  {ADMIN_TAB_META[activeTab].subtitle}
                </p>
              </div>
              
              {/* Quick Admin Stats */}
              {activeTab === 'Overview' && (
                <div className="hidden lg:flex items-center gap-2 ml-4 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-xl text-indigo-700 dark:text-indigo-300 shrink-0 whitespace-nowrap">
                    <Users size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold font-display tabular-nums whitespace-nowrap">
                      {(dashStats?.totalStudents ?? 0).toLocaleString()} <span className="font-normal opacity-80">Students</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-100/80 dark:border-sky-900/50 rounded-xl text-sky-700 dark:text-sky-300 shrink-0 whitespace-nowrap">
                    <GraduationCap size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="text-xs font-bold font-display tabular-nums whitespace-nowrap">
                      {dashStats?.activeTeachers ?? 0} <span className="font-normal opacity-80">Teachers</span>
                    </span>
                  </div>
                  <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                    <Activity size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold font-display tabular-nums whitespace-nowrap">
                      {(dashStats?.aiPredictions ?? 0).toLocaleString()} <span className="font-normal opacity-80">AI Sessions</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Help Toggle (Subjects Only) */}
              {activeTab === 'Subjects' && (
                <div className="relative">
                  <button
                    onClick={() => setIsSubjectsHelpModalOpen(true)}
                    className="relative w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg shadow-indigo-200 text-white transition-all cursor-pointer hover:scale-110 active:scale-95 animate-in zoom-in duration-300"
                    aria-label="How it works"
                  >
                    <HelpCircle size={20} />
                  </button>
                  
                  {showHelpTooltip && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-300 z-50">
                      How It Works?
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e293b] rotate-45" />
                    </div>
                  )}
                </div>
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer hover:scale-[1.02]"
                  aria-label="View notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>}
                </button>

                <NotificationDropdown 
                  isOpen={showNotifications} 
                  onClose={() => setShowNotifications(false)}
                  onViewAll={() => handleTabChange('Audit Log')}
                />
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-2xl sm:rounded-full overflow-hidden backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex items-center justify-center hover:ring-2 hover:ring-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden transition-all active:scale-95 cursor-pointer data-[state=open]:ring-2 data-[state=open]:ring-indigo-500 shrink-0 p-0"
                    aria-label={`Profile menu: ${effectiveProfileData.name?.replace(/System Administrator/gi, 'Administrator') || 'Administrator'}`}
                  >
                    <UserAvatar
                      src={effectiveProfileData.photo}
                      name={effectiveProfileData.name?.replace(/System Administrator/gi, 'Administrator') || 'Administrator'}
                      gender={effectiveProfileData.gender}
                      className="w-full h-full object-cover"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-1.5 shadow-xl z-50">
                  <DropdownMenuLabel className="px-3 py-2 font-normal">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate font-display">
                        {effectiveProfileData.name?.replace(/System Administrator/gi, 'Administrator') || 'Administrator'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {effectiveProfileData.email || 'admin@mathpulse.ai'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-slate-200/60 dark:bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveTab('Profile');
                      onOpenProfile?.();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <UserIcon size={14} />
                    </div>
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveTab('Settings');
                      onOpenSettings?.();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <SettingsIcon size={14} />
                    </div>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-slate-200/60 dark:bg-white/10" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <LogOutIcon size={14} />
                    </div>
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <main className={`flex-1 overflow-y-auto w-full max-w-full overflow-x-hidden px-4 sm:px-[24px] xl:px-[32px] scrollbar-hide ${['User Management', 'Audit Log'].includes(activeTab) ? 'pb-0' : 'pb-[32px]'}`}>
          {activeTab === 'Overview' && (
            <div className="max-w-[1600px] mx-auto space-y-5 lg:space-y-6 pt-4 sm:pt-6 w-full min-w-0">
              {/* Executive Branded Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 border border-indigo-500/20 shadow-xl shadow-indigo-950/20 group">
                {/* Ambient Glows */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl group-hover:bg-indigo-500/25 transition-all duration-700 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-700 pointer-events-none" />

                <div className="relative z-10">
                  {/* Top Status & Accreditation Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shrink-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="whitespace-nowrap">MathPulse Active · S.Y. 2025–2026</span>
                    </div>

                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium backdrop-blur-md shrink-0">
                      <School size={13} className="text-indigo-400 shrink-0" />
                      <span className="whitespace-nowrap">Senior High School STEM</span>
                    </div>
                  </div>

                  {/* Greeting & Headline */}
                  <div className="max-w-3xl">
                    <h2 className="text-xl sm:text-3xl font-display font-black tracking-tight text-white leading-tight">
                      {getExecutiveGreeting()},{' '}
                      <span className="bg-gradient-to-r from-indigo-200 via-sky-200 to-white bg-clip-text text-transparent">
                        {effectiveProfileData.name?.replace(/System Administrator/gi, 'Administrator') || 'Administrator'}
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300/90 mt-1.5 leading-relaxed font-medium">
                      Administrative command center for Senior High School STEM curriculum, faculty allocations, and AI engagement.
                    </p>
                  </div>

                  {/* High-Frequency Administrative Shortcuts */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleQuickAddUser('Teacher')}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Add Faculty or Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('Class Management')}
                      className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 text-xs font-medium rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <BookOpen size={15} className="text-slate-400" />
                      <span>Class Sections</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('Content')}
                      className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 text-xs font-medium rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <FileUp size={15} className="text-slate-400" />
                      <span>Upload Curriculum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('Analytics')}
                      className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 text-xs font-medium rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <BarChart3 size={15} className="text-slate-400" />
                      <span>Analytics Hub</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento KPI Grid (Creative 2x2 on Mobile, 4-up on Desktop with Calm Teacher-Inspired Surface) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                {systemStats.map((statItem, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className={`relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all min-w-0 group border ${
                      statItem.isPriority
                        ? 'border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-400/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Subtle Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${statItem.accentBar} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${statItem.iconBg} border shrink-0`}>
                        <statItem.icon size={18} />
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statItem.badgeBg}`}>
                        {statItem.badge}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-[30px] font-display font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight truncate tabular-nums">
                        {loadingOverview ? '...' : statItem.value}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-1">
                        {statItem.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                        {statItem.subtext}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Creative Mobile Segmented View Switcher */}
              <div className="xl:hidden flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMobileOverviewTab('insights')}
                  className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mobileOverviewTab === 'insights'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={15} />
                  <span>Performance & Honors</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOverviewTab('curriculum')}
                  className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mobileOverviewTab === 'curriculum'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookMarked size={15} />
                  <span>Curriculum & Feed</span>
                </button>
              </div>

              {/* Row 2: Performance Analytics & Top Performers */}
              <div className={`grid grid-cols-12 gap-4 lg:gap-6 min-w-0 ${mobileOverviewTab === 'insights' ? 'block' : 'hidden xl:grid'}`}>
                {/* System Performance & AI Activity Chart */}
                <div className="col-span-12 xl:col-span-7 relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] min-w-0 min-h-[360px]">
                  {/* Subtle Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                          Learning Engagement & AI Activity
                        </h3>
                        <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                          Completed learning volume comparing AI-guided tutoring with self-study quizzes
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start md:self-center shrink-0">
                      {/* Timeframe Filter Pill */}
                      <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold shrink-0">
                        <button
                          type="button"
                          onClick={() => setTimeframeFilter('7d')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            timeframeFilter === '7d'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          7 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeframeFilter('30d')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            timeframeFilter === '30d'
                              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Monthly
                        </button>
                      </div>

                      {/* Clean Legend */}
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="whitespace-nowrap">AI Sessions</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                          <span className="whitespace-nowrap">Self-Study</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                        <ReTooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            border: '1px solid #1e293b',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                            color: '#fff',
                            fontSize: '12px',
                            padding: '10px 14px',
                          }}
                          cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                        />
                        <Bar dataKey="ai" name="AI Sessions" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={16} />
                        <Bar dataKey="man" name="Self-Study" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Academic Honor Roll (Top Performers with Clean Medals) */}
                <div className="col-span-12 xl:col-span-5 relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] min-w-0">
                  {/* Subtle Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 shrink-0" />
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Academic Honor Roll</span>
                        </h3>
                        <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-0.5">Top-ranking students by curriculum mastery</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Analytics')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1 justify-center">
                    {loadingOverview ? (
                      <div className="py-12 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                      </div>
                    ) : topPerformers.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <Award size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">No student performance records available yet.</p>
                      </div>
                    ) : (
                      topPerformers.slice(0, 3).map((studentItem, idx) => {
                        const rankBadges = [
                          { bg: 'bg-amber-500 text-white', label: '1' },
                          { bg: 'bg-slate-400 text-white', label: '2' },
                          { bg: 'bg-amber-700 text-white', label: '3' },
                        ];
                        const rank = rankBadges[idx] || { bg: 'bg-slate-300 text-white', label: String(idx + 1) };

                        return (
                          <div
                            key={studentItem.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <div className="relative shrink-0">
                              <UserAvatar
                                src={studentItem.avatar}
                                name={studentItem.name}
                                className="w-10 h-10 rounded-xl"
                              />
                              <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs ${rank.bg}`}>
                                {rank.label}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {studentItem.name}
                              </p>
                              <span className="inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {studentItem.class}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-extrabold font-display text-slate-900 dark:text-white tabular-nums">
                                {studentItem.performance}%
                              </p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Mastery</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('Analytics')}
                    className="mt-4 w-full py-2.5 px-4 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Explore Full Academic Rankings</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Row 3: Curriculum Health & Live Campus Stream (Clean, Teacher-Inspired Calm Design) */}
              <div className={`grid grid-cols-12 gap-4 lg:gap-6 items-stretch min-w-0 ${mobileOverviewTab === 'curriculum' ? 'block' : 'hidden xl:grid'}`}>
                {/* Left Column: Priority Attention & Global Mastery */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 lg:gap-6">
                  {/* Priority Attention Card (Highlighting Action Needed) */}
                  <div
                    className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 border shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all ${
                      (priorityAttention?.atRiskCount ?? 0) > 0
                        ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-400/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90'
                    }`}
                  >
                    {/* Top Accent Line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r pointer-events-none ${
                        (priorityAttention?.atRiskCount ?? 0) > 0
                          ? 'from-amber-500 to-rose-500'
                          : 'from-emerald-500 to-teal-400'
                      }`}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                            (priorityAttention?.atRiskCount ?? 0) > 0
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {(priorityAttention?.atRiskCount ?? 0) > 0 ? (
                            <AlertCircle size={20} />
                          ) : (
                            <CheckCircle2 size={20} />
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            (priorityAttention?.atRiskCount ?? 0) > 0
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold'
                              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {(priorityAttention?.atRiskCount ?? 0) > 0 ? 'Action Required' : 'All Clear'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Academic Priority
                      </h4>
                      <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mt-1">
                        {(priorityAttention?.atRiskCount ?? 0) > 0
                          ? priorityAttention?.subjectName
                          : 'Student Progress on Track'}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                        {(priorityAttention?.atRiskCount ?? 0) > 0 ? (
                          <>
                            <span className="font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                              {priorityAttention!.atRiskCount}
                            </span>{' '}
                            students require instructional intervention to meet minimum passing standards.
                          </>
                        ) : (
                          'No at-risk students flagged across current active subjects.'
                        )}
                      </p>
                    </div>
                    {(priorityAttention?.atRiskCount ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('Analytics')}
                        className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer w-fit"
                      >
                        <span>Review in Analytics</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  {/* Global Mastery Donut */}
                  <div className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex-1">
                    {/* Subtle Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 pointer-events-none" />

                    <div className="w-full flex items-center gap-2.5 mb-2">
                      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Global Mastery</h3>
                        <p className="font-body text-xs text-slate-500 dark:text-slate-400">Platform-wide composite achievement (DepEd target: 75%)</p>
                      </div>
                    </div>
                    <div className="relative w-40 h-40 my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Mastery', value: globalMastery?.avgMastery ?? 0 },
                              { name: 'Remaining', value: Math.max(0, 100 - (globalMastery?.avgMastery ?? 0)) },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                          >
                            <Cell fill="#6366f1" />
                            <Cell fill="#f1f5f9" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {globalMastery?.avgMastery ?? 0}%
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Composite Avg
                        </span>
                      </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-2.5">
                        <p className="text-lg font-extrabold font-display text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {(globalMastery?.passed ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passed</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-2.5">
                        <p className="text-lg font-extrabold font-display text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {(globalMastery?.pending ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Subject Breakdown & Live Campus Stream */}
                <div className="col-span-12 xl:col-span-8 flex flex-col gap-4 lg:gap-6">
                  {/* Subject Breakdown Table with Filter Tabs */}
                  <div className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 pointer-events-none" />

                    <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
                        <div>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Subject Mastery Matrix</h3>
                          <p className="font-body text-xs text-slate-500 dark:text-slate-400">Curriculum enrollment and topic completion rates</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Subject Category Filter Tabs */}
                        <div className="flex items-center p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                          {(['ALL', 'STEM', 'Core'] as const).map((filterCategory) => (
                            <button
                              key={filterCategory}
                              type="button"
                              onClick={() => setSubjectCategoryFilter(filterCategory)}
                              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                subjectCategoryFilter === filterCategory
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {filterCategory === 'ALL' ? 'All' : filterCategory}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const csvLines = [
                              'Subject,Category,Enrolled,Progress%',
                              ...filteredSubjects.map((subItem) => `${subItem.name},${subItem.type},${subItem.count},${subItem.progress}`),
                            ].join('\n');
                            const fileBlob = new Blob([csvLines], { type: 'text/csv' });
                            const anchorLink = document.createElement('a');
                            anchorLink.href = URL.createObjectURL(fileBlob);
                            anchorLink.download = 'subject-mastery-matrix.csv';
                            anchorLink.click();
                          }}
                          aria-label="Export subject breakdown as CSV"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
                        >
                          <Download size={13} />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto min-w-0">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Enrolled</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mastery Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredSubjects.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                                No subject performance records in this category.
                              </td>
                            </tr>
                          ) : (
                            filteredSubjects.map((subItem, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-5 py-3.5">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">{subItem.name}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                                      subItem.type === 'STEM'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {subItem.type}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-center text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                  {subItem.count}
                                </td>
                                <td className="px-5 py-3.5 min-w-[160px]">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          subItem.progress >= 75
                                            ? 'bg-emerald-500'
                                            : subItem.progress >= 50
                                            ? 'bg-indigo-500'
                                            : 'bg-amber-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, subItem.progress))}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-9 text-right tabular-nums">
                                      {subItem.progress}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Live Campus Stream (Clean, Uncluttered Activity & Security Feed) */}
                  <div className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
                    {/* Subtle Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500 pointer-events-none" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500 shrink-0" />
                        <div>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                            Live Campus Stream
                          </h3>
                          <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time administrative actions and security logs</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Audit Log')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <span>Audit Log</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {recentActivity.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No recent system activity recorded today.
                        </div>
                      ) : (
                        recentActivity.slice(0, 4).map((auditLogItem, idx) => {
                          const isAlert = auditLogItem.severity === 'Warning' || auditLogItem.severity === 'Error' || auditLogItem.severity === 'Critical';
                          const userRole = (auditLogItem.user?.role || '').toLowerCase();
                          const roleBadgeStyle = userRole === 'admin'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : userRole === 'teacher'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';

                          return (
                            <div
                              key={auditLogItem.id || idx}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                                isAlert
                                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isAlert
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {isAlert ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {auditLogItem.action}
                                  </p>
                                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                                    {auditLogItem.timestamp ? new Date(auditLogItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {auditLogItem.details}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                    {auditLogItem.user?.name || 'System Engine'}
                                  </span>
                                  {auditLogItem.user?.role && (
                                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${roleBadgeStyle}`}>
                                      {auditLogItem.user.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'Content' && <AdminPdfUpload />}
          {activeTab === 'RAG Manager' && <AdminRagManager />}
          {activeTab === 'Audit Log' && <AdminAuditLog />}
          {activeTab === 'User Management' && (
            <AdminUserManagement
              createIntentRole={createIntentRole}
              onCreateIntentConsumed={() => setCreateIntentRole(null)}
            />
          )}
          {activeTab === 'Analytics' && <AdminAnalytics />}
          {activeTab === 'AI Monitoring' && <AIMonitoringPage />}
          {activeTab === 'Class Management' && <AdminClassManagement />}
          
          {activeTab === 'Subjects' && <AdminSubjects />}
          {activeTab === 'Profile' && (
            <AdminProfilePage
              profileData={effectiveProfileData}
              onSaveProfile={onSaveProfile ?? (() => {})}
              onBack={() => setActiveTab('Overview')}
              previousTabName="Overview"
              onNavigateToSettings={() => setActiveTab('Settings')}
            />
          )}
          {activeTab === 'Settings' && (
            <AdminSettingsPage
              settingsData={userSettings}
              onSaveSettings={onSaveSettings ?? (async () => {})}
              onApplySettingsPreview={onApplySettingsPreview}
              onExportData={onExportData}
              onClearCache={onClearCache}
              onBack={() => setActiveTab('Overview')}
              previousTabName="Overview"
              onNavigateToProfile={() => setActiveTab('Profile')}
            />
          )}
        </main>
      </div>

      {/* Help Modal */}
      <SubjectsHelpModal 
        isOpen={isSubjectsHelpModalOpen} 
        onClose={() => setIsSubjectsHelpModalOpen(false)} 
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="Logout Confirmation"
        message="Are you sure you want to log out? This will end your current session."
        confirmText="Logout"
        cancelText="Cancel"
      />


    </div>
  );
};

export default AdminDashboard;