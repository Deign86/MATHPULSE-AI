import React, { useState, useCallback } from 'react';
import { BookOpen, Lock, Unlock, Loader2, Save, Clock, FileText, AlertCircle } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { useAuth } from '../../contexts/AuthContext';
import { useSubjectAvailability } from '../../hooks/useSubjectAvailability';
import {
  toggleSubjectAvailability,
  updateSubjectPdfPath,
} from '../../services/platformConfigService';
import { SHS_MATH_SUBJECTS } from '../../data/subjects';
import { toast } from 'sonner';

interface SubjectRowData {
  id: string;
  name: string;
  code: string;
  gradeLevel: string;
  semester: string;
  color: string;
}

interface ShsSubject {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  semester: string;
  color: string;
  pdfAvailable?: boolean;
  topics: Array<{ id: string; name: string; unit: string }>;
}

const SUBJECT_ROWS: SubjectRowData[] = (SHS_MATH_SUBJECTS as unknown as ShsSubject[]).map((s: ShsSubject) => ({
  id: s.id,
  name: s.name,
  code: s.code,
  gradeLevel: s.gradeLevel,
  semester: s.semester,
  color: s.color,
}));

const AdminSubjects: React.FC = () => {
  const { userProfile } = useAuth();
  const { availability, loading, error } = useSubjectAvailability();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localPdfPaths, setLocalPdfPaths] = useState<Record<string, string>>({});

  const handleToggle = useCallback(
    async (subjectId: string, nextAvailable: boolean) => {
      if (!userProfile?.uid) {
        toast.error('You must be logged in as admin to change availability');
        return;
      }
      setSavingId(subjectId);
      try {
        await toggleSubjectAvailability(subjectId, nextAvailable, userProfile.uid);
        toast.success(
          `${SUBJECT_ROWS.find((s) => s.id === subjectId)?.name || subjectId} is now ${nextAvailable ? 'available' : 'locked'}`,
        );
      } catch (err) {
        toast.error('Failed to update subject availability');
        console.error(err);
      } finally {
        setSavingId(null);
      }
    },
    [userProfile?.uid],
  );

  const handlePdfPathChange = useCallback((subjectId: string, value: string) => {
    setLocalPdfPaths((prev) => ({ ...prev, [subjectId]: value }));
  }, []);

  const handleSavePdfPath = useCallback(
    async (subjectId: string) => {
      if (!userProfile?.uid) {
        toast.error('You must be logged in as admin');
        return;
      }
      const path = localPdfPaths[subjectId]?.trim() || null;
      setSavingId(subjectId);
      try {
        await updateSubjectPdfPath(subjectId, path, userProfile.uid);
        toast.success('PDF path updated');
      } catch (err) {
        toast.error('Failed to update PDF path');
        console.error(err);
      } finally {
        setSavingId(null);
      }
    },
    [localPdfPaths, userProfile?.uid],
  );

  return (
    <div className="flex flex-col min-h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-6">
      {/* Stats Dashboard */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-end px-2">
          {loading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Syncing Subject Cloud Data...</span>
            </div>
          )}
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              label: 'Total Subjects', 
              value: SUBJECT_ROWS.length, 
              icon: BookOpen, 
              bg: 'bg-[#4f46e5]', 
              shadow: 'shadow-indigo-500/20' 
            },
            { 
              label: 'Available', 
              value: SUBJECT_ROWS.filter(s => availability[s.id]?.available !== false).length, 
              icon: Unlock, 
              bg: 'bg-[#10b981]', 
              shadow: 'shadow-emerald-500/20' 
            },
            { 
              label: 'Locked', 
              value: SUBJECT_ROWS.filter(s => availability[s.id]?.available === false).length, 
              icon: Lock, 
              bg: 'bg-[#ef4444]', 
              shadow: 'shadow-rose-500/20' 
            },
            { 
              label: 'RAG Sources', 
              value: SUBJECT_ROWS.filter(s => availability[s.id]?.pdfPath).length, 
              icon: FileText, 
              bg: 'bg-[#8b5cf6]', 
              shadow: 'shadow-purple-500/20' 
            },
          ].map((stat, idx) => (
            <div key={idx} className={`relative overflow-hidden ${stat.bg} ${stat.shadow} p-5 rounded-[28px] text-white flex flex-col gap-3 group hover:scale-[1.02] transition-all duration-300 shadow-lg`}>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-700 ease-out" />
              <div className="relative z-10 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{stat.label}</p>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <stat.icon size={14} />
                </div>
              </div>
              <h3 className="relative z-10 text-3xl font-display font-black leading-none tracking-tight">{stat.value}</h3>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 flex items-center gap-3 animate-in shake duration-500">
          <AlertCircle className="text-rose-600" size={20} />
          <p className="text-sm font-bold text-rose-700">{error}</p>
        </div>
      )}

      {/* Subject Table - Premium Integrated */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden relative">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#9956DE] border-b border-[#8b5cf6] sticky top-0 z-20 shadow-md">
              <th className="px-6 py-5 text-[11px] font-black text-white uppercase tracking-widest">Subject Identity</th>
              <th className="px-6 py-5 text-[11px] font-black text-white uppercase tracking-widest">Grade / Semester</th>
              <th className="px-6 py-5 text-[11px] font-black text-white uppercase tracking-widest">Access Status</th>
              <th className="px-6 py-5 text-[11px] font-black text-white uppercase tracking-widest">Toggle Access</th>
              <th className="px-6 py-5 text-[11px] font-black text-white uppercase tracking-widest">RAG Resource Mapping</th>
            </tr>
          </thead>
          <TableBody className="divide-y divide-slate-50">
            {SUBJECT_ROWS.map((subject) => {
              const entry = availability[subject.id];
              const isAvailable = entry?.available ?? true;
              const pdfPath = localPdfPaths[subject.id] ?? entry?.pdfPath ?? '';
              const lastUpdated = entry?.lastUpdated;
              const isSaving = savingId === subject.id;

              return (
                <TableRow key={subject.id} className="group hover:bg-slate-50/50 transition-all">
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform duration-500`}>
                        <BookOpen size={20} className="drop-shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-[#1e293b] truncate text-sm leading-tight group-hover:text-indigo-600 transition-colors">{subject.name}</p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mt-1">{subject.code}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wide">{subject.gradeLevel}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{subject.semester}</p>
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border
                        ${isAvailable 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {isAvailable ? 'Available' : 'Locked'}
                      </span>
                      {lastUpdated && (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1 flex items-center gap-1">
                          <Clock size={10} />
                          Updated: {lastUpdated.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={(checked: boolean) => handleToggle(subject.id, checked)}
                        disabled={isSaving}
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200"
                        aria-label={`Toggle ${subject.name} availability`}
                      />
                      {isSaving && <Loader2 size={16} className="animate-spin text-indigo-500" />}
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 group/input">
                        <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                        <Input
                          value={pdfPath}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePdfPathChange(subject.id, e.target.value)}
                          placeholder="Firebase path (e.g., rag/calculus.pdf)"
                          className="pl-10 h-10 text-xs font-bold rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all"
                          disabled={isSaving}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        onClick={() => handleSavePdfPath(subject.id)}
                        disabled={isSaving}
                        title="Save PDF Path"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : <Save size={18} />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminSubjects;
