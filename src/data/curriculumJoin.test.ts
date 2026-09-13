import { describe, expect, it } from 'vitest';
import { CURRICULUM_LESSONS } from './curriculum/types';
import { CURRICULUM_MODULE_BLUEPRINTS, getCurriculumModulesForLearner } from './curriculumModules';

/**
 * `CURRICULUM_LESSONS` (authored) and `CURRICULUM_MODULE_BLUEPRINTS` (derivation
 * input) are two hand-maintained lists joined by `competencyCode`. `makeLessons`
 * degrades silently when a code misses — it attaches the module's first source
 * PDF and invents a synthetic `${module.id}-l${n}` id — so these assertions are
 * what keep the join total instead of quietly wrong.
 *
 * This replaces the external `grep` one-liner that used to live in the gates
 * ledger and only checked the moduleId join.
 */
const authoredCodes = CURRICULUM_LESSONS.map((lesson) => lesson.competencyCode);
const blueprintCodes = CURRICULUM_MODULE_BLUEPRINTS.flatMap((module) =>
  module.competencies.map((competency) => competency.code),
);

describe('curriculum competency join', () => {
  it('has no duplicate competency codes on either side', () => {
    expect(new Set(authoredCodes).size).toBe(authoredCodes.length);
    expect(new Set(blueprintCodes).size).toBe(blueprintCodes.length);
  });

  it('resolves every blueprint competency to an authored lesson', () => {
    const authored = new Set(authoredCodes);
    const unresolved = blueprintCodes.filter((code) => !authored.has(code));
    expect(unresolved).toEqual([]);
  });

  it('references every authored lesson from a blueprint', () => {
    const declared = new Set(blueprintCodes);
    const orphaned = authoredCodes.filter((code) => !declared.has(code));
    expect(orphaned).toEqual([]);
  });

  it('gives every runtime lesson an authored id rather than a synthetic fallback', () => {
    const lessonIds = new Set(CURRICULUM_LESSONS.map((lesson) => lesson.lessonId));
    const runtimeLessons = getCurriculumModulesForLearner('Grade 11').flatMap(
      (module) => module.lessons,
    );

    expect(runtimeLessons.length).toBeGreaterThan(0);
    expect(runtimeLessons.map((lesson) => lesson.id).filter((id) => !lessonIds.has(id))).toEqual([]);
  });

  it('attaches each runtime lesson to the source PDF authored for its competency', () => {
    const byCode = new Map(CURRICULUM_LESSONS.map((lesson) => [lesson.competencyCode, lesson]));
    const mismatched = getCurriculumModulesForLearner('Grade 11')
      .flatMap((module) => module.lessons)
      .filter((lesson) => {
        const authored = byCode.get(lesson.competencyCode ?? '');
        return authored === undefined || authored.storagePath !== lesson.storagePath;
      });

    expect(mismatched.map((lesson) => lesson.competencyCode)).toEqual([]);
  });
});
