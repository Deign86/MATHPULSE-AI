import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Shield, AlertTriangle, AlertCircle, Info,
  Eye, Loader2, RefreshCw, Lock,
  FileText, ShieldAlert, UserCheck, ChevronLeft, ChevronRight,
  Clock, ShieldCheck, Activity,
  FilterX, Download, type LucideIcon
} from 'lucide-react';
import { recordGet } from '../utils/memberOf';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
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
  icon: LucideIcon;
  variant: 'blue' | 'purple' | 'rose' | 'emerald';
}> = ({ title, value, subtitle, icon: Icon, variant }) => {
  const iconThemes = {
    blue: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50',
    purple: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between min-h-[58px] sm:min-h-[120px]">
      <div className="flex items-center justify-between mb-1.5 sm:mb-3">
        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border shrink-0 ${iconThemes[variant]}`}>
          <Icon size={14} className="sm:hidden" />
          <Icon size={18} className="hidden sm:block" />
        </div>
        <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400">Security</span>
      </div>
      <div>
        <p className="text-lg sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums leading-none">
          {value}
        </p>
        <p className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 sm:mt-2 truncate">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block truncate">{subtitle}</p>
      </div>
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
  const alertCount = logs.filter(l => l.severity === 'Error' || l.severity === 'Critical').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Info': return <Info size={13} />;
      case 'Warning': return <AlertTriangle size={13} />;
      case 'Error': return <ShieldAlert size={13} />;
      case 'Critical': return <AlertCircle size={13} />;
      default: return <Activity size={13} />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Info': return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50';
      case 'Warning': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50';
      case 'Error': return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50';
      case 'Critical': return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800/50 ring-1 ring-red-400';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Label mappings for full-word display
  const CATEGORY_LABELS = {
    'All Categories': 'All Categories',
    'Auth': 'Authentication',
    'Data': 'Data Operations',
    'User': 'User Management',
    'System': 'System Engine',
    'Content': 'Content Pipeline'
  };

  const SEVERITY_LABELS = {
    'All Severities': 'All Severities',
    'Info': 'Information',
    'Warning': 'Warning',
    'Error': 'Error',
    'Critical': 'Critical'
  };

  const ROLE_LABELS = {
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mt-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mb-4">
          <Lock size={32} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Security policy limits audit log inspection to administrative personnel.
        </p>
      </div>
    );
  }

  // Calculate visible range
  const visibleRangeStart = filteredLogs.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const visibleRangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  return (
    <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
      {/* ── 1. Action Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">System Governance & Audit Trails</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
              <Shield size={11} /> Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immutable record of security events, administrative changes, and user operations</p>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={loadLogs} 
            disabled={loading}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Synchronize logs"
            aria-label="Synchronize logs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
          <Button 
            variant="outline"
            disabled
            className="h-[44px] px-3.5 gap-2 rounded-xl border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed"
          >
            <Download size={14} /> Export Logs
          </Button>
        </div>
      </div>

      {/* ── 2. Performance Metric Bento Pods ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Events"
          value={loading ? '...' : logs.length}
          subtitle="System-wide records"
          icon={FileText}
          variant="purple"
        />
        <StatCard
          title="Security Alerts"
          value={loading ? '...' : alertCount}
          subtitle="Requires attention"
          icon={ShieldAlert}
          variant="rose"
        />
        <StatCard
          title="Operational Info"
          value={loading ? '...' : infoCount}
          subtitle="Routine system events"
          icon={UserCheck}
          variant="blue"
        />
        <StatCard
          title="Platform Status"
          value={alertCount > 0 ? 'Review Needed' : 'Nominal'}
          subtitle="Real-time telemetry"
          icon={ShieldCheck}
          variant={alertCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* ── 3. High-Fidelity Filtering Area ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              type="text" 
              placeholder="Search by actor, action description, or details..." 
              className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-medium focus-visible:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[170px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-11">
                <span className="truncate">{recordGet(CATEGORY_LABELS, selectedCategory) ?? selectedCategory}</span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700/60">
                <SelectItem value="All Categories">All Categories</SelectItem>
                <SelectItem value="Auth">Authentication</SelectItem>
                <SelectItem value="Data">Data Operations</SelectItem>
                <SelectItem value="User">User Management</SelectItem>
                <SelectItem value="System">System Engine</SelectItem>
                <SelectItem value="Content">Content Pipeline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-full sm:w-[160px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-11">
                <span className="truncate">{recordGet(SEVERITY_LABELS, selectedSeverity) ?? selectedSeverity}</span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700/60">
                <SelectItem value="All Severities">All Severities</SelectItem>
                <SelectItem value="Info">Information</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-[150px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-11">
                <span className="truncate">{recordGet(ROLE_LABELS, selectedRole) ?? selectedRole}</span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700/60">
                <SelectItem value="All Roles">All Roles</SelectItem>
                <SelectItem value="Admin">Administrator</SelectItem>
                <SelectItem value="Teacher">Educator</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
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
              className="h-11 w-11 rounded-xl border-slate-200/80 dark:border-slate-700/60 text-slate-500 hover:text-indigo-600 disabled:opacity-40"
              title="Reset Filters"
              aria-label="Reset Filters"
            >
              <FilterX size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4. Main Table Area ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action & Scope</th>
                <th className="px-5 py-3.5">Component</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                Array(6).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="h-16 px-5 py-4">
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700" />
                        <div className="space-y-1.5 flex-1">
                          <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded" />
                          <div className="w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center p-8">
                      <Shield size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No audit events match current criteria</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try widening your filters or clearing search parameters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getSeverityStyle(log.severity)}`}>
                        {getSeverityIcon(log.severity)}
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span className="tabular-nums">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center overflow-hidden shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                          {log.user.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{log.user.name || 'System'}</p>
                          <p className="text-[10px] text-slate-400 font-medium capitalize">{log.user.role || 'Service'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[280px]" title={log.action}>{log.action}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[280px] mt-0.5" title={log.details}>{log.details}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                        aria-label={`View details for ${log.action}`}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Standardized Pagination Footer ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{visibleRangeStart}–{visibleRangeEnd}</span> of <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{filteredLogs.length}</span> recorded events
        </p>

        <div className="flex items-center gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[120px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl px-3">
              <span className="truncate">{pageSize} / page</span>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700/60">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">{size} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/60 disabled:opacity-40"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>

            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 tabular-nums">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/60 disabled:opacity-40"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 6. Log Detail Modal ── */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedLog?.action || 'Audit Event Details'}
                </DialogTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Platform operational integrity trail
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {selectedLog && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Severity</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.severity}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timestamp</p>
                <p className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{selectedLog.timestamp}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Component</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.category}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actor</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">{selectedLog.user.name} ({selectedLog.user.role || 'Service'})</p>
              </div>
              <div className="col-span-2 space-y-1 mt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Details</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  {selectedLog.details}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => setSelectedLog(null)}
              className="rounded-xl px-5 text-xs font-semibold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLog;

