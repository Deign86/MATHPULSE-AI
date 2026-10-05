interface TopicMasteryFilterRow {
  topicName: string;
  subjectId: string;
}

export function filterTopicMasteryRows<T extends TopicMasteryFilterRow>(
  topics: T[],
  subjectId: string,
  gradeSubjectIds: string[],
  searchQuery: string,
): T[] {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  return topics.filter((topic) =>
    (subjectId === 'all' || topic.subjectId === subjectId)
    && gradeSubjectIds.includes(topic.subjectId)
    && (!normalizedSearch || topic.topicName.toLocaleLowerCase().includes(normalizedSearch)),
  );
}
