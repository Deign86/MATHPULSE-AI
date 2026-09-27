import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { assignStudentToClassSection } from '../services/studentService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface AddStudentsModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  grade: string;
  section: string;
  teacherName?: string;
  existingStudentUids?: string[];
}

export const AddStudentsModal: React.FC<AddStudentsModalProps> = ({ open, onClose, onAdded, grade, section, teacherName, existingStudentUids = [] }) => {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<{ uid: string; name: string; email: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearchQuery('');
      loadStudents();
    }
  }, [open]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const items = snap.docs
        .filter((d) => !existingStudentUids.includes(d.id))
        .map((d) => {
          const data = d.data();
          return { uid: d.id, name: data.name || data.displayName || 'Student', email: data.email || '' };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setStudents(items);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!currentUser || selected.size === 0) return;
    setSaving(true);
    try {
      const schoolYear = String(new Date().getFullYear());
      const promises = Array.from(selected).map((uid) =>
        assignStudentToClassSection(uid, grade, section, currentUser.uid, schoolYear, teacherName || currentUser.displayName || '')
      );
      await Promise.allSettled(promises);
      toast.success(`Added ${selected.size} student(s) to class`);
      onAdded();
      onClose();
    } catch {
      toast.error('Failed to add students');
    }
    setSaving(false);
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  const modalElement = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80dvh] flex flex-col overflow-hidden z-10">
          <div className="flex items-center justify-between p-5 border-b border-[#f1f5f9] dark:border-slate-800">
            <h2 className="text-base font-semibold text-[#1e293b] dark:text-white">Add Students to {grade} - {section}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="p-1 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-slate-800"><X size={18} className="text-[#64748b] dark:text-slate-400" /></button>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <Input placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <button
                onClick={() => {
                  if (selected.size === filtered.length) setSelected(new Set());
                  else setSelected(new Set(filtered.map((s) => s.uid)));
                }}
                className="text-[11px] font-semibold text-[#a855f7] hover:text-[#9333ea] bg-[#a855f7]/10 hover:bg-[#a855f7]/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <p className="text-xs text-[#64748b] dark:text-slate-400">{selected.size} of {filtered.length} selected</p>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[300px]">
              {loading ? (
                <p className="text-sm text-center text-[#64748b] dark:text-slate-400 py-6">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-center text-[#64748b] dark:text-slate-400 py-6">No students available</p>
              ) : (
                filtered.map((s) => (
                  <button key={s.uid} onClick={() => setSelected((prev) => { const n = new Set(prev); n.has(s.uid) ? n.delete(s.uid) : n.add(s.uid); return n; })}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selected.has(s.uid) ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800' : 'hover:bg-[#f8fafc] dark:hover:bg-slate-800 border border-transparent'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selected.has(s.uid) ? 'bg-[#a855f7] border-[#a855f7]' : 'border-[#cbd5e1] dark:border-slate-700'}`}>
                      {selected.has(s.uid) && <Check size={12} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1e293b] dark:text-white truncate">{s.name}</p>
                      <p className="text-[11px] text-[#64748b] dark:text-slate-400 truncate">{s.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-[#f1f5f9] dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || selected.size === 0} className="bg-[#a855f7] hover:bg-[#9333ea] text-white">
              <UserPlus size={14} className="mr-1.5" />{saving ? 'Adding...' : `Add ${selected.size} Student${selected.size !== 1 ? 's' : ''}`}
            </Button>
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
