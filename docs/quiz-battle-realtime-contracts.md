# Quiz Battle Realtime Contracts

## Scope
This document defines the live match state machine and round lifecycle contract used by the Quiz Battle realtime flows.

- Authoritative runtime: Firebase Cloud Functions in `functions/src/triggers/quizBattleApi.ts`
- Client contract surface: callable responses consumed by `src/services/quizBattleService.ts`
- Primary match collection: `quizBattleMatches/{matchId}`

## Match Status State Machine

### Match `status`
- `ready`: Match exists, waiting for synchronized start confirmation.
- `in_progress`: Round timer is active and answer submissions are accepted.
- `completed`: Final round resolved, outcome/XP finalization available.
- `cancelled`: Terminal cancellation state (reserved for operational controls).

### Round Progression
When a match is `in_progress`, progression is server-authoritative:
- Function sets `roundStartedAtMs` and `roundDeadlineAtMs` per round.
- Submissions are accepted only before `roundDeadlineAtMs`.
- If deadline elapses, Functions resolves the round using available submissions (or timeouts) and advances state.

## Realtime Lifecycle Contract

### Lifecycle event field
`quizBattleMatches/{matchId}.lifecycle`

```ts
interface QuizBattleLifecycleState {
  eventType: "round_started" | "answer_locked" | "round_result" | "match_completed";
  sequence: number;
  roundNumber: number;
  occurredAtMs: number;
  deadlineAtMs?: number;
  answeredCount?: number;
  lockedByStudentId?: string;
  winner?: "playerA" | "playerB" | "draw";
  scoreA?: number;
  scoreB?: number;
  resolvedBy?: "submission" | "timer";
}
```

### Lifecycle history field
`quizBattleMatches/{matchId}.lifecycleHistory` is append-only via `arrayUnion` and stores the same event payload shape.

### Event semantics
- `round_started`: A new round is active, includes `deadlineAtMs`.
- `answer_locked`: One player has submitted and is locked while awaiting opponent or deadline.
- `round_result`: Round has been resolved and score may change.
- `match_completed`: Final round resolved; match transitioned to `completed`.

## Timer and Scoring Authority

All scoring and timeout resolution is server-side:
- Round answer key is read from `quizBattleMatches/{matchId}/server/roundKeys`.
- Winner selection is computed in Functions from correctness + response time tie-break.
- Client `responseMs` is clamped to round time limit and rejected after deadline.
- Timeout fallback resolves unanswered submissions as null/timeout and advances round automatically.

## Room + Matchmaking + Reconnect Contracts

### Private rooms
- Join by code: `quizBattleJoinPrivateRoom({ roomCode })`.
- Room state polling: `quizBattleGetPrivateRoomState({ roomId | roomCode })`.
- Auto-match creation occurs when second participant joins a waiting room.

### Public matchmaking worker
- On-demand pairing pass during queue join/heartbeat.
- Scheduled sweep: `quizBattleResolvePublicMatchmakingSweep` every minute.
- Stale queue entries are removed based on heartbeat and matched TTL windows.

### Heartbeat and resume
- Realtime presence path: `quizBattlePresence/{scope}/{resourceId}/{uid}` in RTDB.
- Callable heartbeat: `quizBattleHeartbeat({ scope, resourceId })` updates Firestore + triggers timer progression checks for match scope.
- Session resume: `quizBattleResumeSession()` restores queue/room/match context.

## Student Leaderboard Privacy Contract

Leaderboard data is sourced from trusted aggregate docs:
- Collection: `studentBattleLeaderboard`
- Client supports privacy display modes:
  - Name: `alias`, `initials`, `full`
  - Score: exact or score-band display
- Current user row remains clearly identifiable as self for usability.
