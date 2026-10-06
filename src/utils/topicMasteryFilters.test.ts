import { describe, expect, it } from 'vitest';
import { filterTopicMasteryRows } from './topicMasteryFilters';

describe('filterTopicMasteryRows', () => {
  const topics = [
    { topicName: 'Functions', subjectId: 'gen-math' },
    { topicName: 'Probability', subjectId: 'stats-prob' },
  ];

  it('filters the visible mastery grid by subject and grade-scoped subject IDs', () => {
    expect(filterTopicMasteryRows(topics, 'stats-prob', ['stats-prob'], '')).toEqual([topics[1]]);
    expect(filterTopicMasteryRows(topics, 'all', ['gen-math'], '')).toEqual([topics[0]]);
  });
});
