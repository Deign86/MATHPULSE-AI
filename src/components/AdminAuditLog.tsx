import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Shield, AlertTriangle, AlertCircle, Info, Download, 
  Calendar, Eye, User, FileText, Settings, Database, Lock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const AdminAuditLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severity');
  const [selectedRole, setSelectedRole] = useState('All Roles');

  const logs = [
    {
      id: 1,
      severity: 'Info',
      timestamp: '2025-01-18 09:30:00',
      user: { name: 'Dr. Maria Santos', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop' },
      action: 'User Login',
      category: 'Auth',
      details: 'Admin logged in successfully'
    },
    {
      id: 2,
      severity: 'Info',
      timestamp: '2025-01-18 08:50:00',
      user: { name: 'Prof. Anderson', role: 'Teacher', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
      action: 'Uploaded Class Records',
      category: 'Data',
      details: 'Uploaded sample_grades.csv with 25 student records'
    },
    {
      id: 3,
      severity: 'Warning',
      timestamp: '2025-01-17 16:00:00',
      user: { name: 'Dr. Maria Santos', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop' },
      action: 'User Status Changed',
      category: 'User',
      details: 'Suspended user: james.park@student.edu - Reason: Policy violation'
    },
    {
      id: 4,
      severity: 'Info',
      timestamp: '2025-01-18 03:00:00',
      user: { name: 'System', role: 'Admin', avatar: null },
      action: 'Automatic Backup',
      category: 'System',
      details: 'Daily automatic backup completed successfully - 1.2GB'
    },
    {
      id: 5,
      severity: 'Info',
      timestamp: '2025-01-17 14:22:00',
      user: { name: 'Sarah Chen', role: 'Student', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
      action: 'Password Reset Request',
      category: 'Auth',
      details: 'Password reset email sent to sarah.chen@student.edu'
    },
    {
      id: 6,
      severity: 'Warning',
      timestamp: '2025-01-17 12:00:00',
      user: { name: 'Dr. Robert Chen', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
      action: 'System Settings Updated',
      category: 'System',
      details: 'Changed maintenance mode: disabled → enabled (scheduled)'
    },
    {
      id: 7,
      severity: 'Info',
      timestamp: '2025-01-16 15:30:00',
      user: { name: 'Ms. Rebecca Johnson', role: 'Teacher', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop' },
      action: 'Module Published',
      category: 'Content',
      details: 'Published new module: "Quadratic Equations Practice"'
    },
    {
      id: 8,
      severity: 'Error',
      timestamp: '2025-01-16 22:15:00',
      user: { name: 'System', role: 'Admin', avatar: null },
      action: 'Failed Login Attempt',
      category: 'Auth',
      details: 'Multiple failed login attempts for: unknown@email.com - IP blocked'
    },
    {
      id: 9,
      severity: 'Info',
      timestamp: '2024-07-15 09:00:00',
      user: { name: 'Dr. Maria Santos', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop' },
      action: 'Created New User',
      category: 'User',
      details: 'Created new teacher account: Ms. Rebecca Johnson (johnson@school.edu)'
    }
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Info': return <Info size={16} className="text-blue-600" />;
      case 'Warning': return <AlertTriangle size={16} className="text-amber-600" />;
      case 'Error': return <AlertCircle size={16} className="text-red-600" />;
      case 'Critical': return <AlertCircle size={16} className="text-red-600" />;
      default: return <Info size={16} className="text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Info': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Error': return 'bg-red-100 text-red-700 border-red-200';
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200 ring-2 ring-red-500';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Auth': return 'bg-purple-100 text-purple-700';
      case 'Data': return 'bg-amber-100 text-amber-700';
      case 'User': return 'bg-blue-100 text-blue-700';
      case 'System': return 'bg-slate-100 text-slate-700';
      case 'Content': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || log.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'All Severity' || log.severity === selectedSeverity;
    const matchesRole = selectedRole === 'All Roles' || log.user.role === selectedRole;
    
    return matchesSearch && matchesCategory && matchesSeverity && matchesRole;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-slate-800">Audit Log</h2>
        <p className="text-sm text-slate-500">System activity monitoring and security events</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 text-slate-600 text-sm font-medium">
          <Calendar size={16} />
          <span>Last 7 days</span>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50">
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-slate-800">12</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-blue-600" />
            <p className="text-xs font-bold text-slate-500">Info</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">8</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-xs font-bold text-slate-500">Warnings</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">2</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-red-600" />
            <p className="text-xs font-bold text-slate-500">Errors</p>
          </div>
          <p className="text-2xl font-bold text-red-600">2</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            type="text" 
            placeholder="Search by user, action, or details..." 
            className="pl-10 bg-slate-50 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option>All Categories</option>
            <option>Auth</option>
            <option>Data</option>
            <option>User</option>
            <option>System</option>
            <option>Content</option>
          </select>
          <select 
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option>All Severity</option>
            <option>Info</option>
            <option>Warning</option>
            <option>Error</option>
            <option>Critical</option>
          </select>
          <select 
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option>All Roles</option>
            <option>Admin</option>
            <option>Teacher</option>
            <option>Student</option>
          </select>
        </div>
      </div>

      {/* Audit List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(log.severity)}`}>
                    {getSeverityIcon(log.severity)}
                    {log.severity}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <div className="p-1 bg-slate-100 rounded">
                      <Calendar size={12} />
                    </div>
                    {log.timestamp}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {log.user.avatar ? (
                      <img src={log.user.avatar} alt={log.user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Shield size={16} className="text-purple-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{log.user.name}</p>
                      <p className="text-xs text-slate-500">{log.user.role}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-medium text-slate-800 text-sm">{log.action}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Shield size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium">No logs found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminAuditLog;
