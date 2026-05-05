/**
 * @file dynamicModuleService.ts
 * Service layer for dynamic modules from Firestore.
 * Maps Firestore `dynamic_modules` documents to the `DynamicModule` runtime type.
 */
import { db } from '../lib/firebase';
import type { CurriculumModuleRuntime } from '../data/curriculumModules';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Local type aliases (self-contained to avoid circular deps)
// ─────────────────────────────────────────────────────────────────────────────

type CurriculumQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type GradeLevel = 'Grade 11' | 'Grade 12';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A dynamic module document as stored in Firestore */
export interface DynamicModuleDoc {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subject: string;
  quarter: CurriculumQuarter;
  content_domain: string;
  competency_group: string;
  competencies: Array<{ code: string; outcome: string }>;
  performance_standard: string;
  real_world_theme: string;
  gradeLevel: GradeLevel;
  lesson_count: number;
  quiz_count: number;
  lessons: Array<{
    id: string;
    title: string;
    duration: string;
    completed: boolean;
    locked: boolean;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    questions: number;
    duration: string;
    completed: boolean;
    locked: boolean;
    type: 'practice' | 'module' | 'final';
  }>;
  module_sources: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  createdAt: Date;
  status: string;
}

/** Dynamic module at runtime — extends CurriculumModuleRuntime with sourceType discriminator */
export interface DynamicModule extends CurriculumModuleRuntime {
  sourceType: 'dynamic';
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject color lookup (mirrors SUBJECT_META in curriculumModules.ts)
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECT_COLORS: Record<string, { color: string; accent: string }> = {
  'gen-math':       { color: '#1f4ea8', accent: '#3f7cff' },
  'business-math':  { color: '#166534', accent: '#22c55e' },
  'stats-prob':     { color: '#6b21a8', accent: '#a855f7' },
  'pre-calc':       { color: '#c2410c', accent: '#f97316' },
  'basic-calc':     { color: '#065f46', accent: '#10b981' },
};

const DEFAULT_SUBJECT_COLOR = { color: '#4a5568', accent: '#718096' };

// ─────────────────────────────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────────────────────────────

function getSubjectColors(subjectId: string) {
  return SUBJECT_COLORS[subjectId] ?? DEFAULT_SUBJECT_COLOR;
}

/**
 * Map a Firestore document to a `DynamicModule` runtime object.
 * Converts raw Firestore data into the shape expected by `ModuleFolderCard`.
 */
export function mapFirestoreToDynamicModule(
  docData: DocumentData,
  docId: string,
): DynamicModule {
  const subjectColors = getSubjectColors(docData.subjectId);

  return {
    id: docId,
    title: docData.title ?? '',
    description: docData.description ?? '',
    lessons: docData.lessons ?? [],
    quizzes: docData.quizzes ?? [],
    progress: 0,
    color: 'bg-white',
    iconColor: 'text-slate-700',
    accentColor: 'bg-slate-700',
    subjectId: (docData.subjectId ?? 'gen-math') as DynamicModule['subjectId'],
    subject: docData.subject ?? '',
    subjectColor: subjectColors.color,
    subjectAccentColor: subjectColors.accent,
    grade_level_availability: [docData.gradeLevel ?? 'Grade 11'],
    recommended_grade_level: docData.gradeLevel ?? 'Grade 11',
    active_grade_level: docData.gradeLevel ?? 'Grade 11',
    quarter: docData.quarter ?? 'Q1',
    content_domain: docData.content_domain ?? '',
    competency_group: docData.competency_group ?? '',
    competencies: docData.competencies ?? [],
    performance_standard: docData.performance_standard ?? '',
    real_world_theme: docData.real_world_theme ?? '',
    lesson_count: docData.lesson_count ?? 0,
    quiz_count: docData.quiz_count ?? 0,
    is_visible_for_grade: true,
    curriculum_aligned_label: 'Dynamic',
    module_sources: docData.module_sources ?? [],
    module_assessments: [],
    isAvailable: true,
    sourceType: 'dynamic',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

const DYNAMIC_MODULES_COLLECTION = 'dynamic_modules';

/**
 * Subscribe to real-time updates from the `dynamic_modules` Firestore collection.
 *
 * @param subjectId - optional filter to a specific subjectId
 * @param onChange - callback invoked with the latest list of DynamicModule objects
 * @returns unsubscribe function — call it to stop listening
 */
export function subscribeToDynamicModules(
  onChange: (modules: DynamicModule[]) => void,
  subjectId?: string,
): Unsubscribe {
  const collectionRef = collection(db, DYNAMIC_MODULES_COLLECTION);

  const constraints: Parameters<typeof query>[1][] = [
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
  ];

  const q = subjectId
    ? query(collectionRef, ...constraints, where('subjectId', '==', subjectId))
    : query(collectionRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const modules = snapshot.docs
        .filter((doc) => doc.exists())
        .map((doc) => mapFirestoreToDynamicModule(doc.data(), doc.id));

      onChange(modules);
    },
    (error) => {
      console.error('[dynamicModuleService] subscribeToDynamicModules error:', error);
      onChange([]);
    },
  );
}
