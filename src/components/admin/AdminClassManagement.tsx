import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { School, ChevronDown, UserCheck, Users, Search, GraduationCap, CheckCircle2, FilterX } from 'lucide-react';

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

  const handleAssignManager = async (classId: string) => {
    const teacherUid = selectedManagers[classId];
    if (!teacherUid) { toast.error('Select a teacher first'); return; }

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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const withManagerCount = classes.filter(c => c.managerId).length;
  const unassignedCount = classes.filter(c => !c.managerId).length;

  return (
    <div className="space-y-6 pt-4 pb-6 max-w-[1400px] mx-auto min-w-0 animate-in fade-in duration-500">
      {/* ── Teacher-Inspired Stats Bento Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 px-1">
        {/* Card 1: Total Sections (Purple Gradient) */}
        <div className="group relative bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED] shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)] border border-white/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 flex col-span-2 sm:col-span-1 flex-row items-center justify-between min-h-0 sm:min-h-[120px] sm:flex-col sm:items-start sm:justify-between transition-all duration-300 ease-out overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {/* Mobile Left / Desktop Top */}
          <div className="flex items-center gap-2.5 sm:justify-between sm:w-full relative z-10 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <School size={14} className="sm:hidden" />
              <School size={18} className="hidden sm:block" />
            </div>
            <div className="sm:hidden">
              <p className="text-xs font-bold text-white leading-tight">Total Sections</p>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
              Rosters
            </span>
          </div>

          {/* Mobile Right / Desktop Bottom */}
          <div className="flex items-center gap-2 sm:block relative z-10 min-w-0">
            <p className="text-xl sm:text-3xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{classes.length}</p>
            <span className="sm:hidden px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
              Rosters
            </span>
            <p className="text-xs font-bold text-white/95 mt-1.5 truncate hidden sm:block">Total Class Sections</p>
            <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">Configured academic cohorts</p>
          </div>
        </div>

        {/* Card 2: Assigned Sections (Green Gradient) */}
        <div className="group relative bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C] shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)] border border-white/25 rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col justify-between col-span-1 min-h-[58px] sm:min-h-[120px] transition-all duration-300 ease-out overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-1 sm:mb-3">
            <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <UserCheck size={13} className="sm:hidden" />
              <UserCheck size={18} className="hidden sm:block" />
            </div>
            <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
              Assigned
            </span>
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-lg sm:text-3xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{withManagerCount}</p>
            <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-0.5 sm:mt-1.5 truncate">With Manager</p>
            <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">Active teacher ownership</p>
          </div>
        </div>

        {/* Card 3: Unassigned Sections (Amber Gradient) */}
        <div className="group relative bg-gradient-to-br from-[#FFB356] via-[#F29424] to-[#D97706] shadow-[0_8px_24px_-6px_rgba(242,148,36,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(242,148,36,0.52)] border border-white/25 rounded-xl sm:rounded-2xl p-2 sm:p-5 flex flex-col justify-between col-span-1 min-h-[58px] sm:min-h-[120px] transition-all duration-300 ease-out overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-1 sm:mb-3">
            <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <Users size={13} className="sm:hidden" />
              <Users size={18} className="hidden sm:block" />
            </div>
            <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
              {unassignedCount > 0 ? 'Pending' : 'Clear'}
            </span>
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-lg sm:text-3xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{unassignedCount}</p>
            <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-0.5 sm:mt-1.5 truncate">Unassigned</p>
            <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">Awaiting teacher assignment</p>
          </div>
        </div>
      </div>

      {/* ── Class List & Filter Container ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-purple-100/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/60 via-indigo-50/30 to-slate-50 dark:from-purple-950/20 dark:via-slate-800/80 dark:to-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9956DE]" />
              Class Rosters & Faculty Assignments
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assign faculty managers to supervise grade level sections</p>
          </div>
          
          <div className="relative w-full sm:w-[280px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter classes or managers..."
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
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredClasses.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mx-auto mb-3 text-[#9956DE]">
                <School size={28} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No class sections match your filter.</p>
              <p className="text-[11px] text-slate-400 mt-1">Try broadening your search term.</p>
            </div>
          ) : filteredClasses.map(cls => (
            <div
              key={cls.id}
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 hover:bg-purple-50/30 dark:hover:bg-purple-950/15 transition-all group relative border-l-4 border-l-transparent hover:border-l-[#9956DE]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#8643C8] dark:group-hover:text-purple-400 transition-colors">{cls.name}</p>
                  {cls.gradeLevel && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#9956DE] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 shadow-xs">
                      {cls.gradeLevel}
                    </span>
                  )}
                  {cls.section && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shadow-xs">
                      Section {cls.section}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {cls.studentCount !== undefined && (
                    <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">{cls.studentCount} enrolled learners</span>
                  )}
                  {cls.managerName ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <CheckCircle2 size={12} />
                      Manager: {cls.managerName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Manager Assignment
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <div className="relative flex-1 sm:w-[250px]">
                  <select
                    value={selectedManagers[cls.id] || ''}
                    onChange={(e) => setSelectedManagers(prev => ({ ...prev, [cls.id]: e.target.value }))}
                    className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-[#9956DE] focus:ring-1 focus:ring-[#9956DE] w-full min-h-[44px] transition-all"
                  >
                    <option value="">Select faculty educator...</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  onClick={() => handleAssignManager(cls.id)}
                  disabled={!selectedManagers[cls.id] || assigning === cls.id}
                  className="px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-[#9956DE] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all whitespace-nowrap flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/25 active:scale-95"
                >
                  {assigning === cls.id ? 'Assigning...' : 'Assign Manager'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminClassManagement;

