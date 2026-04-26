import { DETECTION_ANCHORS, REQUIRED_CRITICAL_ANCHORS, SHEET_NAME_HINTS, SHS_FORMAT } from './constants';
import type { FormatDetectionResult, SheetDetection, WorkbookReadResult } from './types';
import { findAnchorMatchesAcrossWorkbook } from './utils/findAnchors';
import { includesNormalized, normalizeText } from './utils/normalizeText';

function classifySheetRole(sheetName: string, sheetSignals: Set<string>): SheetDetection['role'] {
  const normalizedSheetName = normalizeText(sheetName).toLowerCase();

  const hasSignal = (token: string) =>
    [...sheetSignals].some((signal) => includesNormalized(signal, token));

  if (
    SHEET_NAME_HINTS.inputData.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('INPUT DATA')
  ) {
    return 'inputData';
  }

  if (
    SHEET_NAME_HINTS.finalSemestral.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('FINAL SEMESTRAL GRADES')
    || hasSignal('FINAL GRADES')
  ) {
    return 'finalSemestral';
  }

  if (
    SHEET_NAME_HINTS.firstQuarter.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('FIRST QUARTER')
  ) {
    return 'firstQuarter';
  }

  if (
    SHEET_NAME_HINTS.secondQuarter.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('SECOND QUARTER')
  ) {
    return 'secondQuarter';
  }

  if (
    hasSignal('SENIOR HIGH SCHOOL CLASS RECORD')
    || (hasSignal('WRITTEN WORK') && hasSignal('PERFORMANCE TASKS'))
  ) {
    return 'firstQuarter';
  }

  if (
    SHEET_NAME_HINTS.helper.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('WEIGHT OF COMPONENTS')
    || hasSignal('ATTACHMENTS')
    || hasSignal('HELPER')
  ) {
    return 'helper';
  }

  if (
    SHEET_NAME_HINTS.lookup.some((hint) => normalizedSheetName.includes(hint))
    || hasSignal('LOOK UP')
  ) {
    return 'lookup';
  }

  return 'other';
}

function scoreDetection(input: {
  criticalFound: number;
  criticalTotal: number;
  recognizedSheets: number;
  totalSheets: number;
  hasDepedAnchor: boolean;
}): number {
  const criticalCoverage = input.criticalTotal > 0 ? input.criticalFound / input.criticalTotal : 0;
  const sheetCoverage = input.totalSheets > 0 ? input.recognizedSheets / input.totalSheets : 0;
  const depedBonus = input.hasDepedAnchor ? 1 : 0;

  const confidence = 0.65 * criticalCoverage + 0.2 * sheetCoverage + 0.15 * depedBonus;
  return Number(Math.max(0, Math.min(1, confidence)).toFixed(4));
}

export function detectFormat(readResult: WorkbookReadResult): FormatDetectionResult {
  const anchorMatches = findAnchorMatchesAcrossWorkbook(readResult.matrices, DETECTION_ANCHORS);

  const foundCritical = new Set<string>();
  const evidence: string[] = [];

  REQUIRED_CRITICAL_ANCHORS.forEach((anchor) => {
    const found = anchorMatches.some((match) => includesNormalized(match.anchor, anchor));
    if (found) {
      foundCritical.add(anchor);
      evidence.push(`Found critical anchor: ${anchor}`);
    }
  });

  const missingCriticalAnchors = REQUIRED_CRITICAL_ANCHORS.filter((anchor) => !foundCritical.has(anchor));

  const perSheetSignals = new Map<string, Set<string>>();
  anchorMatches.forEach((match) => {
    if (!perSheetSignals.has(match.sheetName)) {
      perSheetSignals.set(match.sheetName, new Set<string>());
    }
    perSheetSignals.get(match.sheetName)?.add(match.anchor);
  });

  const detections: SheetDetection[] = readResult.sheetNames.map((sheetName) => {
    const signals = perSheetSignals.get(sheetName) || new Set<string>();
    const role = classifySheetRole(sheetName, signals);
    const confidence = Math.min(1, 0.35 + Math.min(0.55, signals.size * 0.08));
    const detectionEvidence = [
      `sheet:${sheetName}`,
      `signals:${signals.size}`,
      ...[...signals].slice(0, 5),
    ];

    return {
      sheetName,
      role,
      confidence: Number(confidence.toFixed(3)),
      evidence: detectionEvidence,
    };
  });

  const detectedSheets: FormatDetectionResult['detectedSheets'] = {
    firstQuarter: [],
    secondQuarter: [],
    finalSemestral: [],
    helper: [],
    lookup: [],
    other: [],
  };

  detections.forEach((detection) => {
    switch (detection.role) {
      case 'inputData':
        if (!detectedSheets.inputData) {
          detectedSheets.inputData = detection.sheetName;
        } else {
          detectedSheets.other.push(detection.sheetName);
        }
        break;
      case 'firstQuarter':
        detectedSheets.firstQuarter.push(detection.sheetName);
        break;
      case 'secondQuarter':
        detectedSheets.secondQuarter.push(detection.sheetName);
        break;
      case 'finalSemestral':
        detectedSheets.finalSemestral.push(detection.sheetName);
        break;
      case 'helper':
        detectedSheets.helper.push(detection.sheetName);
        break;
      case 'lookup':
        detectedSheets.lookup.push(detection.sheetName);
        break;
      case 'other':
      default:
        detectedSheets.other.push(detection.sheetName);
        break;
    }
  });

  const recognizedSheetCount =
    (detectedSheets.inputData ? 1 : 0)
    + detectedSheets.firstQuarter.length
    + detectedSheets.secondQuarter.length
    + detectedSheets.finalSemestral.length
    + detectedSheets.helper.length
    + detectedSheets.lookup.length;

  const confidence = scoreDetection({
    criticalFound: foundCritical.size,
    criticalTotal: REQUIRED_CRITICAL_ANCHORS.length,
    recognizedSheets: recognizedSheetCount,
    totalSheets: readResult.sheetNames.length,
    hasDepedAnchor: anchorMatches.some((match) => includesNormalized(match.anchor, 'Pursuant to DepEd Order 8 series of 2015')),
  });

  const hasAnyQuarter = detectedSheets.firstQuarter.length > 0 || detectedSheets.secondQuarter.length > 0;
  const hasRequiredCore = Boolean(detectedSheets.inputData) && hasAnyQuarter && detectedSheets.finalSemestral.length > 0;

  const isOfficialFormatLikely = confidence >= 0.55 && hasRequiredCore;

  if (!detectedSheets.inputData) {
    evidence.push('Input Data sheet not confidently detected.');
  }
  if (!hasAnyQuarter) {
    evidence.push('No quarter class record sheet detected.');
  }
  if (detectedSheets.finalSemestral.length === 0) {
    evidence.push('No Final Semestral Grades sheet detected.');
  }

  return {
    format: SHS_FORMAT,
    isOfficialFormatLikely,
    confidence,
    evidence,
    missingCriticalAnchors,
    detectedSheets,
    anchorMatches,
  };
}
