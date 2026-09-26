import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { assignClassSectionManager } from '../services/studentService';
import { assignStudentToClassSection } from '../services/studentService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface StudentOption {
  uid: string;
  name: string;
  email: string;
  grade?: string;
  section?: string;
}

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  teacherName?: string;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ open, onClose, onCreated, teacherName }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'details' | 'students'>('details');
  const [className, setClassName] = useState('');
  const grade = 'Grade 11';
  const [section, setSection] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Student assignment
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('details');
      setClassName('');
      setSection('');
      setError('');
      setSelectedStudents(new Set());
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 'students') {
      loadStudents();
    }
  }, [open, step]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'student'));
      const snap = await getDocs(q);
      const students: StudentOption[] = [];
      snap.docs.forEach((doc) => {
        const data = doc.data();
        students.push({
          uid: doc.id,
          name: data.name || data.displayName || 'Student',
          email: data.email || '',
          grade: data.grade,
          section: data.section,
        });
      });
      setAllStudents(students.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('[CreateClassModal] Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateClass = async () => {
    if (!currentUser) return;
    if (!section.trim()) {
      setError('Section name is required');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const schoolYear = String(new Date().getFullYear());
      await assignClassSectionManager({
        classSectionId: '',
        grade,
        section: section.trim(),
        schoolYear,
        ownerTeacherId: currentUser.uid,
        ownerTeacherName: teacherName || currentUser.displayName || '',
        managerId: currentUser.uid,
        managerName: teacherName || currentUser.displayName || '',
        className: className.trim() || `${grade} - ${section.trim()}`,
      });

      // Assign selected students
      if (selectedStudents.size > 0) {
        const promises = Array.from(selectedStudents).map((uid) =>
          assignStudentToClassSection(uid, grade, section.trim(), currentUser.uid, schoolYear, teacherName || currentUser.displayName || '')
        );
        await Promise.allSettled(promises);
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  const modalElement = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80dvh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#f1f5f9] dark:border-slate-800">
            <h2 className="text-lg font-semibold text-[#1e293b] dark:text-white">
              {step === 'details' ? 'Create New Class' : 'Add Students'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-[#64748b] dark:text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {step === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#475569] dark:text-slate-300 block mb-1.5">Class Name</label>
                  <Input
                    placeholder="e.g. Grade 11 - Section A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                  <p className="text-xs text-[#94a3b8] mt-1">Optional. Auto-generated from grade + section if empty.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#475569] dark:text-slate-300 block mb-1.5">Section</label>
                  <Input
                    placeholder="e.g. Section A, STEM-1, Rizal"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-rose-500">{error}</p>}
              </div>
            )}

            {step === 'students' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-[#64748b] dark:text-slate-400">{selectedStudents.size} student(s) selected</p>
                {loadingStudents ? (
                  <p className="text-sm text-[#64748b] dark:text-slate-400 text-center py-4">Loading students...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-sm text-[#64748b] dark:text-slate-400 text-center py-4">No students found.</p>
                ) : (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.uid}
                        onClick={() => toggleStudent(s.uid)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          selectedStudents.has(s.uid)
                            ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
                            : 'hover:bg-[#f8fafc] dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          selectedStudents.has(s.uid) ? 'bg-[#a855f7] border-[#a855f7]' : 'border-[#cbd5e1] dark:border-slate-700'
                        }`}>
                          {selectedStudents.has(s.uid) && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1e293b] dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-[#64748b] dark:text-slate-400 truncate">{s.email}</p>
                        </div>
                        {s.grade && <span className="text-xs text-[#94a3b8]">{s.grade}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {error && <p className="text-sm text-rose-500">{error}</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#f1f5f9] dark:border-slate-800">
            {step === 'details' ? (
              <>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { if (!section.trim()) { setError('Section is required'); return; } setError(''); setStep('students'); }}
                  >
                    Add Students
                  </Button>
                  <Button
                    onClick={handleCreateClass}
                    disabled={creating || !section.trim()}
                    className="bg-[#a855f7] hover:bg-[#9333ea] text-white"
                  >
                    {creating ? 'Creating...' : 'Create Class'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
                <Button
                  onClick={handleCreateClass}
                  disabled={creating}
                  className="bg-[#a855f7] hover:bg-[#9333ea] text-white"
                >
                  <Plus size={16} className="mr-1" />
                  {creating ? 'Creating...' : `Create with ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};
