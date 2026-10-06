export function buildLessonCompletionActivity(
  studentName: string,
  lrn: string,
  classroomId: string,
  lessonId: string,
) {
  return {
    lrn,
    studentName,
    action: 'completed a lesson',
    topic: lessonId,
    classroomId,
    type: 'success' as const,
  };
}
