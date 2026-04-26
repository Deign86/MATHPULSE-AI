import { LEARNER_ROW_STOP_TOKENS, SIGNATURE_ROLES } from '../constants';
import type { LearnerSex } from '../types';
import { normalizeText } from './normalizeText';

export type ClassifiedRowType =
  | 'blank'
  | 'sex-header'
  | 'signature'
  | 'header'
  | 'helper'
  | 'learner'
  | 'unknown';

export function parseLearnerNo(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const parsed = Number(text.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function detectSexContextFromRow(rowText: string): LearnerSex | undefined {
  const normalized = normalizeText(rowText);
  if (normalized.includes('FEMALE')) return 'FEMALE';
  if (normalized.includes('MALE')) return 'MALE';
  return undefined;
}

export function classifyRowType(input: {
  rowText: string;
  hasLearnerNumber: boolean;
  hasLearnerName: boolean;
}): ClassifiedRowType {
  const normalized = normalizeText(input.rowText);
  if (!normalized) return 'blank';

  if (normalized === 'MALE' || normalized === 'FEMALE') {
    return 'sex-header';
  }

  if (SIGNATURE_ROLES.some((token) => normalized.includes(token))) {
    return 'signature';
  }

  if (LEARNER_ROW_STOP_TOKENS.some((token) => normalized.includes(token))) {
    return 'helper';
  }

  if (
    normalized.includes('LEARNERS NAMES')
    || normalized.includes('WRITTEN WORK')
    || normalized.includes('PERFORMANCE TASKS')
    || normalized.includes('QUARTERLY ASSESSMENT')
    || normalized.includes('INITIAL GRADE')
    || normalized.includes('QUARTERLY GRADE')
  ) {
    return 'header';
  }

  if (input.hasLearnerName || input.hasLearnerNumber) {
    return 'learner';
  }

  if (normalized.includes('ATTACHMENTS') || normalized.includes('LOOK UP')) {
    return 'helper';
  }

  return 'unknown';
}
