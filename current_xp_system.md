# Current XP Earning System

> **Last Updated:** 2026-04-26
> This document reflects the **actual implemented behavior** of the XP system. Always verify against `src/services/gamificationService.ts` and `src/services/quizBattleService.ts` before making changes.
>
> For backend scoring upgrade requirements, see: [`docs/xp-scoring-backend-contract.md`](./docs/xp-scoring-backend-contract.md)

---

## How Students Earn XP

Students earn XP through five sources:

1. **Completing Lessons** — flat XP reward
2. **Completing Quizzes** — score-based XP
3. **Daily Login Streaks** — streak bonus XP
4. **Unlocking Achievements** — milestone XP
5. **Quiz Battles** (PvP or Bot) — outcome-based XP (server-authoritative)

---

## XP Rewards by Source

### 1. Lessons
- Completing a lesson: **+50 XP** (flat)

### 2. Quizzes (Module & Practice Center)
- Formula: `floor(score / 100 * 100)` — e.g. 85% → 85 XP, 100% → 100 XP
- Practice Center also applies percentage bonuses on top:
  - Score ≥ 90% → **+50% XP**
  - Score ≥ 80% → **+25% XP**
  - Speed bonus (>50% time remaining) → **+20% XP**

### 3. Daily Login Streak
- Formula: `streak_days * 5 XP`
- Cap: **50 XP per day** (reached at a 10-day streak)

### 4. Achievements
| Achievement | Requirement | XP Reward |
|:---|:---|:---|
| First Steps | Complete 1st lesson | 50 XP |
| Dedicated Learner | Complete 10 lessons | 200 XP |
| Perfect Score | Get 100% on any quiz | 150 XP |
| Week Warrior | 7-day login streak | 300 XP |
| Rising Star | Reach Level 5 | 250 XP |

### 5. Quiz Battles
**XP is awarded by match outcome, calculated server-side (Cloud Functions):**

| Outcome | Base XP | Performance XP | Max Per Match |
|:---|:---|:---|:---|
| Win | **60 XP** | +8% of round points earned | 140 XP |
| Draw | **40 XP** | +8% of round points earned | 140 XP |
| Loss | **20 XP** | +8% of round points earned | 140 XP |

> Source: `functions/src/triggers/quizBattleApi.ts` finalization block.
> **scoringVersion: 'v2'** — Performance-based formula activated 2026-04-28. Old flat XP (80/55/35) records remain via `scoringVersion: 'v1'` in history.

### Per-Round Scoring Engine

Each correct answer is scored with:
- **basePoints: 100**
- **difficultyMultiplier**: easy=1.0, medium=1.15, hard=1.30
- **streakMultiplier**: min(1.72, 1.00 + 0.10 × (streak-1))
- **speedBonus**: 0-20 pts based on response latency

Formula: `round(basePoints × difficultyMultiplier × streakMultiplier + speedBonus)`

### Daily XP Cap (Battles)
- **500 XP/day** from Quiz Battles
- Tracked on `studentBattleStats.battleXPEarnedToday` / `battleXPEarnedDate`
- Resets at midnight UTC
- Other XP sources (lessons, quizzes, achievements) are uncapped

---

## Score Multiplier (Quiz Battle) — Current Status: Visual Only

The **score multiplier** shown in the battle HUD (e.g. `1.24x`) is calculated on the frontend from consecutive correct answers. It currently affects:
- Visual animations and momentum tier labels (`Inferno`, `Heating Up`, `Steady`, `Rebuild`)
- The floating momentum delta text shown after each round

It does **not** affect the XP credited to the player's profile. Profile XP is based solely on match outcome (Win/Draw/Loss) from the server.

> **Future backend work required.** See [`docs/xp-scoring-backend-contract.md`](./docs/xp-scoring-backend-contract.md) for the full specification the backend developer must implement.

---

## In-Game XP Counter — Current Behavior & Label Decision

During a battle, the header shows a live counter (e.g. `+ 35 XP`). This is a **frontend-only performance estimate**, not the actual XP that will be credited.

**Decided approach (Phase 1 — Frontend Only):**
- The in-game counter is labeled **"Battle Score"** to distinguish it from real profile XP
- The match summary screen clearly separates:
  - **Battle Score** — performance points earned during the match (10 XP base per correct answer + streak bonus)
  - **Match Reward** — the actual XP credited to the profile (80 / 55 / 35 based on outcome)

This keeps the UI honest without requiring backend changes now.

**Formula for in-game Battle Score counter:**
```
Per correct answer:
  streak 1 → +10 pts
  streak 2 → +15 pts (10 base + 5 bonus)
  streak 3 → +20 pts (10 base + 10 bonus)
  streak 4+ → +25 pts (10 base + 15 bonus, capped)

Wrong answer → +0 pts, streak resets
```

---

## Daily XP Cap

A **500 XP/day cap** is enforced server-side for Quiz Battles only. Tracking lives on `studentBattleStats.battleXPEarnedToday` / `battleXPEarnedDate`, resetting at midnight UTC. Other XP sources (lessons, quizzes, achievements) remain uncapped.

---

## XP Types: Total vs Current

| Type | Purpose | Can Decrease? |
|:---|:---|:---|
| **Total XP** | Determines Level (lifetime, never decreases) | No |
| **Current XP** | Spendable currency for Avatar Shop | Yes — reduced when purchasing avatar items |

Spending Current XP does not affect Total XP or Level.

---

## Leveling Up

Level is determined by **Total (Lifetime) XP** using an exponential cumulative scale:

- Formula per threshold: `floor(100 * 1.5^(level-1))`
- Examples:
  - Level 2: 100 Total XP
  - Level 3: 250 Total XP
  - Level 4: 475 Total XP
  - Level 5: 812 Total XP

---

## Known Gaps (Tracked — Do Not Fix Without Coordination)

| Gap | Location | Impact | Owner |
|:---|:---|:---|:---|
| ~~Score multiplier is visual-only~~ | `QuizBattlePage.tsx` | ✅ Resolved via server scoring engine (v2) | ✅ Backend done (Phase 2) |
| ~~No daily XP cap~~ | `gamificationService.ts` | ✅ 500 XP/day server-enforced for battles | ✅ Backend done |
| Module quiz can double-award XP | `ModuleDetailView.tsx` + `gamificationService.ts` | Profile XP inflation | Backend (Phase 4) |
| ~~In-game counter ≠ awarded XP~~ | `QuizBattlePage.tsx` | ✅ Resolved via label split (Phase 1) + real scoring (Phase 2) | ✅ Completed |
