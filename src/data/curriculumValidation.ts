import { CurriculumDescriptor, QuarterKey } from '../types/models';

export interface QuarterValidationResult {
  quarter: QuarterKey;
  expectedHours: number;
  minHours: number;
  maxHours: number;
  isConsistent: boolean;
}

export interface G11ValidationResult {
  isValid: boolean;
  totalExpectedCodes: number;
  totalMappedCodes: number;
  missingCodes: string[];
  duplicateCodes: string[];
  unexpectedCodes: string[];
  quarterResults: QuarterValidationResult[];
}

const QUARTERS: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function validateG11GeneralMathDescriptor(
  descriptor: CurriculumDescriptor,
  expectedCodes: readonly string[],
): G11ValidationResult {
  const mappedCodes = descriptor.topicGroups.flatMap((topicGroup) =>
    topicGroup.competencies.map((competency) => competency.code),
  );

  const mappedCodeCounts = mappedCodes.reduce<Record<string, number>>((acc, code) => {
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  const expectedSet = new Set(expectedCodes);
  const mappedSet = new Set(mappedCodes);

  const missingCodes = expectedCodes.filter((code) => !mappedSet.has(code));
  const duplicateCodes = Object.entries(mappedCodeCounts)
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
    .sort();
  const unexpectedCodes = [...mappedSet]
    .filter((code) => !expectedSet.has(code))
    .sort();

  const quarterResults: QuarterValidationResult[] = QUARTERS.map((quarter) => {
    const topicGroups = descriptor.topicGroups.filter((topicGroup) => topicGroup.quarter === quarter);
    const minHours = topicGroups.reduce((sum, topicGroup) => sum + topicGroup.minHours, 0);
    const maxHours = topicGroups.reduce((sum, topicGroup) => sum + topicGroup.maxHours, 0);
    const expectedHours = descriptor.quarterHourAllocation[quarter];

    return {
      quarter,
      expectedHours,
      minHours,
      maxHours,
      isConsistent: expectedHours >= minHours && expectedHours <= maxHours,
    };
  });

  const isValid =
    missingCodes.length === 0 &&
    duplicateCodes.length === 0 &&
    unexpectedCodes.length === 0 &&
    quarterResults.every((result) => result.isConsistent);

  return {
    isValid,
    totalExpectedCodes: expectedCodes.length,
    totalMappedCodes: mappedCodes.length,
    missingCodes,
    duplicateCodes,
    unexpectedCodes,
    quarterResults,
  };
}

export function assertValidG11GeneralMathDescriptor(
  descriptor: CurriculumDescriptor,
  expectedCodes: readonly string[],
): G11ValidationResult {
  const result = validateG11GeneralMathDescriptor(descriptor, expectedCodes);

  if (result.isValid) {
    return result;
  }

  const quarterFailures = result.quarterResults
    .filter((quarterResult) => !quarterResult.isConsistent)
    .map(
      (quarterResult) =>
        `${quarterResult.quarter}(expected=${quarterResult.expectedHours}, min=${quarterResult.minHours}, max=${quarterResult.maxHours})`,
    );

  const details = [
    result.missingCodes.length > 0 ? `missing=[${result.missingCodes.join(', ')}]` : null,
    result.duplicateCodes.length > 0 ? `duplicates=[${result.duplicateCodes.join(', ')}]` : null,
    result.unexpectedCodes.length > 0 ? `unexpected=[${result.unexpectedCodes.join(', ')}]` : null,
    quarterFailures.length > 0 ? `quarterMismatches=[${quarterFailures.join('; ')}]` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  throw new Error(`G11 curriculum validation failed: ${details}`);
}
