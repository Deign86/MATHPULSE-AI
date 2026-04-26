export type ShsWorkbookFormat = 'PH_SHS_OFFICIAL_CLASS_RECORD';

export type LearnerSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type QuarterType = 'FIRST' | 'SECOND';

export type ParseStage =
  | 'idle'
  | 'reading'
  | 'detecting-format'
  | 'extracting'
  | 'normalizing'
  | 'validating'
  | 'complete'
  | 'failed';

export interface CellCoord {
  r: number;
  c: number;
}

export interface MergeRange {
  s: CellCoord;
  e: CellCoord;
}

export interface CellSnapshot {
  v?: unknown;
  w?: string;
  t?: string;
  f?: string;
}

export interface RawSheetSnapshot {
  ref?: string;
  merges: MergeRange[];
  cells: Record<string, CellSnapshot>;
}

export interface RawWorkbookSnapshot {
  sheets: Record<string, RawSheetSnapshot>;
}

export interface MatrixCell {
  address: string;
  row: number;
  col: number;
  v?: unknown;
  w?: string;
  t?: string;
  f?: string;
  displayValue: string | number | boolean | null;
  normalizedText: string;
  mergedFrom?: string;
}

export interface SheetMatrix {
  sheetName: string;
  ref: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  rowCount: number;
  colCount: number;
  cells: Array<Array<MatrixCell | null>>;
}

export interface WorkbookReadResult {
  fileName: string;
  sheetNames: string[];
  raw: RawWorkbookSnapshot;
  matrices: Record<string, SheetMatrix>;
}

export interface AnchorMatch {
  sheetName: string;
  anchor: string;
  row: number;
  col: number;
  address: string;
  value: string;
  confidence: number;
}

export interface SheetDetection {
  sheetName: string;
  role:
    | 'inputData'
    | 'firstQuarter'
    | 'secondQuarter'
    | 'finalSemestral'
    | 'helper'
    | 'lookup'
    | 'other';
  evidence: string[];
  confidence: number;
}

export interface FormatDetectionResult {
  format: ShsWorkbookFormat;
  isOfficialFormatLikely: boolean;
  confidence: number;
  evidence: string[];
  missingCriticalAnchors: string[];
  detectedSheets: {
    inputData?: string;
    firstQuarter: string[];
    secondQuarter: string[];
    finalSemestral: string[];
    helper: string[];
    lookup: string[];
    other: string[];
  };
  anchorMatches: AnchorMatch[];
}

export interface RegionMapping {
  sheetName: string;
  range: MergeRange;
  reason: string;
}

export interface UnclassifiedBlock {
  sheetName: string;
  range: string;
  purposeGuess?: string;
  raw2D: Array<Array<string | number | boolean | null>>;
}

export interface ParsedSignature {
  role: string;
  name?: string;
  sourceSheet: string;
  sourceRow?: number;
}

export interface ParsedLearner {
  learnerNo?: number;
  sex?: LearnerSex;
  fullName: string;
  sourceSheet: string;
  sourceRow: number;
  remarks?: string;
  additionalRemarks?: string;
  statuses?: string[];
}

export interface ParsedAssessmentColumn {
  key: string;
  label: string;
  maxScore?: number;
  column?: string;
}

export interface ParsedLearnerGradeRow {
  learnerNo?: number;
  fullName: string;
  sex?: LearnerSex;
  writtenWorks?: Record<string, number | string | null>;
  performanceTasks?: Record<string, number | string | null>;
  quarterlyAssessment?: number | string | null;
  totals?: Record<string, number | string | null>;
  ps?: Record<string, number | string | null>;
  ws?: Record<string, number | string | null>;
  initialGrade?: number | string | null;
  quarterlyGrade?: number | string | null;
  firstQuarter?: number | string | null;
  secondQuarter?: number | string | null;
  firstSemester?: number | string | null;
  finalGrades?: number | string | null;
  remark?: string | null;
  additionalRemarks?: string | null;
  sourceRow: number;
}

export interface QuarterlyRecordExtraction {
  sheetName: string;
  quarter: QuarterType;
  gradingWeights?: {
    writtenWork?: number;
    performanceTasks?: number;
    quarterlyAssessment?: number;
  };
  assessmentColumns: {
    writtenWorks: ParsedAssessmentColumn[];
    performanceTasks: ParsedAssessmentColumn[];
    quarterlyAssessment?: ParsedAssessmentColumn;
    derived?: ParsedAssessmentColumn[];
  };
  learnerGrades: ParsedLearnerGradeRow[];
  signatures: ParsedSignature[];
  warnings: string[];
}

export interface FinalSemestralRecordExtraction {
  sheetName: string;
  learnerGrades: ParsedLearnerGradeRow[];
  signatures: ParsedSignature[];
  warnings: string[];
}

export interface InputDataExtraction {
  sheetName: string;
  schoolContext: {
    region?: string;
    division?: string;
    schoolName?: string;
    schoolId?: string;
    schoolYear?: string;
    gradeSection?: string;
    semester?: string;
    track?: string;
    subjectCode?: string;
    subjectName?: string;
    teacherName?: string;
  };
  learners: ParsedLearner[];
  signatures: ParsedSignature[];
  attachmentRules: string[];
  helperNotes: string[];
  warnings: string[];
}

export interface ReferenceSheetExtraction {
  sheetName: string;
  componentWeights: Array<Record<string, unknown>>;
  attachmentRules: string[];
  helperNotes: string[];
  signatures: ParsedSignature[];
  warnings: string[];
}

export interface ValidationCoverage {
  totalSheets: number;
  recognizedSheets: number;
  unclassifiedSheets: number;
  mappedCellRegions: number;
  unmappedCellRegions: number;
}

export interface WorkbookValidationResult {
  isOfficialFormatLikely: boolean;
  confidence: number;
  warnings: string[];
  errors: string[];
  coverage: ValidationCoverage;
}

export type ImportedShsWorkbook = {
  format: ShsWorkbookFormat;
  version?: string;
  workbookMeta: {
    fileName: string;
    sheetNames: string[];
    detectedSheets: {
      inputData?: string;
      firstQuarter?: string[];
      secondQuarter?: string[];
      finalSemestral?: string[];
      helper?: string[];
      lookup?: string[];
      other?: string[];
    };
  };
  schoolContext: {
    region?: string;
    division?: string;
    schoolName?: string;
    schoolId?: string;
    schoolYear?: string;
    gradeSection?: string;
    semester?: string;
    track?: string;
    subjectCode?: string;
    subjectName?: string;
    teacherName?: string;
  };
  learners: Array<{
    learnerNo?: number;
    sex?: LearnerSex;
    fullName: string;
    sourceSheet: string;
    sourceRow: number;
    remarks?: string;
    additionalRemarks?: string;
    statuses?: string[];
  }>;
  quarterlyRecords: Array<{
    sheetName: string;
    quarter: QuarterType;
    gradingWeights?: {
      writtenWork?: number;
      performanceTasks?: number;
      quarterlyAssessment?: number;
    };
    assessmentColumns: {
      writtenWorks: Array<{ key: string; label: string; maxScore?: number; column?: string }>;
      performanceTasks: Array<{ key: string; label: string; maxScore?: number; column?: string }>;
      quarterlyAssessment?: { key: string; label: string; maxScore?: number; column?: string };
      derived?: Array<{ key: string; label: string; column?: string }>;
    };
    learnerGrades: ParsedLearnerGradeRow[];
  }>;
  finalSemestralRecords: Array<{
    sheetName: string;
    learnerGrades: ParsedLearnerGradeRow[];
  }>;
  references: {
    componentWeights?: Array<Record<string, unknown>>;
    attachmentRules?: string[];
    helperNotes?: string[];
    signatures?: Array<{
      role: string;
      name?: string;
      sourceSheet: string;
      sourceRow?: number;
    }>;
    unclassifiedBlocks?: UnclassifiedBlock[];
  };
  validation: WorkbookValidationResult;
  raw: RawWorkbookSnapshot;
};

export interface MathPulseEntityMapping {
  classEntity: {
    className: string;
    classSectionId: string;
    grade?: string;
    section?: string;
    semester?: string;
    schoolYear?: string;
    subjectCode?: string;
    subjectName?: string;
    track?: string;
    teacherName?: string;
  };
  studentEntities: Array<{
    fullName: string;
    learnerNo?: number;
    lrn?: string;
    sex?: LearnerSex;
    remarks?: string;
    additionalRemarks?: string;
    statuses?: string[];
  }>;
  gradeEntities: Array<{
    fullName: string;
    sourceSheet: string;
    sourceRow: number;
    quarter?: QuarterType;
    firstQuarter?: number | string | null;
    secondQuarter?: number | string | null;
    firstSemester?: number | string | null;
    finalGrades?: number | string | null;
    quarterlyGrade?: number | string | null;
    initialGrade?: number | string | null;
    remark?: string | null;
    additionalRemarks?: string | null;
  }>;
  remarksEntities: Array<{
    fullName: string;
    remark?: string | null;
    additionalRemarks?: string | null;
    statuses?: string[];
    sourceSheet: string;
    sourceRow: number;
  }>;
}

export interface ParserProgressEvent {
  stage: ParseStage;
  message: string;
}

export interface ParseWorkbookOptions {
  confidenceThreshold?: number;
  onProgress?: (event: ParserProgressEvent) => void;
}

export interface ParseWorkbookResult {
  imported: ImportedShsWorkbook;
  mapping: MathPulseEntityMapping;
}

export type ParseShsWorkbookResult = ParseWorkbookResult;
