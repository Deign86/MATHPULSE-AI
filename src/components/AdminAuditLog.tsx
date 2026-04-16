import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Shield, AlertTriangle, AlertCircle, Info,
  Calendar, Eye, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { getAuditLogs, type AuditLogEntry } from '../services/adminService';
import { toast } from 'sonner';

const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severity');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [visibleCount, setVisibleCount] = useState(25);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setVisibleCount(25);
  }, [searchTerm, selectedCategory, selectedSeverity, selectedRole, logs.length]);

  // Computed stats from real data
  const infoCount = logs.filter(l => l.severity === 'Info').length;
  const warningCount = logs.filter(l => l.severity === 'Warning').length;
  const errorCount = logs.filter(l => l.severity === 'Error' || l.severity === 'Critical').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Info': return <Info size={16} className="text-sky-600" />;
      case 'Warning': return <AlertTriangle size={16} className="text-rose-600" />;
      case 'Error': return <AlertCircle size={16} className="text-red-600" />;
      case 'Critical': return <AlertCircle size={16} className="text-red-600" />;
      default: return <Info size={16} className="text-[#5a6578]" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Info': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Warning': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Error': return 'bg-red-100 text-red-700 border-red-200';
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200 ring-2 ring-red-500';
      default: return 'bg-[#edf1f7] text-[#0a1628] border-[#dde3eb]';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Auth': return 'bg-sky-100 text-sky-700';
      case 'Data': return 'bg-rose-100 text-rose-700';
      case 'User': return 'bg-sky-100 text-sky-700';
      case 'System': return 'bg-[#edf1f7] text-[#0a1628]';
      case 'Content': return 'bg-green-100 text-green-700';
      default: return 'bg-[#edf1f7] text-[#0a1628]';
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

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[#0a1628]">Audit Log</h2>
        <p className="text-sm text-[#5a6578]">System activity monitoring and security events</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="bg-white px-3 py-2 rounded-xl border border-[#dde3eb] flex items-center gap-2 text-[#5a6578] text-sm font-medium">
          <Calendar size={16} />
          <span>Last 100 events</span>
        </div>
        <Button variant="outline" className="gap-2 border-[#dde3eb] hover:bg-[#edf1f7]" onClick={loadLogs}>
          <RefreshCw size={16} />
          Refresh
        </Button>
        <Button
          variant="outline"
          disabled
          title="Audit log export is not implemented yet"
          className="gap-2 border-[#dde3eb] opacity-60 cursor-not-allowed"
        >
          Export (Unavailable)
        </Button>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={24} className="animate-spin text-sky-500" />
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm">
          <p className="text-xs font-bold text-[#5a6578] mb-1">Total Events</p>
          <p className="text-2xl font-bold text-[#0a1628]">{logs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-sky-600" />
            <p className="text-xs font-bold text-[#5a6578]">Info</p>
          </div>
          <p className="text-2xl font-bold text-sky-600">{infoCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-rose-600" />
            <p className="text-xs font-bold text-[#5a6578]">Warnings</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">{warningCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-red-600" />
            <p className="text-xs font-bold text-[#5a6578]">Errors</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{errorCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#dde3eb] shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            type="text" 
            placeholder="Search by user, action, or details..." 
            className="pl-10 bg-[#edf1f7] border-[#dde3eb]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories">All Categories</SelectItem>
              <SelectItem value="Auth">Auth</SelectItem>
              <SelectItem value="Data">Data</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="System">System</SelectItem>
              <SelectItem value="Content">Content</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="All Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Severity">All Severity</SelectItem>
              <SelectItem value="Info">Info</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Error">Error</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Roles">All Roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Teacher">Teacher</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit List */}
      <div className="bg-white rounded-xl border border-[#dde3eb] shadow-sm overflow-hidden">
        <div className="md:hidden divide-y divide-[#dde3eb]">
          {visibleLogs.map((log) => (
            <div key={`mobile-${log.id}`} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(log.severity)}`}>
                  {getSeverityIcon(log.severity)}
                  {log.severity}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="p-2 hover:bg-[#dde3eb] rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
                  aria-label={`View audit event ${log.action}`}
                >
                  <Eye size={16} />
                </button>
              </div>
              <p className="text-sm font-semibold text-[#0a1628]">{log.action}</p>
              <p className="text-xs text-[#5a6578]">{log.timestamp}</p>
              <p className="text-xs text-[#5a6578]">{log.user.name} ({log.user.role})</p>
              <p className="text-xs text-[#5a6578]">{log.details}</p>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[980px] text-left border-collapse">
          <thead>
            <tr className="bg-[#edf1f7] border-b border-[#dde3eb]">
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Severity</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Timestamp</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">User</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Category</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider">Details</th>
              <th className="p-4 text-xs font-bold text-[#5a6578] uppercase tracking-wider text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde3eb]">
            {visibleLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#edf1f7] transition-colors">
                <td className="p-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(log.severity)}`}>
                    {getSeverityIcon(log.severity)}
                    {log.severity}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-[#5a6578] text-sm">
                    <div className="p-1 bg-[#edf1f7] rounded">
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
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                        <Shield size={16} className="text-sky-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[#0a1628] text-sm">{log.user.name}</p>
                      <p className="text-xs text-[#5a6578]">{log.user.role}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-medium text-[#0a1628] text-sm">{log.action}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </span>
                </td>
                <td className="p-4 text-sm text-[#5a6578] max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="p-2 hover:bg-[#dde3eb] rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
                    aria-label={`View audit event ${log.action}`}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {filteredLogs.length > visibleCount ? (
          <div className="border-t border-[#dde3eb] p-4 flex justify-center">
            <Button
              variant="outline"
              className="border-[#dde3eb]"
              onClick={() => setVisibleCount((previous) => previous + 25)}
            >
              Load more events
            </Button>
          </div>
        ) : null}

        {filteredLogs.length === 0 && !loading && (
          <div className="p-12 text-center text-[#5a6578]">
            <Shield size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="font-medium">No logs found</p>
            <p className="text-sm">{logs.length === 0 ? 'Audit events will appear here as actions are performed' : 'Try adjusting your search or filters'}</p>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLog?.action || 'Audit Event Details'}</DialogTitle>
            <DialogDescription>
              Detailed audit information for operational review.
            </DialogDescription>
          </DialogHeader>
          {selectedLog ? (
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-[#0a1628]">Severity:</span> {selectedLog.severity}</p>
              <p><span className="font-semibold text-[#0a1628]">Category:</span> {selectedLog.category}</p>
              <p><span className="font-semibold text-[#0a1628]">Timestamp:</span> {selectedLog.timestamp}</p>
              <p><span className="font-semibold text-[#0a1628]">User:</span> {selectedLog.user.name} ({selectedLog.user.role})</p>
              <p><span className="font-semibold text-[#0a1628]">Details:</span> {selectedLog.details}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminAuditLog;
