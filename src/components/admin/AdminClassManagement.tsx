import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { School, ChevronDown, UserCheck, Users, Search, CheckCircle2, FilterX, Loader2, Sparkles } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import ConfirmModal from '../ConfirmModal';

interface ClassRecord {
  id: string;
  name: string;
  teacherId?: string;
  managerId?: string;
  managerName?: string;
  gradeLevel?: string;
  section?: string;
  studentCount?: number;
}

interface TeacherOption {
  uid: string;
  name: string;
  email: string;
}

const AdminClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedManagers, setSelectedManagers] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState<{ classId: string; action: 'assign' | 'unassign'; teacherUid?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const classSnap = await getDocs(collection(db, 'classrooms'));
      // SAFETY: trusted internal value already conforms to the asserted type.
      const classData = classSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassRecord));
      setClasses(classData);

      const teacherQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const teacherSnap = await getDocs(teacherQuery);
      const teacherData = teacherSnap.docs.map(d => {
        const data = d.data();
        return { uid: d.id, name: data.name || data.displayName || 'Teacher', email: data.email || '' };
      });
      setTeachers(teacherData);

      const managers: Record<string, string> = {};
      classData.forEach(c => { if (c.managerId) managers[c.id] = c.managerId; });
      setSelectedManagers(managers);
    } catch {
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const requestAssignManager = (classId: string) => {
    const teacherUid = selectedManagers[classId];
    if (!teacherUid) { toast.error('Select a teacher first'); return; }

    const teacher = teachers.find(t => t.uid === teacherUid);
    if (!teacher) return;
    const currentManagerId = classes.find(cls => cls.id === classId)?.managerId;
    if (currentManagerId && currentManagerId !== teacherUid) {
      setPendingConfirmation({ classId, action: 'assign', teacherUid });
      return;
    }
    void saveManagerAssignment(classId, teacherUid);
  };

  const saveManagerAssignment = async (classId: string, teacherUid: string) => {
    const teacher = teachers.find(t => t.uid === teacherUid);
    if (!teacher) return;
    setAssigning(classId);
    try {
      await updateDoc(doc(db, 'classrooms', classId), {
        managerId: teacher.uid,
        managerName: teacher.name,
      });
      const ownershipRef = doc(db, 'classSectionOwnership', classId);
      const ownershipSnap = await getDocs(query(collection(db, 'classSectionOwnership'), where('classSectionId', '==', classId)));
      if (ownershipSnap.docs.length > 0) {
        await updateDoc(ownershipSnap.docs[0].ref, { managerId: teacher.uid, managerName: teacher.name });
      } else {
        try { await updateDoc(ownershipRef, { managerId: teacher.uid, managerName: teacher.name }); } catch { /* ownership update is non-critical */ }
      }
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, managerId: teacher.uid, managerName: teacher.name } : c));
      toast.success(`Assigned ${teacher.name} as manager`);
    } catch {
      toast.error('Failed to assign manager');
    } finally {
      setAssigning(null);
    }
  };

  const unassignManager = async (classId: string) => {
    setAssigning(classId);
    try {
      await updateDoc(doc(db, 'classrooms', classId), { managerId: deleteField(), managerName: deleteField() });
      const ownershipSnap = await getDocs(query(collection(db, 'classSectionOwnership'), where('classSectionId', '==', classId)));
      if (ownershipSnap.docs.length > 0) {
        await Promise.all(ownershipSnap.docs.map(ownership => updateDoc(ownership.ref, { managerId: deleteField(), managerName: deleteField() })));
      } else {
        await setDoc(doc(db, 'classSectionOwnership', classId), { managerId: deleteField(), managerName: deleteField() }, { merge: true });
      }
      setClasses(prev => prev.map(cls => cls.id === classId ? { ...cls, managerId: undefined, managerName: undefined } : cls));
      setSelectedManagers(prev => ({ ...prev, [classId]: '' }));
      toast.success('Teacher unassigned');
    } catch {
      toast.error('Failed to unassign teacher');
    } finally {
      setAssigning(null);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingConfirmation) return;
    const { classId, action } = pendingConfirmation;
    setPendingConfirmation(null);
    if (action === 'unassign') {
      await unassignManager(classId);
      return;
    }
    const teacherUid = pendingConfirmation.teacherUid;
    if (teacherUid) await saveManagerAssignment(classId, teacherUid);
  };

  const filteredClasses = useMemo(() => {
    const queryTerm = searchQuery.trim().toLowerCase();
    if (!queryTerm) return classes;
    return classes.filter(cls =>
      cls.name.toLowerCase().includes(queryTerm) ||
      (cls.gradeLevel && cls.gradeLevel.toLowerCase().includes(queryTerm)) ||
      (cls.section && cls.section.toLowerCase().includes(queryTerm)) ||
      (cls.managerName && cls.managerName.toLowerCase().includes(queryTerm))
    );
  }, [classes, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-10 h-10 border-3 border-[#9956DE] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading class sections...</p>
      </div>
    );
  }

  const withManagerCount = classes.filter(c => c.managerId).length;
  const unassignedCount = classes.filter(c => !c.managerId).length;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {/* ── Teacher-Inspired Stats Bento Grid (Unified Highlight Cards) ── */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4 px-1">
        {/* Card 1: Total Sections (Purple Gradient) */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-3xl p-2.5 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED] shadow-[0_4px_16px_-4px_rgba(153,86,222,0.38)] hover:shadow-[0_12px_28px_-6px_rgba(153,86,222,0.48)] border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out min-w-0 min-h-[76px] sm:min-h-[140px] text-white select-none">
          <div className="absolute -bottom-6 -right-6 w-16 sm:w-36 h-16 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-1 sm:mb-3">
            <div className="w-5.5 h-5.5 sm:w-10 sm:h-10 rounded-md sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs text-white transition-transform group-hover:scale-105">
              <School size={12} className="sm:hidden text-white" />
              <School size={18} className="hidden sm:block text-white" />
            </div>
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
              Sections
            </span>
          </div>

          <div className="relative z-10 min-w-0">
            <p className="text-base sm:text-[30px] font-display font-black text-white leading-none sm:leading-tight tracking-tight truncate tabular-nums drop-shadow-xs">{classes.length}</p>
            <p className="text-[9.5px] sm:text-sm font-bold text-white truncate mt-0.5 sm:mt-1 drop-shadow-xs">Total Sections</p>
            <p className="text-[11px] text-white/90 truncate mt-0.5 font-medium hidden sm:block drop-shadow-xs">Registered class sections</p>
          </div>
        </div>

        {/* Card 2: Assigned Sections (Green Gradient) */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-3xl p-2.5 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] shadow-[0_4px_16px_-4px_rgba(16,185,129,0.38)] hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.48)] border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out min-w-0 min-h-[76px] sm:min-h-[140px] text-white select-none">
          <div className="absolute -bottom-6 -right-6 w-16 sm:w-36 h-16 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-1 sm:mb-3">
            <div className="w-5.5 h-5.5 sm:w-10 sm:h-10 rounded-md sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs text-white transition-transform group-hover:scale-105">
              <UserCheck size={12} className="sm:hidden text-white" />
              <UserCheck size={18} className="hidden sm:block text-white" />
            </div>
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
              Assigned
            </span>
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-base sm:text-[30px] font-display font-black text-white leading-none sm:leading-tight tracking-tight truncate tabular-nums drop-shadow-xs">{withManagerCount}</p>
            <p className="text-[9.5px] sm:text-sm font-bold text-white truncate mt-0.5 sm:mt-1 drop-shadow-xs">With Teacher</p>
            <p className="text-[11px] text-white/90 truncate mt-0.5 font-medium hidden sm:block drop-shadow-xs">Assigned faculty advisers</p>
          </div>
        </div>

        {/* Card 3: Unassigned Sections (Amber Gradient) */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-3xl p-2.5 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706] shadow-[0_4px_16px_-4px_rgba(242,148,36,0.38)] hover:shadow-[0_12px_28px_-6px_rgba(242,148,36,0.48)] border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out min-w-0 min-h-[76px] sm:min-h-[140px] text-white select-none">
          <div className="absolute -bottom-6 -right-6 w-16 sm:w-36 h-16 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-1 sm:mb-3">
            <div className="w-5.5 h-5.5 sm:w-10 sm:h-10 rounded-md sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs text-white transition-transform group-hover:scale-105">
              <Users size={12} className="sm:hidden text-white" />
              <Users size={18} className="hidden sm:block text-white" />
            </div>
            <span className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
              {unassignedCount > 0 ? 'Pending' : 'Optimal'}
            </span>
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-base sm:text-[30px] font-display font-black text-white leading-none sm:leading-tight tracking-tight truncate tabular-nums drop-shadow-xs">{unassignedCount}</p>
            <p className="text-[9.5px] sm:text-sm font-bold text-white truncate mt-0.5 sm:mt-1 drop-shadow-xs">No Teacher</p>
            <p className="text-[11px] text-white/90 truncate mt-0.5 font-medium hidden sm:block drop-shadow-xs">Sections requiring adviser</p>
          </div>
        </div>
      </div>

      {/* ── Class Sections & Faculty Assignments Table Container ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        {/* Top Gradient Highlight Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0" />

        {/* Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-purple-100/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/60 via-indigo-50/30 to-slate-50 dark:from-purple-950/20 dark:via-slate-800/80 dark:to-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9956DE]" />
              Class Sections & Teacher Assignments
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage registered class sections, enrolled learners, and assigned faculty advisers</p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-[300px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter sections, teachers, or grades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear filter"
                >
                  <FilterX size={14} />
                </button>
              )}
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50 whitespace-nowrap">
              <Sparkles size={12} className="text-[#9956DE]" />
              {filteredClasses.length} {filteredClasses.length === 1 ? 'Section' : 'Sections'}
            </span>
          </div>
        </div>

        {/* Empty State */}
        {filteredClasses.length === 0 ? (
          <div className="px-6 py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mx-auto text-[#9956DE]">
              <School size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No class sections found</p>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                No class sections match your current filter query. Try clearing or broadening your search terms.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Mobile View (< md) ── */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {filteredClasses.map(cls => (
                <div
                  key={cls.id}
                  className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3 border-l-3 border-l-[#9956DE]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{cls.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {cls.gradeLevel && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-[#9956DE] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
                            {cls.gradeLevel}
                          </span>
                        )}
                        {cls.section && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
                            Section {cls.section}
                          </span>
                        )}
                      </div>
                    </div>
                    {cls.studentCount !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0">
                        <Users size={12} className="text-[#9956DE]" />
                        {cls.studentCount}
                      </span>
                    )}
                  </div>

                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Assigned Teacher</p>
                    {cls.managerName ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 text-xs">
                        <CheckCircle2 size={13} />
                        {cls.managerName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/50 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        No teacher assigned
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="relative w-full">
                      <select
                        value={selectedManagers[cls.id] || ''}
                        onChange={(e) => setSelectedManagers(prev => ({ ...prev, [cls.id]: e.target.value }))}
                        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE] w-full min-h-[44px] transition-all"
                      >
                        <option value="">Select a teacher...</option>
                        {teachers.map(t => (
                          <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => requestAssignManager(cls.id)}
                      disabled={!selectedManagers[cls.id] || selectedManagers[cls.id] === cls.managerId || assigning === cls.id}
                      className="w-full min-h-[44px] bg-gradient-to-r from-[#9956DE] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-purple-500/25 active:scale-98"
                    >
                      {assigning === cls.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        selectedManagers[cls.id] === cls.managerId && cls.managerId ? 'Assigned' : cls.managerId ? 'Reassign' : 'Assign Teacher'
                      )}
                    </button>
                    {cls.managerId && (
                      <button
                        onClick={() => setPendingConfirmation({ classId: cls.id, action: 'unassign' })}
                        disabled={assigning === cls.id}
                        className="w-full min-h-[40px] border border-rose-200 text-rose-700 dark:text-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl disabled:opacity-50"
                      >
                        Unassign Teacher
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop Table View (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto w-full">
              <Table className="w-full text-left border-collapse min-w-[768px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-20">
                    <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Class Section</TableHead>
                    <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Enrolled Learners</TableHead>
                    <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Assigned Teacher</TableHead>
                    <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Assign / Reassign Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClasses.map((cls) => (
                    <TableRow
                      key={cls.id}
                      className="group hover:bg-purple-50/25 dark:hover:bg-purple-950/15 border-l-2 border-l-transparent hover:border-l-[#9956DE] transition-all"
                    >
                      {/* Section Info */}
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9956DE]/15 to-[#7274ED]/15 dark:from-[#9956DE]/30 dark:to-[#7274ED]/30 border border-[#9956DE]/20 text-[#9956DE] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300">
                            <School size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">
                              {cls.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {cls.gradeLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-[#9956DE] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 shadow-xs">
                                  {cls.gradeLevel}
                                </span>
                              )}
                              {cls.section && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shadow-xs">
                                  Section {cls.section}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Enrolled Learners */}
                      <TableCell className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200/60 dark:border-slate-700/60">
                          <Users size={13} className="text-[#9956DE]" />
                          <span className="tabular-nums font-extrabold">{cls.studentCount ?? 0}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">students</span>
                        </div>
                      </TableCell>

                      {/* Assigned Teacher Status */}
                      <TableCell className="px-5 py-4 text-center">
                        {cls.managerName ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60 text-xs shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span>{cls.managerName}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-full border border-amber-200/80 dark:border-amber-800/60 text-xs shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Unassigned</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Action / Select Teacher */}
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-2 max-w-[380px]">
                          <div className="relative flex-1">
                            <select
                              value={selectedManagers[cls.id] || ''}
                              onChange={(e) => setSelectedManagers(prev => ({ ...prev, [cls.id]: e.target.value }))}
                              className="appearance-none bg-slate-50/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE] w-full min-h-[38px] transition-all cursor-pointer"
                            >
                              <option value="">Select a teacher...</option>
                              {teachers.map(t => (
                                <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <button
                            onClick={() => requestAssignManager(cls.id)}
                            disabled={!selectedManagers[cls.id] || selectedManagers[cls.id] === cls.managerId || assigning === cls.id}
                            className="px-3.5 py-2 min-h-[38px] bg-gradient-to-r from-[#9956DE] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0 shadow-sm shadow-purple-500/25 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {assigning === cls.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Assigning...</span>
                              </>
                            ) : (
                              <span>{selectedManagers[cls.id] === cls.managerId && cls.managerId ? 'Assigned' : cls.managerId ? 'Reassign' : 'Assign Teacher'}</span>
                            )}
                          </button>
                          {cls.managerId && (
                            <button
                              onClick={() => setPendingConfirmation({ classId: cls.id, action: 'unassign' })}
                              disabled={assigning === cls.id}
                              className="px-3 py-2 min-h-[38px] border border-rose-200 text-rose-700 dark:text-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl disabled:opacity-50 whitespace-nowrap"
                            >
                              Unassign
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={pendingConfirmation !== null}
        onClose={() => setPendingConfirmation(null)}
        onConfirm={confirmPendingAction}
        title={pendingConfirmation?.action === 'unassign' ? 'Unassign teacher?' : 'Reassign teacher?'}
        message={pendingConfirmation?.action === 'unassign'
          ? 'This will remove the current teacher assignment from this class section.'
          : 'This will replace the current teacher assigned to this class section.'}
        confirmText={pendingConfirmation?.action === 'unassign' ? 'Unassign' : 'Reassign'}
        type="danger"
      />
    </div>
  );
};

export default AdminClassManagement;

