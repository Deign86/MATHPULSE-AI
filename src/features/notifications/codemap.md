# src/features/notifications/

## Responsibility
- Provides in-app notifications, unread counts, read/delete actions, and daily student check-in reminders.

## Design
- `NotificationProvider` + `useNotifications` own authenticated notification state; `NotificationBell`, `NotificationPanel`, and `NotificationItem` are consumers.
- `dedupeNotifications`, `filterNotificationsForRole`, and `selectUnreadCount` normalize/filter view state; Firestore writes are isolated in service modules.

## Flow
- Auth user → `NotificationProvider` → `subscribeToNotifications` in `notificationFirestoreService` → context → bell/panel; actions call mark-read, mark-all-read, or delete Firestore functions.
- `useDailyCheckInReminder` runs only for a student user; no backend REST endpoint is used by the core notification flow.

## Integration
- Uses `AuthContext` role and UID; notifications do not mutate IAR (`not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`).
- No Quiz Battle RTDB queue integration.
