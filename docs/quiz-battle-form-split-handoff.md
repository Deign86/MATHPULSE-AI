# Quiz Battle Setup Form Split Handoff

Date: 2026-04-15
Branch: feat/quiz-battle-page
Audience: Backend developer

## Backend Change Status

No backend code changes are introduced for this handoff document.

This branch change is frontend-focused for Quiz Battle setup UX. Existing callable endpoints and payload schema remain compatible.

## Branch Files Relevant To This Handoff

- src/components/QuizBattlePage.tsx
- src/components/ui/warp-background.tsx
- src/assets/quiz_battle_avatar.png
- docs/quiz-battle-form-split-handoff.md

Only `src/components/QuizBattlePage.tsx` is relevant to setup form behavior.

## What Changed In Setup Flow (Frontend)

- Mode selection is surfaced at the start as two cards in the Hub:
  - 1v1 Online
  - 1v1 vs Bot
- Selecting a card sets `setupConfig.mode` and routes to Setup.
- The in-setup mode switch was removed.
- Setup now renders only the fields relevant to the selected mode.

## Implementation Status In This Branch

Applied in `src/components/QuizBattlePage.tsx`:

- Removed the in-form Mode selector buttons.
- Added a selected-mode status line in Setup (`1v1 Online` or `1v1 vs Bot`).
- Split setup controls so online-only fields are only shown in online mode.
- Moved `Online Match Type` and optional room code input to online-only setup content.
- Kept battle sound toggle as a shared UI preference for both modes.
- Removed separate Adaptive Bot toggle from setup to avoid conflicting controls.
- Bot difficulty is now selected from one control that includes `adaptive`.

## Form Content By Mode

### 1v1 Online form (fields to show)

- Category
  - payload key: `subjectId`
  - required
- Strand / Topic Group
  - payload key: `topicId`
  - required
- Difficulty
  - payload key: `difficulty`
  - allowed: `easy | medium | hard`
- Number of Questions
  - payload key: `rounds`
  - range: 3 to 20
- Time per Question
  - payload key: `timePerQuestionSec`
  - range: 10 to 180
- Online Match Type
  - payload key: `queueType`
  - allowed: `public_matchmaking | private_room`
- Room Code (only when `queueType = private_room`)
  - UI input only (not part of `setup` payload)
  - if present: join room by code
  - if blank: create room
- Battle Sounds
  - UI preference only
  - not required by backend

### 1v1 vs Bot form (fields to show)

- Category
  - payload key: `subjectId`
  - required
- Strand / Topic Group
  - payload key: `topicId`
  - required
- Bot Difficulty
  - payload key: `botDifficulty`
  - allowed: `easy | medium | hard | adaptive`
- Number of Questions
  - payload key: `rounds`
  - range: 3 to 20
- Time per Question
  - payload key: `timePerQuestionSec`
  - range: 10 to 180
- Battle Sounds
  - UI preference only
  - not required by backend

### Fields intentionally not shown in Bot form

- `queueType`
- private room code input
- online-only match type controls

## API Mapping By Mode

### 1v1 Online

- Public matchmaking:
  - call: `quizBattleJoinQueue`
  - requires: `mode = online`, `queueType = public_matchmaking`
- Private room create:
  - call: `quizBattleCreatePrivateRoom`
  - requires: `mode = online`
- Private room join:
  - call: `quizBattleJoinPrivateRoom(roomCode)`

### 1v1 vs Bot

- call: `quizBattleCreateBotMatch`
- requires: `mode = bot`
- bot queue is not allowed

## Validation and Contract Notes (No Contract Break)

The backend still normalizes and validates setup with current rules:

- `topicId` required
- `rounds` clamped to 3..20
- `timePerQuestionSec` clamped to 10..180
- bot mode cannot use `private_room`

The frontend split does not require backend API shape changes.

## Known Behavior Detail To Keep In Mind

Bot difficulty selection uses:

- if bot difficulty is set to `adaptive`, frontend sets `adaptiveBot = true`
- for non-adaptive bot difficulty, frontend sets `adaptiveBot = false`
- backend still resolves effective bot difficulty as:
  - `adaptive` when `adaptiveBot = true`
  - otherwise `botDifficulty`

This branch already applies the single-control approach, so no overlap remains in Setup.

## Merge Checklist For Backend Developer

- No endpoint rename needed
- No payload contract migration needed
- Confirm logs do not show `invalid-argument` due to mode/queue mismatch
- Optional: keep strict validation as-is (it already matches the split behavior)
