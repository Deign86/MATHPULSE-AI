// src/components/admin/AdminClassManagement.tsx
// Admin module for managing classes and assigning section managers

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { School, ChevronDown, UserCheck, Users } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all classes
      const classSnap = await getDocs(collection(db, 'classrooms'));
      const classData = classSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassRecord));
      setClasses(classData);

      // Load all teachers
      const teacherQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const teacherSnap = await getDocs(teacherQuery);
      const teacherData = teacherSnap.docs.map(d => {
        const data = d.data();
        return { uid: d.id, name: data.name || data.displayName || 'Teacher', email: data.email || '' };
      });
      setTeachers(teacherData);

      // Pre-fill current managers
      const managers: Record<string, string> = {};
      classData.forEach(c => { if (c.managerId) managers[c.id] = c.managerId; });
      setSelectedManagers(managers);
    } catch (err) {
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
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, managerId: teacher.uid, managerName: teacher.name } : c));
      toast.success(`Assigned ${teacher.name} as manager`);
    } catch (err) {
      toast.error('Failed to assign manager');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <School className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-slate-900">{classes.length}</p>
              <p className="text-[12px] text-slate-500 font-medium">Total Classes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-slate-900">{classes.filter(c => c.managerId).length}</p>
              <p className="text-[12px] text-slate-500 font-medium">With Manager</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-slate-900">{classes.filter(c => !c.managerId).length}</p>
              <p className="text-[12px] text-slate-500 font-medium">Unassigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-bold text-slate-900">All Classes</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {classes.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-[13px]">No classes found.</div>
          ) : classes.map(cls => (
            <div key={cls.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 truncate">{cls.name}</p>
                <p className="text-[12px] text-slate-500">
                  {cls.gradeLevel || ''} {cls.section ? `• ${cls.section}` : ''} {cls.studentCount ? `• ${cls.studentCount} students` : ''}
                </p>
                {cls.managerName && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Manager: {cls.managerName}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <select
                    value={selectedManagers[cls.id] || ''}
                    onChange={(e) => setSelectedManagers(prev => ({ ...prev, [cls.id]: e.target.value }))}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-[220px]"
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  onClick={() => handleAssignManager(cls.id)}
                  disabled={!selectedManagers[cls.id] || assigning === cls.id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {assigning === cls.id ? '...' : 'Assign'}
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
