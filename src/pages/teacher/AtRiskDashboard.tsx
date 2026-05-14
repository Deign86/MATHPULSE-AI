import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
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
  Filter,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
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

// ─── Stats Summary ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
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

  // Subscribe to all managedStudents (teacher can see their own)
  useEffect(() => {
    // In a real app, filter by teacherId: query(managedStudentsRef, where('teacherId', '==', currentUserId))
    // For now, load all to demonstrate the UI
    const managedStudentsRef = collection(db, 'managedStudents');
    // TODO: replace with actual teacher-scoped query
    // const q = query(managedStudentsRef, where('teacherId', '==', teacherId));
    const unsubscribe = onSnapshot(
      managedStudentsRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            // Map WRI fields from document
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

  // Filter + sort
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.riskStatus === filterStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.lrn || '').toLowerCase().includes(q)
      );
    }

    // Sort
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

  // Stats
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
    return sortDir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">At-Risk Student Monitoring</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Track student risk using the Weighted Risk Index (WRI) based on DepEd grading standards
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Students"
            value={stats.total}
            icon={<Users size={20} className="text-slate-600" />}
            color="bg-slate-100"
          />
          <StatCard
            label="Safe"
            value={stats.safe}
            icon={<ShieldCheck size={20} className="text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatCard
            label="Watch"
            value={stats.watch}
            icon={<Eye size={20} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Intervene"
            value={stats.intervene}
            icon={<AlertTriangle size={20} className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Critical"
            value={stats.critical}
            icon={<AlertCircle size={20} className="text-rose-600" />}
            color="bg-rose-50"
          />
          <StatCard
            label="At Risk"
            value={stats.atRisk}
            icon={<Skull size={20} className="text-slate-600" />}
            color="bg-slate-100"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {(['all', 'safe', 'watch', 'intervene', 'critical', 'at_risk'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status === 'all' ? 'All' : status === 'at_risk' ? 'At Risk' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({stats[status as keyof typeof stats]})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div className="text-sm text-slate-500">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Users size={32} />
              <p className="mt-2 text-sm">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-slate-900"
                      >
                        Student <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">
                      <button
                        onClick={() => handleSort('wri')}
                        className="flex items-center gap-1 hover:text-slate-900"
                      >
                        WRI <SortIcon field="wri" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">
                      Diagnostic
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden lg:table-cell">
                      External
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden lg:table-cell">
                      System
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <React.Fragment key={student.id}>
                      <tr
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedStudentId((prev) =>
                            prev === student.id ? null : student.id
                          )
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {student.name || '—'}
                          </div>
                          <div className="text-xs text-slate-500">{student.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge
                            status={student.riskStatus}
                            wri={student.wri}
                            size="sm"
                            showScore
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold tabular-nums">
                            {student.wri !== null ? student.wri.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell tabular-nums">
                          {student.diagnosticScore !== null
                            ? `${student.diagnosticScore.toFixed(0)}%`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell tabular-nums">
                          {student.externalGradesAvg !== null
                            ? `${student.externalGradesAvg.toFixed(0)}%`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell tabular-nums">
                          {student.systemPerformanceAvg !== null
                            ? `${student.systemPerformanceAvg.toFixed(0)}%`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setExpandedStudentId((prev) =>
                                prev === student.id ? null : student.id
                              )
                            }
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${
                                expandedStudentId === student.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedStudentId === student.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-slate-50/50">
                            <RiskDetailPanel
                              studentId={student.id!}
                              studentName={student.name!}
                            />
                            {(student.riskStatus === 'critical' || student.riskStatus === 'at_risk') && (
                              <InterventionChecklistPanel
                                studentId={student.id!}
                                studentName={student.name!}
                              />
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
        <div className="text-xs text-slate-400 text-center">
          WRI classification based on DepEd DO No. 8, s. 2015 (Policy Guidelines on Classroom Assessment).
          WRI is a support tool — final academic decisions remain with the teacher.
        </div>
      </div>
    </div>
  );
};
