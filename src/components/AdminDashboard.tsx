import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, AlertCircle, BarChart3, Target, Award, Shield, Loader2, BookMarked } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import AdminContent from './AdminContent';
import AdminAuditLog from './AdminAuditLog';
import AdminSettings from './AdminSettings';
import AdminUserManagement from './AdminUserManagement';
import AdminAnalytics from './AdminAnalytics';
import MasteryHeatmap from './MasteryHeatmap';
import {
  getDashboardStats,
  getAuditLogs,
  getTopPerformers,
  type DashboardStats,
  type AuditLogEntry,
  type TopPerformer,
} from '../services/adminService';

interface AdminDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

interface SystemStats {
  totalStudents: number;
  activeTeachers: number;
  totalClassrooms: number;
  loading: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onOpenProfile, onOpenSettings }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    if (activeTab !== 'Overview') return;
    let cancelled = false;
    setLoadingOverview(true);
    Promise.all([
      getDashboardStats(),
      getAuditLogs(),
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
  }, [activeTab]);

  const systemStats = [
    {
      label: 'Total Students',
      value: loadingOverview ? '...' : (dashStats?.totalStudents ?? 0).toLocaleString(),
      icon: Users,
      color: 'bg-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      label: 'Active Teachers',
      value: loadingOverview ? '...' : (dashStats?.activeTeachers ?? 0).toString(),
      icon: GraduationCap,
      color: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Total Classes',
      value: loadingOverview ? '...' : (dashStats?.totalClasses ?? 0).toString(),
      icon: BookOpen,
      color: 'bg-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      label: 'At-Risk Students',
      value: loadingOverview ? '...' : (dashStats?.atRiskStudents ?? 0).toString(),
      icon: AlertCircle,
      color: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Avg Performance',
      value: loadingOverview ? '...' : `${dashStats?.avgPerformance ?? 0}%`,
      icon: BarChart3,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'AI Interactions',
      value: loadingOverview ? '...' : (dashStats?.aiPredictions ?? 0).toLocaleString(),
      icon: Target,
      color: 'bg-sky-100',
      iconColor: 'text-sky-600',
    },
  ];

  // Map audit severity to display colors
  const severityColor = (s: string) => {
    if (s === 'Error' || s === 'Critical') return { text: 'text-red-600', bg: 'bg-red-50' };
    if (s === 'Warning') return { text: 'text-rose-600', bg: 'bg-rose-50' };
    return { text: 'text-sky-600', bg: 'bg-sky-50' };
  };

  return (
    <div className="flex h-screen w-full bg-[#edf1f7] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole="admin"
        onOpenSettings={onOpenSettings}
        onLogout={() => setShowLogoutConfirm(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[#dde3eb] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-display font-bold text-[#0a1628] leading-tight">
                {activeTab === 'Overview' && 'Admin Dashboard'}
                {activeTab === 'Content' && 'Content'}
                {activeTab === 'Audit Log' && 'Audit Log'}
                {activeTab === 'User Management' && 'User Management'}
                {activeTab === 'Analytics' && 'Analytics'}
                {activeTab === 'Settings' && 'Settings'}
              </h1>
              <p className="text-xs text-[#5a6578] font-body">
                {activeTab === 'Overview' && 'System Overview & Management'}
                {activeTab === 'Content' && 'Manage platform content'}
                {activeTab === 'Audit Log' && 'Monitor system activity'}
                {activeTab === 'User Management' && 'Manage all user accounts'}
                {activeTab === 'Analytics' && 'Detailed performance metrics'}
                {activeTab === 'Settings' && 'Configure platform settings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 w-[152px] h-11 shrink-0 bg-[#edf1f7] p-1.5 pr-3 rounded-lg cursor-pointer hover:bg-[#dde3eb] transition-all group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-sky-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-[#0a1628] leading-none group-hover:text-sky-600 transition-colors truncate">Admin</p>
              </div>
            </button>

          </div>
        </header>

        {/* Main Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Stats & Activity */}
            <div className="col-span-8 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {systemStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                          <Icon size={24} className={stat.iconColor} />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-[#0a1628] mb-1">
                        {loadingOverview ? <Loader2 size={20} className="animate-spin text-slate-400" /> : stat.value}
                      </h3>
                      <p className="text-sm text-[#5a6578] font-medium">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Performance Chart - empty until data imported */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#0a1628] mb-1">System Performance Overview</h2>
                    <p className="text-sm text-[#5a6578]">Last 30 days</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <BarChart3 size={32} className="text-[#dde3eb]" />
                  <p className="text-sm font-medium text-[#5a6578]">No performance data yet</p>
                  <p className="text-xs text-[#a0aec0]">Import class records to populate analytics.</p>
                </div>
              </div>

              {/* Platform-Wide Subject Mastery Heatmap */}
              <MasteryHeatmap />

              {/* Recent Activity - real audit log */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb]">
                <h2 className="text-lg font-bold text-[#0a1628] mb-5">Recent System Activity</h2>
                {loadingOverview ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-sky-500" /></div>
                ) : recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <BookMarked size={28} className="text-[#dde3eb]" />
                    <p className="text-sm text-[#5a6578]">No audit events yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((entry) => {
                      const sc = severityColor(entry.severity);
                      return (
                        <div
                          key={entry.id}
                          className={`${sc.bg} border border-[#dde3eb] rounded-2xl p-4 flex items-start gap-4`}
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                            <Shield size={18} className={sc.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0a1628] mb-0.5">{entry.action}</p>
                            <p className="text-xs text-[#5a6578] truncate">{entry.details}</p>
                            <p className="text-xs text-[#5a6578] mt-1">{entry.timestamp} · {entry.user.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Top Performers & Quick Actions */}
            <div className="col-span-4 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-indigo-600 to-sky-600 rounded-3xl p-6 text-white shadow-lg">
                <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-slate-300 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Add New Teacher</p>
                    <p className="text-xs text-sky-100">Create teacher account</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-slate-300 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Add New Student</p>
                    <p className="text-xs text-sky-100">Register new student</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-slate-300 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">System Settings</p>
                    <p className="text-xs text-sky-100">Configure platform</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-slate-300 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Generate Report</p>
                    <p className="text-xs text-sky-100">Export analytics</p>
                  </button>
                </div>
              </div>

              {/* Top Performers - real student data */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb]">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                    <Award size={20} className="text-rose-600" />
                  </div>
                  <h2 className="text-lg font-bold text-[#0a1628]">Top Performers</h2>
                </div>
                {loadingOverview ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-sky-500" /></div>
                ) : topPerformers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Award size={28} className="text-[#dde3eb]" />
                    <p className="text-sm text-[#5a6578]">No student data yet</p>
                    <p className="text-xs text-[#a0aec0]">Students will appear here as they progress.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((student, idx) => (
                      <div
                        key={student.id}
                        className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-[#0a1628]">{student.name}</h4>
                            <p className="text-xs text-[#5a6578]">{student.class}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-xl p-2">
                            <p className="text-[10px] text-[#5a6578] mb-1">Performance</p>
                            <p className="text-lg font-bold text-teal-600">{student.performance}%</p>
                          </div>
                          <div className="bg-white rounded-xl p-2">
                            <p className="text-[10px] text-[#5a6578] mb-1">Level</p>
                            <p className="text-lg font-bold text-sky-600">{student.level}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Model Status */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb]">
                <h2 className="text-lg font-bold text-[#0a1628] mb-5">AI Model Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5a6578]">Prediction Accuracy</span>
                    <span className="text-sm font-bold text-[#5a6578]">No data</span>
                  </div>
                  <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden">
                    <div className="h-full bg-[#dde3eb] rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-[#5a6578]">Model Performance</span>
                    <span className="text-sm font-bold text-[#5a6578]">Untrained</span>
                  </div>
                  <div className="h-2 bg-[#edf1f7] rounded-full overflow-hidden">
                    <div className="h-full bg-[#dde3eb] rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-xl">
                    <p className="text-xs text-sky-800">
                      <strong>Status:</strong> Import student data to enable AI predictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
          {activeTab === 'Content' && <AdminContent />}
          {activeTab === 'Audit Log' && <AdminAuditLog />}
          {activeTab === 'User Management' && <AdminUserManagement />}
          {activeTab === 'Analytics' && <AdminAnalytics />}
          {activeTab === 'Settings' && <AdminSettings />}
        </main>
      </div>

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