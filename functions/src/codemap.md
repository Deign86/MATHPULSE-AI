# functions/src/

## Responsibility
Implementation root: initializes Admin and composes the automation, configuration, notification, scoring, service, trigger, and utility modules.

## Design
`index.ts` is the deployment export surface; `firestoreRules.test.ts` checks adjacent Firestore access contracts. Domain logic is separated by subfolder.

## Flow
Firestore/HTTP/scheduled event → `triggers/*` or `notifications/index.ts` → `automations/*` and services/utilities → Firestore/RTDB/FCM.

## Integration
Exports include `onStudentCreated`, `onDiagnosticComplete`, `onQuizSubmitted`, `onAttendanceUpdate`, `onContentUpdated`, profile/reassessment and WRI handlers, manual callables, Quiz Battle callables/sweep, and push triggers. Main collections: `users`, `diagnosticResults`, `quizResults`, `attendance`, `curriculumContent`, `quizBattleMatches`, `notifications`.
