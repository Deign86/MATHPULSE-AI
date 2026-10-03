# Lane D — Cloud Functions and regression hotspots

Scope: Add regression tests only; production code remains read-only.

- [x] D1: Add at least 10 new regression test files across the requested Cloud Functions, frontend services, risk engine, and notification mark-all-as-read hotspots.
  CHECK: node -e "const fs=require('node:fs');const files=['functions/src/triggers/onStudentCreated.regression.test.ts','functions/src/triggers/onDiagnosticComplete.regression.test.ts','functions/src/triggers/onQuizSubmitted.regression.test.ts','functions/src/triggers/riskTriggers.regression.test.ts','functions/src/triggers/quizBattleSubmit.regression.test.ts','functions/src/triggers/quizBattleLifecycle.regression.test.ts','functions/src/notifications/index.regression.test.ts','src/services/__tests__/regression.apiServiceTransport.test.ts','src/services/__tests__/regression.quizBattleSubmit.test.ts','src/services/__tests__/regression.lessonQuizService.test.ts','src/services/__tests__/regression.honestXp.test.ts','src/services/__tests__/regression.unlockGate.test.ts','src/utils/riskEngine.regression.test.ts','src/features/notifications/notificationMarkAllAsRead.regression.test.ts'];const count=files.filter(fs.existsSync).length;console.log(count);if(count<10)process.exit(1)"
  EXPECT: /^(1[0-9]|[2-9][0-9]+)$/
  EVIDENCE: `14` lane-owned regression test files exist.

- [x] D2: Newly added Cloud Functions regression tests pass.
  CHECK: node --test --test-name-pattern="student creation|diagnostic completion|quiz mastery|WRI recalculation|answer choice shuffling|heartbeat, forfeit, and rematch|teacher notification authorization fails closed" "functions/lib/**/*.test.js"
  EXPECT: /# fail 0/
  EVIDENCE: Functions TypeScript build passed; targeted Node run completed 21 suites with 0 failures, including the new student creation, diagnostic, mastery/XP identity, WRI, battle submit/lifecycle, and notification cases.

- [x] D3: Newly added frontend regression tests pass.
  CHECK: npm run test -- src/services/__tests__/regression.apiServiceTransport.test.ts src/services/__tests__/regression.quizBattleSubmit.test.ts src/services/__tests__/regression.lessonQuizService.test.ts src/services/__tests__/regression.honestXp.test.ts src/services/__tests__/regression.unlockGate.test.ts src/utils/riskEngine.regression.test.ts src/features/notifications/notificationMarkAllAsRead.regression.test.ts
  EXPECT: /passed|Tests:.*passed/
  EVIDENCE: `npm run test` passed 7 files and 16 tests.
