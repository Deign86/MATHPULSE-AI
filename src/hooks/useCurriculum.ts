import { useState, useEffect, useCallback } from 'react';
import {
  getCurriculumSubjects,
  getCurriculumTopics,
  type CurriculumSubject,
  type CurriculumTopic,
} from '../services/apiService';
import { SHS_MATH_SUBJECTS } from '../data/subjects';

// Legacy static data adapter - converts old static format to new API format
const adaptStaticSubject = (staticSubject: {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  semester: string;
  color: string;
  pdfAvailable: boolean;
  topics: Array<{ id: string; name: string; unit: string }>;
}): CurriculumSubject => ({
  id: staticSubject.id,
  code: staticSubject.code,
  name: staticSubject.name,
  gradeLevel: staticSubject.gradeLevel,
  semester: staticSubject.semester,
  color: staticSubject.color,
  pdfAvailable: staticSubject.pdfAvailable,
  topics: staticSubject.topics.map((t: { id: string; name: string; unit: string }) => ({
    id: t.id,
    name: t.name,
    unit: t.unit,
  })),
});

interface UseCurriculumResult {
  subjects: CurriculumSubject[];
  isLoading: boolean;
  error: string | null;
  getSubject: (id: string) => CurriculumSubject | undefined;
  getTopics: (subjectId: string) => CurriculumTopic[];
  refetch: () => void;
}

/**
 * Curriculum hook - reads from Firestore (via API), falls back to static data.
 * Use this instead of direct static imports for dynamic curriculum.
 */
export function useCurriculum(gradeLevel?: string): UseCurriculumResult {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'firestore' | 'static'>('static');

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try Firestore first
      const firestoreSubjects = await getCurriculumSubjects(gradeLevel);
      if (firestoreSubjects && firestoreSubjects.length > 0) {
        setSubjects(firestoreSubjects);
        setSource('firestore');
        // [useCurriculum] Loaded subjects from Firestore
      } else {
        // Fall back to static
        // [useCurriculum] No Firestore data, using static
        const staticData = (SHS_MATH_SUBJECTS as unknown as CurriculumSubject[]).filter(
          (s) => !gradeLevel || s.gradeLevel === gradeLevel,
        );
        setSubjects(staticData.map(adaptStaticSubject));
        setSource('static');
      }
    } catch (e) {
      // Fall back to static on error
      console.warn('[useCurriculum] API failed, using static:', e);
      const staticData = (SHS_MATH_SUBJECTS as unknown as CurriculumSubject[]).filter(
        (s) => !gradeLevel || s.gradeLevel === gradeLevel,
      );
      setSubjects(staticData.map(adaptStaticSubject));
      setSource('static');
      setError(e instanceof Error ? e.message : 'Failed to load curriculum');
    } finally {
      setIsLoading(false);
    }
  }, [gradeLevel]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const getSubject = useCallback(
    (id: string) => subjects.find((s) => s.id === id),
    [subjects],
  );

  const getTopics = useCallback(
    (subjectId: string) => {
      const subject = subjects.find((s) => s.id === subjectId);
      return subject?.topics || [];
    },
    [subjects],
  );

  return {
    subjects,
    isLoading,
    error,
    getSubject,
    getTopics,
    refetch: fetchSubjects,
  };
}

/**
 * Legacy adapter - returns static curriculum data.
 * Use useCurriculum() for Firestore-backed data.
 */
export function useStaticCurriculum() {
  const staticSubjects = (SHS_MATH_SUBJECTS as unknown as CurriculumSubject[]).map(
    adaptStaticSubject,
  );

  const getSubject = (id: string) =>
    staticSubjects.find((s) => s.id === id);

  const getTopics = (subjectId: string) => {
    const subject = staticSubjects.find((s) => s.id === subjectId);
    return subject?.topics || [];
  };

  return {
    subjects: staticSubjects,
    isLoading: false,
    error: null,
    getSubject,
    getTopics,
    refetch: () => {},
  };
}