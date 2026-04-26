# Module Quizzes and Quiz Battle Status Audit

Date: 2026-04-21
Scope: Current implementation status of module page quizzes and Quiz Battle (1v1 online, 1v1 vs bot), plus backend readiness gaps and mechanics recommendations.

## 1) Executive Summary

- Module assessments are live but split across two different quiz engines with different scoring and persistence behavior.
- Quiz Battle online and bot modes are live with server-authoritative round resolution, XP payout, history, and leaderboard writes.
- Several high-impact contract mismatches exist (Firestore rules vs payload fields, RTDB presence schema vs client writes) that can block automation or silently degrade realtime reliability.
- Mechanics are partially implemented today (streak visuals and limited XP modifiers), but no unified scoring contract exists yet for multipliers, streak bonuses, and bonus-point economy across all quiz modes.

## 2) Source-Of-Truth Locations

- Module catalog and lock states: `src/data/subjects.ts`
- In-module quiz runtime and question banks: `src/components/ModuleDetailView.tsx`, `src/components/InteractiveLesson.tsx`
- Practice Center quiz runtime: `src/components/PracticeCenter.tsx`, `src/components/QuizExperience.tsx`
- Progress and XP persistence: `src/services/progressService.ts`, `src/services/gamificationService.ts`
- Quiz submission automation write: `src/services/automationService.ts`
- Quiz submission trigger pipeline: `functions/src/triggers/onQuizSubmitted.ts`, `functions/src/automations/quizProcessor.ts`
- Quiz Battle backend contracts and authority: `functions/src/triggers/quizBattleApi.ts`, `functions/src/index.ts`
- Quiz Battle frontend callable client and local fallbacks: `src/services/quizBattleService.ts`, `src/components/QuizBattlePage.tsx`
- Firestore auth rules: `firestore.rules`
- RTDB presence rules: `database.rules.json`

## 3) Current Status: Module Page Quizzes

### 3.1 Inventory and Content Source

- Static quiz inventory in module data:
  - 13 `practice` quizzes
  - 13 `module` quizzes
  - 5 module quizzes currently `locked: true`
- Current locked module quiz IDs:
  - `gm-3-q2`, `pc-3-q2`, `sp-3-q2`, `sp-4-q2`, `bc-3-q2`
- In-module question content is hardcoded in `ModuleDetailView` (`quizQuestionBanks`) and selected by quiz ID prefix with subject fallback.

### 3.2 Runtime Paths (Important Split)

There are two distinct quiz runtimes:

1. In-module assessments (lesson journey / checkpoint)
   - UI path: `ModuleDetailView` -> `InteractiveLesson`
   - Persists via `completeQuiz(...)` and `recalculateAndUpdateModuleProgress(...)`

2. Practice Center assessments
   - UI path: `PracticeCenter` -> `QuizExperience`
   - Does not call `completeQuiz(...)`
   - Calls `triggerQuizSubmitted(...)` and optional `saveQuizResults(...)` only for `ai_generated` quizzes

### 3.3 Mechanics Currently Implemented

In `InteractiveLesson` (module journey):
- Score increments by correct answers.
- Streak tracking exists.
- Streak bonus XP starts at streak >= 3 using `bonus = streak * 5` per qualifying correct answer.
- Result XP formula: `totalXP = baseXP + scoreXP + streakBonusXP`
  - `baseXP = 100` for quizzes, `50` for lessons
  - `scoreXP = round(correct/total * 100)`

In `QuizExperience` (Practice Center):
- Streak and combo multiplier UI state exists (`1x`, `2x`, `3x`).
- Correct answers increment score count.
- Combo multiplier currently affects feedback/FX, not direct per-question scoring formula.
- XP starts from `quiz.xpReward`, then applies:
  - +50% if score >= 90
  - +25% if score >= 80
  - +20% speed bonus if >50% time remains

### 3.4 Progress and Persistence Behavior

- `completeQuiz(...)` writes:
  - `progress.quizAttempts[]`
  - module quiz completion lists
  - `totalQuizzesCompleted` increment when first completion
  - XP award via internal `awardXP` using `floor(score/100 * 100)`
- In-module quiz completion currently calls `completeQuiz(...)` with:
  - empty answers (`[]`)
  - `timeSpent = 0`
  - This means attempt-level analytics are persisted with low-fidelity telemetry.

### 3.5 Current Gaps in Module Quiz Layer

- Split-engine inconsistency:
  - Module journey quizzes and Practice Center quizzes do not share one canonical scoring/persistence pipeline.
- Practice Center persistence gap:
  - `QuizExperience` path does not write `progress.quizAttempts` for static quizzes, so completion/best-score tracking can diverge from user activity.
- XP double-award risk on in-module path:
  - `ModuleDetailView` awards XP through `onEarnXP(...)` and also calls `completeQuiz(...)` (which awards XP again).
- Automation coverage gap:
  - Risk recalculation automation trigger is called from `QuizExperience`, but not from `ModuleDetailView` in-module completion path.

## 4) Current Status: Quiz Battle (1v1 Online and 1v1 vs Bot)

### 4.1 Overall Architecture

- Backend authority is implemented in Cloud Functions callables (exported in `functions/src/index.ts`).
- Main state collections:
  - `quizBattleQueue`
  - `quizBattleRooms`
  - `quizBattleMatches`
  - `quizBattleHistory`
  - `studentBattleStats`
  - `studentBattleLeaderboard`
- Match round answer keys are held in private subdoc:
  - `quizBattleMatches/{matchId}/server/roundKeys`

### 4.2 1v1 Online Mode Status

Implemented:
- Public matchmaking queue join/leave.
- Private room create/join/leave by code.
- Grade/curriculum compatibility checks (with env-gated shared mode option).
- Ready-state sync before round start.
- Round lifecycle events:
  - `round_started`, `answer_locked`, `round_result`, `match_completed`
- Round winner logic is server-authoritative:
  - correctness first, response-time tiebreak when both correct.
- Session resume and heartbeat callables are implemented.

### 4.3 1v1 vs Bot Mode Status

Implemented:
- Direct bot match creation and start.
- Bot difficulty profiles affect simulated accuracy and response latency.
- Server-authoritative scoring and finalization same as online path.
- Bot rematch callable is implemented.

### 4.4 Battle XP, History, and Leaderboard

Implemented server-side:
- Match outcome by score:
  - `win`, `draw`, `loss`
- XP by outcome:
  - `win = 80`, `draw = 55`, `loss = 35`
- Finalization writes:
  - `quizBattleHistory` per participant
  - `studentBattleStats` aggregate metrics
  - `studentBattleLeaderboard`
  - `users.currentXP` and `users.totalXP`
  - `xpActivities` records

### 4.5 Battle Reliability and Fallbacks

- Frontend has dev-local fallback behavior in `quizBattleService` for certain callable/network failures.
- Backend includes scheduled sweep (`quizBattleResolvePublicMatchmakingSweep`) and timeout progression helpers.
- AI-generation gate for online starts is environment-controlled and currently includes temporary bank-source unblock logic.

## 5) Backend Readiness Gaps (Current + Future)

## High Priority

1. Firestore rules/payload mismatch for quiz automation writes.
   - Rules for `quizResults` and `diagnosticResults` use ownership checks on `studentId`.
   - Frontend writer uses `lrn` (not `studentId`) in `triggerQuizSubmitted(...)`.
   - Impact: student writes can be denied, which blocks trigger-based risk recalculation.

2. RTDB presence schema mismatch.
   - RTDB rules allow only small payload with `state` and `updatedAt` (optional `displayName`).
   - Client writes fields like `studentId`, `scope`, `resourceId`, `online`, `heartbeatAt`, `updatedAt`.
   - Impact: presence writes likely fail validation and are silently degraded (client catches and warns).

3. Module quiz pipeline is not unified.
   - In-module and Practice Center paths use different persistence + automation behavior.
   - Impact: inconsistent analytics, progression, and risk recalculation coverage.

4. XP accounting inconsistency.
   - In-module path can award XP from both UI callback and persistence service award.
   - Impact: possible over-award and leaderboard/profile skew.

## Medium Priority

1. Attempt telemetry fidelity is incomplete for module journey quizzes.
   - `completeQuiz(...)` currently receives empty answers/time in module path.

2. AI source enforcement in online battle is not strict by default.
   - Current logic supports temporary seeded bank unblock during generation instability.

3. Test coverage is mostly helper-level for battle generation and utilities.
   - Full callable integration tests (queue/room/start/submit/finalize/rules) are limited.

4. Practice Center detailed result persistence is conditional.
   - `saveQuizResults(...)` is restricted to `ai_generated` source in `QuizExperience`.

## 6) Proposed Mechanics (Multipliers, Streaks, Bonus Points, and More)

Goal: one mechanics contract across module quizzes and Quiz Battle, with server-verifiable scoring and clear anti-abuse controls.

### 6.1 Canonical Scoring Components (Recommended)

Per question:
- `basePoints` (e.g., 100)
- `difficultyMultiplier` (easy=1.0, medium=1.15, hard=1.30)
- `streakMultiplier` (caps to prevent runaway)
- `speedBonus` (bounded by answer latency)
- `accuracyBonus` (end-of-quiz match bonus)

Suggested formulas:

- `streakMultiplier = min(1.50, 1.00 + 0.05 * max(0, streak - 1))`
- `speedBonus = clamp(0, 20, round(20 * (timeRemainingOnQuestion / questionTimeLimit)))`
- `questionPoints = round(basePoints * difficultyMultiplier * streakMultiplier + speedBonus)`

End-of-quiz:
- `cleanRoundBonus` for all-correct rounds (battle)
- `perfectQuizBonus` for 100% accuracy
- `comebackBonus` when trailing by >=2 and winning (battle)

### 6.2 XP Economy Recommendation

Separate "score points" from "XP payout":
- Keep score points for match/quiz ranking.
- Convert to XP with capped curve:
  - `xp = floor(baseXp + performanceXp + bonusXp)`
  - Add hard cap per mode (example: module <= 220, battle <= 140)

This keeps progression stable while allowing expressive mechanics.

### 6.3 Event Contract Additions

For each answer/round, persist:
- `streakAtAnswer`
- `difficultyMultiplierUsed`
- `speedBonusAwarded`
- `questionPointsAwarded`
- `serverValidatedLatencyMs`

For final result, persist:
- `bonusBreakdown` object
- `xpBreakdown` object
- `scoringVersion` (for safe migrations)

### 6.4 Anti-Abuse and Fairness Controls

- Keep all final point and XP calculations on backend for battle and eventually for module submissions.
- Clamp client-reported latency and reject impossible timings.
- Introduce idempotency key checks for all answer submits (already present in battle submit path).
- Version mechanics (`scoringVersion`) to safely iterate formulas without breaking old records.

### 6.5 Rollout Plan

Phase 1 (stabilize contracts):
- Fix rules/payload mismatches (`studentId` vs `lrn`, presence schema alignment).
- Unify module quiz submission path so all completions produce one canonical submission event.

Phase 2 (mechanics unification):
- Implement shared scoring engine contract and persist bonus breakdowns.
- Keep existing UI effects, but source truth from returned backend scoring payload.

Phase 3 (competitive tuning):
- Tune streak/speed/bonus caps from telemetry.
- Add seasonal leaderboard modifiers if needed.

## 7) Immediate Action Checklist

1. Align Firestore rule ownership field and automation payload (`studentId` vs `lrn`).
2. Align RTDB presence payload to current rules, or update rules to match intended payload shape.
3. Consolidate module quiz completion paths so both ModuleDetail and PracticeCenter write one canonical attempt event.
4. Remove XP double-award path by defining a single XP authority per completion.
5. Add callable integration tests for online and bot battle lifecycle, including timeout and resume paths.

## 8) Cross-Check Status

- Cross-check completed against uploaded `mechanics.md` proposal.

### 8.1 Feasibility Verdict

- The proposal is feasible with current architecture.
- Battle mode already has server-authoritative lifecycle and is the right anchor point for the unified engine.
- Module quizzes require additional backend ownership to satisfy the "server-validated final scoring" requirement.

### 8.2 What Already Matches the Proposal

- Battle answer timing is already submitted and clamped server-side (`responseMs` path).
- Battle round resolution is server-authoritative (correctness + time tiebreak).
- Battle outcomes and XP are already finalized in Cloud Functions and persisted to history/stats/leaderboard.
- Module quiz UIs already have streak state and bonus concepts, so UX migration is straightforward.

### 8.3 Proposal-to-Code Gaps

1. Unified per-question score engine does not exist yet.
  - Current battle score increments by round winner only (not formula points).
  - Current module engines compute XP differently and independently.

2. Per-question difficulty is not propagated to battle runtime payload.
  - Question bank has difficulty metadata, but live battle question contract strips it before client delivery.

3. `serverValidatedLatencyMs` is not currently persisted.
  - Backend clamps `clientResponseMs`, but does not store a separate server-derived latency metric.

4. Module final scoring is not backend-authoritative.
  - Module scoring and XP are computed in frontend components.

5. UI contract additions from proposal are only partial.
  - 2x2 answer layout exists for battle, but no immediate green/red outcome coloring with floating point indicators.
  - Lock-state exists, but no explicit soft-penalty lock semantics for incorrect answers in module flows.

## 9) Frontend Changes Required (Mechanics Proposal)

1. Introduce a shared scoring payload contract in frontend types.
  - Add `QuestionScoreResult` fields to battle and module result models:
    - `pointsAwarded`
    - `streakMultiplierApplied`
    - `speedBonusApplied`
    - `difficultyMultiplierApplied`
    - `serverValidatedLatencyMs`

2. Update battle answer UI to consume server scoring breakdown per round.
  - Show localized `+points` feedback after round resolution.
  - Add speed bonus indicator only when bonus > 10.
  - Add streak milestone ring/icon state from server-sourced streak data.

3. Add non-disruptive answer-state visuals.
  - Correct: soft green state and short floating points text.
  - Incorrect: soft red state and temporary lock styling.

4. Normalize module quiz input data for shared engine.
  - Ensure each module question has difficulty metadata (default medium where unknown).
  - For module mode, pass speed inputs as fixed zero-equivalent (`timeRemainingMs=0`, `timeLimitMs=1`) to disable speed bonus by design.

5. Unify module completion path.
  - Route both `InteractiveLesson` and `QuizExperience` static quizzes through one submission pipeline to avoid split scoring behavior.

6. Remove XP double-award risk in module path.
  - Keep one XP authority per completion event (either UI callback path or persistence service path, not both).

## 10) Backend Changes Required (Mechanics Proposal)

1. Implement a central scoring engine in Cloud Functions.
  - New reusable scorer for both battle and module submissions using:
    - base points
    - difficulty multiplier
    - streak multiplier
    - speed bonus
  - Return persisted per-question breakdown + aggregate totals.

2. Battle: migrate from round-win score increments to formula-based points (or explicitly keep round-win and add parallel points track).
  - Persist per-round `questionPointsAwarded` and cumulative point totals per player.
  - Define winner logic clearly (point total vs current round-win semantics).

3. Battle: persist server latency metric.
  - Derive `serverValidatedLatencyMs` at submission time from round start/deadline timeline.
  - Keep client value only as auxiliary data.

4. Battle: add bonus economy and caps.
  - Add clean-round and comeback bonus calculators in finalization.
  - Replace fixed outcome XP with `floor(baseXP + performanceXP + bonusXP)` and hard caps:
    - module max (e.g., 220)
    - battle max (e.g., 140)

5. Module: move final score validation server-side.
  - Add callable or trigger path that validates submitted answers against canonical question bank.
  - This requires canonical question source availability in backend (Firestore-backed bank or shared static dataset loaded by functions).

6. Align auth contracts and rules before rollout.
  - Resolve `studentId` vs `lrn` ownership mismatch for quiz writes.
  - Align RTDB presence payload and rules shape.

7. Add integration tests for scoring and anti-cheat behavior.
  - Cases: timeout, stale round submit, replay/idempotency, impossible latency, cap enforcement, comeback bonus eligibility.

## 11) Frontend-Only Implementation Log (2026-04-22)

Scope decision (confirmed): Quiz Battle UI first, frontend-only, no backend/rules changes in this pass.

### 11.1 Files Updated

- `src/components/QuizBattlePage.tsx`

### 11.2 Implemented UI/UX Changes

1. Replaced static battle badges with live, state-driven HUD indicators in active match view:
  - Dynamic streak chip (`playerRoundStreak`)
  - Dynamic visual multiplier chip (`playerVisualMultiplier`)
  - Live score chip with pulse feedback when score changes

2. Added mid-battle momentum panel:
  - Player score/streak card
  - Opponent score/streak card
  - Momentum tier chip (`Inferno`, `Heating Up`, `Steady`, `Rebuild`)
  - Last swing indicator (`lastRoundMomentumDelta`)

3. Added animated per-round feedback affordances:
  - Floating momentum text on round resolution
  - Enhanced round summary card with:
    - Correct/incorrect outcome
    - Opponent correctness
    - Correct option marker
    - Visual multiplier + momentum chips

4. Added time-pressure visual escalation:
  - Timer bar pulse and urgent highlighting when time is low
  - Choice button stress-state styling in critical countdown

### 11.3 Implemented SFX Changes

1. Upgraded tone engine from single-note cues to multi-note event cues.

2. Added new tone events for momentum progression:
  - `streak`
  - `multiplier`

3. Added persistent SFX controls:
  - Existing toggle kept (`quiz_battle_sound_enabled`)
  - New volume control (`quiz_battle_sound_volume`)
  - Setup-page slider for live adjustment
  - In-match quick mute/unmute button in fullscreen header

### 11.4 Data/Contract Impact

- No backend callable contract changes.
- No Firestore schema changes.
- No RTDB schema/rules changes.
- No scoring authority changes (server remains authoritative for battle outcomes and XP).

### 11.5 Notes For Backend Co-Dev

1. Current multiplier/momentum values are visual-only and frontend-derived from existing round result fields.

2. This pass intentionally avoids introducing new score payload fields (`pointsAwarded`, `streakMultiplierApplied`, etc.) until backend scoring contract work is scheduled.

3. When backend scoring payloads are available, this UI can be switched from visual heuristics to server-returned per-round breakdown without structural redesign.

---

## 12) Frontend-Only Implementation Log (2026-04-26)

### 12.1 Scope

1v1 online mode bug fixes and UX polish pass. No backend or Firestore schema changes.

### 12.2 Files Updated

- `src/components/QuizBattlePage.tsx`
- `current_xp_system.md`
- `docs/xp-scoring-backend-contract.md` (new file)

### 12.3 Bug Fixes

**1. Popup spam bug (stale closure)**
- Root cause: The polling `useEffect` captured `lastRoundResult` as `null` in a stale closure because it was not in the dependency array. Every 3-second poll incorrectly detected a "new" round result and re-triggered the popup overlay.
- Fix: Replaced state-based check with `popupShownForRoundRef` (a `useRef`). Refs are always current regardless of closures. Both the polling path and the `submitRoundAnswer` path now write to this ref before triggering the popup, ensuring each round fires exactly one popup.

**2. "Waiting for opponent" did not actually block input**
- Root cause: The choice button `disabled` prop only checked `isSubmitting || designPauseActive`. `roundLocked` state was set but never wired to the `disabled` attribute.
- Fix: Added `roundLocked` to the `disabled` prop. Also improved the waiting indicator UI with a sub-label "Choices locked until round resolves".

**3. First-answering player never received the round result popup**
- Root cause: The polling detection used `r.roundNumber === activeMatch.currentRound` where `activeMatch` is a stale closure value. When the server advances `currentRound` after the opponent answers, the stale closure value may no longer match the round in `roundResults`.
- Fix: Removed the `currentRound` equality check entirely. Now uses only `r.roundNumber > popupShownForRoundRef.current` with a `.sort()` to show the oldest unshown result first. This is closure-safe and handles all timing edge cases.

**4. Chosen answer highlight disappears while waiting for opponent**
- Root cause: When `submitRoundAnswer` returns without a `roundResult` (player answered first), the code called `setSelectedOptionIndex(null)` unconditionally, wiping the visual selection before entering `roundLocked`.
- Fix: Moved `setSelectedOptionIndex(null)` inside the non-online `else` branch. In online mode, `selectedOptionIndex` is preserved until the round fully resolves via the `pendingMatchUpdate` timeout (1.5s after popup). The chosen option now stays highlighted with the indigo color throughout the waiting period.

**5. Opponent avatar not shown on choice buttons in online mode**
- Root cause: Avatar-on-choice logic was hardcoded to `botSelectedIndex` for bot mode only. Online mode uses the same `botSelectedIndex` field to carry the opponent's selected choice, but the rendering code never read it for online.
- Fix: Unified into `opponentPickedIdx` that branches on `activeMatch.mode`. Bot mode derives from `botCorrect`. Online mode reads `botSelectedIndex` directly. Opponent icon renders as `<Users>` for human opponents instead of `<Bot>`.

**6. Opponent surrender / disconnect not handled**
- Root cause: No frontend detection of `status === 'cancelled'` transition mid-match.
- Fix: Added `opponentSurrendered` state. Polling now checks if `latest.status === 'cancelled'` while `activeMatch.status === 'in_progress'`. If so, triggers a surrender notification modal with a speech bubble from the opponent avatar ("I give up! 🏳️") and two actions: Claim Victory / Start New Match.

### 12.4 XP System Clarifications

- Separated the in-game "Battle Score" (frontend-computed per-round accumulation) from the "Match Reward" (server-authoritative Win/Draw/Loss XP).
- Match summary now shows both separately with clear labels.
- In-game header counter re-labeled from "XP" to "Battle Score" to avoid confusion.
- Full backend scoring contract written to `docs/xp-scoring-backend-contract.md`.

### 12.5 Known Remaining Gaps (Online Mode)

| Gap | Impact | Owner |
|:---|:---|:---|
| `opponentSelectedIndex` is not a distinct field in `QuizBattleRoundResult` — reuses `botSelectedIndex` | Brittle naming, confusing for devs | Backend (rename field) |
| Reconnection after tab close shows blank hub briefly before match resumes | Poor UX for reconnecting players | Backend (resume session loading state) |
| Round timer uses client-side countdown, not server `roundDeadlineAtMs` | Clock drift between players | Backend (Phase 2) |
| No "rematch" flow for online mode | Players must create new match | Backend + Frontend |
| Surrender only detected via `cancelled` status from polling — delay up to 3 seconds | Latent surrender notification | Backend (push event for surrender) |