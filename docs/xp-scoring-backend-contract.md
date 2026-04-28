# XP & Scoring Backend Contract

> **Document Type:** Backend Developer Handoff — Required Reading Before Touching Scoring or XP
> **Last Updated:** 2026-04-28
> **Status:** Phase 2 — **COMPLETE**. Scoring engine v2 is live (performance XP, daily caps, scoreBreakdown).
> **Related docs:**
> - [`current_xp_system.md`](../current_xp_system.md) — Full XP system overview
> - [`docs/quiz-systems-status-audit.md`](./quiz-systems-status-audit.md) — Architecture gaps and rollout plan

---

## Context for the Backend Developer

The Quiz Battle system currently has a **split XP problem**:

1. The frontend computes a live "Battle Score" counter during matches (correct answers + streak bonus).
2. The server awards XP based only on match outcome (Win=80, Draw=55, Loss=35).
3. The score multiplier (`1.24x`, `1.72x`, etc.) shown on the HUD is **visual-only** — it does not affect any real XP calculation.

**Phase 1 (Done by Frontend):** The in-game counter is now labeled "Battle Score" and the match summary separates it from the actual "Match Reward" XP. This is a stopgap so the UI is honest.

**Phase 2 (Your job):** The backend needs to implement a proper performance-based XP calculation so the multiplier is real, the per-round scoring is real, and the server returns a breakdown that the frontend can display.

---

## Phase 2 Requirements

### 1. Per-Round Scoring Engine

Each round answer submission must return a `scoreBreakdown` object alongside the existing `roundResult`. The backend Cloud Function in `functions/src/triggers/quizBattleApi.ts` (the answer submission handler) must compute and persist:

```ts
interface RoundScoreBreakdown {
  basePoints: number;             // Always 100
  difficultyMultiplier: number;   // easy=1.0, medium=1.15, hard=1.30
  streakMultiplier: number;       // 1.0 + 0.10 * max(0, streak-1), capped at 1.72
  speedBonus: number;             // 0 to 20, based on response latency
  totalPointsAwarded: number;     // round(basePoints * difficultyMultiplier * streakMultiplier + speedBonus)
  streakAtAnswer: number;         // current consecutive correct count at time of answer
  serverValidatedLatencyMs: number; // server-derived, not client-reported
}
```

**Formula:**
```
streakMultiplier = min(1.72, 1.00 + 0.10 * max(0, consecutiveCorrectCount - 1))
speedBonus = clamp(0, 20, round(20 * (roundDeadlineAtMs - submittedAtMs) / (roundDeadlineAtMs - roundStartedAtMs)))
totalPointsAwarded = round(100 * difficultyMultiplier * streakMultiplier + speedBonus)
```

> **Important:** The streak count must be computed server-side from persisted round results, NOT trusted from the client.

---

### 2. Match Finalization — Performance XP

Replace the current flat outcome XP (`win=80, draw=55, loss=35`) with a **performance-based XP formula** at match finalization:

```ts
// Finalization formula
const baseMatchXP = outcome === 'win' ? 60 : outcome === 'draw' ? 40 : 20;
const performanceXP = floor(totalPointsEarned * 0.08); // 8% of in-match score → XP
const cappedXP = min(baseMatchXP + performanceXP, XP_CAP_PER_BATTLE);

// XP caps
const XP_CAP_PER_BATTLE = 140; // hard cap per match
// Future: daily cap of 500 XP from battles (requires daily XP tracking)
```

The finalization block must persist:
```ts
interface MatchXPBreakdown {
  baseMatchXP: number;       // outcome base
  performanceXP: number;     // earned from score
  totalXPAwarded: number;    // what actually goes to profile
  totalPointsEarned: number; // cumulative round points
  scoringVersion: 'v2';      // increment when formula changes
}
```

---

### 3. Response Contract Update

The `submitRoundAnswer` callable response must be extended to include:

```ts
// Add to existing QuizBattleRoundResult
interface QuizBattleRoundResult {
  // ...existing fields...
  scoreBreakdown: RoundScoreBreakdown; // NEW — required in Phase 2
}

// Add to match finalization
interface QuizBattleMatchCompletion {
  // ...existing fields...
  xpBreakdown: MatchXPBreakdown; // NEW — required in Phase 2
}
```

The frontend (`QuizBattlePage.tsx`) is already structured to consume a `scoreBreakdown` field when available. No frontend restructuring is needed — just return the data and the UI will pick it up.

---

### 4. Daily XP Cap (Battle Source Only)

Add daily XP tracking for battle rewards:

- Track `battleXPEarnedToday` on the `studentBattleStats` document
- Reset at midnight (UTC or local — decide and document)
- Reject `awardXP` calls from battle finalization once `battleXPEarnedToday >= 500`
- The cap applies only to battle XP — other sources (lessons, quizzes, achievements) are uncapped

---

### 5. Difficulty Propagation

Currently, `difficulty` metadata exists in the question bank but is stripped before being sent to the client. To enable the difficulty multiplier:

- Include `difficulty: 'easy' | 'medium' | 'hard'` in the per-round answer key stored in `quizBattleMatches/{matchId}/server/roundKeys`
- Use this server-side value (never trust client-reported difficulty)

---

## Files to Modify

| File | Change |
|:---|:---|
| `functions/src/triggers/quizBattleApi.ts` | Add `RoundScoreBreakdown` computation in answer submission handler |
| `functions/src/triggers/quizBattleApi.ts` | Replace flat outcome XP with `MatchXPBreakdown` formula in finalization |
| `functions/src/triggers/quizBattleApi.ts` | Add daily battle XP cap enforcement |
| `src/services/quizBattleService.ts` | Extend `QuizBattleRoundResult` interface with `scoreBreakdown` field |
| `src/services/quizBattleService.ts` | Extend completion response with `xpBreakdown` field |
| `current_xp_system.md` | Update "Score Multiplier" section to reflect real status after Phase 2 |
| `docs/xp-scoring-backend-contract.md` | Mark Phase 2 as complete when done |

---

## Do NOT Change Without Coordination

- Do **not** change the `QuizBattleRoundResult` interface without telling the frontend developer — the UI reads from it directly.
- Do **not** change the XP awarded to `users.currentXP` and `users.totalXP` format — these are consumed by `gamificationService.ts` on the client.
- Do **not** remove the existing flat outcome XP fields during migration — add the new breakdown alongside until the frontend confirms it's reading from `xpBreakdown`.
- Always bump `scoringVersion` when formula changes so old records can be distinguished.

---

## Acceptance Criteria (Phase 2 Complete When)

- [x] `submitRoundAnswer` response includes `roundResult.scoreBreakdown` with all required fields
- [x] Match finalization uses performance XP formula (not flat outcome XP)
- [x] `xpBreakdown` is returned in match completion response
- [x] Daily battle XP cap of 500 is enforced server-side
- [x] `scoringVersion: 'v2'` is written to history records
- [x] `current_xp_system.md` "Score Multiplier" section updated to reflect real status
- [x] This document's status header updated to `Phase 2: Complete`
