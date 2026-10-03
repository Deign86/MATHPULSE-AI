# functions/

## Responsibility
Node 22 Firebase Functions package; `src/index.ts` initializes Admin once and exports deployable handlers.

## Design
TypeScript compiles CommonJS from `src/` to `lib/`; `package.json` build uses `tsc`. Dependencies are firebase-admin, firebase-functions, and axios.
`onQuizSubmitted` is a Firestore 2nd-gen trigger (`firebase-functions/v2/firestore`): deploying it requires the EventArc API plus pubsub/run/eventarc IAM bindings for the project service agents — a project-owner action, not code (see deploy workflow).
Emulator-gated tests (`*.emulator.test.ts`, `realtimeDatabaseRules.test.ts`) assert the `demo-mathpulse` project identity and SKIP when it is absent, so `npm test` passes both under emulators (PR CI) and without them (deploy validation). Never run these tests against a non-demo project.

## Flow
Firestore event / callable / schedule / FCM export → trigger or notification handler → Firestore, Realtime Database, backend HTTP, or FCM.

## Integration
`src/index.ts` exports student, diagnostic, quiz, attendance, content, profile, module, WRI, manual, and Quiz Battle handlers plus notification handlers. Runtime configured as Node 22; deploy/build via package scripts.
