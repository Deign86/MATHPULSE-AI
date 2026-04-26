import { useCallback, useMemo, useState } from 'react';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../services/shsExcel/parser/constants';
import { parseShsWorkbook } from '../services/shsExcel/parser';
import type { ImportedShsWorkbook, ParseShsWorkbookResult } from '../services/shsExcel/parser/types';

export type ShsImportStage = 'idle' | 'reading' | 'detecting format' | 'extracting' | 'validating' | 'complete' | 'failed';

export interface UseShsExcelImportState {
  stage: ShsImportStage;
  progressPercent: number;
  progressMessage: string;
  error: string | null;
  result: ParseShsWorkbookResult | null;
}

const STAGE_PROGRESS: Record<ShsImportStage, number> = {
  idle: 0,
  'reading': 15,
  'detecting format': 35,
  'extracting': 60,
  'validating': 82,
  'complete': 100,
  'failed': 100,
};

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to parse workbook. Ensure the file follows official SHS class record structure.';
}

function hasCriticalBlockingIssues(workbook: ImportedShsWorkbook): boolean {
  return workbook.validation.errors.length > 0 || workbook.validation.confidence < DETECTION_CONFIDENCE_THRESHOLD;
}

export function useShsExcelImport() {
  const [state, setState] = useState<UseShsExcelImportState>({
    stage: 'idle',
    progressPercent: 0,
    progressMessage: 'Waiting for workbook upload.',
    error: null,
    result: null,
  });

  const parseFile = useCallback(async (file: File) => {
    setState({
      stage: 'reading',
      progressPercent: STAGE_PROGRESS.reading,
      progressMessage: 'Reading workbook and preserving raw structure...',
      error: null,
      result: null,
    });

    try {
      const parsed = await parseShsWorkbook(file, {
        confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD,
        onProgress: (event) => {
          const normalizedStage = (event.stage.replace('-', ' ') as ShsImportStage);
          const stage = normalizedStage in STAGE_PROGRESS ? normalizedStage : 'extracting';
          setState((prev) => ({
            ...prev,
            stage,
            progressPercent: STAGE_PROGRESS[stage],
            progressMessage: event.message,
          }));
        },
      });

      setState({
        stage: 'complete',
        progressPercent: STAGE_PROGRESS.complete,
        progressMessage: 'Workbook parsed and validated.',
        error: null,
        result: parsed,
      });

      return parsed;
    } catch (error) {
      const message = normalizeErrorMessage(error);
      setState({
        stage: 'failed',
        progressPercent: STAGE_PROGRESS.failed,
        progressMessage: 'Workbook parsing failed.',
        error: message,
        result: null,
      });
      throw new Error(message);
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      progressPercent: STAGE_PROGRESS.idle,
      progressMessage: 'Waiting for workbook upload.',
      error: null,
      result: null,
    });
  }, []);

  const canConfirmImport = useMemo(() => {
    if (!state.result) return false;
    return !hasCriticalBlockingIssues(state.result.imported);
  }, [state.result]);

  return {
    ...state,
    parseFile,
    reset,
    canConfirmImport,
    confidenceThreshold: DETECTION_CONFIDENCE_THRESHOLD,
  };
}
