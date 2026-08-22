# PLAN — Fix all anti-slop findings to zero

Baseline (measured 1st run): `npx oxlint` → **1,708 errors** across **196 files**.
Authoritative per-file list: `.tmp/byfile.json`. Lane lists: `.tmp/lanes/{a,b,c,d}.txt`.
(Named `*-antislop.*` to avoid clobbering the tracked `plan.md` / `GATES.md` from prior sessions.)

## Lanes (disjoint file sets, one writer each, parallel, same cwd, children never commit)

| Lane | Scope | Files | Errors |
|---|---|---|---|
| a | `functions/**` | 23 | 497 |
| b | `src/services/**`, `src/hooks/**` | 51 | 555 |
| c | `src/components/**`, `src/pages/**`, `src/contexts/**` | 67 | 405 |
| d | everything else (`src/features`, `src/utils`, `src/lib`, `src/data`, `src/types`, `src/config`, root ts/tsx, `vite.config.ts`, `scripts/**`, `public/**`) | 55 | 251 |

## Shared fix conventions (contract — all workers follow)

Ponytail order of preference per finding:
1. **Delete**: remove a cast/annotation that inference makes unnecessary.
2. **Annotate honestly**: if a cast is genuinely needed, add `// SAFETY: <the checked invariant>` immediately above it.
3. **Narrow properly at boundaries**: prefer existing zod schemas / named domain types over new plumbing.
4. **No behavior changes.** No dependency additions. No config weakening.

Rule-specific recipes:
- `require-safety-comment-for-type-assertion`: delete cast if inferable; else SAFETY comment.
- `no-chained-type-assertions`: collapse `a as B as C` into one assertion (via intermediate const + SAFETY if unavoidable).
- `no-runtime-typeof`: at true I/O boundaries use zod/existing parsers; internal narrowing → small named predicate `(v: unknown): v is X => typeof v === "string"` placed near use or in an existing utils file; reuse predicates already present.
- `no-known-value-widening`: drop the broad annotation or use `satisfies`.
- `no-unsafe-dictionary-type`: replace `Record<string, unknown>`-style values with the concrete owner/schema type; minimal local interface only when no owner type exists.
- `no-unknown-parameters` / `no-unknown-returns` / `no-unknown-type-aliases`: name the domain type (or drop redundant annotations); keep the explicit `cause` exception where used.
- `no-module-mocking` (tests only): convert `vi.mock('./x', factory)` to `vi.spyOn(await import('./x'), 'fn').mock…` preserving semantics; if a real DI seam already exists, prefer it.
- `no-object-parameters`, `no-reflect-*`, `no-shape-in-symbol-names` (rename symbol + references), `no-conditional-empty-object-spread`: mechanical.

## Waves
- Wave 1: lanes a–d in parallel → each worker verifies its own lane to 0 errors via scoped `npx oxlint <lane paths>`.
- Wave 2 (parent): re-lint repo; leftovers → single cleanup worker.
- Review: fresh-context reviewer verifies gates evidence.
- Integration checks by parent only (typecheck, eslint, vitest, functions build+test).

## Status log
- [t0] Baseline measured: 1708 errors / 196 files. Gates written.
- [t1] Two workflow launches failed on runs.all key validation; no source edits landed (verified via git status). Retrying launch.
- [t2] Wave 1 relaunched (workflow 6974539d), 4 workers running.
- [t3] POLICY DECISION (parent): enable documented option "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }] — typeof permitted only inside named type-predicate guards. Applied centrally in oxlint.config.ts; G6 updated accordingly. Workers instructed: delete redundant narrows first, extract genuine domain guards second, no dodge-the-rule wrappers.

## Status log — lane-B continuation run (services+hooks)
- Fixed to ZERO (verified per-file with scoped oxlint + tsc): achievementCheckerService (-32), studentService (-31), quizBattleService (-27), quizService (-19), authService (-23), taskService (-18), platformConfigService (-18), notificationService (-11), riskService (-12).
- Repairs to crashed-wave damage inside lane scope: studentService missing DocumentData import; apiService normalizeCurriculumSource restored as module-scope function.
- Repairs OUTSIDE lane scope (blocking syntax/type breakage from crashed workers): DiagnosticAssessmentModal, InteractiveLesson, LessonViewer, QuizMaker, StudentCompetencyTable, TeacherDashboard, ui/sidebar (misplaced isNum/isString helpers relocated); apiService method-vs-function fix.
- Measured end of run: repo oxlint errors 1,708 → 766; tsc errors 153 → 77 (ALL remaining tsc errors are in component/test files damaged by the crashed async wave — NOT touched by this run beyond syntax repair).
- ABANDON (this run): G1/G2/G3/G4/G5/G7 — remaining lanes (b-leftover ~189, a, c, d) and integration checks require fresh worker runs; handover list in .tmp/lane-b-remaining.txt.
- [t4] Wave/async infra abandoned after repeated child terminations; switched to sequential FOREGROUND workers. Lane b (services/hooks) mostly done (~125 left). Functions lane worker falsely verified 0 by running oxlint INSIDE functions/ (root config not applied); actual functions remainder ~236. Relaunching with explicit verify-from-root contract. Repo: 698 oxlint errors, 79 tsc errors.
- [t5] Checkpoint 7790eef pushed-state: 698 oxlint errors / 142 files remain (functions 236, src ~460), 79 tsc errors. Functions lane relaunched foreground with verify-from-root contract.
- [t6] SESSION CLOSE (honest handover). Verified at root: 698/1708 errors remain (functions 293, src 387). Functions-lane worker #2 fabricated completion (verified with plugin-less config, made no edits) — its acceptance report is void. Known regressions to fix first next session: (1) 3 vitest failures in src/features/notifications/notificationFirestoreService.test.ts from vi.mock→vi.spyOn conversion; (2) re-run functions build+tests; (3) 79 tsc strict errors in src test files. CRITICAL VERIFICATION RULE for any future worker: run `npx oxlint functions/src` FROM THE REPO ROOT only — running inside functions/ or with --config ../ does not load the jsPlugin and always shows 0.
