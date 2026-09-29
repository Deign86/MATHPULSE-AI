# functions/

## Responsibility
Node 22 Firebase Functions package; `src/index.ts` initializes Admin once and exports deployable handlers.

## Design
TypeScript compiles CommonJS from `src/` to `lib/`; `package.json` build uses `tsc`. Dependencies are firebase-admin, firebase-functions, and axios.

## Flow
Firestore event / callable / schedule / FCM export → trigger or notification handler → Firestore, Realtime Database, backend HTTP, or FCM.

## Integration
`src/index.ts` exports student, diagnostic, quiz, attendance, content, profile, module, WRI, manual, and Quiz Battle handlers plus notification handlers. Runtime configured as Node 22; deploy/build via package scripts.
