# MathPulse AI: Practice Center - Frontend Changes

## 1. Overview
Transition the Practice Center from static quizzes to a stateful, dynamic learning loop.
This document outlines the React/Vite implementation tasks.

## 2. Global Rules & Guidelines
- **Animations:** Use `motion/react` with WAAPI-backed animations (transform, opacity) by default. Avoid layout-triggering properties. Only use Motion's hybrid/JS features when WAAPI cannot cleanly support the effect (and explain usage when committing).
- **UI/UX:** Adhere to `ui-ux-pro-max` aesthetic defaults defined for MathPulse AI (radix-ui composites + tailwind variants).
- **Time/Regen:** Do NOT send timestamps from the client. Let the backend handle all time calculation to prevent spoofing.

## 3. New Components to Scaffold
- `PracticeCenterPage.tsx`: The main orchestrator for the practice view.
- `QuestionCard.tsx`: The animated card component displaying the active question. Must visualize the Bloom's progression state (`New`, `Retry`, `Learning`, `Mastered`). 
- `AssistanceBar.tsx`: Houses the 3 new mechanics:
  - **Hint (The Nudge)**: Costs currency.
  - **Reveal (The Bypass)**: Costs high currency, disables 'Mastered' progression.
  - **Explain**: Free, unlocked only *after* answering or revealing.
- `ResourceHUD.tsx`: Shows Hearts (Health), Keys (Hints/Reveals), and the Regeneration Timer visually counting down between backend syncs.

## 4. Hooks & State Management
- `usePracticeRound(topicId)`
  - Calls `GET /practice/generate-round`.
  - Maintains the queue of questions for the current session.
- `usePracticeInteraction()`
  - Calls `POST /practice/submit-answer` for regular answers.
  - Updates local Resource HUD optimistically, then syncs with API response.
- `useAssistanceAction()`
  - Coordinates spending Keys for *Hint* or *Reveal*. Handles API loading/error states.

## 5. Phase 1 Implementation Plan for Frontend
1. Build `ResourceHUD` and `AssistanceBar` statically.
2. Build `QuestionCard` with dynamic `motion/react` WAAPI entrance/exit transitions.
3. Wire up `usePracticeRound` with mocked backend responses to verify the state transitions.
4. Implement offline/error states if the economy backend rejects a transaction.

## 6. Implementation Notes for Frontend Dev
- Wait for the API contracts from the backend developer (refer to `practice-center-backend-spec.md` for what to expect).
- Mock the API responses in a `practiceMocks.ts` file initially so frontend development is unblocked.

## 7. Current UI Alignment Work
- The active lesson quiz shell is being compacted to mirror the Quiz Battle layout more closely.
- Match the battle-style header hierarchy in `InteractiveLesson.tsx`: top-left HUD/progress, centered subject-topic chip, and top-right fullscreen/audio/menu controls.
- Keep the question card and answer card visually separated; do not merge the prompt and choices into one surface.
- Remove circular radio indicators from multiple-choice tiles so the options read as dense battle choices instead of form inputs.
- Place Hint, Reveal, and Explain as subtle bottom action buttons with lightweight color accents.
- Keep the progress bar as the existing segmented square/dot system; only relocate it into the battle-style HUD area.