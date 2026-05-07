import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lock, Unlock, Loader2, Save, Clock, FileText } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-[#0a1628]">Subject Availability</h2>
          <p className="text-sm text-[#5a6578]">
            Toggle subjects on or off to control student access. Changes take effect immediately across the platform.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Syncing...
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Subject table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs font-black uppercase tracking-wider text-slate-500">Subject</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-slate-500">Grade / Sem</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-slate-500">Available</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-slate-500 w-[320px]">PDF Path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBJECT_ROWS.map((subject) => {
              const entry = availability[subject.id];
              const isAvailable = entry?.available ?? true;
              const pdfPath = localPdfPaths[subject.id] ?? entry?.pdfPath ?? '';
              const lastUpdated = entry?.lastUpdated;
              const isSaving = savingId === subject.id;

              return (
                <TableRow key={subject.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-sm`}
                      >
                        <BookOpen size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0a1628]">{subject.name}</p>
                        <p className="text-[11px] text-slate-400 font-semibold">{subject.code}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="text-sm text-slate-600">{subject.gradeLevel}</p>
                    <p className="text-[11px] text-slate-400">{subject.semester}</p>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        <>
                          <Unlock size={14} className="text-teal-500" />
                          <span className="text-xs font-bold text-teal-600">Unlocked</span>
                        </>
                      ) : (
                        <>
                          <Lock size={14} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">Locked</span>
                        </>
                      )}
                    </div>
                    {lastUpdated && (
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {lastUpdated.toLocaleString()}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={(checked: boolean) => handleToggle(subject.id, checked)}
                        disabled={isSaving}
                        aria-label={`Toggle ${subject.name} availability`}
                      />
                      {isSaving && <Loader2 size={14} className="animate-spin text-slate-400" />}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={pdfPath}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePdfPathChange(subject.id, e.target.value)}
                          placeholder="Firebase Storage path (optional)"
                          className="pl-8 h-8 text-xs"
                          disabled={isSaving}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleSavePdfPath(subject.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700 mb-2">How it works</p>
        <ul className="text-sm text-sky-800 space-y-1 list-disc list-inside">
          <li>Turning a subject <strong>off</strong> immediately locks its modules and removes it from Quiz Battle.</li>
          <li>Turning a subject <strong>on</strong> unlocks it everywhere — no redeployment required.</li>
          <li>The <strong>PDF Path</strong> field is optional and references the RAG source in Firebase Storage.</li>
          <li>All changes are logged with timestamps and your admin user ID.</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default AdminSubjects;
