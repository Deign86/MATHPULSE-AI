import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Shield, AlertTriangle, AlertCircle, Info,
  Calendar, Eye, Loader2, RefreshCw, Lock,
  FileText, ShieldAlert, UserCheck, ChevronLeft, ChevronRight,
  ListFilter, ArrowRight, Clock, ShieldCheck, Activity,
  Filter, Download, RotateCcw
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { getAuditLogs, type AuditLogEntry } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─────────────────────────────────────────────
// Internal Components
// ─────────────────────────────────────────────

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  variant: 'blue' | 'purple' | 'rose' | 'emerald';
}> = ({ title, value, subtitle, icon: Icon, variant }) => {
  const variants = {
    blue: 'bg-[#5154E7] shadow-blue-200/50',
    purple: 'bg-[#9956DE] shadow-purple-200/50',
    rose: 'bg-[#F43F5E] shadow-rose-200/50',
    emerald: 'bg-[#10B981] shadow-emerald-200/50',
  };

  return (
    <div className={`relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg transition-all hover:scale-[1.02] ${variants[variant]}`}>
      <div className="absolute -right-4 -top-4 opacity-10">
        <Icon size={100} />
      </div>
      <div className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      <h3 className="text-2xl font-black mt-2 leading-none">{value}</h3>
      <p className="text-[10px] font-bold mt-4 opacity-70 uppercase tracking-widest">{subtitle}</p>
      
      {/* Subject Card Styling Circle */}
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
    </div>
  );
};

const AdminAuditLog: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadLogs = useCallback(async () => {
    if (authLoading || !userProfile) return;

    const normalizedRole = String(userProfile.role || '').toLowerCase();
    if (normalizedRole !== 'admin' && normalizedRole !== 'teacher') {
      setLoading(false);
      setAccessDenied(true);
      return;
    }

    setAccessDenied(false);
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [authLoading, userProfile]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Computed stats from real data
  const infoCount = logs.filter(l => l.severity === 'Info').length;
  const warningCount = logs.filter(l => l.severity === 'Warning').length;
  const alertCount = logs.filter(l => l.severity === 'Error' || l.severity === 'Critical').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Info': return <Info size={14} />;
      case 'Warning': return <AlertTriangle size={14} />;
      case 'Error': return <ShieldAlert size={14} />;
      case 'Critical': return <AlertCircle size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Info': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'Warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Error': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Critical': return 'bg-red-50 text-red-600 border-red-100 ring-1 ring-red-500';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  // Label mappings for full-word display
  const CATEGORY_LABELS: Record<string, string> = {
    'All Categories': 'All Categories',
    'Auth': 'Authentication',
    'Data': 'Data Operations',
    'User': 'User Management',
    'System': 'System Engine',
    'Content': 'Content Pipeline'
  };

  const SEVERITY_LABELS: Record<string, string> = {
    'All Severities': 'All Severities',
    'Info': 'Information',
    'Warning': 'Warning',
    'Error': 'Error',
    'Critical': 'Critical'
  };

  const ROLE_LABELS: Record<string, string> = {
    'All Roles': 'All Roles',
    'Admin': 'Administrator',
    'Teacher': 'Educator',
    'Student': 'Student'
  };

  // Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.user.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All Categories' || log.category === selectedCategory;
      const matchesSeverity = selectedSeverity === 'All Severities' || log.severity === selectedSeverity;
      const matchesRole = selectedRole === 'All Roles' || log.user.role === selectedRole;
      
      return matchesSearch && matchesCategory && matchesSeverity && matchesRole;
    });
  }, [logs, searchTerm, selectedCategory, selectedSeverity, selectedRole]);

  // Pagination Logic
  const totalPages = Math.max(Math.ceil(filteredLogs.length / pageSize), 1);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSeverity, selectedRole]);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-[32px] border border-slate-200 mt-8">
        <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
          <Lock size={40} className="text-rose-500" />
        </div>
        <h3 className="text-2xl font-black text-[#1e293b]">Access Denied</h3>
        <p className="text-slate-400 font-medium max-w-md mx-auto mt-2 uppercase text-[11px] tracking-widest">
          Security policy restricts audit log visibility to administrative personnel only.
        </p>
      </div>
    );
  }

  // Calculate visible range
  const visibleRangeStart = filteredLogs.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const visibleRangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  return (
    <div className="flex flex-col min-h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 space-y-8 pt-6 xl:pt-8 pb-6 px-1 max-w-[1600px] mx-auto w-full">
        {/* ── 1. Action Header Bar ── */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-[#9956DE] rounded-full" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">System Governance Pipeline</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={loadLogs} 
               disabled={loading}
               className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-purple-600 shadow-sm transition-all active:scale-95 group"
               title="Synchronize logs"
             >
               <RefreshCw size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
             </button>
             <button 
               disabled
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-60 cursor-not-allowed"
             >
               <Download size={14} /> Export Logs
             </button>
          </div>
        </div>

        {/* ── 2. Performance Metric Pods ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            title="Total Events"
            value={loading ? '...' : logs.length}
            subtitle="System-Wide Logs"
            icon={FileText}
            variant="purple"
          />
          <StatCard
            title="Security Alerts"
            value={loading ? '...' : alertCount}
            subtitle="Critical Incidents"
            icon={ShieldAlert}
            variant="rose"
          />
          <StatCard
            title="Operational Info"
            value={loading ? '...' : infoCount}
            subtitle="Routine Pipelines"
            icon={UserCheck}
            variant="blue"
          />
          <StatCard
            title="System Health"
            value={alertCount > 0 ? 'Compromised' : 'Healthy'}
            subtitle="Live Monitoring"
            icon={ShieldCheck}
            variant={alertCount > 0 ? 'rose' : 'emerald'}
          />
        </div>

        {/* ── 3. High-Fidelity Filtering Area ── */}
        <div className="sticky top-0 z-40 -mx-[24px] xl:-mx-[32px] px-[24px] xl:px-[32px] pt-4 pb-4 bg-[#f8fafc]">
          <div className="flex flex-col xl:flex-row items-center gap-3">
              {/* Global Search */}
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#9956DE] transition-colors" size={16} />
                <Input 
                  type="text" 
                  placeholder="Trace user identity, action strings, or operation details..." 
                  className="pl-11 h-12 bg-white border-slate-200/60 rounded-2xl focus-visible:ring-[#9956DE]/20 focus-visible:border-[#9956DE] transition-all text-sm font-medium shadow-md shadow-slate-200/40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px] bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[10px] font-black uppercase tracking-widest text-slate-900 rounded-xl h-12 shadow-md shadow-slate-200/40 px-4">
                    <span className="truncate">{CATEGORY_LABELS[selectedCategory] || selectedCategory}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="All Categories" className="font-bold">All Categories</SelectItem>
                    <SelectItem value="Auth" className="font-bold">Authentication</SelectItem>
                    <SelectItem value="Data" className="font-bold">Data Operations</SelectItem>
                    <SelectItem value="User" className="font-bold">User Management</SelectItem>
                    <SelectItem value="System" className="font-bold">System Engine</SelectItem>
                    <SelectItem value="Content" className="font-bold">Content Pipeline</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-[200px] bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[10px] font-black uppercase tracking-widest text-slate-900 rounded-xl h-12 shadow-md shadow-slate-200/40 px-4">
                    <span className="truncate">{SEVERITY_LABELS[selectedSeverity] || selectedSeverity}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="All Severities" className="font-bold">All Severities</SelectItem>
                    <SelectItem value="Info" className="font-bold">Information</SelectItem>
                    <SelectItem value="Warning" className="font-bold">Warning</SelectItem>
                    <SelectItem value="Error" className="font-bold">Error</SelectItem>
                    <SelectItem value="Critical" className="font-bold">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px] bg-white border border-slate-200 hover:border-[#9956DE] transition-all focus:ring-2 focus:ring-[#9956DE]/10 text-[10px] font-black uppercase tracking-widest text-slate-900 rounded-xl h-12 shadow-md shadow-slate-200/40 px-4">
                    <span className="truncate">{ROLE_LABELS[selectedRole] || selectedRole}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="All Roles" className="font-bold">All Roles</SelectItem>
                    <SelectItem value="Admin" className="font-bold">Administrator</SelectItem>
                    <SelectItem value="Teacher" className="font-bold">Educator</SelectItem>
                    <SelectItem value="Student" className="font-bold">Student</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All Categories');
                    setSelectedSeverity('All Severities');
                    setSelectedRole('All Roles');
                  }}
                  disabled={!searchTerm && selectedCategory === 'All Categories' && selectedSeverity === 'All Severities' && selectedRole === 'All Roles'}
                  className="h-12 w-12 rounded-2xl border-slate-200/60 text-[#9956DE] hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  title="Reset Filters"
                >
                  <RotateCcw size={18} />
                </Button>
              </div>
          </div>
        </div>

        {/* ── 4. Main Table Area ── */}
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/40 relative">
          <div className="rounded-[32px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-[106px] z-30 shadow-md bg-[#f8fafc]">
                <tr className="border-b border-[#8b5cf6]">
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap rounded-tl-[32px]">Incident Level</th>
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">User Actor</th>
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Action Performed</th>
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Component</th>
                  <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest text-right whitespace-nowrap rounded-tr-[32px]">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(10).fill(0).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={6} className="h-20 p-8">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 animate-pulse" />
                           <div className="space-y-2">
                             <div className="w-32 h-3 bg-slate-50 animate-pulse rounded" />
                             <div className="w-48 h-2 bg-slate-50 animate-pulse rounded" />
                           </div>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Shield size={48} className="text-slate-100 mb-4" />
                        <p className="text-[16px] font-black text-[#1e293b]">No audit trails captured</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Try adjusting your tracking filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-purple-50/20 transition-colors">
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getSeverityStyle(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Clock size={14} />
                          </div>
                          <span className="text-[13px] font-bold text-[#1e293b]">{log.timestamp}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {log.user.avatar ? (
                              <img src={log.user.avatar} alt={log.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <Shield size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-[#1e293b] leading-none group-hover:text-[#9956DE] transition-colors truncate">{log.user.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{log.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-[#1e293b] truncate max-w-[250px]" title={log.details}>{log.action}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[250px] mt-0.5">{log.details}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 uppercase tracking-widest">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex justify-end">
                           <button
                            onClick={() => setSelectedLog(log)}
                            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#9956DE] hover:border-[#9956DE]/30 hover:bg-purple-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Eye size={16} />
                          </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>{/* End flex-1 content wrapper */}

      {/* ── 5. Standardized Sticky Footer Pagination ── */}
      <div className="sticky bottom-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-12 py-3 bg-white border-t-2 border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] -mx-[24px] xl:-mx-[32px] w-[calc(100%+48px)] xl:w-[calc(100%+64px)]">
        <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9956DE] animate-pulse shadow-[0_0_12px_rgba(153,86,222,0.6)]"></span>
          Showing <span className="text-slate-900 font-black border-b-2 border-[#9956DE]/40 pb-0.5">{visibleRangeStart}–{visibleRangeEnd}</span>
          <span className="text-slate-300 font-bold mx-1">/</span>
          <span className="text-slate-900 font-black border-b-2 border-[#9956DE]/40 pb-0.5">{filteredLogs.length}</span>
          <span className="text-slate-400 ml-1">Total System Records</span>
        </p>

        <div className="flex items-center gap-6">
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[140px] bg-white border border-slate-300 text-[11px] font-black uppercase tracking-wider text-slate-900 rounded-xl hover:border-[#9956DE] transition-all px-4 shadow-sm">
              <span className="truncate">{pageSize} / Page</span>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="font-bold">{size} / Page</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl bg-[#9956DE] border-none text-white hover:bg-[#8b5cf6] hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-purple-200/60"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </Button>

            <div className="px-5 py-2 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center min-w-[130px]">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                Page <span className="text-[#9956DE] mx-1">{currentPage}</span>
                <span className="text-slate-300 mx-1">OF</span>
                <span className="text-slate-500">{Math.max(totalPages, 1)}</span>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl bg-[#9956DE] border-none text-white hover:bg-[#8b5cf6] hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-purple-200/60"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 6. Log Detail Modal ── */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-[600px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <div className={`h-2 w-full ${selectedLog ? getSeverityStyle(selectedLog.severity).split(' ')[0].replace('bg-', 'bg-').replace('-50', '-500') : 'bg-purple-600'}`}></div>
          <div className="p-8 space-y-6">
            <DialogHeader className="text-left">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#9956DE] border border-slate-100">
                    <ShieldCheck size={24} />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-black text-[#1e293b] leading-tight">
                      {selectedLog?.action || 'Audit Event Details'}
                    </DialogTitle>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                      Platform Operational Integrity Trail
                    </p>
                 </div>
               </div>
            </DialogHeader>
            
            {selectedLog && (
              <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incident Severity</p>
                   <p className="text-sm font-black text-[#1e293b]">{selectedLog.severity}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                   <p className="text-sm font-black text-[#1e293b]">{selectedLog.timestamp}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Component</p>
                   <p className="text-sm font-black text-[#1e293b]">{selectedLog.category}</p>
                </div>
                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User Actor</p>
                   <p className="text-sm font-black text-[#1e293b]">{selectedLog?.user.name}</p>
                </div>
                <div className="col-span-2 space-y-1 mt-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Operation Details</p>
                   <p className="text-sm font-medium text-[#1e293b] leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                     {selectedLog.details}
                   </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button 
                onClick={() => setSelectedLog(null)}
                className="bg-[#9956DE] hover:bg-[#8b5cf6] text-white rounded-xl px-8 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-purple-100 transition-all"
              >
                Dismiss Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLog;
