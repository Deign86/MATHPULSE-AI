import React, { useState, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Lock,
  Unlock,
  Loader2,
  Clock,
  AlertCircle,
  Link2,
  Search,
  X,
  FilterX,
  CheckCircle2,
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { toggleSubjectAvailability } from '../../services/platformConfigService';
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

const GRADE_OPTIONS = ['All Grades', 'Grade 11', 'Grade 12'] as const;
const STATUS_OPTIONS = ['All Statuses', 'Available', 'Locked', 'With Materials'] as const;

const AdminSubjects: React.FC = () => {
  const { userProfile } = useAuth();
  const { availability, loading, error } = useSubjectAvailability();
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('All Grades');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');

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

  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return SUBJECT_ROWS.filter((subject) => {
      const entry = availability[subject.id];
      const isAvailable = entry?.available ?? !subject.shelved;
      const pdfPath = entry?.pdfPath ?? '';

      // Text search
      if (
        query &&
        !subject.name.toLowerCase().includes(query) &&
        !subject.code.toLowerCase().includes(query) &&
        !subject.gradeLevel.toLowerCase().includes(query)
      ) {
        return false;
      }

      // Grade level filter
      if (selectedGrade !== 'All Grades' && subject.gradeLevel !== selectedGrade) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'Available' && !isAvailable) return false;
      if (selectedStatus === 'Locked' && isAvailable) return false;
      if (selectedStatus === 'With Materials' && !pdfPath) return false;

      return true;
    });
  }, [searchTerm, selectedGrade, selectedStatus, availability]);

  const hasActiveFilters = searchTerm !== '' || selectedGrade !== 'All Grades' || selectedStatus !== 'All Statuses';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGrade('All Grades');
    setSelectedStatus('All Statuses');
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-6 animate-in fade-in duration-300">
      {loading && (
        <div className="flex items-center justify-end px-2">
          <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] dark:text-purple-300 rounded-2xl border border-purple-100 dark:border-purple-900/40 animate-pulse shadow-xs">
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
            value: SUBJECT_ROWS.filter((s) => availability[s.id]?.available !== false).length,
            subtext: 'Accessible to students',
            badge: 'Active',
            icon: Unlock,
            gradient: 'bg-gradient-to-br from-[#75D06A] via-[#52B847] to-[#36962C]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(82,184,71,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(82,184,71,0.52)]',
          },
          {
            label: 'Locked',
            value: SUBJECT_ROWS.filter((s) => availability[s.id]?.available === false).length,
            subtext: 'Materials not yet linked',
            badge: 'Locked',
            icon: Lock,
            gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.52)]',
          },
          {
            label: 'Linked Materials',
            value: SUBJECT_ROWS.filter((s) => availability[s.id]?.pdfPath).length,
            subtext: 'Ready for AI tutoring',
            badge: 'AI Ready',
            icon: Link2,
            gradient: 'bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1]',
            shadow: 'shadow-[0_8px_24px_-6px_rgba(2,132,199,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(2,132,199,0.52)]',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col justify-between ${stat.gradient} ${stat.shadow} border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out min-w-0 min-h-[110px] sm:min-h-[140px] text-white select-none`}
          >
            <div className="absolute -bottom-6 -right-6 w-24 sm:w-36 h-24 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between mb-1.5 sm:mb-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs text-white transition-transform group-hover:scale-105">
                <stat.icon size={14} className="sm:hidden text-white" />
                <stat.icon size={18} className="hidden sm:block text-white" />
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                {stat.badge}
              </span>
            </div>
            <div className="relative z-10 min-w-0">
              <h3 className="text-lg sm:text-[30px] font-display font-black text-white leading-tight tracking-tight truncate tabular-nums drop-shadow-xs">{stat.value}</h3>
              <p className="text-[10px] sm:text-sm font-bold text-white truncate mt-0.5 sm:mt-1 drop-shadow-xs">{stat.label}</p>
              <p className="text-[11px] text-white/90 truncate mt-0.5 font-medium hidden sm:block drop-shadow-xs">{stat.subtext}</p>
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

      {/* ── Search & Filter Toolbar ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 sm:p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 group-focus-within:text-[#9956DE] transition-colors" size={15} />
          <Input
            type="text"
            placeholder="Search by subject name or code (e.g. Pre-Calculus, GMATH)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8.5 pr-8 h-10 bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-semibold focus-visible:ring-1 focus-visible:ring-purple-400 w-full"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              aria-label="Clear subject search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Grade filter */}
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="h-10 text-xs font-bold bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 rounded-xl min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
              {GRADE_OPTIONS.map((grade) => (
                <SelectItem key={grade} value={grade} className="text-xs font-bold">
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-10 text-xs font-bold bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 rounded-xl min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className="text-xs font-bold">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-10 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#9956DE] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-bold gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <FilterX size={14} />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile Bento Cards View (< md) ── */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>{filteredSubjects.length} of {SUBJECT_ROWS.length} Subjects</span>
          {hasActiveFilters && (
            <span className="text-[#9956DE] dark:text-purple-300 font-extrabold text-[11px]">Filtered</span>
          )}
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] flex items-center justify-center mx-auto">
              <BookOpen size={22} />
            </div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No subjects match your filter</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">Try clearing search or changing the grade/status filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-2 text-xs font-bold rounded-xl border-slate-200 text-[#9956DE]"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const entry = availability[subject.id];
            const isAvailable = entry?.available ?? !subject.shelved;
            const lastUpdated = entry?.lastUpdated;
            const isSaving = savingId === subject.id;

            return (
              <div
                key={`mobile-subject-${subject.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3 relative overflow-hidden border-l-4 border-l-[#9956DE]"
              >
                {/* Header row with icon, title, code, and switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                      <BookOpen size={18} className="drop-shadow-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug truncate">{subject.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{subject.code}</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={(checked: boolean) => handleToggle(subject.id, checked)}
                      disabled={isSaving}
                      className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200"
                      aria-label={`Toggle ${subject.name} availability`}
                    />
                    {isSaving && <Loader2 size={14} className="animate-spin text-purple-500" />}
                  </div>
                </div>

                {/* Grade, Quarter, and Availability Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {subject.gradeLevel}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    {subject.quarterLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {isAvailable ? 'Available' : 'Locked'}
                  </span>
                  {subject.shelved && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending
                    </span>
                  )}
                </div>

                {lastUpdated && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock size={10} />
                    Last updated: {lastUpdated.toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop Table View (≥ md) ── */}
      <div className="hidden md:flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 relative overflow-hidden">
        {/* Top Brand Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] shrink-0" />

        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-20">
                <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Subject</TableHead>
                <TableHead className="px-5 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Grade / Term</TableHead>
                <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-5 py-4 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#9956DE] flex items-center justify-center mx-auto mb-3">
                      <BookOpen size={24} />
                    </div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">No subjects found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your search query or changing active filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((subject) => {
                  const entry = availability[subject.id];
                  const isAvailable = entry?.available ?? !subject.shelved;
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
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider border ${
                              isAvailable
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminSubjects;
