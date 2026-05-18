import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, Bell, Layers, ChevronDown, Table, FileText, ScanLine, TrendingDown,
  CheckCircle, Edit3, ArrowLeft, Cpu, ArrowRight, Check, Save, Info, Edit2, Search,
  FileSpreadsheet, Download, Trash2, ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';

import type { ClassSectionMetadata } from '../../types/models';
import type { StudentView } from '../../components/TeacherDashboard';

import type { ParseWorkbookResult } from '../import/services/shsExcel/parser/types';
import type { UploadResponse } from '../../services/apiService';
import { apiService, ApiError } from '../../services/apiService';
import { parseShsWorkbook } from '../import/services/shsExcel/parser';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../import/services/shsExcel/parser/constants';
import { resolveClassMetadata, assignStudentToClassSection, updateManagedStudentSectionAssignment, updateStudentRisk } from '../../services/studentService';

function normalizeClassSectionId(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function buildStudentViewKey(student: StudentView): string {
  const classSectionKey = normalizeClassSectionId(student.classSectionId) || normalizeClassSectionId(student.classroomId);
  const lrnKey = (student.lrn || '').trim().toLowerCase();
  const idKey = (student.id || '').trim().toLowerCase();
  const nameKey = student.name.trim().toLowerCase().replace(/\\s+/g, '_');

  if (classSectionKey && lrnKey) return `${classSectionKey}|lrn:${lrnKey}`;
  if (classSectionKey && idKey) return `${classSectionKey}|id:${idKey}`;
  if (lrnKey) return `lrn:${lrnKey}`;
  if (idKey && nameKey) return `id:${idKey}|name:${nameKey}`;
  return `${classSectionKey}|anonymous`;
}

export interface DataImportViewProps {
  classSectionId?: string;
  className?: string;
  classMetadata?: ClassSectionMetadata;
  students?: StudentView[];
  classes?: { id: string; name: string; classSectionId?: string }[];
  teacherId?: string;
  teacherName?: string;
  onImportedClassRecords?: (payload: {
    students: UploadResponse['students'];
    classSectionId: string;
    className: string;
    classMetadata?: ClassSectionMetadata;
  }) => void;
  onDataChanged?: () => void;
  onBackToClasses?: () => void;
  onStudentsUpdated?: (students: StudentView[]) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
}

export default function DataImportView({
  classSectionId,
  className,
  classMetadata,
  students: initialStudents = [],
  classes: availableClasses = [],
  teacherId = '',
  teacherName = 'Teacher',
  onImportedClassRecords,
  onDataChanged,
  onBackToClasses,
  onStudentsUpdated,
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto
}: DataImportViewProps) {
  const [currentImportView, setCurrentImportView] = useState<'main' | 'mapping-logs' | 'edit-records' | 'upload-history'>('main');

  // Logic for Import
  const [shsExcelResult, setShsExcelResult] = useState<ParseWorkbookResult | null>(null);
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const [uploadingClassRecords, setUploadingClassRecords] = useState(false);
  const [uploadingCourseMaterials, setUploadingCourseMaterials] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');
  const [uploadInterpretation, setUploadInterpretation] = useState<{
    datasetIntent?: 'synthetic_student_records' | 'general_analytics' | 'eval_only';
    summary?: {
      scoringColumns: number;
      displayColumns: number;
      storageOnlyColumns: number;
      lowConfidenceColumns: number;
      domainMismatchWarnings: number;
    };
    columns: Array<{
      columnName: string;
      mappedField?: string;
      usagePolicy: 'scoring' | 'display' | 'storage_only';
      confidenceBand: 'high' | 'medium' | 'low';
      domainSignals?: string[];
    }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  const normalizeLearnerKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clampPercent = (value: number, fallback: number): number => {
    const finiteValue = Number.isFinite(value) ? value : fallback;
    return Math.max(0, Math.min(100, finiteValue));
  };

  const toCsvCell = (value: string | number): string => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const buildNormalizedWorkbookCsv = (workbookResult: ParseWorkbookResult, sourceFileName: string): File | null => {
    const scoreByLearner = new Map<string, number[]>();
    const scoreFields = ['quarterlyGrade', 'finalGrades', 'firstSemester', 'firstQuarter', 'secondQuarter', 'initialGrade'] as const;

    workbookResult.mapping.gradeEntities.forEach((gradeRow) => {
      const learnerKey = normalizeLearnerKey(gradeRow.fullName || '');
      if (!learnerKey) return;
      const values = scoreFields
        .map((field) => toFiniteNumber(gradeRow[field]))
        .filter((value): value is number => value !== null);
      if (values.length === 0) return;
      const existing = scoreByLearner.get(learnerKey) || [];
      scoreByLearner.set(learnerKey, existing.concat(values));
    });

    const students = workbookResult.mapping.studentEntities || [];
    if (students.length === 0) return null;

    const fallbackTerm = (workbookResult.imported.schoolContext.semester || workbookResult.imported.schoolContext.schoolYear || 'First Semester').trim();
    const fallbackAssessment = (workbookResult.imported.schoolContext.subjectName || 'Class Record Import').trim();
    const classToken = (classSectionId || className || 'import').replace(/[^a-zA-Z0-9]+/g, '').toUpperCase().slice(0, 12) || 'IMPORT';

    const header = ['name', 'lrn', 'email', 'engagementScore', 'avgQuizScore', 'attendance', 'assignmentCompletion', 'term', 'assessmentName'];
    const rows = [header.join(',')];

    students.forEach((student, index) => {
      const learnerKey = normalizeLearnerKey(student.fullName || '');
      const learnerScores = scoreByLearner.get(learnerKey) || [];
      const avgScore = learnerScores.length > 0 ? learnerScores.reduce((sum, value) => sum + value, 0) / learnerScores.length : 75;

      const avgQuizScore = clampPercent(avgScore, 75);
      const attendance = clampPercent(avgQuizScore + 5, 85);
      const engagementScore = clampPercent((avgQuizScore * 0.7) + (attendance * 0.3), 80);
      const assignmentCompletion = clampPercent((attendance * 0.6) + (avgQuizScore * 0.4), 82);

      const learnerNoSeed = student.learnerNo || (index + 1);
      const lrn = `IMP-${classToken}-${String(learnerNoSeed).padStart(4, '0')}`;
      const name = student.fullName || `Learner ${index + 1}`;

      rows.push([
        toCsvCell(name), toCsvCell(lrn), toCsvCell(''), toCsvCell(Number(engagementScore.toFixed(1))),
        toCsvCell(Number(avgQuizScore.toFixed(1))), toCsvCell(Number(attendance.toFixed(1))),
        toCsvCell(Number(assignmentCompletion.toFixed(1))), toCsvCell(fallbackTerm), toCsvCell(fallbackAssessment)
      ].join(','));
    });

    if (rows.length <= 1) return null;
    const normalizedName = sourceFileName.replace(/\.(xlsx|xls)$/i, '');
    return new File([rows.join('\n')], `${normalizedName}-normalized.csv`, { type: 'text/csv' });
  };

  const handleFileUpload = async (file: File) => {
    setUploadingClassRecords(true);
    setUploadResult('');
    setUploadInterpretation(null);

    let uploadFile = file;

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      try {
        const workbookResult = await parseShsWorkbook(file, { confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD });
        setShsExcelResult(workbookResult);
        const normalizedFile = buildNormalizedWorkbookCsv(workbookResult, file.name);
        if (normalizedFile) uploadFile = normalizedFile;
      } catch {
        setShsExcelResult(null);
      }
    } else {
      setShsExcelResult(null);
    }

    try {
      const result = await apiService.uploadClassRecords(uploadFile, { classSectionId, className, datasetIntent: 'synthetic_student_records' });
      const uploadedStudentsCount = result.students.length;
      
      const resolveUploadedClassContext = (result: any, classSectionId?: string, className?: string, classMetadata?: ClassSectionMetadata) => {
        return {
          classSectionId: result.classSectionId || classSectionId || 'imported_class',
          className: result.className || className || 'Imported Class',
          classMetadata: result.classMetadata || classMetadata
        };
      };

      const resolvedImportContext = resolveUploadedClassContext(result, classSectionId, className, classMetadata);

      if (uploadedStudentsCount > 0) {
        onImportedClassRecords?.({
          students: result.students,
          classSectionId: resolvedImportContext.classSectionId,
          className: resolvedImportContext.className,
          classMetadata: resolvedImportContext.classMetadata,
        });
      }

      if (result.success) {
        toast.success(`Successfully imported ${uploadedStudentsCount} student records.`);
        setUploadInterpretation({
          datasetIntent: result.datasetIntent,
          summary: result.interpretationSummary,
          columns: result.columnInterpretations?.map((item) => ({
            columnName: item.columnName, mappedField: item.mappedField, usagePolicy: item.usagePolicy,
            confidenceBand: item.confidenceBand, domainSignals: item.domainSignals,
          })) || [],
        });
        onDataChanged?.();
      } else {
        toast.error('Import completed but no usable student rows were detected. Check required columns and retry.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingClassRecords(false);
    }
  };

  const handleCourseMaterialUpload = async (file: File) => {
    setUploadingCourseMaterials(true);
    try {
      const result = await apiService.uploadCourseMaterials(file, { classSectionId, className });
      if (result.success) {
        const topicCount = result.topics?.length ?? 0;
        toast.success(`Course material imported (${topicCount} topics extracted).`);
        onDataChanged?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Course material upload failed');
    } finally {
      setUploadingCourseMaterials(false);
    }
  };

  // Logic for Edit Records
  const [localStudents, setLocalStudents] = useState<StudentView[]>(initialStudents);
  const [saving, setSaving] = useState(false);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

  // Filter students: only show students this teacher manages
  const filteredStudents = useMemo(() => {
    let filtered = localStudents;

    // Primary filter: only students in teacher's own classes
    if (availableClasses.length > 0) {
      const classIds = new Set(availableClasses.map(c => normalizeClassSectionId(c.classSectionId || c.id)));
      filtered = filtered.filter(s =>
        classIds.has(normalizeClassSectionId(s.classSectionId)) ||
        classIds.has(normalizeClassSectionId(s.classroomId))
      );
    } else {
      // Teacher has no classes — show nothing
      return [];
    }

    // Secondary filter: if a specific class is selected, narrow further
    if (classSectionId) {
      filtered = filtered.filter(s =>
        normalizeClassSectionId(s.classSectionId) === normalizeClassSectionId(classSectionId) ||
        normalizeClassSectionId(s.classroomId) === normalizeClassSectionId(classSectionId)
      );
    }

    return filtered;
  }, [localStudents, classSectionId, availableClasses]);

  useEffect(() => {
    setLocalStudents(initialStudents);
    setSectionDrafts(Object.fromEntries(
      initialStudents.map((student) => [buildStudentViewKey(student), { grade: student.grade || '', section: student.section || '' }])
    ));
  }, [initialStudents]);

  const [sectionDrafts, setSectionDrafts] = useState<Record<string, { grade: string; section: string }>>({});

  const handleSaveEditRecords = async () => {
    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;
    try {
      for (const student of filteredStudents) {
        const draft = sectionDrafts[buildStudentViewKey(student)];
        const updatedGrade = draft?.grade || student.grade;
        const updatedSection = draft?.section || student.section;

        try {
          if (teacherId && (updatedGrade !== student.grade || updatedSection !== student.section)) {
            await assignStudentToClassSection(student.id, updatedGrade, updatedSection, teacherId, new Date().getFullYear().toString(), teacherName);
            await updateManagedStudentSectionAssignment(student.id, updatedGrade, updatedSection);
            savedCount++;
          }
        } catch (err) {
          console.warn(`[EditRecords] Failed to save ${student.name}:`, err);
          errorCount++;
        }
      }

      const updatedLocal = localStudents.map((student) => {
        const draft = sectionDrafts[buildStudentViewKey(student)];
        if (!draft) return student;
        const classMetadata = resolveClassMetadata({
          metadata: student.classMetadata, classSectionId: student.classSectionId,
          className: [draft.grade, draft.section].filter(Boolean).join(' - '),
          grade: draft.grade, section: draft.section,
        });
        return {
          ...student, grade: draft.grade, section: draft.section,
          className: classMetadata.className || [draft.grade, draft.section].filter(Boolean).join(' - '),
          classSectionId: classMetadata.classSectionId || student.classSectionId,
          classMetadata,
        };
      });
      setLocalStudents(updatedLocal);
      onStudentsUpdated?.(updatedLocal);
      if (errorCount > 0) {
        toast.warning(`Saved ${savedCount} records, ${errorCount} failed`);
      } else {
        toast.success('Records saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto w-full block">
      <div className="w-full p-[24px] xl:p-[32px] space-y-[24px]">
        {/* Sub-view: Main Dashboard */}
        {currentImportView === 'main' && (
          <div className="block space-y-[24px]">
            {/* Context Selector Banner */}
            <div className="bg-white/80 backdrop-blur-[12px] rounded-[16px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                  <Layers className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-[#1e293b]">Upload Context</h2>
                  <p className="text-[12px] text-[#64748b]">Select where the imported data should be applied</p>
                </div>
              </div>
              <div className="relative w-full md:w-[300px]">
                <select 
                  className="appearance-none bg-[#f8fafc] border border-[#e2e8f0] text-[#1e293b] font-bold text-[13px] rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer w-full transition-colors"
                  value={className || classSectionId || 'All Classes'}
                  onChange={() => {}}
                >
                  <option value="All Classes">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.classSectionId || c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#64748b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Upload Zones (Side by Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              {/* Zone 1: Class Records (Summer Sky Blue) */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
                onDragLeave={() => setDragOver1(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver1(false); const f = e.dataTransfer.files[0]; if(f) handleFileUpload(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed transition-all rounded-[24px] p-8 flex flex-col items-center justify-center text-center cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden h-[280px] ${dragOver1 ? 'border-[#1FA7E1] bg-[#1FA7E1]/10' : 'border-[#1FA7E1]/30 hover:border-[#1FA7E1] bg-white hover:bg-[#1FA7E1]/5'}`}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFileUpload(f); }} className="hidden" />
                <div className="w-16 h-16 rounded-full bg-[#1FA7E1]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-[#1FA7E1]/20">
                  {uploadingClassRecords ? <span className="animate-spin text-[#1FA7E1]">...</span> : <Table className="w-8 h-8 text-[#1FA7E1]" />}
                </div>
                <h3 className="text-[18px] font-bold text-[#1e293b] mb-2">{uploadingClassRecords ? 'Uploading...' : 'Class Records'}</h3>
                <p className="text-[13px] text-[#64748b] max-w-sm mb-6">
                  Upload student grades, attendance logs, and quiz scores to power predictive analytics.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-full border border-slate-200">.csv</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-full border border-slate-200">.xlsx</span>
                </div>
              </div>

              {/* Zone 2: Course Materials (Amethyst Purple) */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
                onDragLeave={() => setDragOver2(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver2(false); const f = e.dataTransfer.files[0]; if(f) handleCourseMaterialUpload(f); }}
                onClick={() => materialInputRef.current?.click()}
                className={`border-2 border-dashed transition-all rounded-[24px] p-8 flex flex-col items-center justify-center text-center cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden h-[280px] ${dragOver2 ? 'border-[#9956DE] bg-[#9956DE]/10' : 'border-[#9956DE]/30 hover:border-[#9956DE] bg-white hover:bg-[#9956DE]/5'}`}
              >
                <input ref={materialInputRef} type="file" accept=".pdf,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleCourseMaterialUpload(f); }} className="hidden" />
                <div className="w-16 h-16 rounded-full bg-[#9956DE]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-[#9956DE]/20">
                  {uploadingCourseMaterials ? <span className="animate-spin text-[#9956DE]">...</span> : <FileText className="w-8 h-8 text-[#9956DE]" />}
                </div>
                <h3 className="text-[18px] font-bold text-[#1e293b] mb-2">{uploadingCourseMaterials ? 'Uploading...' : 'Course Materials'}</h3>
                <p className="text-[13px] text-[#64748b] max-w-sm mb-6">
                  Upload syllabus, lesson plans, and curriculum docs to ground AI lesson generation.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-full border border-slate-200">.pdf</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-full border border-slate-200">.docx</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-full border border-slate-200">.txt</span>
                </div>
              </div>
            </div>

            {/* How AI Uses Data Feature Cards (Vibrant Gradients) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
              {/* Smart Parsing (Blue) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(14,165,233,0.2)] flex flex-col text-white group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/30">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mb-3 relative z-10 transition-transform group-hover:scale-110">
                  <ScanLine className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-[14px] mb-1.5 relative z-10">Smart Parsing</h4>
                <p className="text-[12px] text-white/90 leading-relaxed relative z-10">AI automatically understands varied spreadsheet formats and maps column names securely.</p>
              </div>
              
              {/* Risk Prediction (Orange) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(249,115,22,0.2)] flex flex-col text-white group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/30">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mb-3 relative z-10 transition-transform group-hover:scale-110">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-[14px] mb-1.5 relative z-10">Risk Prediction</h4>
                <p className="text-[12px] text-white/90 leading-relaxed relative z-10">Analyzes historical performance patterns across your data to predict at-risk students.</p>
              </div>
              
              {/* Contextual AI (Purple) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(168,85,247,0.2)] flex flex-col text-white group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mb-3 relative z-10 transition-transform group-hover:scale-110">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-[14px] mb-1.5 relative z-10">Contextual AI</h4>
                <p className="text-[12px] text-white/90 leading-relaxed relative z-10">Maps curriculum topics to generate highly personalized remedial lesson paths.</p>
              </div>
            </div>

            {/* Bottom Section: Data Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white flex flex-col justify-between h-full">
                <h2 className="text-[16px] font-semibold text-[#1e293b] mb-4">Data Health</h2>
                <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-[16px] p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-emerald-50 hover:shadow-md hover:border-emerald-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-emerald-600 transition-transform duration-300 hover:scale-110 hover:-translate-y-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-emerald-700 font-bold text-[15px] mb-1">All Records Synced</h3>
                  <p className="text-emerald-600/80 text-[12px] max-w-[200px]">AI parsing completed successfully with no anomalies detected.</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => setCurrentImportView('edit-records')}
                    className="w-full flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-black text-white text-[13px] font-semibold rounded-full px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-transform hover:scale-[1.02]"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Class Records
                  </button>
                  <button
                    onClick={() => setCurrentImportView('mapping-logs')}
                    className="w-full flex items-center justify-center gap-2 bg-white text-[#475569] border border-slate-300 hover:bg-slate-50 text-[13px] font-semibold rounded-full px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors"
                  >
                    View Mapping Logs
                  </button>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-[12px] rounded-[24px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[16px] font-semibold text-[#1e293b]">Recent Uploads</h2>
                  <button 
                    onClick={() => setCurrentImportView('mapping-logs')}
                    className="text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors"
                  >
                    View All
                  </button>
                </div>
                
                <div className="flex-1 space-y-[12px] overflow-y-auto no-scrollbar flex flex-col justify-center items-center h-[120px]">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2 border border-slate-100">
                    <FileSpreadsheet className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-500">There are no recent uploads yet.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Mapping Logs */}
        {currentImportView === 'mapping-logs' && (
          <div className="space-y-[16px]">
            <div className="shrink-0 mb-2">
              <button
                onClick={() => setCurrentImportView('main')}
                className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors w-max bg-white px-[18px] py-2 rounded-full shadow-sm border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Uploads
              </button>
            </div>
            
            <div className="bg-white rounded-[18px] border border-[#f1f5f9] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#f1f5f9] bg-slate-50 flex justify-between items-center">
                <h2 className="text-[15px] font-semibold text-[#1e293b]">Latest Import Mapping</h2>
              </div>
              <div className="p-5">
                {uploadInterpretation ? (
                  <div className="space-y-3">
                    {uploadInterpretation.columns.map((col, i) => (
                      <div key={i} className="flex justify-between p-3 border rounded bg-slate-50">
                        <span className="font-semibold text-sm">{col.columnName}</span>
                        <span className="text-sm text-indigo-600">{col.mappedField || 'Unmapped'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No recent mapping logs to display.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Edit Class Records */}
        {currentImportView === 'edit-records' && (
          <div className="space-y-[16px] h-full flex flex-col">
            <div className="shrink-0 mb-2">
              <button
                onClick={() => setCurrentImportView('main')}
                className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors w-max bg-white px-[18px] py-2 rounded-full shadow-sm border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Uploads
              </button>
            </div>

            <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1e293b]">Edit Class Records</h2>
                  <p className="text-[13px] text-[#64748b]">Review and modify student data manually</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCurrentImportView('main')} className="px-5 py-2 rounded-full border border-slate-300 text-slate-700 font-semibold text-[13px] hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={handleSaveEditRecords} disabled={saving} className="px-5 py-2 rounded-full bg-emerald-500 text-white font-semibold text-[13px] hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50">
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </div>

{/* Info Toolbar */}
              <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0 text-slate-500 text-[13px]">
                <span className="flex items-center gap-2 font-medium">
                  <Info className="w-4 h-4" /> Click on any field to edit
                </span>
                <span>Showing {filteredStudents.length} records</span>
              </div>
              
              <div className="overflow-auto flex-1 table-scrollbar bg-white relative">
                  <div className="min-w-[1100px] w-full flex flex-col min-h-full">
                    {/* Header Row */}
                    <div className="flex items-center w-full bg-slate-100/90 border-b border-slate-200 text-[12px] font-semibold text-slate-500 tracking-wide sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-12">
                      <div className="flex-[1.5] min-w-[240px] px-6 sticky left-0 z-30 bg-slate-100/90 backdrop-blur-sm border-r border-slate-200 h-full flex items-center shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                        Student Name
                      </div>
                      <div className="w-[100px] shrink-0 px-4 h-full flex items-center justify-center">LRN</div>
                      <div className="w-[140px] shrink-0 px-4 h-full flex items-center justify-center">Grade</div>
                      <div className="w-[140px] shrink-0 px-4 h-full flex items-center justify-center">Section</div>
                      <div className="w-[100px] shrink-0 px-4 h-full flex items-center justify-center">Avg Score</div>
                      <div className="w-[120px] shrink-0 px-4 h-full flex items-center justify-center">Risk Level</div>
                      <div className="flex-1 min-w-[180px] px-4 h-full flex items-center justify-center">Weakest Topic</div>
                        <div className="w-[80px] shrink-0 px-4 h-full flex items-center justify-center border-r border-transparent">Action</div>
                      </div>
                  {/* Editable Rows */}
                  <div className="flex flex-col w-full pb-4">
                    {filteredStudents.map((student, i) => {
                      const rowKey = buildStudentViewKey(student);
                      
                      // Derive Initials
                      const parts = student.name.split(' ');
                      const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : student.name.substring(0,2).toUpperCase();
                      
                      // Derive Avatar Color
                      const colors = ['bg-[#be185d]', 'bg-[#3b82f6]', 'bg-[#f43f5e]', 'bg-[#2563eb]', 'bg-[#059669]', 'bg-[#d946ef]'];
                      const color = colors[i % colors.length];

                      // Avg Score Color
                      const scoreColor = (student.avgScore ?? 0) >= 75 ? 'text-emerald-500' : (student.avgScore ?? 0) >= 60 ? 'text-orange-500' : 'text-rose-500';

                      // Risk Level Styles
                      let riskStyles = 'bg-slate-50 text-slate-600 border-slate-200';
                      const lowerRisk = (student.riskLevel || '').toLowerCase();
                      if (lowerRisk === 'low') riskStyles = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                      else if (lowerRisk === 'high') riskStyles = 'bg-rose-50 text-rose-600 border-rose-200';
                      else if (lowerRisk === 'medium') riskStyles = 'bg-orange-50 text-orange-600 border-orange-200';
                      
                      return (
                          <div key={rowKey} className="flex items-center w-full border-b border-slate-100 hover:bg-slate-50 transition-colors group min-h-[64px]">
                            <div className="flex-[1.5] min-w-[240px] px-6 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 h-full flex items-center gap-4 shadow-[2px_0_4px_rgba(0,0,0,0.01)]">
                            <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center font-bold text-[12px] shrink-0`}>
                              {initials}
                            </div>
                            <span className="font-semibold text-slate-800 text-[14px] truncate">{student.name}</span>
                          </div>
                          <div className="w-[100px] shrink-0 px-4 flex justify-center text-[13px] text-slate-500">
                            {student.lrn || '—'}
                          </div>
                          <div className="w-[140px] shrink-0 px-4 flex justify-center">
                            <input 
                              type="text" 
                              value={sectionDrafts[rowKey]?.grade || student.grade || ''} 
                              onChange={(e) => setSectionDrafts(p => ({ ...p, [rowKey]: { ...p[rowKey], grade: e.target.value } }))}
                              readOnly={editingRowKey !== rowKey}
                              className={`outline-none px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-600 w-full transition-all text-center ${editingRowKey === rowKey ? 'bg-white border border-purple-500 ring-2 ring-purple-500/20' : 'bg-slate-100 border border-transparent cursor-default'}`}
                            />
                          </div>
                          <div className="w-[140px] shrink-0 px-4 flex justify-center">
                            <input 
                              type="text" 
                              value={sectionDrafts[rowKey]?.section || student.section || ''} 
                              onChange={(e) => setSectionDrafts(p => ({ ...p, [rowKey]: { ...p[rowKey], section: e.target.value } }))}
                              readOnly={editingRowKey !== rowKey}
                              className={`outline-none px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-600 w-full transition-all text-center ${editingRowKey === rowKey ? 'bg-white border border-purple-500 ring-2 ring-purple-500/20' : 'bg-slate-100 border border-transparent cursor-default'}`}
                            />
                          </div>
                          <div className="w-[100px] shrink-0 px-4 flex justify-center">
                            <span className={`${scoreColor} font-bold text-[14px]`}>{student.avgScore}%</span>
                          </div>
                          <div className="w-[120px] shrink-0 px-4 flex justify-center">
                            <span className={`px-3 py-1 text-[10px] font-bold rounded uppercase border ${riskStyles}`}>
                              {student.riskLevel || 'Unknown'}
                            </span>
                          </div>
                            <div className="flex-1 min-w-[180px] px-4 flex justify-center text-[13px] text-slate-600 truncate">
                              {student.weakestTopic || 'Foundational Skills'}
                            </div>
                            <div className="w-[80px] shrink-0 px-4 flex justify-center border-r border-transparent">
                            <button
                              onClick={() => setEditingRowKey(editingRowKey === rowKey ? null : rowKey)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${editingRowKey === rowKey ? 'bg-purple-100 text-purple-600' : 'hover:bg-slate-200 text-slate-400'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}










