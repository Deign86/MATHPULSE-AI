# functions/src/notifications/

## Responsibility
Defines Firestore, scheduled, and callable handlers that relay selected application events to Firebase Cloud Messaging.

## Design
Handlers build event-specific payloads and route all delivery through `utils/sendPush`; event IDs support deduplication, and the in-app relay ignores foreground-FCM writes.

## Flow
Firestore create/write or scheduler/callable → event-specific handler → preference/auth checks and `sendPushToUser(s)` → user token docs → FCM; in-app notification create relays mapped priority types only.

## Integration
Exports: `onAchievementUnlocked` (`users/{userId}/achievements/{achievementId}`), `onQuizBattleUpdate` (`quizBattleMatches/{battleId}`), `onGradePosted` (`assessmentResults/{studentId}/attempts/{attemptId}`), `dailyRewardReminder`, `streakReminder`, `notifyAssignmentDeadline`, `sendTestPush`, `onInAppNotificationCreated` (`notifications/{userId}/items/{notificationId}`). Reads `users`, `dailyRewards`, `quizAssignments`, `classSectionOwnership`; depends on `utils/sendPush` and FCM.
