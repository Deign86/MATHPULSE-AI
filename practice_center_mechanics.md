# Practice Center Mechanics & Unified Engine Proposal

This document outlines the proposed mechanics for the Practice Center quizzes, ensuring they utilize the **Unified Point-Based Engine** while catering to a learning-focused environment rather than a competitive one.

## 1. Unified Point-Based Scoring
To eliminate the split-engine inconsistency, the Practice Center will use the exact same point formula as Quiz Battles:

**`Points = (Base * Difficulty) * Streak Multiplier + Speed Bonus`**

- **Base Correct Answer**: 100 Points.
- **Difficulty Multiplier**: Easy = 1.0x, Medium = 1.2x, Hard = 1.5x.
- **Streak Multiplier**: 1.0x to 1.5x depending on consecutive correct answers.
- **Speed Bonus**: Scales up to 50 points based on response speed.

---

## 2. The Learning Focus: Hint & Reveal Mechanics
Because the Practice Center is for learning, students should not be severely punished for struggling, but they should be incentivized to figure it out themselves.

We will introduce two new assistive features available **only** in the Practice Center (disabled in Quiz Battles):

### A. The "Hint" Feature
- **Effect**: Removes 2 incorrect options (50:50) or provides a small textual clue.
- **Trade-off**: The Base Points for this specific question are **halved** (drops from 100 to 50).
- **Motivation**: The student still earns points and continues their streak, rewarding them for ultimately choosing the correct answer.

### B. The "Reveal Answer" Feature
- **Effect**: Instantly selects the correct answer and automatically opens the step-by-step **Explanation**.
- **Trade-off**: The Base Points for this specific question drop to **0 Points**. It breaks the active streak.
- **Motivation**: Prioritizes learning. If a student is completely stuck, they can see exactly how the problem is solved without aimlessly guessing.

---

## 3. Practice Center Specific XP Economy
Since there is no "Winner" or "Loser" in the Practice Center, XP should be awarded based purely on milestones and performance thresholds, translated from their total Match Points.

*Total XP Earned = Base Completion XP + Performance Bonus XP*

- **Base Completion XP**: +30 XP for simply finishing the practice module.
- **Performance Bonuses**:
  - **Clean Sweep**: +20 XP (100% correct without using Reveals).
  - **Speed Demon**: +15 XP (Overall fast average response time).
  - **Independent Learner**: +15 XP (Completed the quiz without using any Hints or Reveals).

*Maximum possible XP from one Practice Quiz = 80 XP (30 Base + 20 Clean Sweep + 15 Speed + 15 Independent).*

---

## 4. Frontend Implementation Plan (Phase 1)
Since the backend will handle the final mathematical validations later, the frontend implementation involves:

1. **Adding Assistive UI Components**: 
   - A `Hint` button (with an icon) that disables 2 wrong choices and visually indicates a "50% Point Penalty".
   - A `Reveal & Explain` button that shows the correct answer and slides open an explanation panel.
2. **Integrating the Unified HUD**: 
   - Bring the visual Multiplier chips, Streak indicators, and Momentum UI from the Quiz Battle over to the Practice Center.
3. **Local Point Tracking**:
   - Update the local React state to tally `Match Points` using the new formula until the backend endpoint is ready to accept and validate the payload. 
4. **Post-Quiz Summary Screen**: 
   - Build a new completion screen that breaks down their Earned Points, Base XP, and any Performance Badges (Clean Sweep, Independent Learner, etc.) earned.
