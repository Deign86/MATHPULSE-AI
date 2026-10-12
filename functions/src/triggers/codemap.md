# functions/src/triggers/

## Responsibility
Adapts Firestore events, schedules, and HTTPS callables into automation and Quiz Battle operations.

## Design
Small collection triggers validate event payloads and delegate. `quizBattleApi.ts` contains authenticated transactional queue, room, match, submission, timer, AI question-generation, and finalization handlers; `manualTriggers.ts` guards operator-driven reruns.
Quiz Battle question generation tries the FastAPI question bank first, then calls Claude (`claude-haiku-5-5` by default) through `@anthropic-ai/sdk` structured outputs (`output_config.format`, no sampling parameters). `generateAiQuestionSet` owns retry/backoff (SDK `maxRetries: 0`): 408/409/429/5xx, timeouts and malformed replies retry; other 4xx fail fast. Tests inject the `invokeRequest` seam with Claude-shaped replies.
`onQuizSubmitted` is a Firestore 2nd-gen trigger (`onDocumentCreatedWithAuthContext` from `firebase-functions/v2/firestore`): it deploys through EventArc, so the project needs the EventArc API plus pubsub/run/eventarc IAM service-agent bindings (project-owner action; deploy fails without them).

## Flow
Firestore event / callable / scheduler → named trigger or callable → automation/scoring/service helper → Firestore; Quiz Battle additionally updates RTDB presence and persists match scoring. `runWriBatchRecalc` and matchmaking sweep scan on schedule.

## Integration
Triggers: `onStudentCreated`, `onStudentProfileUpdated`, `onDiagnosticComplete`, `onQuizSubmitted`, `onAttendanceUpdate`, `onContentUpdated`, `onModuleStatusUpdate`, `onActivityScoreWritten`, `onExternalGradeWritten`, `runWriBatchRecalc`; callables `manualProcessStudent`, `manualProcessQuiz`, `manualBackfillCurriculumVersion`, `manualRequestReassessment`, Quiz Battle `quizBattleJoinQueue`, `quizBattleLeaveQueue`, `quizBattleCreatePrivateRoom`, `quizBattleJoinPrivateRoom`, `quizBattleLeavePrivateRoom`, `quizBattleGetPrivateRoomState`, `quizBattleCreateBotMatch`, `quizBattleStartMatch`, `quizBattleGetMatchState`, `quizBattleGetGenerationAudit`, `quizBattleSubmitAnswer`, `quizBattleRequestRematch`, `quizBattleHeartbeat`, `quizBattleResumeSession`; scheduler `quizBattleResolvePublicMatchmakingSweep`. Collections include `users`, `diagnosticResults`, `quizResults`, `attendance`, `curriculumContent`, `modules`, `managedStudents/activityScores`, `managedStudents/externalGrades`, `quizBattleQueue`, `quizBattleRooms`, `quizBattleMatches`, and question-bank collection (default `quizBattleQuestionBank`); presence is RTDB `quizBattlePresence`.
