# Grade-11 All-Subjects Unlock — Changes & Findings

Branch: `grade11-all-subjects-unlock` | Date: 2026-09-11 | Status: implemented, verified e2e, unmerged

## Goal
New Grade 11 modules render 1:1 with existing UI/UX, all locks removed, all subjects included, Grade-11-only, lesson content derivable from PDFs.

## Changes (36 files)

### Unlock + all-subjects frontend (parent)
- `src/data/curriculumModules.ts` — 20 blueprints (14 gen-math + 6 new: gm-q2-compound-interest, gm-q2-annuities, bm-q1-business-math, stat-q1-probability, fm-q1/fm-q2-finite-math); `makeQuizzes` forces `locked:false`; `getCurriculumModulesForLearner` forces `isAvailable:true`/`moduleStatus:'available'`; added `finite-math` subject id/meta/defaults/normalizer; lesson duration fixed `22 min`
- `src/data/subjects.ts` — added `business-math` + `finite-math` entries/topics; `SubjectId` 4-union; active ids 4; flipped `gm-3-q2`/`sp-4-q2` `locked:true`→`false`
- `src/data/curriculum/types.ts` — `GradeLevel` = `'Grade 11'` only
- `src/components/QuizMaker.tsx` — Grade-11-only (levels, normalizer, fallback topics, category prefixes)
- `src/data/curriculumTemplates.ts` — removed Grade-12 inferred template
- `src/types/assessment.ts` — all 8 categories for Grade 11; comments fixed
- `src/components/LessonViewer.tsx` — NEW `PdfFallbackPanel`: on RAG failure renders the DepEd source PDF in-iframe (header + retry + new-tab link) instead of dead error
- `src/data/iarBlueprint.ts` — version id `...-g12-candidate-shortform` → `...-g11-shortform`
- `GATES.md` — restored file (was accidentally overwritten mid-session) + appended Section D gates D1–D6, all checked

### Backend + functions Grade-12 removal (worker `3a6d4358`)
- `backend/services/curriculum_service.py` — deleted pre-calc/basic-calc fallback subjects
- `backend/main.py` — removed Grade-12 strand lists, MATH_TOPICS key, pre-calc/calc topics; 12-inputs resolve to Grade 11
- `backend/routes/curriculum_routes.py` — `valid_grades={"Grade 11"}`; `diagnostic.py` — Grade-11-only description
- `functions/.../backfillCurriculumVersion.ts`, `diagnosticProcessor.ts` (gate always open), `diagnosticPolicies.ts`, `learningPathEngine.ts`, `runtimeChecks.ts`, `constants.ts`, `quizBattleApi.ts`

### P1 remainder sweep (worker `ecd1f633`, interrupted after landing)
- `src/config/subjects.ts`, `AdminPriorityModules`, `MasteryHeatmap`, `TopicMasteryView`, `QuizExperience`, `SupplementalBanner`, `lessonQuizService`, `useSubjectAvailability` (comment), `platformConfigService` (defaults = 4×`available:true`), `LayoutDiagram.md` (counts), `youtube_service` (Grade 11 default), `constants.ts`, `iarAssessmentScoring.ts`, quiz/rag/deepseek route defaults

## Verification evidence
- `npx tsc --noEmit` clean; `npx vitest run` 27 files/179 tests pass; `npx oxlint --quiet` exit 0; `gate-check.mjs GATES.md` 37 met; final reviewer verdict OK (P2s only)
- Chrome DevTools e2e: 20 unlocked cards, 4-subject + 20-group filters, search narrows correctly, 5 detail views (GenMath/Finite/StatsProb/BizMath/Annuities), PDF fallback renders real Storage PDF (screenshot), Practice + Recommended tabs clean, full quiz answered Q1→Q2 with live AI questions (screenshot)
- `git diff` contains no `chroma.sqlite3`, `package-lock.json`, `__pycache__`, binaries

## Findings (for next session)
1. **RAG lesson 422 (pre-existing, remote backend)**: POST `/api/rag/lesson` via HF Space `deign86-mathpulse-api-v3test` returns 422 for gen-math too — unchanged request shape, so not caused by this work. PDF fallback covers UX. Fix = update/redeploy backend or run local backend.
2. **`toMillis` console noise (pre-existing)**: `platformConfigService` chokes on stored Firestore `updatedAt` shape, falls back to unlocked defaults. Zero user impact; fix = harden `firestoreToDate`.
3. **Total Grade-12 purge PENDING (user-approved)**: reviewer-blocked leftovers were swept except deep `g12*` data keys (`g12Readiness`, `G12Candidate`, `grade12TransitionGate`, `g12-*` topic aliases, `migrate_grade12_to_grade11.py`, `main.py` intent keywords). A purge worker failed without edits (`ea3c2181` — returned plan, no changes). Next: re-run total purge with legacy-read normalization so stored Firestore records still match.
4. **`types.ts` full-file diff is CRLF noise** — only real change is line 1 (`GradeLevel`). Commit normalizes it.
5. Quiz Battle still lists pre-calc/basic-calc IDs in static bank — covered by purge item 3.
