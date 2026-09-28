# src/data/

## Responsibility
Frontend-owned static learning, assessment, reward, and display datasets plus adapters for curriculum selection.

## Design
`subjects.ts` exports `SHS_MATH_SUBJECTS`, `SUBJECTS_BY_GRADE`, and subject IDs; `curriculumModules.ts` exports `CURRICULUM_MODULE_BLUEPRINTS`, `getCurriculumSubjectsForGrade`, and `getCurriculumModulesForLearner`. Other datasets include `IAR_QUESTION_BLUEPRINT`, `G11_GENERAL_MATH_DESCRIPTOR`, `REWARD_CATALOG`, and `MOCK_INVENTORY`.

## Flow
Hooks/services resolve learner/grade data against the static blueprints, then adapt it for feature use. `curriculumValidation.ts` checks authored curriculum descriptors; reward helpers select date/seed-based rewards.

## Integration
Data contracts align with `types/` and `data/curriculum/`; runtime learner progress and personalized results are loaded through `services/`, not treated as static content.
