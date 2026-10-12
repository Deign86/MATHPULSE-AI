import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  docIdFor,
  balanceCorrectIndex,
  filterStructurally,
  isSoleCorrect,
  normalizeStem,
  parseModuleLessons,
  parseStaticBankStems,
  planLessonRequests,
  selectByQuota,
  toBankDoc,
  type Difficulty,
  type SeedQuestion,
} from './seed-quiz-battle-bank.ts';

function question(overrides: Partial<SeedQuestion> = {}): SeedQuestion {
  return {
    moduleId: 'gm-1',
    lessonIndex: 2,
    lessonTitle: 'Operations on Functions',
    difficulty: 'easy',
    stem: 'If f(x) = 2x + 1 and g(x) = x - 3, what is (f + g)(4)?',
    choices: ['8', '9', '10', '12'],
    correctIndex: 1,
    explanation: 'f(4) = 9 and g(4) = 1, so the sum is 10.',
    hint: 'Evaluate each function at 4 first.',
    ...overrides,
  };
}

test('mapped doc satisfies the canonical battle question shape', () => {
  const stamp = { serverTimestamp: true };
  const doc = toBankDoc(question(), 'gen-math', stamp);
  assert.equal(doc.subject, 'gen-math');
  assert.equal(doc.gradeLevel, 11);
  assert.equal(doc.curriculumVersion, 'strengthened');
  assert.equal(doc.curriculumVersionSetId, 'shs-core-v1');
  assert.equal(doc.topic, 'gm-1');
  assert.equal(doc.subtopic, 'Operations on Functions');
  assert.equal(doc.competencyCode, 'gm-1-L3');
  assert.ok(doc.competencyText.length > 0);
  assert.ok(doc.stem.length >= 8);
  assert.equal(doc.questionType, 'multiple_choice');
  assert.equal(doc.choices.length, 4);
  assert.equal(new Set(doc.choices).size, 4);
  assert.equal(doc.correctAnswer, '9');
  assert.ok(doc.choices.includes(doc.correctAnswer));
  assert.deepEqual(doc.tags, ['ai-seeded', 'gm-1']);
  assert.equal(doc.language, 'en');
  assert.equal(doc.isActive, true);
  assert.equal(doc.sourceType, 'reviewed-ai');
  assert.equal(doc.reviewedBy, 'claude-haiku-verifier');
  assert.equal(doc.createdBy, 'seed-script');
  assert.equal(doc.reviewedAt, stamp);
  assert.equal(doc.createdAt, stamp);
  assert.equal(doc.updatedAt, stamp);
});

test('doc id is deterministic per module and stem', () => {
  const id = docIdFor('gm-1', 'What is 2 + 2?');
  assert.match(id, /^ai-gm-1-[0-9a-f]{12}$/);
  assert.equal(id, docIdFor('gm-1', 'What is 2 + 2?'));
  assert.notEqual(id, docIdFor('gm-2', 'What is 2 + 2?'));
});

test('structural filter drops duplicates, bad choices, long stems and static-bank repeats', () => {
  const staticStems = new Set([normalizeStem('Solve for x: 3x - 5 = 16')]);
  const input = [
    question(),
    question({ stem: '  IF f(x) = 2x + 1 and  g(x) = x - 3, what is (f + g)(4)? ' }),
    question({ stem: 'Another valid stem here', choices: ['1', '1', '2', '3'] }),
    question({ stem: 'Third stem with three choices', choices: ['1', '2', '3'] }),
    question({ stem: 'x'.repeat(221) }),
    question({ stem: 'Solve for x: 3x - 5 = 16' }),
    question({ stem: 'Index out of range stem', correctIndex: 4 }),
  ];
  const { kept, dropped } = filterStructurally(input, staticStems);
  assert.equal(kept.length, 1);
  assert.deepEqual(Object.fromEntries(dropped), {
    duplicate_stem: 1,
    duplicate_choices: 1,
    bad_choices: 1,
    stem_too_long: 1,
    duplicate_of_static_bank: 1,
    bad_correct_index: 1,
  });
});

test('lesson plan spreads the quota exactly', () => {
  const plan = planLessonRequests(3, { easy: 11, medium: 12, hard: 11 });
  const total = (difficulty: Difficulty) => plan.reduce((sum, counts) => sum + counts[difficulty], 0);
  assert.deepEqual([total('easy'), total('medium'), total('hard')], [11, 12, 11]);
  assert.deepEqual(planLessonRequests(0, { easy: 1, medium: 1, hard: 1 }), []);
});

test('quota selection interleaves lessons and caps each difficulty', () => {
  const pool = [
    ...[0, 0, 0, 1, 2].map((lessonIndex, index) => question({ lessonIndex, stem: `Easy stem number ${index}` })),
    question({ difficulty: 'hard', stem: 'Only hard stem here' }),
  ];
  const picked = selectByQuota(pool, { easy: 3, medium: 9, hard: 8 });
  assert.deepEqual(picked.filter((entry) => entry.difficulty === 'easy').map((entry) => entry.lessonIndex), [0, 1, 2]);
  assert.equal(picked.filter((entry) => entry.difficulty === 'hard').length, 1);
});

test('real sources parse: every module has lessons and the static bank has prompts', () => {
  const modules = parseModuleLessons(readFileSync(fileURLToPath(new URL('../src/data/subjects.ts', import.meta.url)), 'utf8'));
  assert.deepEqual(modules.map((module) => module.moduleId), ['gm-1', 'gm-2', 'gm-3', 'sp-1', 'sp-2', 'sp-3', 'sp-4']);
  assert.deepEqual(modules.map((module) => module.lessons.length), [10, 6, 5, 3, 3, 4, 4]);
  assert.equal(modules[0].lessons[0], 'Patterns and Real-Life Relationships');
  const staticStems = parseStaticBankStems(readFileSync(fileURLToPath(new URL('../functions/src/triggers/quizBattleApi.ts', import.meta.url)), 'utf8'));
  assert.ok(staticStems.has(normalizeStem('Solve for x: 3x - 5 = 16')));
});

test('balancing moves the correct choice to a rotating slot without losing it', () => {
  const input = Array.from({ length: 8 }, (_, index) => question({ stem: `Balanced stem number ${index}`, correctIndex: index % 2 }));
  const balanced = balanceCorrectIndex(input);
  assert.deepEqual(balanced.map((entry) => entry.correctIndex), [0, 1, 2, 3, 0, 1, 2, 3]);
  balanced.forEach((entry, index) => {
    assert.equal(entry.choices[entry.correctIndex], input[index].choices[input[index].correctIndex]);
    assert.deepEqual([...entry.choices].sort(), [...input[index].choices].sort());
  });
});

test('verifier result must name exactly the generated key', () => {
  assert.equal(isSoleCorrect([2], 2), true);
  assert.equal(isSoleCorrect([], 2), false);
  assert.equal(isSoleCorrect([1], 2), false);
  assert.equal(isSoleCorrect([1, 2], 2), false);
});
