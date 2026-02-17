import React, { useState } from 'react';
import { Users, GraduationCap, BookOpen, TrendingUp, AlertCircle, Settings, BarChart3, Target, Award, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import AdminContent from './AdminContent';
import AdminAuditLog from './AdminAuditLog';
import AdminSettings from './AdminSettings';
import AdminUserManagement from './AdminUserManagement';

interface AdminDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onOpenProfile }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const systemStats = [
    {
      label: 'Total Students',
      value: '1,247',
      change: '+12%',
      icon: Users,
      color: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      trend: 'up'
    },
    {
      label: 'Active Teachers',
      value: '48',
      change: '+3',
      icon: GraduationCap,
      color: 'bg-teal-100',
      iconColor: 'text-teal-600',
      trend: 'up'
    },
    {
      label: 'Total Classes',
      value: '156',
      change: '+8',
      icon: BookOpen,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
      trend: 'up'
    },
    {
      label: 'At-Risk Students',
      value: '243',
      change: '-5%',
      icon: AlertCircle,
      color: 'bg-red-100',
      iconColor: 'text-red-600',
      trend: 'down'
    },
    {
      label: 'Avg Performance',
      value: '76%',
      change: '+2%',
      icon: BarChart3,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600',
      trend: 'up'
    },
    {
      label: 'AI Predictions',
      value: '892',
      change: '+45',
      icon: Target,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: 'up'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'alert',
      message: '15 new students identified as at-risk',
      time: '5 minutes ago',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 2,
      type: 'success',
      message: 'Teacher "Prof. Anderson" added new module',
      time: '1 hour ago',
      icon: BookOpen,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      id: 3,
      type: 'info',
      message: 'System backup completed successfully',
      time: '2 hours ago',
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 4,
      type: 'achievement',
      message: '50 students completed their learning paths',
      time: '3 hours ago',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const topPerformers = [
    {
      id: 1,
      name: 'Alex Johnson',
      avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
      class: 'Math 101',
      performance: 98,
      level: 12
    },
    {
      id: 2,
      name: 'Sarah Williams',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      class: 'Math 102',
      performance: 96,
      level: 11
    },
    {
      id: 3,
      name: 'David Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      class: 'Math 101',
      performance: 94,
      level: 10
    }
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole="admin" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'Overview' && 'Admin Dashboard'}
              {activeTab === 'Content' && 'Content'}
              {activeTab === 'Audit Log' && 'Audit Log'}
              {activeTab === 'User Management' && 'User Management'}
              {activeTab === 'Analytics' && 'Analytics'}
              {activeTab === 'Settings' && 'Settings'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeTab === 'Overview' && 'System Overview & Management'}
              {activeTab === 'Content' && 'Manage and monitor your MathPulse AI system'}
              {activeTab === 'Audit Log' && 'Manage and monitor your MathPulse AI system'}
              {activeTab === 'User Management' && 'Manage students, teachers, and administrators'}
              {activeTab === 'Analytics' && 'Detailed system performance metrics'}
              {activeTab === 'Settings' && 'Configure platform settings'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <Settings size={20} />
            </button>
            <button 
              onClick={onOpenProfile}
              className="flex items-center gap-3 bg-slate-100 p-1.5 pr-4 rounded-xl cursor-pointer hover:bg-slate-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">Administrator</p>
                <p className="text-xs text-slate-500 mt-1">System Admin</p>
              </div>
            </button>
            <Button
              onClick={() => setShowLogoutConfirm(true)}
              variant="outline"
              className="px-4 py-2 rounded-xl border-slate-200 hover:border-red-500 hover:text-red-500 font-bold text-sm"
            >
              Logout
            </Button>
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
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                          <Icon size={24} className={stat.iconColor} />
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            stat.trend === 'up'
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {stat.change}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</h3>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Performance Chart Placeholder */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">System Performance Overview</h2>
                    <p className="text-sm text-slate-500">Last 30 days</p>
                  </div>
                  <Button
                    variant="outline"
                    className="px-4 py-2 rounded-xl border-slate-200 hover:border-indigo-600 hover:text-indigo-600 font-bold text-sm"
                  >
                    View Report
                  </Button>
                </div>

                {/* Simplified Chart Visual */}
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-48">
                    {[65, 72, 68, 78, 85, 82, 88, 92, 87, 90, 95, 89].map((value, idx) => (
                      <div key={idx} className="flex-1 flex flex-col justify-end">
                        <div
                          className="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg hover:opacity-80 transition-all cursor-pointer"
                          style={{ height: `${value}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-5">Recent System Activity</h2>
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={activity.id}
                        className={`${activity.bgColor} border border-slate-100 rounded-2xl p-4 flex items-start gap-4`}
                      >
                        <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={20} className={activity.color} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800 mb-1">{activity.message}</p>
                          <p className="text-xs text-slate-500">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Top Performers & Quick Actions */}
            <div className="col-span-4 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
                <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Add New Teacher</p>
                    <p className="text-xs text-indigo-100">Create teacher account</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Add New Student</p>
                    <p className="text-xs text-indigo-100">Register new student</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">System Settings</p>
                    <p className="text-xs text-indigo-100">Configure platform</p>
                  </button>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 text-left transition-all">
                    <p className="text-sm font-bold">Generate Report</p>
                    <p className="text-xs text-indigo-100">Export analytics</p>
                  </button>
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Award size={20} className="text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Top Performers</h2>
                </div>

                <div className="space-y-3">
                  {topPerformers.map((student, idx) => (
                    <div
                      key={student.id}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-800">{student.name}</h4>
                          <p className="text-xs text-slate-600">{student.class}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-2">
                          <p className="text-[10px] text-slate-500 mb-1">Performance</p>
                          <p className="text-lg font-bold text-teal-600">{student.performance}%</p>
                        </div>
                        <div className="bg-white rounded-xl p-2">
                          <p className="text-[10px] text-slate-500 mb-1">Level</p>
                          <p className="text-lg font-bold text-indigo-600">{student.level}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Model Status */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-5">AI Model Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Prediction Accuracy</span>
                    <span className="text-sm font-bold text-teal-600">94.2%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full" style={{ width: '94.2%' }}></div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-slate-600">Model Performance</span>
                    <span className="text-sm font-bold text-indigo-600">Excellent</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: '92%' }}></div>
                  </div>

                  <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <p className="text-xs text-teal-800">
                      <strong>Status:</strong> All systems operational. Last trained 2 days ago.
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