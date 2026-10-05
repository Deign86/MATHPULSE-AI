# TCH-054 trusted quiz-completion notifications

- [ ] Server-side fan-out resolves teacher recipients from trusted enrollment or assignment data for both assigned and lesson quizzes; client-selected recipients are ignored.
  CHECK: cd functions && npm test
  EXPECT: notification contract tests pass for both quiz categories and forged teacher IDs cannot receive notifications.
  EVIDENCE: implementation and contract tests added, but Functions build/test could not complete because dependencies are unavailable and the machine-wide slot was occupied.
- [x] Backend quiz-completion hook emits the Firestore event consumed by the trusted trigger. Evidence: `src/services/quizService.ts` records assignment ID in the `quizSubmissions` completion document; `npm run typecheck` passed.
  CHECK: npm run typecheck
  EXPECT: frontend TypeScript typecheck passes.
- [x] Teacher inbox/activity reader accepts teacher quiz-completion notifications without weakening user scoping. Evidence: targeted Vitest passed (1 file, 14 tests); auth UID scoping remains in `notificationFirestoreService`.
  CHECK: npx vitest run src/features/notifications/notificationFirestoreService.test.ts
  EXPECT: targeted inbox reader tests pass, including teacher activity notice mapping and auth scoping.
- [ ] Functions compile and all Functions contracts pass.
  CHECK: cd functions && npm run build && npm test
  EXPECT: Functions build and tests pass; if pre-existing sendPush.ts type errors block, only trigger-related imports/types are adjusted.
  EVIDENCE: `npm run build` failed with unresolved Firebase/Node modules and pre-existing `sendPush.ts` type errors; `npm test` was cancelled while waiting for the machine-wide slot.

## Verification ledger

- `npm run typecheck`: PASS.
- `npx vitest run src/features/notifications/notificationFirestoreService.test.ts`: PASS, 14/14.
- `functions/npm run build`: BLOCKED by unresolved `firebase-admin` / `firebase-functions` modules and existing build errors including `src/utils/sendPush.ts`.
- `functions/npm test`: BLOCKED; cancelled while waiting for the machine-wide slot.
- `gate-check.mjs gates/group-notify.md`: BLOCKED; checker ran unrelated root `GATES.md` checks and reported existing TC-TCH-045 failure.
