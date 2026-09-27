const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const normalizeCacheText = (value: string): string =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const stableHash = (input: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(36);
};

export const cacheKeys = {
  modules: (gradeLevel: string | null | undefined, priorityTopics: string[] = []) => [
    'modules',
    gradeLevel ?? 'all',
    ...priorityTopics,
  ] as const,
  topicMastery: (teacherId: string, classSectionId?: string | null) => [
    'topic-mastery',
    teacherId,
    classSectionId ?? 'all',
  ] as const,
  masteryHeatmap: () => ['mastery-heatmap'] as const,
  avatarInventory: () => ['avatar-inventory'] as const,
};
