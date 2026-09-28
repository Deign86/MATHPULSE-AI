# src/data/curriculum/

## Responsibility
Canonical frontend curriculum lesson records and lookup/enrichment helpers.

## Design
`types.ts` defines `CurriculumLesson` and `CurriculumModule`, stores `CURRICULUM_LESSONS`, and exports `getLessonById`, `getLessonsByModule`, and `getLessonsBySubject`. `index.ts` exports `buildLessonFromCurriculum` and `enrichLessonWithCurriculum` to adapt records to the application `Lesson` shape.

## Flow
Consumers resolve authored curriculum records by lesson/module/subject ID; the adapter returns a fallback when no lesson exists, or enriches module lesson objects with curriculum fields when found.

## Integration
Curriculum hooks and module data consume these records; the shared `Lesson` contract comes from `data/subjects.ts`. Backend RAG lesson content is requested separately through services.
