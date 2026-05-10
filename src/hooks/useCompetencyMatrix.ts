/**
 * useCompetencyMatrix Hook
 *
 * Custom hook that fetches and computes competency axis scores per module
 * from Firestore, returning data in the format expected by CompetencyRadarChart.
 *
 * Uses real-time Firestore listeners so the chart updates immediately when
 * "Reset Testing Data" clears the progress / quizResults subcollection.
 *
 * Data sources (in priority order):
 *   1. users/{userId}/competencyMatrix/{moduleId}  (cached, instant)
 *   2. users/{userId}/quizResults/{quizId}  +  moduleProgress
 *   3. progress.quizAttempts  (embedded fallback)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../lib/firebase';
import {
  fetchQuizResults,
  fetchModuleProgress,
  fetchCachedCompetencyMatrix,
  computeModuleScores,
  THEME_PALETTE,
} from '../services/competencyService';
import { subscribeToUserProgress } from '../services/progressService';
import { getActiveSubjectIdsForGrade } from '../data/subjects';
import { subjects } from '../data/subjects';
import type { RadarRow, ModuleInfo, FirestoreModuleProgress } from '../types/competency';
import type { UserProgress } from '../types/models';

export interface UseCompetencyMatrixResult {
  /** Radar chart data — one row per axis, each with module scores */
  data: RadarRow[];
  /** Module metadata (id, name, color) for legend and polygons */
  modulesList: ModuleInfo[];
  /** Name of the module with the highest average score */
  topModule: string;
  /** True while initial fetch is in progress */
  loading: boolean;
  /** Error message if fetch failed, null on success */
  error: string | null;
  /** True when student has no quiz activity yet */
  isEmpty: boolean;
  /** Re-fetch data from Firestore */
  refresh: () => void;
}

const RADAR_METRICS = [
  { key: 'progress', label: 'Overall Mastery' },
  { key: 'concept', label: 'Concept Grasp' },
  { key: 'application', label: 'Application' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'consistency', label: 'Consistency' },
];

/**
 * Hook to fetch and compute competency matrix data for a given user.
 *
 * Uses an onSnapshot listener on the user's progress document so the chart
 * re-computes and re-renders immediately whenever "Reset Testing Data" or
 * any other operation modifies the underlying Firestore data.
 *
 * @param userId  Firebase UID of the student
 */
export function useCompetencyMatrix(userId: string): UseCompetencyMatrixResult {
  const [data, setData] = useState<RadarRow[]>([]);
  const [modulesList, setModulesList] = useState<ModuleInfo[]>([]);
  const [topModule, setTopModule] = useState<string>('N/A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const loadIdRef = useRef(0);

  const computeAndSet = useCallback(
    async (progress: UserProgress | null, currentLoadId: number) => {
      if (currentLoadId !== loadIdRef.current) return;

      // Build module list (stable — only runs once)
      const activeSubjectIds = getActiveSubjectIdsForGrade(null);
      const activeSubjectId = activeSubjectIds[0] ?? 'gen-math';
      const validModules =
        subjects.find((s) => s.id === activeSubjectId)?.modules || [];

      const modsInfo: ModuleInfo[] = validModules.map((mod, i) => ({
        id: mod.id,
        name:
          mod.title.length > 15
            ? mod.title.substring(0, 15).trim() + '...'
            : mod.title,
        color: THEME_PALETTE[i % THEME_PALETTE.length],
      }));

      // Try cache first
      const cached = await fetchCachedCompetencyMatrix(userId);
      if (currentLoadId !== loadIdRef.current) return;

      if (Object.keys(cached).length > 0) {
        buildChartFromCache(cached, modsInfo, setData, setTopModule);
        setIsEmpty(false);
        setLoading(false);
        return;
      }

      // No cache — compute from raw data
      const quizResults = await fetchQuizResults(userId);
      const moduleProgress = await fetchModuleProgress(userId);
      if (currentLoadId !== loadIdRef.current) return;

      const hasActivity = quizResults.length > 0;
      setIsEmpty(!hasActivity);

      buildChartFromRawData(
        quizResults,
        moduleProgress,
        modsInfo,
        validModules,
        setData,
        setTopModule,
      );

      setLoading(false);
    },
    [userId],
  );

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const currentLoadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // Initial one-shot fetch
      const progressDoc = await new Promise<UserProgress | null>((resolve) => {
        // We use subscribeToUserProgress as a one-shot by resolving on first event
        const unsub = subscribeToUserProgress(userId, (progress) => {
          unsub();
          resolve(progress);
        });
      });

      if (currentLoadId !== loadIdRef.current) return;
      await computeAndSet(progressDoc, currentLoadId);
    } catch (err) {
      console.error('[useCompetencyMatrix] Failed to load:', err);
      if (currentLoadId === loadIdRef.current) {
        setError('Failed to load competency data. Please try again.');
        setLoading(false);
      }
    }
  }, [userId, computeAndSet]);

  // Set up real-time listener on the progress document
  // This ensures the chart updates instantly when Reset Testing Data fires
  useEffect(() => {
    if (!userId) return;

    // Subscribe to progress changes (real-time)
    const unsub = subscribeToUserProgress(userId, (progress) => {
      const currentLoadId = ++loadIdRef.current;
      // On every progress change (including resets), re-compute
      void computeAndSet(progress, currentLoadId);
    });

    return () => unsub();
  }, [userId, computeAndSet]);

  return { data, modulesList, topModule, loading, error, isEmpty, refresh: load };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildChartFromCache(
  cached: Record<
    string,
    {
      moduleName: string;
      overallMastery: number;
      conceptGrasp: number;
      application: number;
      engagement: number;
      consistency: number;
    }
  >,
  modsInfo: ModuleInfo[],
  setData: (d: RadarRow[]) => void,
  setTopModule: (t: string) => void,
) {
  let highestAvg = -1;
  let bestModName = 'N/A';

  const chartData: RadarRow[] = RADAR_METRICS.map((metric) => {
    const row: RadarRow = { metric: metric.label, fullMark: 100 };

    modsInfo.forEach((mod) => {
      const c = cached[mod.id];
      if (c) {
        if (metric.key === 'progress') row[mod.id] = c.overallMastery;
        else if (metric.key === 'concept') row[mod.id] = c.conceptGrasp;
        else if (metric.key === 'application') row[mod.id] = c.application;
        else if (metric.key === 'engagement') row[mod.id] = c.engagement;
        else if (metric.key === 'consistency') row[mod.id] = c.consistency;
      }
    });

    return row;
  });

  modsInfo.forEach((mod) => {
    const c = cached[mod.id];
    if (c) {
      const avg =
        (c.overallMastery +
          c.conceptGrasp +
          c.application +
          c.engagement +
          c.consistency) /
        5;
      if (avg > highestAvg) {
        highestAvg = avg;
        bestModName = mod.name;
      }
    }
  });

  setTopModule(bestModName);
  setData(chartData);
}

function buildChartFromRawData(
  quizResults: { moduleId: string; score: number; questionType: string }[],
  moduleProgress: Record<string, FirestoreModuleProgress>,
  modsInfo: ModuleInfo[],
  validModules: { id: string; title: string; lessons: unknown[]; quizzes: unknown[] }[],
  setData: (d: RadarRow[]) => void,
  setTopModule: (t: string) => void,
) {
  let highestAvg = -1;
  let bestModName = 'N/A';

  const chartData: RadarRow[] = RADAR_METRICS.map((metric) => {
    const row: RadarRow = { metric: metric.label, fullMark: 100 };

    validModules.forEach((mod) => {
      const mp = moduleProgress[mod.id];
      const scores = computeModuleScores(
        mod.id,
        quizResults as Parameters<typeof computeModuleScores>[1],
        mp ?? {
          moduleId: mod.id,
          subjectId: '',
          sessionsCompleted: 0,
          lastActive: new Date(),
          moduleTitle: mod.title,
          lessonsCompleted: [],
          quizzesCompleted: [],
        },
        validModules,
      );

      if (metric.key === 'progress') row[mod.id] = scores.overallMastery;
      else if (metric.key === 'concept') row[mod.id] = scores.conceptGrasp;
      else if (metric.key === 'application') row[mod.id] = scores.application;
      else if (metric.key === 'engagement') row[mod.id] = scores.engagement;
      else if (metric.key === 'consistency') row[mod.id] = scores.consistency;
    });

    return row;
  });

  validModules.forEach((mod) => {
    const mp = moduleProgress[mod.id];
    const scores = computeModuleScores(
      mod.id,
      quizResults as Parameters<typeof computeModuleScores>[1],
      mp ?? ({
        moduleId: mod.id,
        subjectId: '',
        sessionsCompleted: 0,
        lastActive: new Date(),
        moduleTitle: mod.title,
        lessonsCompleted: [],
        quizzesCompleted: [],
      } as Parameters<typeof computeModuleScores>[2]),
      validModules,
    );
    const avg =
      (scores.overallMastery +
        scores.conceptGrasp +
        scores.application +
        scores.engagement +
        scores.consistency) /
      5;
    if (avg > highestAvg) {
      highestAvg = avg;
      bestModName = modsInfo.find((m) => m.id === mod.id)?.name || 'N/A';
    }
  });

  setTopModule(bestModName);
  setData(chartData);
}