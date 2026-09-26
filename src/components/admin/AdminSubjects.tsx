import React, { useState, useCallback } from 'react';
import { BookOpen, Lock, Unlock, Loader2, Save, Clock, FileText, AlertCircle, Link2 } from 'lucide-react';
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
        toast.success('Learning material link saved');
      } catch (err) {
        toast.error('Failed to save material link');
        console.error(err);
      } finally {
        setSavingId(null);
      }
    },
    [localPdfPaths, userProfile?.uid],
  );

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {loading && (
        <div className="flex items-center justify-end px-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Loading subjects...</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[
          {
            label: 'Total Subjects',
            value: SUBJECT_ROWS.length,
            subtext: 'Senior high math curriculum',
            badge: 'Curriculum',
            icon: BookOpen,
            gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.52)]',
          },
          {
            label: 'Available',
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.available !== false).length,
            subtext: 'Accessible to students',
            badge: 'Active',
            icon: Unlock,
            gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
          },
          {
            label: 'Locked',
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.available === false).length,
            subtext: 'Materials not yet linked',
            badge: 'Locked',
            icon: Lock,
            gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.52)]',
          },
          {
            label: 'Linked Materials',
            value: SUBJECT_ROWS.filter(s => availability[s.id]?.pdfPath).length,
            subtext: 'Ready for AI tutoring',
            badge: 'AI Ready',
            icon: Link2,
            gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
          },
        ].map((stat, idx) => (
          <div key={idx} className={`group relative ${stat.gradient} ${stat.shadow} border border-white/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 ease-out overflow-hidden min-h-[58px] sm:min-h-[120px] cursor-default`}>
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

      {/* Subject Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto relative w-full">
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />
        <Table className="w-full text-left border-collapse min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-20">
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Subject</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Grade / Term</TableHead>
              <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Access</TableHead>
              <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Learning Material Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-50 dark:divide-slate-800">
            {SUBJECT_ROWS.map((subject) => {
              const entry = availability[subject.id];
              // Shelved subjects (no PDFs) default to locked until PDFs land.
              const isAvailable = entry?.available ?? !subject.shelved;
              const pdfPath = localPdfPaths[subject.id] ?? entry?.pdfPath ?? '';
              const lastUpdated = entry?.lastUpdated;
              const isSaving = savingId === subject.id;

              return (
                <TableRow key={subject.id} className="group hover:bg-purple-50/20 dark:hover:bg-purple-950/10 border-l-2 border-l-transparent hover:border-l-[#9956DE] transition-all">
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300`}>
                        <BookOpen size={18} className="drop-shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white truncate text-sm leading-tight group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">{subject.name}</p>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{subject.code}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{subject.gradeLevel}</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{subject.quarterLabel}</p>
                      {subject.shelved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Materials pending
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider border
                        ${isAvailable
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-500'}`} />
                        {isAvailable ? 'Available' : 'Locked'}
                      </span>
                      {lastUpdated && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock size={9} />
                          {lastUpdated.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-3 min-h-[44px] min-w-[44px]">
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={(checked: boolean) => handleToggle(subject.id, checked)}
                        disabled={isSaving}
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200"
                        aria-label={`Toggle ${subject.name} availability`}
                      />
                      {isSaving && <Loader2 size={16} className="animate-spin text-purple-500" />}
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 group/input">
                        <FileText size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#9956DE] transition-colors" />
                        <Input
                          value={pdfPath}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePdfPathChange(subject.id, e.target.value)}
                          placeholder="File path (e.g. rag/calculus.pdf)"
                          className="pl-9 h-10 text-xs font-semibold rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-purple-400 focus-visible:border-purple-400 transition-all"
                          disabled={isSaving}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-[#9956DE] dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-transparent hover:border-purple-200/60 dark:hover:border-purple-800/60 active:scale-95 transition-all"
                        onClick={() => handleSavePdfPath(subject.id)}
                        disabled={isSaving}
                        title="Save material link"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin text-purple-500" /> : <Save size={18} />}
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
