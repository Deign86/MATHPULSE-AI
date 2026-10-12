import { describe, expect, it } from 'vitest';
import { getCurriculumModulesForLearner } from './curriculumModules';

const gradeElevenModules = getCurriculumModulesForLearner('Grade 11');
const quizTitles = gradeElevenModules.flatMap((module) => module.quizzes.map((quiz) => quiz.title));

describe('generated quiz titles', () => {
  it('has quizzes to check', () => {
    expect(quizTitles.length).toBeGreaterThan(0);
  });

  it('never glue two competency sentences together as "<sentence>. and <Sentence>"', () => {
    expect(quizTitles.filter((title) => /\.\s+and\s/i.test(title))).toEqual([]);
  });

  it('does not end a title with the competency sentence\'s full stop', () => {
    expect(quizTitles.filter((title) => title.endsWith('.'))).toEqual([]);
  });

  it('joins the two business-finance competencies with a clean separator', () => {
    expect(quizTitles).toContain(
      'Represent business transactions and financial goals using variables and equations; Analyze financial options using ratio, percent change, and margin reasoning',
    );
  });
});
