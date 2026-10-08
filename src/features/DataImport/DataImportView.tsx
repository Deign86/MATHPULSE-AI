import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import {
  Sparkles, Bell, Layers, ChevronDown, Table, FileText, ScanLine, TrendingDown,
  CheckCircle, Edit3, ArrowLeft, Cpu, ArrowRight, Check, Save, Info, Edit2, Search,
  FileSpreadsheet, Download, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Upload,
  CloudUpload, X, FileCheck
} from 'lucide-react';
import { Button } from '../../components/ui/button';

import type { ClassSectionMetadata } from '../../types/models';
import type { StudentView } from '../../components/TeacherDashboard';

import type { ParseWorkbookResult } from '../import/services/shsExcel/parser/types';
import type { CourseMaterialArtifactSummary, StudentAccountImportPreviewResponse, UploadResponse } from '../../services/apiService';
import { apiService, ApiError } from '../../services/apiService';
import { db } from '../../lib/firebase';
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

type PaginationItem = { kind: 'page'; page: number } | { kind: 'ellipsis'; id: string };

const importMappingLogSchema = z.object({
  datasetIntent: z.enum(['synthetic_student_records', 'general_analytics', 'eval_only']).optional(),
  summary: z.object({
    scoringColumns: z.number(),
    displayColumns: z.number(),
    storageOnlyColumns: z.number(),
    lowConfidenceColumns: z.number(),
    domainMismatchWarnings: z.number(),
  }).optional(),
  columns: z.array(z.object({
    columnName: z.string(),
    mappedField: z.string().optional(),
    usagePolicy: z.enum(['scoring', 'display', 'storage_only']),
    confidenceBand: z.enum(['high', 'medium', 'low']),
    domainSignals: z.array(z.string()).optional(),
  })),
});

const classRecordUploadHistorySchema = z.array(z.object({
  fileName: z.string(),
  uploadedAt: z.string(),
  classSectionId: z.string(),
  className: z.string(),
  studentCount: z.number(),
}));

const classRecordImportDocumentSchema = z.object({
  fileName: z.string(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  classSectionId: z.string().optional(),
  className: z.string().optional(),
  rowCount: z.number().optional(),
  datasetIntent: z.enum(['synthetic_student_records', 'general_analytics', 'eval_only']).optional(),
  interpretationSummary: importMappingLogSchema.shape.summary.optional(),
  columnInterpretations: importMappingLogSchema.shape.columns.optional(),
});

type ImportMappingLog = z.infer<typeof importMappingLogSchema>;
type ClassRecordUploadHistoryEntry = z.infer<typeof classRecordUploadHistorySchema>[number];
type WorkbookParseError = Error;

function createPaginationItems(total: number, current: number): PaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ kind: 'page', page: i + 1 }));
  }

  const items: PaginationItem[] = [{ kind: 'page', page: 1 }];

  if (current > 3) {
    items.push({ kind: 'ellipsis', id: 'start-dots' });
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let p = start; p <= end; p += 1) {
    items.push({ kind: 'page', page: p });
  }

  if (current < total - 2) {
    items.push({ kind: 'ellipsis', id: 'end-dots' });
  }

  items.push({ kind: 'page', page: total });
  return items;
}

const DATA_HEALTH_STYLES = {
  synced: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    card: 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    title: 'text-emerald-800',
    detail: 'text-emerald-700/80',
  },
  empty: {
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    card: 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50',
    icon: 'bg-slate-100 text-slate-500 border-slate-200',
    title: 'text-slate-700',
    detail: 'text-slate-500',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    card: 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50',
    icon: 'bg-amber-100 text-amber-600 border-amber-200',
    title: 'text-amber-800',
    detail: 'text-amber-700/80',
  },
  error: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    card: 'bg-rose-50/60 border-rose-200/80 hover:bg-rose-50',
    icon: 'bg-rose-100 text-rose-600 border-rose-200',
    title: 'text-rose-800',
    detail: 'text-rose-700/80',
  },
} as const;

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
  onSelectClass?: (classSectionId: string | null) => void;
  onStudentsUpdated?: (students: StudentView[]) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  onNavigateToModuleAvailability?: () => void;
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
  onSelectClass,
  onStudentsUpdated,
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto,
  onNavigateToModuleAvailability
}: DataImportViewProps) {
  const [currentImportView, setCurrentImportView] = useState<'main' | 'mapping-logs' | 'edit-records' | 'upload-history'>('main');

  // Logic for Import
  const [shsExcelResult, setShsExcelResult] = useState<ParseWorkbookResult | null>(null);
  const [pendingWorkbookUpload, setPendingWorkbookUpload] = useState<File | null>(null);
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const [uploadingClassRecords, setUploadingClassRecords] = useState(false);
  const [classRecordParsing, setClassRecordParsing] = useState(false);
  const [uploadingCourseMaterials, setUploadingCourseMaterials] = useState(false);
  const [recentMaterials, setRecentMaterials] = useState<CourseMaterialArtifactSummary[]>([]);
  const [recentMaterialsLoading, setRecentMaterialsLoading] = useState(true);
  const [recentMaterialsError, setRecentMaterialsError] = useState('');
  const [accountPreviewing, setAccountPreviewing] = useState(false);
  const [accountCommitting, setAccountCommitting] = useState(false);
  const [studentAccountFile, setStudentAccountFile] = useState<File | null>(null);
  const [accountPreview, setAccountPreview] = useState<StudentAccountImportPreviewResponse | null>(null);
  const [confirmedMoveRows, setConfirmedMoveRows] = useState<Set<number>>(() => new Set());
  const [accountImportMessage, setAccountImportMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<string>('');
  const [uploadInterpretation, setUploadInterpretation] = useState<ImportMappingLog | null>(null);
  const [classRecordHistory, setClassRecordHistory] = useState<ClassRecordUploadHistoryEntry[]>([]);
  const [classRecordHistoryError, setClassRecordHistoryError] = useState('');

  interface PendingImportUpload {
    file: File;
    type: 'class_records' | 'course_materials';
    workbookResult?: ParseWorkbookResult;
    parserErrors?: string[];
  }

  const [pendingUpload, setPendingUpload] = useState<PendingImportUpload | null>(null);

  const refreshRecentMaterials = useCallback(async () => {
    setRecentMaterialsLoading(true);
    setRecentMaterialsError('');
    try {
      const response = await apiService.getRecentCourseMaterials({ classSectionId, limit: 5 });
      setRecentMaterials(response.materials);
    } catch (error: unknown) {
      setRecentMaterialsError(error instanceof Error ? error.message : 'Could not load recent curriculum uploads.');
    } finally {
      setRecentMaterialsLoading(false);
    }
  }, [classSectionId]);

  const refreshClassRecordImports = useCallback(async () => {
    if (!teacherId) {
      setClassRecordHistory([]);
      setUploadInterpretation(null);
      setClassRecordHistoryError('');
      return;
    }
    try {
      const importsQuery = query(
        collection(db, 'classRecordImports'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc'),
        limit(5),
      );
      const snapshot = await getDocs(importsQuery);
      const entries = snapshot.docs.flatMap((entry) => {
        const parsedDocument = classRecordImportDocumentSchema.safeParse(entry.data());
        if (!parsedDocument.success) return [];
        const stored = parsedDocument.data;
        const uploadedAt = stored.createdAt instanceof Timestamp
          ? stored.createdAt.toDate().toISOString()
          : stored.updatedAt instanceof Timestamp
            ? stored.updatedAt.toDate().toISOString()
            : '';
        const parsed = classRecordUploadHistorySchema.safeParse([{
          fileName: stored.fileName,
          uploadedAt,
          classSectionId: stored.classSectionId || '',
          className: stored.className || 'Imported Class',
          studentCount: stored.rowCount || 0,
        }]);
        return parsed.success ? parsed.data : [];
      });
      setClassRecordHistory(entries);
      const latest = snapshot.docs[0]
        ? classRecordImportDocumentSchema.safeParse(snapshot.docs[0].data())
        : null;
      const mapping = latest?.success ? importMappingLogSchema.safeParse({
        datasetIntent: latest.data.datasetIntent,
        summary: latest.data.interpretationSummary,
        columns: latest.data.columnInterpretations,
      }) : null;
      setUploadInterpretation(mapping?.success ? mapping.data : null);
      setClassRecordHistoryError('');
    } catch (error: unknown) {
      console.warn('[DataImportView] Could not load persisted class-record imports:', error);
      setClassRecordHistoryError(error instanceof Error ? error.message : 'Could not refresh persisted class-record uploads.');
    }
  }, [teacherId]);

  useEffect(() => {
    void refreshRecentMaterials();
  }, [refreshRecentMaterials]);

  useEffect(() => {
    void refreshClassRecordImports();
  }, [refreshClassRecordImports]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const studentAccountInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewStudentAccounts = async (file: File) => {
    setAccountPreviewing(true);
    setAccountPreview(null);
    setConfirmedMoveRows(new Set());
    setAccountImportMessage('');
    try {
      const preview = await apiService.previewStudentAccountImport(file, {
        classSectionId,
        className,
        defaultGrade: classMetadata?.grade ?? undefined,
        defaultSection: classMetadata?.section ?? undefined,
      });
      setAccountPreview(preview);
      if (!preview.previewToken) {
        setAccountImportMessage('Preview did not return a token; import cannot be committed.');
      }
    } catch (error: unknown) {
      setAccountImportMessage(error instanceof Error ? error.message : 'Student account preview failed.');
    } finally {
      setAccountPreviewing(false);
    }
  };

  const handleCommitStudentAccounts = async (confirmSectionMoves: boolean) => {
    const previewToken = accountPreview?.previewToken;
    if (!previewToken || accountCommitting) return;
    const confirmationMessage = confirmSectionMoves
      ? 'Move the selected students to this class and import the remaining eligible rows?'
      : 'Import eligible students? Existing or invalid rows will be skipped.';
    if (!window.confirm(confirmationMessage)) return;
    setAccountCommitting(true);
    setAccountImportMessage('');
    try {
      const committed = await apiService.commitStudentAccountImport({ previewToken, confirmSectionMoves });
      const blockedMoves = committed.rows.filter((row) => row.status === 'blocked' && /cannot import|move/i.test(row.message));
      setAccountImportMessage(
        blockedMoves.length > 0
          ? `${blockedMoves.length} section move(s) blocked: ${blockedMoves.map((row) => row.message).join(' ')}`
          : `Import completed: ${committed.summary.createdRows} created, ${committed.summary.updatedRows} updated, ${committed.summary.blockedRows} blocked, ${committed.summary.failedRows} failed.`,
      );
      if (committed.success) onDataChanged?.();
    } catch (error: unknown) {
      setAccountImportMessage(error instanceof Error ? error.message : 'Student account import failed.');
    } finally {
      setAccountCommitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSelectClassRecordsFile = (file: File) => {
    setPendingUpload({ file, type: 'class_records' });
    setShsExcelResult(null);
    setClassRecordParsing(/\.(xlsx|xls)$/i.test(file.name));
    if (!/\.(xlsx|xls)$/i.test(file.name)) return;
    void parseShsWorkbook(file, { confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD }).then((workbookResult) => {
      const parseErrors = workbookResult.imported.validation.errors.slice();
      if (workbookResult.mapping.studentEntities.length === 0) {
        parseErrors.push('Workbook parsing found no student records.');
      }
      const malformedRows = workbookResult.mapping.studentEntities
        .filter((student) => {
          const lrn = student.lrn?.trim() || '';
          const email = student.email?.trim() || '';
          return lrn ? !/^\d{12}$/.test(lrn) : !email;
        })
        .map((student) => `Row ${student.sourceRow}: ${student.lrn ? 'LRN must contain exactly 12 digits.' : 'LRN or email is required.'}`);
      const parserErrorsWithIdentity = [...parseErrors, ...malformedRows];
      setShsExcelResult(workbookResult);
      setPendingUpload((current) => current?.file === file
        ? { ...current, workbookResult, parserErrors: parserErrorsWithIdentity }
        : current);
      if (parserErrorsWithIdentity.length) {
        setUploadResult(parserErrorsWithIdentity.join(' '));
      }
    }).catch((error: WorkbookParseError) => {
      const parserErrors = [error instanceof Error ? error.message : 'Workbook parsing failed.'];
      setPendingUpload((current) => current?.file === file ? { ...current, parserErrors } : current);
      setUploadResult(parserErrors.join(' '));
    }).finally(() => setClassRecordParsing(false));
  };

  const handleSelectCourseMaterialFile = (file: File) => {
    setPendingUpload({ file, type: 'course_materials' });
  };

  const handleCancelUpload = () => {
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (materialInputRef.current) materialInputRef.current.value = '';
  };

  const handleConfirmUpload = () => {
    if (!pendingUpload) return;
    const { file, type, workbookResult, parserErrors } = pendingUpload;
    if (type === 'class_records' && (classRecordParsing || (parserErrors?.length ?? 0) > 0)) return;
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (materialInputRef.current) materialInputRef.current.value = '';

    if (type === 'class_records') {
      void handleFileUpload(file, workbookResult);
    } else {
      void handleCourseMaterialUpload(file);
    }
  };

  const normalizeLearnerKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

  function isNum<T>(value: T): value is T & number {
    return typeof value === 'number';
  }


  const toFiniteNumber = (value: number | string | null | undefined): number | null => {
    if (isNum(value) && Number.isFinite(value)) return value;
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

      const lrn = student.lrn?.trim() || '';
      const name = student.fullName || `Learner ${index + 1}`;

      rows.push([
        toCsvCell(name), toCsvCell(lrn), toCsvCell(student.email?.trim() || ''), toCsvCell(Number(engagementScore.toFixed(1))),
        toCsvCell(Number(avgQuizScore.toFixed(1))), toCsvCell(Number(attendance.toFixed(1))),
        toCsvCell(Number(assignmentCompletion.toFixed(1))), toCsvCell(fallbackTerm), toCsvCell(fallbackAssessment)
      ].join(','));
    });

    if (rows.length <= 1) return null;
    const normalizedName = sourceFileName.replace(/\.(xlsx|xls)$/i, '');
    return new File([rows.join('\n')], `${normalizedName}-normalized.csv`, { type: 'text/csv' });
  };

  const handleFileUpload = async (file: File, parsedWorkbook?: ParseWorkbookResult) => {
    setUploadingClassRecords(true);
    setUploadResult('');
    setUploadInterpretation(null);

    let uploadFile = file;

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      try {
        const workbookResult = parsedWorkbook ?? await parseShsWorkbook(file, { confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD });
        setShsExcelResult(workbookResult);
        if (workbookResult.imported.validation.errors.length) throw new Error(workbookResult.imported.validation.errors.join(' '));
        if (workbookResult.mapping.studentEntities.length === 0) {
          setUploadResult('No students were found in the spreadsheet; no records were imported.');
          setUploadingClassRecords(false);
          return;
        }
        const malformedLrnRows = workbookResult.mapping.studentEntities
          .map((student, index) => ({
            row: student.sourceRow || index + 2,
            lrn: student.lrn?.trim() || '',
            email: student.email?.trim() || '',
          }))
          .filter(({ lrn, email }) => (lrn ? !/^\d{12}$/.test(lrn) : !email));
        if (malformedLrnRows.length > 0) {
          const rowErrors = malformedLrnRows.map(({ row, lrn }) =>
            `Row ${row}: ${lrn ? 'LRN must contain exactly 12 digits.' : 'LRN or email is required.'}`,
          );
          setUploadResult(rowErrors.join(' '));
          toast.error(rowErrors.join(' '));
          setUploadingClassRecords(false);
          return;
        }
        const normalizedFile = buildNormalizedWorkbookCsv(workbookResult, file.name);
        if (normalizedFile) uploadFile = normalizedFile;
        setPendingWorkbookUpload(uploadFile);
        setUploadingClassRecords(false);
        return;
      } catch (error: unknown) {
        setShsExcelResult(null);
        setUploadResult(error instanceof Error ? error.message : 'Workbook parsing failed.');
        toast.error(error instanceof Error ? error.message : 'Workbook parsing failed.');
        setUploadingClassRecords(false);
        return;
      }
    } else {
      setShsExcelResult(null);
    }

    await uploadClassRecords(uploadFile);
  };

  const uploadClassRecords = async (uploadFile: File) => {
    setUploadingClassRecords(true);
    setPendingWorkbookUpload(null);
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

      if (result.success) {
        if (uploadedStudentsCount > 0) {
          onImportedClassRecords?.({
            students: result.students,
            classSectionId: resolvedImportContext.classSectionId,
            className: resolvedImportContext.className,
            classMetadata: resolvedImportContext.classMetadata,
          });
        }
        toast.success(`Successfully imported ${uploadedStudentsCount} student records.`);
        const mappingLog: ImportMappingLog = {
          datasetIntent: result.datasetIntent,
          summary: result.interpretationSummary,
          columns: result.columnInterpretations?.map((item) => ({
            columnName: item.columnName, mappedField: item.mappedField, usagePolicy: item.usagePolicy,
            confidenceBand: item.confidenceBand, domainSignals: item.domainSignals,
          })) || [],
        };
        setUploadInterpretation(mappingLog);
        await refreshClassRecordImports();
        await refreshRecentMaterials();
        onDataChanged?.();
      } else {
        const message = result.warnings?.join(' ') || 'Import completed but no usable student rows were detected. Check required columns and retry.';
        setUploadResult(message);
        toast.error(message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadResult(message);
      toast.error(message);
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
        await refreshRecentMaterials();
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

  const scopeOptionValue = (classItem: { id: string; classSectionId?: string }) => classItem.classSectionId || classItem.id;
  const scopeClass = availableClasses.find(c => normalizeClassSectionId(scopeOptionValue(c)) === normalizeClassSectionId(classSectionId));

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

  // Pagination for Class Records Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudents.length]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, validCurrentPage, pageSize]);

  const visibleRangeStart = filteredStudents.length === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const visibleRangeEnd = Math.min(validCurrentPage * pageSize, filteredStudents.length);

  const buildSectionDrafts = (students: StudentView[]) => Object.fromEntries(
    students.map((student) => [buildStudentViewKey(student), { grade: student.grade || '', section: student.section || '' }])
  );

  useEffect(() => {
    setLocalStudents(initialStudents);
    setSectionDrafts(buildSectionDrafts(initialStudents));
  }, [initialStudents]);

  const [sectionDrafts, setSectionDrafts] = useState<Record<string, { grade: string; section: string }>>({});

  const closeEditRecords = () => {
    setEditingRowKey(null);
    setSectionDrafts(buildSectionDrafts(localStudents));
    setCurrentImportView('main');
  };

  const dataHealth = uploadResult
    ? { styles: DATA_HEALTH_STYLES.error, title: 'Last Import Failed', detail: uploadResult }
    : classRecordHistoryError || recentMaterialsError
      ? { styles: DATA_HEALTH_STYLES.warning, title: 'Sync Issue Detected', detail: classRecordHistoryError || recentMaterialsError }
      : filteredStudents.length === 0
        ? { styles: DATA_HEALTH_STYLES.empty, title: 'No Records Loaded', detail: 'Import class records to populate this view.' }
        : { styles: DATA_HEALTH_STYLES.synced, title: 'All Records Synced', detail: 'AI parsing completed successfully with no anomalies detected.' };

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
    <div className="w-full min-h-full block">
      <div className="w-full p-3.5 sm:p-[24px] xl:p-[32px] space-y-4 sm:space-y-[24px] pb-36 sm:pb-40 lg:pb-12">
        {/* Sub-view: Main Dashboard */}
        {currentImportView === 'main' && (
          <div className="block space-y-[24px]">
            {/* Context Selector Banner */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-bold text-slate-800 font-display">Target Class Context</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/70">
                      Scope
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Select the section or classroom where imported records should apply</p>
                </div>
              </div>
              <div className="relative w-full md:w-[320px]">
                <select 
                  className="appearance-none bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-bold text-xs sm:text-[13px] rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-2xs cursor-pointer w-full transition-all"
                  value={scopeClass ? scopeOptionValue(scopeClass) : 'All Classes'}
                  onChange={(e) => onSelectClass?.(e.target.value === 'All Classes' ? null : e.target.value)}
                >
                  <option value="All Classes">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={scopeOptionValue(c)}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Upload Zones (Side by Side) with Prominent Colored Dotted Border */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Zone 1: Class Records (Vibrant Sky Blue Dotted) */}
              <div 
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
                onDragLeave={() => setDragOver1(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver1(false); const f = e.dataTransfer.files[0]; if(f) handleSelectClassRecordsFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-[3.5px] border-dotted transition-all duration-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center cursor-pointer group min-h-[230px] sm:min-h-[250px] active:scale-[0.99] ${
                  dragOver1
                    ? 'border-sky-600 bg-sky-100/90 shadow-md ring-4 ring-sky-400/30 scale-[1.01]'
                    : 'border-sky-400 hover:border-sky-600 bg-gradient-to-b from-sky-50/40 to-sky-50/20 hover:bg-sky-50/70 shadow-2xs hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleSelectClassRecordsFile(f); }} className="hidden" />

                <div className="flex flex-col items-center justify-center my-auto py-2">
                  <div className={`w-14 h-14 rounded-2xl bg-sky-100/80 flex items-center justify-center mb-3 text-sky-600 transition-all duration-200 border-2 border-sky-300 shadow-2xs ${dragOver1 ? 'scale-110 bg-sky-200' : 'group-hover:scale-105 group-hover:bg-sky-200/80'}`}>
                    {uploadingClassRecords ? <span className="animate-spin font-bold">...</span> : <CloudUpload className="w-7 h-7" />}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 font-display">
                    {uploadingClassRecords ? 'Processing Class Records...' : 'Upload Class Spreadsheet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Select a spreadsheet or browse files from your computer
                  </p>
                </div>

                {/* Footer Info & File Type Chips */}
                <div className="w-full flex items-center justify-between pt-3 border-t border-sky-200/60 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">Supported Formats</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-white text-sky-700 font-bold text-[10px] rounded-md border border-sky-200 shadow-2xs">.CSV</span>
                    <span className="px-2 py-0.5 bg-white text-sky-700 font-bold text-[10px] rounded-md border border-sky-200 shadow-2xs">.XLSX</span>
                    <span className="px-2 py-0.5 bg-white text-sky-700 font-bold text-[10px] rounded-md border border-sky-200 shadow-2xs">.XLS</span>
                  </div>
                </div>
              </div>

              {shsExcelResult && pendingWorkbookUpload && (
                <section className="rounded-xl border border-sky-200 bg-white p-4 space-y-3" aria-label="Spreadsheet student preview">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Student preview — {shsExcelResult.mapping.studentEntities.length} students</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => { setPendingWorkbookUpload(null); setShsExcelResult(null); }}>Cancel</Button>
                      <Button type="button" disabled={uploadingClassRecords} onClick={() => void uploadClassRecords(pendingWorkbookUpload)}>
                        Confirm import
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead><tr><th className="p-2">Row</th><th className="p-2">Student</th><th className="p-2">LRN</th><th className="p-2">Email</th></tr></thead>
                      <tbody className="divide-y">
                        {shsExcelResult.mapping.studentEntities.map((student) => (
                          <tr key={`${student.sourceRow}-${student.fullName}`}>
                            <td className="p-2">{student.sourceRow}</td><td className="p-2">{student.fullName}</td>
                            <td className="p-2">{student.lrn || '—'}</td><td className="p-2">{student.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Zone 2: Course Materials (Vibrant Purple Dotted) */}
              <div 
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') materialInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
                onDragLeave={() => setDragOver2(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver2(false); const f = e.dataTransfer.files[0]; if(f) handleSelectCourseMaterialFile(f); }}
                onClick={() => materialInputRef.current?.click()}
                className={`border-[3.5px] border-dotted transition-all duration-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center cursor-pointer group min-h-[230px] sm:min-h-[250px] active:scale-[0.99] ${
                  dragOver2
                    ? 'border-purple-600 bg-purple-100/90 shadow-md ring-4 ring-purple-400/30 scale-[1.01]'
                    : 'border-purple-400 hover:border-purple-600 bg-gradient-to-b from-purple-50/40 to-purple-50/20 hover:bg-purple-50/70 shadow-2xs hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <input ref={materialInputRef} type="file" accept=".pdf,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleSelectCourseMaterialFile(f); }} className="hidden" />

                <div className="flex flex-col items-center justify-center my-auto py-2">
                  <div className={`w-14 h-14 rounded-2xl bg-purple-100/80 flex items-center justify-center mb-3 text-purple-600 transition-all duration-200 border-2 border-purple-300 shadow-2xs ${dragOver2 ? 'scale-110 bg-purple-200' : 'group-hover:scale-105 group-hover:bg-purple-200/80'}`}>
                    {uploadingCourseMaterials ? <span className="animate-spin font-bold">...</span> : <CloudUpload className="w-7 h-7" />}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 font-display">
                    {uploadingCourseMaterials ? 'Processing Curriculum Materials...' : 'Upload Curriculum Documents'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Select curriculum files or browse documents from your computer
                  </p>
                </div>

                {/* Footer Info & File Type Chips */}
                <div className="w-full flex items-center justify-between pt-3 border-t border-purple-200/60 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">Supported Formats</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-white text-purple-700 font-bold text-[10px] rounded-md border border-purple-200 shadow-2xs">.PDF</span>
                    <span className="px-2 py-0.5 bg-white text-purple-700 font-bold text-[10px] rounded-md border border-purple-200 shadow-2xs">.DOCX</span>
                    <span className="px-2 py-0.5 bg-white text-purple-700 font-bold text-[10px] rounded-md border border-purple-200 shadow-2xs">.TXT</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3" aria-labelledby="student-account-import-title">
              <div>
                <h3 id="student-account-import-title" className="text-sm font-bold text-slate-800">Student Account Import</h3>
                <p className="text-xs text-slate-500">Preview a roster and review any requested section moves before committing.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={studentAccountInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setStudentAccountFile(file);
                    setAccountPreview(null);
                    setConfirmedMoveRows(new Set());
                    setAccountImportMessage('');
                  }}
                  aria-label="Select student account roster"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!studentAccountFile || accountPreviewing}
                  onClick={() => studentAccountFile && void handlePreviewStudentAccounts(studentAccountFile)}
                >
                  {accountPreviewing ? 'Previewing…' : 'Preview roster'}
                </Button>
              </div>
              {accountPreview && (
                <div className="space-y-3" aria-live="polite">
                  <p className="text-xs text-slate-600">
                    {accountPreview.summary.totalRows} rows: {accountPreview.summary.validRows} valid, {accountPreview.summary.invalidRows} invalid, {accountPreview.summary.duplicateRows} duplicate.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead><tr><th className="p-2">Row</th><th className="p-2">Student</th><th className="p-2">LRN</th><th className="p-2">Class</th><th className="p-2">Status / review</th></tr></thead>
                      <tbody className="divide-y">
                        {accountPreview.rows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="p-2">{row.rowNumber}</td>
                            <td className="p-2">{row.fullName}</td>
                            <td className="p-2">{row.studentId}</td>
                            <td className="p-2">{row.grade} {row.section}</td>
                            <td className="p-2">
                              {row.status === 'move_confirmation_required' && (
                                <label className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={confirmedMoveRows.has(row.rowNumber)}
                                    onChange={(event) => setConfirmedMoveRows((current) => {
                                      const next = new Set(current);
                                      if (event.target.checked) next.add(row.rowNumber);
                                      else next.delete(row.rowNumber);
                                      return next;
                                    })}
                                  />
                                  <span>Confirm move: {row.issues.join(' ') || 'Existing section assignment will change.'}</span>
                                </label>
                              )}
                              {row.status !== 'move_confirmation_required' && `${row.status}${row.issues.length ? ` — ${row.issues.join(' ')}` : ''}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={!accountPreview.previewToken || accountCommitting || !accountPreview.rows.some((row) => row.status === 'move_confirmation_required') || confirmedMoveRows.size !== accountPreview.rows.filter((row) => row.status === 'move_confirmation_required').length}
                      onClick={() => void handleCommitStudentAccounts(true)}
                    >
                      {accountCommitting ? 'Committing…' : 'Confirm moves & import'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!accountPreview.previewToken || accountCommitting}
                      onClick={() => void handleCommitStudentAccounts(false)}
                    >
                      Import without moves (moves stay blocked)
                    </Button>
                  </div>
                </div>
              )}
              {accountImportMessage && (
                <div role="status" className="flex items-start justify-between gap-3 text-xs text-slate-700">
                  <p>{accountImportMessage}</p>
                  <Button type="button" variant="outline" onClick={() => setAccountImportMessage('')}>Dismiss</Button>
                </div>
              )}
              {accountPreview?.warnings.map((warning) => <p key={warning} className="text-xs text-amber-700">{warning}</p>)}
            </section>

            {/* Quick Link to Module Availability Control in Topic Mastery */}
            {onNavigateToModuleAvailability && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800 font-display">Manage Curriculum Module Availability</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Configure DepEd module states or attach custom teacher PDFs to curriculum topics.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToModuleAvailability}
                  className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[12px] font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  Manage Availability
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* How AI Uses Data Feature Cards (Aligned to Teacher Side Design System) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Smart Parsing (Blue) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/90 border-t-[3px] border-t-sky-500 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 text-sky-600 transition-transform group-hover:scale-105 shadow-2xs">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Auto-Parse
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1 font-display">Intelligent Parsing</h4>
                <p className="text-xs text-slate-500 leading-relaxed">AI automatically decodes varied DepEd grading sheets, ECR templates, and maps student columns securely.</p>
              </div>
              
              {/* Risk Prediction (Orange) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/90 border-t-[3px] border-t-amber-500 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600 transition-transform group-hover:scale-105 shadow-2xs">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Early Alert
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1 font-display">Risk Trajectory Analysis</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Analyzes historical assessment patterns across student scores to predict at-risk students before exams.</p>
              </div>
              
              {/* Contextual AI (Purple) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/90 border-t-[3px] border-t-purple-500 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0 text-purple-600 transition-transform group-hover:scale-105 shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Curriculum AI
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1 font-display">Contextual AI Grounding</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Maps curriculum competencies to generate personalized remedial lesson paths and adaptive quiz battles.</p>
              </div>
            </div>

            {/* Bottom Section: Data Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-[15px] font-bold text-slate-800 font-display">Data Health</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dataHealth.styles.badge}`}>
                    Live Status
                  </span>
                </div>
                <div className={`flex-1 border rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-xs ${dataHealth.styles.card}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 shadow-2xs border ${dataHealth.styles.icon}`}>
                    {dataHealth.styles === DATA_HEALTH_STYLES.synced ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  </div>
                  <h3 className={`font-bold text-sm mb-1 ${dataHealth.styles.title}`}>{dataHealth.title}</h3>
                  <p className={`text-xs max-w-[220px] leading-relaxed ${dataHealth.styles.detail}`}>{dataHealth.detail}</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentImportView('edit-records')}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-[13px] font-semibold rounded-xl px-4 py-2.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Class Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentImportView('mapping-logs')}
                    className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-xs sm:text-[13px] font-semibold rounded-xl px-4 py-2.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    View Mapping Logs
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xs border border-slate-200/90 flex flex-col justify-between h-full">
                <div className="flex justify-between items-center mb-3.5">
                  <h2 className="text-[15px] font-bold text-slate-800 font-display">Recent Uploads</h2>
                  <button 
                    type="button"
                    onClick={() => void refreshRecentMaterials()}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex-1 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 min-h-[140px]" aria-live="polite">
                  {recentMaterialsLoading ? (
                    <p className="text-xs text-slate-500" role="status">Loading recent uploads…</p>
                  ) : (recentMaterialsError || classRecordHistoryError) && recentMaterials.length === 0 && classRecordHistory.filter((entry) => !classSectionId || entry.classSectionId === classSectionId).length === 0 ? (
                    <p className="text-xs text-rose-700" role="alert">{recentMaterialsError || `Could not load persisted class-record uploads: ${classRecordHistoryError}`}</p>
                  ) : recentMaterials.length === 0 && classRecordHistory.filter((entry) => !classSectionId || entry.classSectionId === classSectionId).length === 0 ? (
                    <p className="text-xs font-medium text-slate-500">There are no recent uploads for this class yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {classRecordHistoryError && (
                        <li className="text-xs text-amber-800" role="alert">Could not refresh class-record uploads; showing previously loaded history. {classRecordHistoryError}</li>
                      )}
                      {recentMaterialsError && <li className="text-xs text-rose-700" role="alert">{recentMaterialsError}</li>}
                      {classRecordHistory.filter((entry) => !classSectionId || entry.classSectionId === classSectionId).map((entry) => (
                        <li key={`${entry.uploadedAt}-${entry.fileName}`} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                          <p className="text-sm font-semibold text-slate-800 break-words">{entry.fileName}</p>
                          <p className="text-xs text-slate-500">{entry.studentCount} student record{entry.studentCount === 1 ? '' : 's'} · {entry.className}</p>
                        </li>
                      ))}
                      {recentMaterials.map((material) => (
                        <li key={material.materialId} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                          <p className="text-sm font-semibold text-slate-800 break-words">{material.fileName || 'Curriculum document'}</p>
                          <p className="text-xs text-slate-500">
                            {material.topicsCount} topic{material.topicsCount === 1 ? '' : 's'} extracted
                            {material.className ? ` · ${material.className}` : ''}
                          </p>
                          {material.topicTitles.length > 0 && (
                            <p className="text-xs text-slate-600 mt-1">{material.topicTitles.join(' · ')}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-slate-500 mt-3">Uploaded curriculum documents are saved here as course materials.</p>
                  <button
                    type="button"
                    onClick={onNavigateToModuleAvailability}
                    className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-800 underline"
                  >
                    Go to Modules
                  </button>
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
                type="button"
                onClick={() => setCurrentImportView('main')}
                className="flex items-center gap-2 text-[13px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-all w-max bg-white px-[18px] py-2 rounded-full shadow-2xs hover:shadow-xs border border-slate-200 hover:border-indigo-200 cursor-pointer active:scale-95"
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
                onClick={closeEditRecords}
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
                  <button onClick={closeEditRecords} className="px-5 py-2 rounded-full border border-slate-300 text-slate-700 font-semibold text-[13px] hover:bg-slate-50">
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
                <span>
                  Showing {filteredStudents.length === 0 ? 0 : `${visibleRangeStart}–${visibleRangeEnd} of ${filteredStudents.length}`} records
                </span>
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
                      {/* Sticky Right Action Column */}
                      <div className="w-[90px] shrink-0 px-4 h-full flex items-center justify-center sticky right-0 z-30 bg-slate-100/95 backdrop-blur-sm border-l border-slate-200 shadow-[-2px_0_4px_rgba(0,0,0,0.02)] font-bold text-slate-600">
                        Action
                      </div>
                    </div>
                  {/* Editable Rows */}
                  <div className="flex flex-col w-full pb-4">
                    {filteredStudents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                          <Info className="w-7 h-7 text-slate-400" />
                        </div>
                        {availableClasses.length === 0 ? (
                          <>
                            <h3 className="text-[16px] font-bold text-slate-700 mb-2">No managed classes found</h3>
                            <p className="text-[13px] text-slate-500 max-w-sm">You don't currently manage any classes. Ask your administrator to assign you as a section manager, or create a new class from the Dashboard.</p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-[16px] font-bold text-slate-700 mb-2">No students in this class yet</h3>
                            <p className="text-[13px] text-slate-500 max-w-sm">Import class records or add students to this class to edit their records here.</p>
                          </>
                        )}
                      </div>
                    ) : paginatedStudents.map((student, i) => {
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
                                readOnly
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
                            {/* Sticky Right Action Cell */}
                            <div className="w-[90px] shrink-0 px-4 h-full min-h-[64px] flex items-center justify-center sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.02)] transition-colors">
                              <button
                                type="button"
                                onClick={() => setEditingRowKey(editingRowKey === rowKey ? null : rowKey)}
                                title={editingRowKey === rowKey ? "Done editing" : "Edit student record"}
                                aria-label={`Edit record for ${student.name}`}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  editingRowKey === rowKey
                                    ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400/40 shadow-xs'
                                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                                }`}
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

              {/* Pagination Controls */}
              {filteredStudents.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] shrink-0">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse"></span>
                    <span>
                      Showing <strong className="text-slate-800">{visibleRangeStart}–{visibleRangeEnd}</strong> of <strong className="text-slate-800">{filteredStudents.length}</strong> records
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="hidden sm:inline">Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1 outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
                      >
                        {PAGE_SIZE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt} / page</option>
                        ))}
                      </select>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={validCurrentPage <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-600 border border-slate-200 shadow-2xs disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Previous Page"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {createPaginationItems(totalPages, validCurrentPage).map((item) =>
                          item.kind === 'ellipsis' ? (
                            <span key={item.id} className="px-1 text-slate-400 text-xs">...</span>
                          ) : (
                            <button
                              key={`page-${item.page}`}
                              type="button"
                              onClick={() => setCurrentPage(item.page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                validCurrentPage === item.page
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                              }`}
                            >
                              {item.page}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={validCurrentPage >= totalPages}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-600 border border-slate-200 shadow-2xs disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Next Page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Confirmation Modal */}
      {typeof document !== 'undefined' && pendingUpload && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={handleCancelUpload}
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-upload-title"
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto z-10 p-5 sm:p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    pendingUpload.type === 'class_records'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                      : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800'
                  }`}>
                    {pendingUpload.type === 'class_records' ? (
                      <FileSpreadsheet className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 id="confirm-upload-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                      {pendingUpload.type === 'class_records'
                        ? 'Confirm Class Records Upload'
                        : 'Confirm Course Material Upload'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Review file details before initiating processing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* File Info Card */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Selected File
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {formatFileSize(pendingUpload.file.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={pendingUpload.file.name}>
                    {pendingUpload.file.name}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Target Scope:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {className || classSectionId || 'All Classes'}
                  </span>
                </div>
              </div>

              {pendingUpload.type === 'class_records' && /\.(xlsx|xls)$/i.test(pendingUpload.file.name) && (
                <section aria-label="Class record parse preview" className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {classRecordParsing ? 'Parsing workbook…' : 'Workbook preview'}
                  </h4>
                  {pendingUpload.parserErrors?.length ? (
                    <ul role="alert" className="max-h-24 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                      {pendingUpload.parserErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
                    </ul>
                  ) : null}
                  {pendingUpload.workbookResult && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 text-xs dark:border-slate-700">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-slate-200 px-2 py-1 font-bold dark:border-slate-700">
                        <span>Name</span><span>LRN</span><span>Score</span>
                      </div>
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {pendingUpload.workbookResult.mapping.studentEntities.map((student) => {
                        const scoreRow = pendingUpload.workbookResult?.mapping.gradeEntities.find((grade) => normalizeLearnerKey(grade.fullName) === normalizeLearnerKey(student.fullName));
                        const score = scoreRow?.finalGrades ?? scoreRow?.firstSemester ?? scoreRow?.quarterlyGrade ?? scoreRow?.initialGrade;
                        return (
                          <li key={`${student.sourceRow}-${student.fullName}`} className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1.5">
                            <span className="truncate font-medium">{student.fullName}</span>
                            <span>{student.lrn || 'No LRN'}</span>
                            <span>{score ?? '—'}</span>
                          </li>
                        );
                      })}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* Explanatory Notice */}
              <div className="rounded-xl p-3 bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {pendingUpload.type === 'class_records' ? (
                  <p>
                    MathPulse AI will parse student records, auto-detect assessment and grading columns, and sync learner progress to your analytics directory.
                  </p>
                ) : (
                  <p>
                    MathPulse AI will extract topics, competencies, and unit structures from this document to ground AI lesson planning and quiz generation.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelUpload}
                  className="w-full sm:w-auto h-10 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={pendingUpload.type === 'class_records' && (classRecordParsing || (pendingUpload.parserErrors?.length ?? 0) > 0)}
                  className="w-full sm:w-auto h-10 text-xs sm:text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Proceed & Process
                </Button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}










