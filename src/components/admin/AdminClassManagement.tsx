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
    <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <School size={18} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Sections</span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">{classes.length}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">Class Sections</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Configured academic rosters</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck size={18} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Assigned
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">{withManagerCount}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">With Assigned Manager</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Faculty ownership active</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Users size={18} />
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              unassignedCount > 0 
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
            }`}>
              {unassignedCount > 0 ? 'Pending Action' : 'All Set'}
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">{unassignedCount}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">Unassigned Sections</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting teacher assignment</p>
          </div>
        </div>
      </div>

      {/* Class List & Filter Container */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Class Roster & Section Managers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Assign faculty managers to supervise grade level sections</p>
          </div>
          
          <div className="relative w-full sm:w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter classes or managers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FilterX size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {filteredClasses.length === 0 ? (
            <div className="px-6 py-14 text-center text-slate-400">
              <School size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium">No class sections match your filter.</p>
            </div>
          ) : filteredClasses.map(cls => (
            <div key={cls.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{cls.name}</p>
                  {cls.gradeLevel && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {cls.gradeLevel}
                    </span>
                  )}
                  {cls.section && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Section {cls.section}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {cls.studentCount !== undefined && (
                    <span className="tabular-nums font-medium">{cls.studentCount} enrolled students</span>
                  )}
                  {cls.managerName ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={13} />
                      Manager: {cls.managerName}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">No manager assigned</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <div className="relative flex-1 sm:w-[240px]">
                  <select
                    value={selectedManagers[cls.id] || ''}
                    onChange={(e) => setSelectedManagers(prev => ({ ...prev, [cls.id]: e.target.value }))}
                    className="appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full min-h-[44px]"
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  onClick={() => handleAssignManager(cls.id)}
                  disabled={!selectedManagers[cls.id] || assigning === cls.id}
                  className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap flex items-center justify-center shrink-0 shadow-sm"
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

