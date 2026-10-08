# Gates: lane i

Scope: Fix issues #272 #227 #228 #215 #273 #230 #231 #229 #304 (AI Chat, diagnostic assessment, avatar studio) with the smallest root-cause change each; untag their known-bug e2e tests; no backend changes. Vitest CHECKs use `vitest.lane-i.config.ts`, an uncommitted worktree-only shim that only adds `server.fs.allow` for the junctioned node_modules.

- [x] G272: Chat auto-titles match whole words, so "using fractions" is no longer "Trigonometry Help".
  CHECK: npx vitest run src/contexts/ChatContext.test.ts -t "inside other words"
  EXPECT: /Tests\s+1 passed/
  EVIDENCE: Start at  21:28:42 | Duration  4.15s (transform 1.79s, setup 2.10s, import 443ms, tests 7ms, environment 1.39s)

- [x] G227: A welcome-only session is titled "New Chat".
  CHECK: npx vitest run src/contexts/ChatContext.test.ts -t "New Chat"
  EXPECT: /Tests\s+1 passed/
  EVIDENCE: Start at  21:28:49 | Duration  3.43s (transform 1.50s, setup 1.63s, import 524ms, tests 18ms, environment 1.04s)

- [x] G228: Explore Topics cards send through handleSendMessage only, which creates the single session.
  CHECK: grep -c "createNewSession()" src/components/AIChatPage.tsx
  EXPECT: 1
  EVIDENCE: 1

- [x] G215: Every quick-prompt chip prompt passes the math scope boundary check.
  CHECK: npx vitest run src/components/AIChatPage.test.tsx -t "quick-prompt"
  EXPECT: /Tests\s+4 passed/
  EVIDENCE: Start at  21:28:55 | Duration  8.14s (transform 2.92s, setup 2.99s, import 3.65s, tests 9ms, environment 1.27s)

- [x] G273: The hub no longer claims the diagnostic is auto-saved (resume has no reader for the checkpoint) and its duration matches the modal.
  CHECK: grep -c "auto-saved\|About 10 minutes" src/components/assessment/AssessmentHub.tsx
  EXPECT: 0
  EVIDENCE: 0

- [x] G230: Diagnostic generation waits the advertised 90 s in one request and does not retry after a timeout.
  CHECK: npx vitest run src/services/diagnosticService.test.ts
  EXPECT: /Tests\s+1 passed/
  EVIDENCE: Start at  21:29:05 | Duration  2.02s (transform 1.15s, setup 1.50s, import 264ms, tests 8ms, environment 0ms)

- [x] G231: A practice topic/subject hint in sessionStorage preselects that focus in the Practice Center; unmatched hints are ignored.
  CHECK: npx vitest run src/components/PracticeCenter.test.tsx
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  21:29:10 | Duration  10.38s (transform 1.78s, setup 1.81s, import 2.48s, tests 4.51s, environment 1.40s)

- [x] G229: Breakdown practice/lesson links call onClose before dispatching navigation, so the Modules tab update wins the batch.
  CHECK: grep -A1 "^    onClose();" src/components/assessment/DiagnosticBreakdown.tsx | grep -c "mathpulse:navigate"
  EXPECT: 2
  EVIDENCE: 2

- [x] G304: Equipping during a preview restores and builds the next outfit from the pre-preview layers.
  CHECK: grep -c "previewTimer ? preEquipRef.current : equipped" src/components/AvatarShop.tsx
  EXPECT: 1
  EVIDENCE: 1

- [x] G-E2E: known-bug tags removed from the e2e tests of fixed issues (ai-chat phone chat, iar-states x2, avatar crown preview); the remaining avatar-studio tag is an unrelated Alt+D test.
  CHECK: grep -c "known-bug" tests/e2e/learning/ai-chat.e2e.ts tests/e2e/assessment/iar-states.e2e.ts tests/e2e/student/avatar-studio.e2e.ts
  EXPECT: /ai-chat\.e2e\.ts:0[\s\S]*iar-states\.e2e\.ts:0[\s\S]*avatar-studio\.e2e\.ts:1/
  EVIDENCE: tests/e2e/assessment/iar-states.e2e.ts:0 | tests/e2e/student/avatar-studio.e2e.ts:1

- [x] G-TSC: TypeScript passes.
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK

- [x] G-LINT: ESLint passes on src.
  CHECK: npx eslint src --ext .ts,.tsx --max-warnings=0 && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: (node:29400) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead. | (Use `node --trace-deprecation ...` to show where the warning was created)

- [x] G-OX: oxlint anti-slop passes.
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\APG\Downloads\MATHPULSE-AI\.worktrees\lane-i\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)

- [x] G-VITEST: Vitest suites touching changed files pass.
  CHECK: npx vitest run src/contexts src/services/diagnosticService.test.ts src/components/AIChatPage.test.tsx src/components/PracticeCenter.test.tsx src/components/AvatarShop.test.tsx src/components/assessment src/utils/mathScope.test.ts
  EXPECT: /Test Files\s+\d+ passed \(\d+\)\s+Tests\s+\d+ passed/
  EVIDENCE: Start at  21:30:38 | Duration  20.38s (transform 31.53s, setup 55.69s, import 51.20s, tests 8.89s, environment 37.31s)
