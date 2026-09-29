# functions/src/utils/

## Responsibility
Shared helpers for FCM delivery, profile sanitization, request rate limits, and numeric bounds.

## Design
`sendPush.ts` validates app routes and assignment IDs, gates on preferences/quiet hours, deduplicates delivery, chunks FCM sends, retries transient errors, and deactivates invalid tokens. `profileSanitizer.ts` returns idempotent field patches; `rateLimiter.ts` uses Firestore transactions; `math.ts` provides `clamp`.

## Flow
Notification handler → `sendPushToUser(s)` → preferences and `users/{uid}/fcmTokens` → `_pushDeliveries` idempotency/token state → FCM. User profile write trigger → sanitizer → patched `users` fields. Callable middleware → rate-limit transaction → allow or reject.

## Integration
Consumed by `notifications/index.ts`, `triggers/onStudentCreated`, `triggers/onStudentProfileUpdated`, `triggers/quizBattleApi`, and scoring callers. Reads `users/{uid}/settings/preferences`, `users/{uid}/fcmTokens`; writes `_pushDeliveries` and invalid-token flags. Rate limiter uses `_ratelimits/{uid}/{functionName}`; profile sanitizer covers `users.name` and `users.phone`.
