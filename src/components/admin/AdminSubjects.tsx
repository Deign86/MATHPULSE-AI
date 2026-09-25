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
  quarterLabel: string;
  shelved: boolean;
  color: string;
}

interface SubjectMetadataRecord {
  termStructure?: 'quarterly' | 'year-long' | string;
  quarters?: readonly string[];
  shelved?: boolean;
}

const quarterLabelFor = (s: (typeof SHS_MATH_SUBJECTS)[number]): string => {
  // SAFETY: s is an entry from SHS_MATH_SUBJECTS conforming to SubjectMetadataRecord.
  const subject = s as SubjectMetadataRecord;
  return subject.termStructure === 'year-long'
    ? 'Year-long • Units 1–4'
    : `Quarters ${([...(subject.quarters ?? [])].join(' • ') || 'Q1–Q4')}`;
};

const isShelved = (s: (typeof SHS_MATH_SUBJECTS)[number]): boolean => {
  // SAFETY: s is an entry from SHS_MATH_SUBJECTS where shelved is an optional boolean flag.
  const subject = s as SubjectMetadataRecord;
  return subject.shelved === true;
};

const SUBJECT_ROWS: SubjectRowData[] = SHS_MATH_SUBJECTS.map((s) => ({
  id: s.id,
  name: s.name,
  code: s.code,
  gradeLevel: s.gradeLevel,
  quarterLabel: quarterLabelFor(s),
  shelved: isShelved(s),
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
    <div className="flex flex-col min-h-full space-y-8 pt-6 xl:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-6">
      {loading && (
        <div className="flex items-center justify-end px-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Syncing Subject Cloud Data...</span>
          </div>
        </div>
      )}

      {/* Stats Grid - Executive Bento Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[
          { 
            label: 'Total Subjects', 
            value: SUBJECT_ROWS.length, 
            subtext: 'Senior high math modules',
            badge: 'Curriculum',
            icon: BookOpen, 
            gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)]',
          },
          { 
            label: 'Available', 
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.available !== false).length, 
            subtext: 'Active curriculum access',
            badge: 'Active',
            icon: Unlock, 
            gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
          },
          { 
            label: 'Locked / Shelved', 
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.available === false).length, 
            subtext: 'Pending PDF materials',
            badge: 'Locked',
            icon: Lock, 
            gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.52)]',
          },
          { 
            label: 'RAG Sources', 
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.pdfPath).length, 
            subtext: 'Vectorized knowledge docs',
            badge: 'AI Vector',
            icon: FileText, 
            gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
          },
        ].map((stat, idx) => (
          <div key={idx} className={`group relative ${stat.gradient} ${stat.shadow} border border-white/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out overflow-hidden min-h-[58px] sm:min-h-[120px]`}>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between relative z-10 mb-1.5 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <stat.icon size={14} className="sm:hidden" />
                <stat.icon size={18} className="hidden sm:block" />
              </div>
              <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/25">
                {stat.badge}
              </span>
            </div>
            <div className="relative z-10 min-w-0">
              <h3 className="text-lg sm:text-3xl font-black font-display text-white leading-none tracking-tight tabular-nums drop-shadow-sm">{stat.value}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-1 sm:mt-1.5 truncate">{stat.label}</p>
              <p className="text-[10px] text-white/70 mt-0.5 truncate font-medium hidden sm:block">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 px-6 py-4 flex items-center gap-3 animate-in shake duration-500">
          <AlertCircle className="text-rose-600 dark:text-rose-400" size={20} />
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Subject Table - Teacher-Inspired Integrated Design */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto relative w-full">
        <Table className="w-full text-left border-collapse min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-slate-50 dark:from-purple-950/30 dark:via-slate-800 dark:to-slate-800 border-b border-purple-100 dark:border-slate-700 sticky top-0 z-20">
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Subject Identity</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Grade / Quarters</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Access Status</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Toggle Access</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">RAG Resource Mapping</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-50">
            {SUBJECT_ROWS.map((subject) => {
              const entry = availability[subject.id];
              // Shelved subjects (no PDFs) default to locked until PDFs land.
              const isAvailable = entry?.available ?? !subject.shelved;
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{subject.quarterLabel}</p>
                      {subject.shelved && (
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-tight">Shelved — no PDFs yet</p>
                      )}
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
                    <div className="flex items-center gap-3 min-h-[44px] min-w-[44px]">
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
