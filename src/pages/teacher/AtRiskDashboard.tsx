import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { RiskBadge } from '../../components/risk/RiskBadge';
import { RiskDetailPanel } from '../../components/risk/RiskDetailPanel';
import { InterventionChecklistPanel } from '../../components/risk/InterventionChecklistPanel';
import {
  ShieldCheck,
  Eye,
  AlertTriangle,
  AlertCircle,
  Skull,
  Search,
  RefreshCw,
  ChevronDown,
  SortAsc,
  SortDesc,
  Users,
} from 'lucide-react';
import type { ManagedStudent } from '../../services/studentService';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'safe' | 'watch' | 'intervene' | 'critical' | 'at_risk';
type SortField = 'name' | 'wri' | 'updatedAt';

interface DashboardStudent extends ManagedStudent {
  wri: number | null;
  riskStatus: 'safe' | 'watch' | 'intervene' | 'critical' | 'at_risk' | null;
  diagnosticScore: number | null;
  externalGradesAvg: number | null;
  systemPerformanceAvg: number | null;
}

// ─── Gradient Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, gradient, shadowColor, subtitle }) => (
  <div className={`relative overflow-hidden ${gradient} rounded-[16px] p-5 shadow-[0_4px_12px_${shadowColor}] hover:shadow-[0_8px_24px_${shadowColor}] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-white`}>
    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4"></div>
    <div className="flex items-start justify-between relative z-10 mb-2">
      <span className="text-[13px] font-medium text-white/90">{label}</span>
      <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
        {icon}
      </div>
    </div>
    <div className="text-[28px] font-bold relative z-10 leading-none mb-4">{value}</div>
    <div className="flex items-center relative z-10 border-t border-white/20 pt-3 mt-auto">
      <span className="text-[12px] font-medium text-white/90">{subtitle}</span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AtRiskDashboard: React.FC = () => {
  const [students, setStudents] = useState<DashboardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('wri');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const managedStudentsRef = collection(db, 'managedStudents');
    const unsubscribe = onSnapshot(
      managedStudentsRef,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ...d,
            wri: (d.wri as number) ?? null,
            riskStatus: (d.riskStatus as DashboardStudent['riskStatus']) ?? null,
            diagnosticScore: (d.diagnosticScore as number) ?? null,
            externalGradesAvg: (d.externalGradesAvg as number) ?? null,
            systemPerformanceAvg: (d.systemPerformanceAvg as number) ?? null,
          } as DashboardStudent;
        });
        setStudents(data);
        setLoading(false);
      },
      (error) => {
        console.error('[AtRiskDashboard] error:', error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.riskStatus === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.lrn || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''));
      } else if (sortField === 'wri') {
        cmp = (a.wri ?? 100) - (b.wri ?? 100);
      } else if (sortField === 'updatedAt') {
        cmp = ((a.updatedAt as { seconds?: number })?.seconds ?? 0) - ((b.updatedAt as { seconds?: number })?.seconds ?? 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [students, filterStatus, searchQuery, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = students.length;
    const safe = students.filter((s) => s.riskStatus === 'safe').length;
    const watch = students.filter((s) => s.riskStatus === 'watch').length;
    const intervene = students.filter((s) => s.riskStatus === 'intervene').length;
    const critical = students.filter((s) => s.riskStatus === 'critical').length;
    const atRisk = students.filter((s) => s.riskStatus === 'at_risk').length;
    return { total, safe, watch, intervene, critical, atRisk };
  }, [students]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <SortAsc size={12} className="text-white" /> : <SortDesc size={12} className="text-white" />;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-[16px] border-b border-slate-200/50 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">At-Risk Student Monitoring</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Track student risk using the Weighted Risk Index (WRI) based on DepEd grading standards
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Row — Gradient Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[16px]">
          <StatCard
            label="Total Students"
            value={stats.total}
            icon={<Users className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#a855f7] to-[#9333ea]"
            shadowColor="rgba(168,85,247,0.2)"
            subtitle="Enrolled in system"
          />
          <StatCard
            label="Safe"
            value={stats.safe}
            icon={<ShieldCheck className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#10b981] to-[#059669]"
            shadowColor="rgba(16,185,129,0.2)"
            subtitle="On track"
          />
          <StatCard
            label="Watch"
            value={stats.watch}
            icon={<Eye className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7]"
            shadowColor="rgba(14,165,233,0.2)"
            subtitle="Monitor closely"
          />
          <StatCard
            label="Intervene"
            value={stats.intervene}
            icon={<AlertTriangle className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#f97316] to-[#ea580c]"
            shadowColor="rgba(249,115,22,0.2)"
            subtitle="Needs support"
          />
          <StatCard
            label="Critical"
            value={stats.critical}
            icon={<AlertCircle className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#ef4444] to-[#dc2626]"
            shadowColor="rgba(239,68,68,0.2)"
            subtitle="Immediate action"
          />
          <StatCard
            label="At Risk"
            value={stats.atRisk}
            icon={<Skull className="w-4 h-4 text-white" />}
            gradient="bg-gradient-to-br from-[#6b7280] to-[#4b5563]"
            shadowColor="rgba(107,114,128,0.2)"
            subtitle="Legacy classification"
          />
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-30 py-4 -my-4 bg-[#f8fafc]/80 backdrop-blur-[16px] border-b border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] px-2 mb-6 rounded-b-[18px]">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
              {/* Search */}
              <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#e2e8f0] group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-64">
                <Search className="w-4 h-4 text-[#64748b] shrink-0 group-focus-within:text-[#9956DE] transition-colors" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none ml-2 text-[13px] w-full text-[#475569] placeholder:text-[#94a3b8]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-2 -m-2">
                {(['all', 'safe', 'watch', 'intervene', 'critical', 'at_risk'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 text-[13px] font-semibold rounded-full whitespace-nowrap transition-colors shadow-md ${
                      filterStatus === status
                        ? 'bg-[#9956DE] text-white'
                        : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'at_risk' ? 'At Risk' : status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && (
                      <span className="ml-1 text-[11px] opacity-70">
                        ({stats[status as keyof typeof stats]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[13px] text-slate-500 font-medium shrink-0">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-[18px] border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="animate-spin text-[#9956DE]" />
              <span className="ml-2 text-slate-500 text-sm">Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Users size={32} />
              <p className="mt-2 text-sm">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#9956DE] text-[11px] font-bold text-white tracking-wider uppercase">
                    <th className="text-left px-5 py-3.5">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-white/80 transition-colors">
                        Student <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3.5">Status</th>
                    <th className="text-left px-4 py-3.5">
                      <button onClick={() => handleSort('wri')} className="flex items-center gap-1 hover:text-white/80 transition-colors">
                        WRI <SortIcon field="wri" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3.5 hidden md:table-cell">Diagnostic</th>
                    <th className="text-left px-4 py-3.5 hidden lg:table-cell">External</th>
                    <th className="text-left px-4 py-3.5 hidden lg:table-cell">System</th>
                    <th className="text-right px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <React.Fragment key={student.id}>
                      <tr
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedStudentId((prev) => prev === student.id ? null : student.id)
                        }
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800 text-[14px]">{student.name || '—'}</div>
                          <div className="text-[11px] text-slate-400">{student.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <RiskBadge status={student.riskStatus} wri={student.wri} size="sm" showScore />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-800 tabular-nums">
                            {student.wri !== null ? student.wri.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell tabular-nums">
                          {student.diagnosticScore !== null ? `${student.diagnosticScore.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell tabular-nums">
                          {student.externalGradesAvg !== null ? `${student.externalGradesAvg.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell tabular-nums">
                          {student.systemPerformanceAvg !== null ? `${student.systemPerformanceAvg.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedStudentId((prev) => prev === student.id ? null : student.id)}
                            className="text-slate-400 hover:text-[#9956DE] transition-colors"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${expandedStudentId === student.id ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </td>
                      </tr>

                      {expandedStudentId === student.id && (
                        <tr>
                          <td colSpan={7} className="px-5 py-4 bg-[#f5f3ff]/40 border-t border-slate-100">
                            <RiskDetailPanel studentId={student.id!} studentName={student.name!} />
                            {(student.riskStatus === 'critical' || student.riskStatus === 'at_risk') && (
                              <InterventionChecklistPanel studentId={student.id!} studentName={student.name!} />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DepEd Attribution */}
        <div className="text-[11px] text-slate-400 text-center">
          WRI classification based on DepEd DO No. 8, s. 2015 (Policy Guidelines on Classroom Assessment).
          WRI is a support tool — final academic decisions remain with the teacher.
        </div>
      </div>
    </div>
  );
};
