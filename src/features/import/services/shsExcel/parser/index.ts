import { DEFAULT_CONFIDENCE_THRESHOLD } from './constants';
import { detectFormat } from './detectFormat';
import { extractFinalSemestral } from './extractFinalSemestral';
import { extractInputData } from './extractInputData';
import { extractQuarterSheet } from './extractQuarterSheet';
import { extractReferenceSheets } from './extractReferenceSheets';
import { normalizeWorkbook } from './normalizeWorkbook';
import { readWorkbookFromFile } from './readWorkbook';
import type { ParseWorkbookOptions, ParseWorkbookResult, SheetMatrix, WorkbookReadResult } from './types';
import { RangeTracker } from './utils/rangeTracker';
import { validateWorkbook, mapWorkbookToMathPulseEntities } from './validateWorkbook';

const SLOW_PARSE_WARN_MS = 1500;

function getWorkbookMatrixCellCount(workbook: WorkbookReadResult | null): number {
  if (!workbook) return 0;
  return Object.values(workbook.matrices).reduce((sum, matrix) => sum + (matrix.rowCount * matrix.colCount), 0);
}

function emitParseTelemetry(input: {
  fileName: string;
  durationMs: number;
  stage: 'success' | 'failed';
  sheetCount: number;
  matrixCellCount: number;
  errorMessage?: string;
}): void {
  const base = `[shs-import] parse ${input.stage} file=${input.fileName} duration=${input.durationMs}ms sheets=${input.sheetCount} matrixCells=${input.matrixCellCount}`;

  if (input.stage === 'failed') {
    console.error(`${base}${input.errorMessage ? ` error=${input.errorMessage}` : ''}`);
    return;
  }

  if (input.durationMs >= SLOW_PARSE_WARN_MS) {
    console.warn(`${base} slow=true threshold=${SLOW_PARSE_WARN_MS}ms`);
    return;
  }

  if (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)) {
    console.info(base);
  }
}

function emitProgress(options: ParseWorkbookOptions | undefined, event: { stage: 'idle' | 'reading' | 'detecting-format' | 'extracting' | 'normalizing' | 'validating' | 'complete' | 'failed'; message: string }) {
  options?.onProgress?.(event);
}

function normalizeRows(rows: number[], matrix: SheetMatrix): number[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => Number.isFinite(row))
        .map((row) => Math.max(matrix.startRow, Math.min(matrix.endRow, Math.trunc(row)))),
    ),
  );
}

function markSheetRows(
  tracker: RangeTracker,
  matrix: SheetMatrix,
  rows: number[],
  reason: string,
): void {
  normalizeRows(rows, matrix).forEach((row) => {
    tracker.markRange(
      matrix.sheetName,
      {
        s: { r: row, c: matrix.startCol },
        e: { r: row, c: matrix.endCol },
      },
      reason,
    );
  });
}

export async function parseShsWorkbook(file: File, options?: ParseWorkbookOptions): Promise<ParseWorkbookResult> {
  const confidenceThreshold = options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const parseStart = Date.now();
  let workbook: WorkbookReadResult | null = null;

  try {
    emitProgress(options, { stage: 'reading', message: 'Reading workbook structure and raw sheets...' });
    workbook = await readWorkbookFromFile(file);

    emitProgress(options, { stage: 'detecting-format', message: 'Detecting DepEd SHS workbook format...' });
    const detection = detectFormat(workbook);

    emitProgress(options, { stage: 'extracting', message: 'Extracting metadata, learners, grades, and references...' });

    const inputSheetName = detection.detectedSheets.inputData || workbook.sheetNames[0];
    const inputSheet = workbook.matrices[inputSheetName];
    const inputData = inputSheet
      ? extractInputData(inputSheet)
      : {
          sheetName: inputSheetName,
          schoolContext: {},
          learners: [],
          signatures: [],
          attachmentRules: [],
          helperNotes: [],
          warnings: ['Input data sheet was not available in matrix map.'],
        };

    const quarterSheetNames = [
      ...(detection.detectedSheets.firstQuarter || []),
      ...(detection.detectedSheets.secondQuarter || []),
    ];

    const quarterSheets = quarterSheetNames
      .map((name) => workbook.matrices[name])
      .filter((sheet): sheet is SheetMatrix => Boolean(sheet))
      .map((sheet) => extractQuarterSheet(sheet));

    const finalSheets = (detection.detectedSheets.finalSemestral || [])
      .map((name) => workbook.matrices[name])
      .filter((sheet): sheet is SheetMatrix => Boolean(sheet))
      .map((sheet) => extractFinalSemestral(sheet));

    const referenceMatrices = [
      ...(detection.detectedSheets.helper || []),
      ...(detection.detectedSheets.lookup || []),
    ]
      .map((name) => workbook.matrices[name])
      .filter((sheet): sheet is SheetMatrix => Boolean(sheet));

    const references = extractReferenceSheets(referenceMatrices);

    const tracker = new RangeTracker();

    detection.anchorMatches.forEach((match) => {
      const matrix = workbook.matrices[match.sheetName];
      if (!matrix) return;
      markSheetRows(tracker, matrix, [match.row], `Anchor match: ${match.anchor}`);
    });

    [inputData.sheetName].forEach((sheetName) => {
      const sheet = workbook.matrices[sheetName];
      if (!sheet) return;

      const metadataRows = Array.from({ length: Math.min(14, sheet.rowCount) }, (_, index) => sheet.startRow + index);
      const learnerRows = inputData.learners.map((learner) => learner.sourceRow - 1);
      const signatureRows = inputData.signatures
        .map((signature) => signature.sourceRow)
        .filter((row): row is number => typeof row === 'number')
        .map((row) => row - 1);

      markSheetRows(
        tracker,
        sheet,
        [...metadataRows, ...learnerRows, ...signatureRows],
        'Input Data parsed rows',
      );
    });

    quarterSheets.forEach((sheet) => {
      const matrix = workbook.matrices[sheet.sheetName];
      if (!matrix) return;

      const learnerRows = sheet.learnerGrades.map((row) => row.sourceRow - 1);
      const signatureRows = sheet.signatures
        .map((signature) => signature.sourceRow)
        .filter((row): row is number => typeof row === 'number')
        .map((row) => row - 1);
      const headerSeed = learnerRows.length > 0
        ? Math.max(matrix.startRow, Math.min(...learnerRows) - 2)
        : matrix.startRow;

      markSheetRows(
        tracker,
        matrix,
        [headerSeed, headerSeed + 1, ...learnerRows, ...signatureRows],
        'Quarter sheet parsed rows',
      );
    });

    finalSheets.forEach((sheet) => {
      const matrix = workbook.matrices[sheet.sheetName];
      if (!matrix) return;

      const learnerRows = sheet.learnerGrades.map((row) => row.sourceRow - 1);
      const signatureRows = sheet.signatures
        .map((signature) => signature.sourceRow)
        .filter((row): row is number => typeof row === 'number')
        .map((row) => row - 1);
      const headerSeed = learnerRows.length > 0
        ? Math.max(matrix.startRow, Math.min(...learnerRows) - 2)
        : matrix.startRow;

      markSheetRows(
        tracker,
        matrix,
        [headerSeed, headerSeed + 1, ...learnerRows, ...signatureRows],
        'Final semestral parsed rows',
      );
    });

    referenceMatrices.forEach((sheet) => {
      const weightedRows = references.componentWeights
        .filter((row) => row.sourceSheet === sheet.sheetName)
        .map((row) => row.sourceRow)
        .filter((row): row is number => typeof row === 'number')
        .map((row) => row - 1);

      const signatureRows = references.signatures
        ?.filter((signature) => signature.sourceSheet === sheet.sheetName)
        .map((signature) => signature.sourceRow)
        .filter((row): row is number => typeof row === 'number')
        .map((row) => row - 1) || [];

      const bootstrapRows = weightedRows.length === 0 && signatureRows.length === 0
        ? [sheet.startRow, sheet.startRow + 1, sheet.startRow + 2]
        : [];

      markSheetRows(
        tracker,
        sheet,
        [...weightedRows, ...signatureRows, ...bootstrapRows],
        'Reference/helper parsed rows',
      );
    });

    const unmappedBlocks = tracker.getUnmappedBlocks(workbook.matrices);

    emitProgress(options, { stage: 'validating', message: 'Validating completeness and structural integrity...' });
    const validation = validateWorkbook({
      detection,
      inputData,
      quarterSheets,
      finalSheets,
      mappedCellRegions: tracker.getMappedRegionCount(),
      unmappedCellRegions: unmappedBlocks.length,
      totalSheets: workbook.sheetNames.length,
    });

    emitProgress(options, { stage: 'normalizing', message: 'Normalizing parsed workbook and creating entity mapping...' });
    const imported = normalizeWorkbook({
      workbook,
      detection,
      inputData,
      quarterSheets,
      finalSheets,
      references,
      validation,
      unclassifiedBlocks: unmappedBlocks,
    });

    if (imported.validation.confidence < confidenceThreshold) {
      imported.validation.warnings.push(
        `Detection confidence ${imported.validation.confidence.toFixed(2)} is below confirmation threshold ${confidenceThreshold.toFixed(2)}.`,
      );
    }

    const mapping = mapWorkbookToMathPulseEntities(imported);

    emitProgress(options, { stage: 'complete', message: 'Workbook parse completed.' });
    emitParseTelemetry({
      fileName: file.name,
      durationMs: Date.now() - parseStart,
      stage: 'success',
      sheetCount: workbook.sheetNames.length,
      matrixCellCount: getWorkbookMatrixCellCount(workbook),
    });
    return {
      imported,
      mapping,
    };
  } catch (error) {
    emitProgress(options, { stage: 'failed', message: error instanceof Error ? error.message : 'Failed to parse workbook.' });
    emitParseTelemetry({
      fileName: file.name,
      durationMs: Date.now() - parseStart,
      stage: 'failed',
      sheetCount: workbook?.sheetNames.length ?? 0,
      matrixCellCount: getWorkbookMatrixCellCount(workbook),
      errorMessage: error instanceof Error ? error.message : 'Failed to parse workbook.',
    });
    throw error;
  }
}
