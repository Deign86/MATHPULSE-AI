# Gates: PASTE-P2 Wave-1 Merrill MicroLesson deck

Scope: Add the isolated MicroLesson card/deck/test files with typed Merrill phases, accessible dot navigation, KaTeX, and Quiz Battle routing without editing `LessonViewer.tsx`.

- [x] G1: The focused MicroLesson test suite fails before the components exist (TDD RED)
  CHECK: npm run test -- src/components/notebook/MicroLessonDeck.test.tsx
  EXPECT: /FAIL|Cannot find module|failed/
  EVIDENCE: ❯ loadAndTransform node_modules/vite/dist/node/chunks/dep-Dq2t6Dq0.js:35740:27 | ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

- [x] G2: The focused MicroLesson test suite passes after implementation
  CHECK: npm run test -- src/components/notebook/MicroLessonDeck.test.tsx
  EXPECT: /Tests.*passed|Test Files.*passed/
  EVIDENCE: Start at  09:26:43 | Duration  20.53s (transform 4.58s, setup 5.33s, import 8.49s, tests 5.16s, environment 1.23s)

- [x] G3: Oxlint reports no findings for the three new source files
  CHECK: npx oxlint --quiet src/components/notebook/MicroLessonCard.tsx src/components/notebook/MicroLessonDeck.tsx src/components/notebook/MicroLessonDeck.test.tsx && node -e "console.log('oxlint clean')"
  EXPECT: oxlint clean
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\APG\Downloads\MATHPULSE-AI\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)

- [x] G4: TypeScript type checking passes for the repository
  CHECK: npm run typecheck && node -e "console.log('typecheck clean')"
  EXPECT: typecheck clean
  EVIDENCE: > tsc --noEmit | typecheck clean

- [x] G5: The production frontend build passes
  CHECK: npm run build && node -e "console.log('build clean')"
  EXPECT: build clean
  EVIDENCE: - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks | - Adjust chunk size limit for this warning via build.chunkSizeWarni

- [x] G6: `LessonViewer.tsx` remains untouched by this task
  CHECK: node -e "const fs=require('node:fs'); const crypto=require('node:crypto'); const current=crypto.createHash('sha256').update(fs.readFileSync('src/components/LessonViewer.tsx')).digest('hex'); const baseline=fs.readFileSync('.omo/evidence/paste-p2-wave1/task-5-lessonviewer-before.sha256','utf8').trim(); console.log(current===baseline?'LessonViewer untouched':'LessonViewer changed'); if(current!==baseline) process.exitCode=1;"
  EXPECT: LessonViewer untouched
  EVIDENCE: LessonViewer untouched

- [x] G7: Desktop and 375px browser screenshots show the deck without horizontal overflow and include visual evidence paths
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-5-desktop.png`, `task-5-desktop-snapshot.txt`, `task-5-mobile-integration.png`, and `task-5-mobile-snapshot.txt`; browser measurements reported no horizontal overflow at desktop or 375px.

## PASTE-P2 Wave-1 — Honest XP Engine (Task 2)

- [x] T2-G1: Protected legacy services remain unchanged.
  CHECK: git diff --quiet -- src/services/progressService.ts src/services/gamificationService.ts src/services/dailyRewardService.ts; if ($?) { 'PROTECTED_UNCHANGED' }
  EXPECT: PROTECTED_UNCHANGED
  EVIDENCE: .omo/evidence/paste-p2-wave1/task-2-retry-protected.log

- [x] T2-G2: Honest XP formula and learning-event idempotency tests pass.
  CHECK: npm run test -- --run src/services/__tests__/honestXp.test.ts
  EXPECT: Tests  8 passed
  EVIDENCE: .omo/evidence/paste-p2-wave1/task-2-retry-improved-green.log

- [x] T2-G3: The additive TypeScript files compile under the project’s strict settings.
  CHECK: npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --types vitest/globals,vite/client src/services/honestXp.ts src/services/learningEventsService.ts src/services/__tests__/honestXp.test.ts; if ($?) { 'TARGETED_TYPECHECK_PASSED' }
  EXPECT: TARGETED_TYPECHECK_PASSED
  EVIDENCE: .omo/evidence/paste-p2-wave1/task-2-retry-improved-typecheck.log

- [x] T2-G4: Anti-slop Oxlint passes.
  CHECK: npx oxlint --quiet src/services/honestXp.ts src/services/learningEventsService.ts src/services/__tests__/honestXp.test.ts; if ($?) { 'ANTI_SLOP_PASSED' }
  EXPECT: ANTI_SLOP_PASSED
  EVIDENCE: .omo/evidence/paste-p2-wave1/task-2-retry-improved-oxlint.log

- [ ] T2-G5: Language-server diagnostics are clean for the modified TypeScript files.
  EVIDENCE: pending

- [x] T2-G6: The task-local gate checker records all applicable evidence.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs .omo/evidence/paste-p2-wave1/task-2-gates.md
  EXPECT: ALL MET
  EVIDENCE: C:\Users\APG\Downloads\MATHPULSE-AI\GATES.md: 25 gates | ALL MET (22 met, 3 abandoned)

ABANDON: T2-G5 TypeScript LSP server is not installed and the existing user preference declines installation; targeted tsc validation is recorded instead.

## PASTE-P2 Wave-1 — Unlock Gate (Task 1 Retry)

- [x] T1-G1: The reused unlock-gate test file was executed before implementation changes.
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-1-retry-red.log` records the pre-existing partial implementation passing 9 tests.

- [x] T1-G2: The focused unlock-gate test suite passes.
  CHECK: npx vitest run src/services/__tests__/unlockGate.test.ts
  EXPECT: /Test Files  1 passed|Tests  9 passed/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-1-retry-green.log`

- [x] T1-G3: The new unlock-gate files pass targeted TypeScript checking.
  CHECK: npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --types vitest/globals,vite/client src/services/unlockGate.ts src/services/__tests__/unlockGate.test.ts
  EXPECT: exit code 0
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-1-retry-tsc.log`

- [x] T1-G4: Oxlint reports no findings for the new unlock-gate files.
  CHECK: npx oxlint --quiet src/services/unlockGate.ts src/services/__tests__/unlockGate.test.ts
  EXPECT: exit code 0
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-1-retry-oxlint.log`

- [ ] T1-G5: Language-server diagnostics are clean for the new unlock-gate files.
  EVIDENCE: `lsp_diagnostics` was invoked for both files; the TypeScript server is not installed and installation was previously declined.

- [x] T1-G6: Task-local gate checking records all unlock-gate evidence.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs .omo/evidence/paste-p2-wave1/task-1-gates.md
  EXPECT: /ALL MET/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-1-gate-check.log`

ABANDON: T1-G5 The TypeScript LSP server is not installed and the existing user preference declines installation; targeted tsc validation is recorded instead.

## PASTE-P2 Wave-2 — Wiring (Task 6)

Scope: Wire the existing Wave-1 unlock selector, MicroLessonDeck, and honest-XP exports at their existing frontend call sites. Preserve `PdfFallbackPanel`, `SECTION_TABS`, legacy `completeLesson` defaults, locked/available defaults for legacy module callers, shelved subject locks, and all unrelated worktree changes.

- [x] T6-G1: Unlock matrix covers 74% locked, 75% open, and shelved subjects locked.
  CHECK: npx vitest run src/services/__tests__/unlockGate.test.ts
  EXPECT: /Test Files  1 passed|Tests.*passed/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-unlock.log`

- [x] T6-G2: Focused UI matrix covers deck-present cards and RAG-failure PDF fallback.
  CHECK: npx vitest run src/components/notebook/MicroLessonDeck.test.tsx src/components/__tests__/LessonViewerGrounding.test.tsx src/components/ModulesPage.test.tsx
  EXPECT: /Test Files.*passed|Tests.*passed/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-ui.log`

- [x] T6-G3: Targeted TypeScript checking passes for the Wave-2 wiring and matrix tests.
  CHECK: node -e "const fs=require('node:fs'); const text=fs.readFileSync('.omo/evidence/paste-p2-wave1/task-6-typecheck.log','utf8'); if (!text.includes('EXIT_CODE: 0')) process.exit(1); console.log('targeted typecheck evidence verified')"
  EXPECT: /targeted typecheck evidence verified/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-typecheck.log`

- [x] T6-G4: Oxlint reports no findings for the changed wiring and focused tests.
  CHECK: npx oxlint --quiet src/components/ModulesPage.tsx src/components/LessonViewer.tsx src/components/ModuleDetailView.tsx src/components/notebook/MicroLessonDeck.tsx src/components/notebook/MicroLessonDeck.test.tsx src/components/__tests__/LessonViewerGrounding.test.tsx src/components/ModulesPage.test.tsx src/services/unlockGate.ts src/services/__tests__/unlockGate.test.ts
  EXPECT: exit code 0
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-oxlint.log`

- [ ] T6-G5: Language-server diagnostics were invoked for every edited source/test file.
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-diagnostics.log`; TypeScript LSP is not installed and installation was previously declined.

- [x] T6-G6: Task-local gate checking records the Wave-2 evidence.
  CHECK: node .agents/skills/unlazy/scripts/gate-check.mjs .omo/evidence/paste-p2-wave1/task-6-gates.md
  EXPECT: /ALL MET/
  EVIDENCE: `.omo/evidence/paste-p2-wave1/task-6-gate-check.log`

ABANDON: T6-G5 The TypeScript LSP server is not installed and the existing user preference declines installation; scoped tsc validation is recorded instead.
