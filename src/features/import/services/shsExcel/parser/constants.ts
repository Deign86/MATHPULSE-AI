import type { QuarterType } from './types';

export const SHS_FORMAT: 'PH_SHS_OFFICIAL_CLASS_RECORD' = 'PH_SHS_OFFICIAL_CLASS_RECORD';

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
export const DETECTION_CONFIDENCE_THRESHOLD = 0.85;
export const SHS_PARSER_VERSION = '2026.04.24';
export const MAX_EMPTY_LEARNER_ROWS_BEFORE_STOP = 4;

export const REQUIRED_CRITICAL_ANCHORS = [
  'INPUT DATA',
  'SENIOR HIGH SCHOOL CLASS RECORD',
  'LEARNERS NAMES',
  'WRITTEN WORK',
  'PERFORMANCE TASKS',
  'QUARTERLY ASSESSMENT',
  'REMARK',
  'FINAL SEMESTRAL GRADES',
] as const;

export const DETECTION_ANCHORS = [
  ...REQUIRED_CRITICAL_ANCHORS,
  'Pursuant to DepEd Order 8 series of 2015',
  'INITIAL GRADE',
  'QUARTERLY GRADE',
  'ADDITIONAL REMARKS',
  'MALE',
  'FEMALE',
  'SUBMITTED BY',
  'CHECKED BY',
  'VERIFIED BY',
  'RECOMMENDED BY',
  'APPROVED BY',
  'WEIGHT OF COMPONENTS',
  'LOOK UP',
  'HELPER',
  'ATTACHMENTS',
] as const;

export const SIGNATURE_ROLES = [
  'SUBMITTED BY',
  'CHECKED BY',
  'VERIFIED BY',
  'RECOMMENDED BY',
  'APPROVED BY',
] as const;

export const STATUS_TOKENS = [
  'WITH ATTACHMENTS',
  'OFFICIALLY DROPPED',
  'WITHDRAWN',
  'UNOFFICIALLY DROPPED',
  'TRANSFEREE',
  'SHIFTER',
] as const;

export const LEARNER_ROW_STOP_TOKENS = [
  'TOTAL',
  'SUBMITTED BY',
  'CHECKED BY',
  'VERIFIED BY',
  'RECOMMENDED BY',
  'APPROVED BY',
  'WEIGHT OF COMPONENTS',
] as const;

export const QUARTER_HINTS: Record<QuarterType, string[]> = {
  FIRST: ['FIRST QUARTER', '1ST QUARTER', 'Q1'],
  SECOND: ['SECOND QUARTER', '2ND QUARTER', 'Q2'],
};

export const SHEET_NAME_HINTS = {
  inputData: ['input data'],
  firstQuarter: ['first quarter', '1st quarter', 'q1'],
  secondQuarter: ['second quarter', '2nd quarter', 'q2'],
  finalSemestral: ['final semestral', 'final grades', 'semestral'],
  helper: ['helper', 'weight', 'attachments'],
  lookup: ['look up', 'lookup', 'reference'],
};

export const METADATA_ANCHORS: Record<string, string[]> = {
  region: ['REGION'],
  division: ['DIVISION'],
  schoolName: ['SCHOOL NAME'],
  schoolId: ['SCHOOL ID'],
  schoolYear: ['SCHOOL YEAR'],
  gradeSection: ['GRADE / SECTION', 'GRADE/SECTION'],
  semester: ['SEMESTER'],
  track: ['TRACK'],
  subjectCode: ['SUBJECT CODE'],
  subjectName: ['SUBJECT NAME', 'SUBJECT'],
  teacherName: ['TEACHER', 'NAME OF TEACHER'],
};

export const COLUMN_ANCHORS = {
  learnerNo: ['NO', 'NO.', '#'],
  learnerName: ['LEARNERS NAMES', 'LEARNER NAME', 'NAME'],
  writtenWork: ['WRITTEN WORK', 'WW'],
  performanceTasks: ['PERFORMANCE TASKS', 'PT'],
  quarterlyAssessment: ['QUARTERLY ASSESSMENT', 'QA'],
  total: ['TOTAL'],
  ps: ['PS'],
  ws: ['WS'],
  initialGrade: ['INITIAL GRADE'],
  quarterlyGrade: ['QUARTERLY GRADE'],
  firstQuarter: ['FIRST QUARTER', '1ST QUARTER'],
  secondQuarter: ['SECOND QUARTER', '2ND QUARTER'],
  firstSemester: ['FIRST SEMESTER'],
  finalGrades: ['FINAL GRADES', 'FINAL GRADE'],
  remark: ['REMARK', 'REMARKS'],
  additionalRemarks: ['ADDITIONAL REMARKS', 'ADDITIONAL REMARK'],
};
