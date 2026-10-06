interface SavedLessonSection {
  lastSectionIndex?: number;
}

export function getSavedLessonSectionIndex(
  savedProgress: SavedLessonSection | undefined,
  sectionCount: number,
): number | undefined {
  const sectionIndex = savedProgress?.lastSectionIndex;
  if (sectionCount <= 0 || !Number.isInteger(sectionIndex) || sectionIndex === undefined || sectionIndex < 0) {
    return undefined;
  }

  return Math.min(sectionIndex, sectionCount - 1);
}
