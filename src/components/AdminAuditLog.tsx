import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Shield, AlertTriangle, AlertCircle, Info,
  Eye, Loader2, RefreshCw, Lock,
  FileText, ShieldAlert, UserCheck, ChevronLeft, ChevronRight,
  Clock, ShieldCheck, Activity,
  FilterX, Download, Copy, Check, type LucideIcon
} from 'lucide-react';
import { recordGet } from '../utils/memberOf';
import { Button } from './ui/button';
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
  const [isExporting, setIsExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
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
  const alertCount = logs.filter(l => l.severity === 'Error' || l.severity === 'Critical' || l.severity === 'Warning').length;
  const adminActionCount = logs.filter(l => l.user?.role === 'Admin' || l.category === 'User' || l.category === 'Auth').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Info': return <Info size={12} />;
      case 'Warning': return <AlertTriangle size={12} />;
      case 'Error': return <ShieldAlert size={12} />;
      case 'Critical': return <AlertCircle size={12} />;
      default: return <Activity size={12} />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Info': return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60';
      case 'Warning': return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
      case 'Error': return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60';
      case 'Critical': return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 ring-1 ring-red-400/40';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

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

  // Export CSV Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const rows = [
        ['MathPulse AI - Security & Activity Audit Log Export'],
        [`Exported At: ${new Date().toLocaleString()}`],
        [`Filtered Events: ${filteredLogs.length} of ${logs.length}`],
        [],
        ['Event ID', 'Severity', 'Timestamp', 'Actor Name', 'Actor Role', 'Category', 'Action', 'Details'],
        ...filteredLogs.map(l => [
          l.id,
          l.severity,
          l.timestamp,
          l.user?.name || 'System',
          l.user?.role || 'Service',
          l.category,
          l.action,
          l.details
        ])
      ];

      const csvContent = rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MathPulse_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Audit log exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export audit log');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('Copied to clipboard');
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mt-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mb-4">
          <Lock size={32} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Security policy limits audit log inspection to administrative and authorized personnel.
        </p>
      </div>
    );
  }

  // Calculate visible range
  const visibleRangeStart = filteredLogs.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const visibleRangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  const kpis = [
    {
      title: 'Total Audit Events',
      value: loading ? null : logs.length.toLocaleString(),
      subValue: 'System & user telemetry',
      icon: FileText,
      trend: '+18.4%',
      badge: 'Audit Base',
      isPositive: true,
      gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)]',
      progressPercent: 84,
    },
    {
      title: 'Security & Warnings',
      value: loading ? null : alertCount.toString(),
      subValue: alertCount > 0 ? 'Requires administrative review' : 'Zero critical errors',
      icon: ShieldAlert,
      badge: alertCount > 0 ? 'Action Needed' : 'All Clear',
      trend: alertCount > 0 ? 'Review' : 'Clear',
      isPositive: alertCount === 0,
      gradient: alertCount > 0
        ? 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]'
        : 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
      shadow: alertCount > 0
        ? 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.48)]'
        : 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.48)]',
      progressPercent: Math.min(100, Math.max(10, alertCount * 10)),
    },
    {
      title: 'Admin Operations',
      value: loading ? null : adminActionCount.toLocaleString(),
      subValue: 'User and auth mutations',
      icon: UserCheck,
      badge: 'Admin Mutate',
      trend: '+12.1%',
      isPositive: true,
      gradient: 'bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#4338CA]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(99,102,241,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(99,102,241,0.48)]',
      progressPercent: 65,
    },
    {
      title: 'Platform Integrity',
      value: loading ? null : alertCount > 0 ? 'Review' : 'Optimal',
      subValue: 'Security enforcement active',
      icon: ShieldCheck,
      badge: 'Protected',
      trend: 'Protected',
      isPositive: true,
      gradient: 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.48)]',
      progressPercent: 100,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-8 animate-in fade-in duration-300">
      
      {/* ── Top Utility & Action Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Audit Pipeline Active
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tracking <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{logs.length}</span> recorded administrative events
          </span>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button 
            onClick={loadLogs} 
            disabled={loading}
            title="Synchronize logs"
            aria-label="Synchronize logs"
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#9956DE] dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#9956DE]' : ''} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting || loading || filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] px-3.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 border border-purple-400/30 cursor-pointer"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Bento Cards (Full Color Gradients) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${kpi.gradient} ${kpi.shadow} border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out flex flex-col justify-between group min-w-0 text-white select-none`}
            >
              {/* Ambient Glow */}
              <div className="absolute -bottom-6 -right-6 w-24 sm:w-36 h-24 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 truncate">
                      {kpi.title}
                    </span>
                    {kpi.badge && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                        {kpi.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    {loading ? (
                      <div className="h-7 w-20 bg-white/20 rounded-lg animate-pulse" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-display font-black text-white tabular-nums tracking-tight leading-none drop-shadow-xs">
                        {kpi.value}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs text-white">
                  <Icon size={18} />
                </div>
              </div>

              {/* Subtext and Progress Bar */}
              <div className="relative z-10 space-y-2 mt-2 pt-2.5 border-t border-white/20">
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <span className="text-white/90 font-medium truncate drop-shadow-xs">
                    {kpi.subValue}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-black text-white text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/25 shadow-2xs shrink-0">
                    {kpi.trend}
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500 shadow-xs"
                    style={{ width: `${Math.min(Math.max(kpi.progressPercent, 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── High-Fidelity Filtering Area ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-3">
        {/* Line 1: Search and Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Global Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by actor, action description, or event details..."
              className="w-full pl-10 pr-3 h-10 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-medium outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE]/30 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[155px] bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-10">
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
              <SelectTrigger className="w-full sm:w-[145px] bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-10">
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
              <SelectTrigger className="w-full sm:w-[140px] bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-medium rounded-xl h-10">
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
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-700/60 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 disabled:opacity-40 shrink-0"
              title="Reset Filters"
              aria-label="Reset Filters"
            >
              <FilterX size={15} />
            </Button>
          </div>
        </div>

        {/* Line 2: Context Bar & Inline Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{visibleRangeStart}–{visibleRangeEnd}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredLogs.length}</strong> events
            </span>
            {(searchTerm || selectedCategory !== 'All Categories' || selectedSeverity !== 'All Severities' || selectedRole !== 'All Roles') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200/60 dark:border-purple-800/40">
                Filtered View
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[105px] bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold rounded-lg px-2.5">
                <span className="truncate">{pageSize} / page</span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700/60">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">{size} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg border-slate-200/80 dark:border-slate-700/60 disabled:opacity-40 cursor-pointer"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </Button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 tabular-nums">
                {currentPage} / {Math.max(totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg border-slate-200/80 dark:border-slate-700/60 disabled:opacity-40 cursor-pointer"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Audit Table Area ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3.5 text-center w-28">Severity</th>
                <th className="px-4 py-3.5 text-left w-44">Timestamp</th>
                <th className="px-4 py-3.5 text-left w-48">Actor</th>
                <th className="px-4 py-3.5 text-left">Action & Details</th>
                <th className="px-4 py-3.5 text-center w-36">Component</th>
                <th className="px-4 py-3.5 text-center w-20">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {loading ? (
                Array(6).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="h-16 px-4 py-4">
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
                      <p className="text-xs text-slate-400 mt-0.5">Try clearing search parameters or adjusting severity filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-all border-l-2 border-l-transparent hover:border-l-[#9956DE]"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityStyle(log.severity)}`}>
                        {getSeverityIcon(log.severity)}
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span className="tabular-nums">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center overflow-hidden shrink-0 text-[#9956DE] dark:text-purple-300 font-bold text-xs">
                          {log.user.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{log.user.name || 'System'}</p>
                          <p className="text-[10px] text-slate-400 font-medium capitalize">{log.user.role || 'Service'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[320px] group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors" title={log.action}>
                        {log.action}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[320px] mt-0.5" title={log.details}>
                        {log.details}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 inline-block border border-slate-200/60 dark:border-slate-600/40">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-[#9956DE] hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800/50 transition-all cursor-pointer"
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

      {/* ── Log Detail Modal ── */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-900/50 flex items-center justify-center text-[#9956DE] dark:text-purple-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedLog?.action || 'Audit Event Details'}
                </DialogTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Complete audit event record and execution payload
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedLog.severity}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{selectedLog.timestamp}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Component</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedLog.category}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actor</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{selectedLog.user.name} ({selectedLog.user.role || 'Service'})</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action & Payload Details</p>
                  <button
                    onClick={() => handleCopyDetails(selectedLog.details)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9956DE] dark:text-purple-300 hover:underline cursor-pointer"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copiedId ? 'Copied' : 'Copy Details'}
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono select-all">
                  {selectedLog.details}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button 
              onClick={() => setSelectedLog(null)}
              className="rounded-xl px-5 text-xs font-bold cursor-pointer"
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
