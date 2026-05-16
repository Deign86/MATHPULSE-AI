import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, AlertCircle, BarChart3, Target, Award, Shield, Loader2, BookMarked, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import UserAvatar from './UserAvatar';
import AdminPdfUpload from './admin/AdminPdfUpload';
import AdminAuditLog from './AdminAuditLog';
import AdminUserManagement from './AdminUserManagement';
import AdminAnalytics from './AdminAnalytics';
import AdminAIMonitoring from './AdminAIMonitoring';
import AdminSubjects from './admin/AdminSubjects';
import SubjectsHelpModal from './admin/SubjectsHelpModal';
import MasteryHeatmap from './MasteryHeatmap';
import AdminPriorityModules from './AdminPriorityModules';
import NotificationDropdown from './NotificationDropdown';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie 
} from 'recharts';
import { Zap, Activity, TrendingUp, ArrowUpRight, CheckCircle2, Sparkles, Bell, HelpCircle } from 'lucide-react';
import {
  getDashboardStats,
  getAuditLogs,
  getTopPerformers,
  type DashboardStats,
  type AuditLogEntry,
  type TopPerformer,
} from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

interface AdminDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onOpenProfile, onOpenSettings }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [createIntentRole, setCreateIntentRole] = useState<'Teacher' | 'Student' | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSubjectsHelpModalOpen, setIsSubjectsHelpModalOpen] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const handleTabChange = (nextTab: string): boolean => {
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
    // Only query audit logs if user has admin/teacher role
    const normalizedRole = String(userProfile.role || '').toLowerCase();
    const canReadAuditLogs = normalizedRole === 'admin' || normalizedRole === 'teacher';

    let cancelled = false;
    setLoadingOverview(true);
    Promise.all([
      getDashboardStats(),
      canReadAuditLogs ? getAuditLogs() : Promise.resolve([]),
      getTopPerformers(3),
    ]).then(([stats, logs, performers]) => {
      if (cancelled) return;
      setDashStats(stats);
      setRecentActivity(logs.slice(0, 4));
      setTopPerformers(performers);
    }).catch(console.error).finally(() => {
      if (!cancelled) setLoadingOverview(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, userProfile]);

  const systemStats = [
    {
      label: 'Active Teachers',
      value: (dashStats?.activeTeachers ?? 0).toString(),
      icon: GraduationCap,
      color: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Total Classes',
      value: (dashStats?.totalClasses ?? 0).toString(),
      icon: BookOpen,
      color: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'AI Inferences',
      value: (dashStats?.aiPredictions ?? 0).toLocaleString(),
      icon: Zap,
      color: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'At-Risk Alerts',
      value: (dashStats?.atRiskStudents ?? 0).toString(),
      icon: AlertCircle,
      color: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
  ];

  // Map audit severity to display colors
  const severityColor = (s: string) => {
    if (s === 'Error' || s === 'Critical') return { text: 'text-red-600', bg: 'bg-red-50' };
    if (s === 'Warning') return { text: 'text-rose-600', bg: 'bg-rose-50' };
    return { text: 'text-sky-600', bg: 'bg-sky-50' };
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-body">
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
          <div className="fixed inset-y-0 left-0 z-50 p-3 lg:hidden">
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-transparent border-b border-[#e2e8f0]/40 px-[24px] xl:px-[32px] pt-[24px] pb-[16px] flex-shrink-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-0">
            <div className="flex-1 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden mt-1 p-2 rounded-lg border border-[#dde3eb] bg-white text-[#5a6578] hover:bg-[#edf1f7] transition-colors"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-tight">
                  {activeTab === 'Overview' && 'Admin Dashboard'}
                  {activeTab === 'Content' && 'Content & RAG'}
                  {activeTab === 'Audit Log' && 'Audit Log'}
                  {activeTab === 'User Management' && 'User Management'}
                  {activeTab === 'Analytics' && 'Analytics'}
                  {activeTab === 'AI Monitoring' && 'AI Monitoring'}
                  {activeTab === 'Subjects' && 'Curriculum Control'}
                </h1>
                <p className="text-[13px] text-[#64748b] mt-1">
                  {activeTab === 'Overview' && `System Overview & Management`}
                  {activeTab === 'Content' && 'Upload PDFs for AI-powered content.'}
                  {activeTab === 'Audit Log' && 'Monitor system activity and security.'}
                  {activeTab === 'User Management' && 'Manage all user accounts and roles.'}
                  {activeTab === 'Analytics' && 'Detailed system performance metrics.'}
                  {activeTab === 'AI Monitoring' && 'Platform AI usage and system health.'}
                  {activeTab === 'Subjects' && 'Manage academic subjects, availability, and RAG knowledge sources.'}
                </p>
              </div>
              
              {/* Quick Admin Stats */}
              {activeTab === 'Overview' && (
                <div className="hidden xl:flex items-center gap-2 ml-4 mt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-lg">
                    <Users size={13} className="text-[#4f46e5]" />
                    <span className="text-xs font-display font-semibold text-[#4f46e5]">{(dashStats?.totalStudents ?? 0).toLocaleString()} students</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-lg">
                    <GraduationCap size={13} className="text-[#0ea5e9]" />
                    <span className="text-xs font-display font-semibold text-[#0ea5e9]">{dashStats?.activeTeachers ?? 0} teachers</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <Zap size={13} className="text-amber-600" />
                    <span className="text-xs font-display font-semibold text-amber-600">{(dashStats?.aiPredictions ?? 0).toLocaleString()} inferences</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
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
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                </button>

                <NotificationDropdown 
                  isOpen={showNotifications} 
                  onClose={() => setShowNotifications(false)}
                  onViewAll={() => handleTabChange('Audit Log')}
                />
              </div>

              {/* Profile Pill */}
              <div
                onClick={onOpenProfile}
                className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors h-10 hover:scale-[1.02]"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                  <UserAvatar
                    src={userProfile?.photo}
                    name={userProfile?.name || 'Admin'}
                    gender={userProfile?.gender}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[13px] font-semibold text-[#1e293b]">{userProfile?.name || 'Admin'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <main className={`flex-1 overflow-y-auto px-[24px] xl:px-[32px] scrollbar-hide ${['User Management', 'Audit Log'].includes(activeTab) ? 'pb-0' : 'pb-[32px]'}`}>
          {activeTab === 'Overview' && (
            <div className="max-w-[1600px] mx-auto space-y-8 pt-6 xl:pt-8">
              {/* Row 1: Ratio 4:8 */}
              <div className="grid grid-cols-12 gap-6 h-[170px]">
                {/* Welcome Card (col-span-4) */}
                <div className="col-span-12 xl:col-span-4 h-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] rounded-[28px] p-6 relative overflow-hidden shadow-sm shadow-indigo-500/10 group">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <h2 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Platform Overview</h2>
                      <p className="text-white text-4xl font-display font-black tracking-tighter leading-none">
                        {loadingOverview ? '...' : (dashStats?.totalStudents ?? 0).toLocaleString()}
                      </p>
                      <p className="text-white/80 text-xs font-medium mt-1">Total Active Students</p>
                    </div>
                    <div className="flex items-center gap-2 py-1 px-3 bg-white/10 backdrop-blur-md rounded-full w-fit border border-white/10">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-white text-[10px] font-bold tracking-wide">+12.5% increase</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 pointer-events-none">
                    <Users size={140} className="text-white" />
                  </div>
                </div>

                {/* KPI Stats Card (col-span-8) */}
                <div className="col-span-12 xl:col-span-8 h-full bg-white border border-slate-200/60 rounded-[28px] px-2 py-5 flex items-center shadow-sm shadow-slate-200/50">
                  <div className="grid grid-cols-4 w-full h-full">
                    {systemStats.map((stat, idx) => (
                      <div key={idx} className={`flex flex-col justify-center px-8 ${idx !== 3 ? 'border-r border-slate-100' : ''}`}>
                        <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                          <stat.icon size={20} className={stat.iconColor} />
                        </div>
                        <p className="text-[24px] font-display font-black text-[#1e293b] leading-tight tracking-tight">
                          {loadingOverview ? '...' : stat.value}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Ratio 5:4:3 */}
              <div className="grid grid-cols-12 gap-6 min-h-[330px]">
                {/* System Performance (col-span-5) */}
                <div className="col-span-12 xl:col-span-5 bg-white rounded-[28px] border border-slate-200/60 p-6 flex flex-col shadow-sm shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1e293b]">System Performance</h3>
                      <p className="text-[11px] text-slate-400 font-medium">AI vs Manual Activity</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">AI</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Manual</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'M', ai: 400, man: 240 },
                        { name: 'T', ai: 300, man: 139 },
                        { name: 'W', ai: 520, man: 280 },
                        { name: 'T', ai: 480, man: 390 },
                        { name: 'F', ai: 600, man: 480 },
                        { name: 'S', ai: 200, man: 100 },
                        { name: 'S', ai: 150, man: 90 },
                      ]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#cbd5e1' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#cbd5e1' }} />
                        <ReTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.1)', padding: '10px' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="ai" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="man" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Model Status (col-span-4) */}
                <div className="col-span-12 xl:col-span-4 bg-white rounded-[28px] border border-slate-200/60 p-6 flex flex-col shadow-sm shadow-slate-200/50 group">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1e293b]">AI Model Status</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Inference Tracking</p>
                    </div>
                    <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Activity size={16} className="text-indigo-600" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-[38px] font-display font-black text-indigo-600 tracking-tighter leading-none">160</span>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Optimal</span>
                  </div>
                  <div className="flex-1 min-h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { v: 10 }, { v: 15 }, { v: 12 }, { v: 25 }, { v: 18 }, { v: 35 }, { v: 28 }, { v: 45 }
                      ]}>
                        <defs>
                          <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStatus)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <button className="w-full mt-4 py-3 bg-slate-50 text-[#1e293b] text-[11px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2.5 group/btn">
                    Health Check <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>

                {/* Top Performers (col-span-3) */}
                <div className="col-span-12 xl:col-span-3 flex flex-col gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Top Performers</h3>
                  <div className="flex flex-col gap-3 flex-1">
                    {loadingOverview ? (
                      <div className="flex-1 flex items-center justify-center bg-white rounded-[28px] border border-slate-100">
                        <Loader2 size={24} className="animate-spin text-slate-200" />
                      </div>
                    ) : topPerformers.slice(0, 2).map((student, idx) => (
                      <div 
                        key={student.id} 
                        className={`relative rounded-[28px] border p-4 shadow-sm shadow-slate-200/50 transition-all cursor-pointer group overflow-hidden ${
                          idx === 0 
                          ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200/50' 
                          : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200/50'
                        }`}
                      >
                        {/* Dynamic Glow Background */}
                        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 transition-all duration-700 group-hover:scale-125 ${
                          idx === 0 ? 'bg-emerald-400' : 'bg-indigo-400'
                        }`}></div>
                        
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="relative shrink-0">
                            {/* Avatar Ring */}
                            <div className={`p-[3px] rounded-[20px] shadow-sm ${
                              idx === 0 ? 'bg-gradient-to-tr from-emerald-500 to-emerald-200' : 'bg-gradient-to-tr from-indigo-500 to-indigo-200'
                            }`}>
                              <img src={student.avatar} alt="" className="w-11 h-11 rounded-[17px] object-cover bg-white" />
                            </div>
                            {/* Rank Badge */}
                            <div className={`absolute -top-2 -right-2 w-6 h-6 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md ${
                              idx === 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                            }`}>
                              {idx === 0 ? '🥇' : '🥈'}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[13px] font-black truncate transition-colors ${
                              idx === 0 ? 'text-emerald-900 group-hover:text-emerald-600' : 'text-indigo-900 group-hover:text-indigo-600'
                            }`}>{student.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                idx === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                              }`}>{student.class}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-xl font-display font-black leading-none ${
                              idx === 0 ? 'text-emerald-600' : 'text-indigo-600'
                            }`}>{student.performance}%</p>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">Mastery</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('Analytics')} className="mt-auto py-2.5 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] text-center bg-white border border-slate-200/60 rounded-xl hover:bg-slate-50 transition-all shadow-sm shadow-slate-200/50">
                      All Rankings
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Ratio 4:8 */}
              <div className="flex flex-col xl:flex-row gap-6 pb-8 items-stretch">
                {/* Left Column (col-span-4, vertical stack) */}
                <div className="w-full xl:w-1/3 flex flex-col gap-6">
                  {/* Priority Attention Card */}
                  <div className="bg-[#1e293b] rounded-[28px] p-6 text-white shadow-sm shadow-slate-900/10 relative overflow-hidden group min-h-[190px] flex flex-col justify-between shrink-0">
                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 pointer-events-none">
                      <AlertCircle size={200} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
                          <AlertCircle size={18} className="text-white" />
                        </div>
                        <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-[9px] font-black uppercase tracking-widest">Urgent</span>
                        </div>
                      </div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Priority Attention</h4>
                      <h3 className="text-xl font-display font-black tracking-tight leading-tight">General Mathematics</h3>
                    </div>
                    <div className="relative z-10 pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">12 At-Risk Students</span>
                      <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">Review</button>
                    </div>
                  </div>

                  {/* Global Mastery Average (Expand to fill) */}
                  <div className="bg-white rounded-[28px] border border-slate-200/60 p-7 flex flex-col items-center justify-center shadow-sm shadow-slate-200/50 relative overflow-hidden flex-1">
                    <div className="absolute top-7 left-8">
                      <h3 className="text-[14px] font-bold text-[#1e293b]">Global Mastery</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Average performance</p>
                    </div>
                    <div className="relative w-40 h-40 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Mastery', value: 76 },
                              { name: 'Remaining', value: 24 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={8}
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[36px] font-display font-black text-[#1e293b] leading-none">76%</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1">Overall</span>
                      </div>
                    </div>
                    <div className="mt-8 flex items-center gap-12">
                      <div className="text-center">
                        <p className="text-xl font-display font-black text-indigo-600 leading-none">1,762</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Passed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-display font-black text-slate-300 leading-none">762</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending</p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20"></div>
                  </div>
                </div>

                {/* Right Column (col-span-8, vertical stack) */}
                <div className="w-full xl:w-2/3 flex flex-col gap-6">
                  {/* Platform-Wide Subject Mastery */}
                  <div className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                      <div>
                        <h3 className="text-[15px] font-bold text-[#1e293b]">Subject Breakdown</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Core vs STEM performance</p>
                      </div>
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] font-black text-[#1e293b] uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all">Export</button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/20">
                            <th className="px-6 py-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Subject</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Category</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center">Enrolled</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/60">
                          {[
                            { name: 'General Mathematics', type: 'Core', count: '4.2k', progress: 85 },
                            { name: 'Pre-Calculus (STEM)', type: 'STEM', count: '1.8k', progress: 62 },
                            { name: 'Stats & Probability', type: 'Core', count: '3.1k', progress: 78 },
                            { name: 'Basic Calculus', type: 'STEM', count: '1.2k', progress: 45 },
                          ].map((sub, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-[#1e293b] group-hover:text-indigo-600 transition-colors">{sub.name}</span>
                                  <span className="text-[9px] font-medium text-slate-400">Semester 1</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${sub.type === 'STEM' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>{sub.type}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-[12px] font-bold text-slate-600">{sub.count}</span>
                              </td>
                              <td className="px-6 py-4 min-w-[180px]">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                                    <div className={`h-full rounded-full ${sub.progress > 80 ? 'bg-indigo-500' : sub.progress > 60 ? 'bg-indigo-400' : 'bg-rose-400'} transition-all duration-1000`} style={{ width: `${sub.progress}%` }}></div>
                                  </div>
                                  <span className="text-[11px] font-black text-[#1e293b] w-8">{sub.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nested Bottom Row (2-col grid) */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/50">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-bold text-[#1e293b]">Activity</h3>
                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                          <Activity size={14} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="space-y-5">
                        {recentActivity.slice(0, 3).map((log, idx) => (
                          <div key={idx} className="flex gap-3 group">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              <CheckCircle2 size={14} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-[#1e293b] truncate leading-tight group-hover:text-indigo-600 transition-colors">{log.action}</p>
                              <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">{log.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/50">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[15px] font-bold text-[#1e293b]">Load</h3>
                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                          <Zap size={14} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="space-y-5">
                        {[
                          { label: 'Foundational', color: 'bg-emerald-400', val: 45 },
                          { label: 'Intermediate', color: 'bg-indigo-400', val: 35 },
                          { label: 'Advanced', color: 'bg-rose-400', val: 20 },
                        ].map((item, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.label}</span>
                              <span className="text-[11px] font-black text-[#1e293b]">{item.val}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden p-[1px]">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'Content' && <AdminPdfUpload />}
          {activeTab === 'Audit Log' && <AdminAuditLog />}
          {activeTab === 'User Management' && (
            <AdminUserManagement
              createIntentRole={createIntentRole}
              onCreateIntentConsumed={() => setCreateIntentRole(null)}
            />
          )}
          {activeTab === 'Analytics' && <AdminAnalytics />}
          {activeTab === 'AI Monitoring' && <AdminAIMonitoring />}
          
          {activeTab === 'Subjects' && <AdminSubjects />}
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