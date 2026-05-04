# MathPulse AI: Practice Center Spec

**Project:** MathPulse AI
**Module:** Self-Paced Practice Center
**Target Stack:** React/Vite (Frontend), FastAPI (Backend), Firestore (Database)
**Version:** 2.0 (Includes Security & Edge Cases)

---

## 1. Executive Summary
This document outlines the architectural and functional requirements for transitioning the MathPulse AI Practice Center from a static quiz format to a dynamic, stateful learning loop. The system leverages Spaced Repetition and the first four levels of Bloom's Taxonomy to ensure mastery before progression. It also introduces a resource economy (Hearts/Keys) to balance the use of learning assist features (Hint/Reveal).

## 2. The Mastery Loop & Bloom's Taxonomy
Instead of delivering a fixed set of questions, the backend dynamically generates rounds based on the user's specific progress state for each topic. The system evaluates the first four levels of Bloom's Taxonomy using auto-gradable formats to maintain low latency.

*   **New** & **Retry** *(Remembering & Understanding)*: Tests basic recall and identification. If a "New" question is answered incorrectly, it becomes "Retry".
*   **Learning** *(Applying)*: Tests the ability to use concepts in standard problems. Reached after successfully answering a New/Retry question.
*   **Mastered** *(Analyzing)*: Tests multi-step logic or error identification. Reached after successfully answering a Learning question without bypassing.

### Round Progression Logic
*   **Phase 1 (Foundation):** 100% 'New' or 'Retry' questions. Must upgrade to 'Learning' to clear.
*   **Phase 2 (Application):** Introduces mid-tier problems. Interleaves recent 'Learning' questions. Correct answers push status to 'Mastered', incorrect drops them back.
*   **Phase 3 (Complexity):** Introduces analytical problems. Reintroduces 'Learning' concepts after a time delay (Spaced Repetition).
*   **Phase 4 (The Gauntlet):** A final retention check pulling only from 'Mastered' and 'Learning' tags to finalize module completion.

## 3. Learning Assistance Mechanics
To prevent frustration while maintaining the gamified challenge, users have access to three specific assistance actions during a problem. These actions tie into the Resource Economy.

*   **Hint (The Nudge):** Reveals a formula, eliminates a wrong option, or provides a partial step. *Cost: Small amount of consumable currency (e.g., 1 Key).*
*   **Reveal (The Bypass):** Instantly highlights the correct answer, preventing the user from getting stuck. *Cost: High amount of currency or zero XP yield for the question. Locks the question state from advancing to 'Mastered'.*
*   **Explain (The Teacher):** Unlocks only after the question is answered (correctly or incorrectly) or Revealed. Provides the complete pedagogical rationale. *Cost: Free (core learning mechanic).*

## 4. The Resource Economy (Lazy Evaluation)
To prevent infinite guessing without relying on heavy server chron jobs, time-based regeneration uses **Lazy Evaluation**.

### 4.1 Core Implementation
The Firestore user document stores `current_hearts` and `last_regen_timestamp`. When the client makes a request to FastAPI, the backend calculates the time delta from the timestamp, adds the regenerated hearts, updates the timestamp, and returns the fresh value to the client.

### 4.2 Security & Edge Cases [CRITICAL]
**The development team MUST implement the following safeguards to prevent economy exploitation and data corruption:**

*   **Clock Spoofing Prevention:** The backend must NEVER accept the current time from the React frontend payload. FastAPI must strictly use server-side UTC (e.g., `datetime.now(timezone.utc)`) or Firestore's native `FieldValue.serverTimestamp()` for all delta calculations.
*   **Max Capacity Overflow Clamp:** To handle users returning after long absences, the calculated regeneration must be clamped to the maximum allowed limit. *Equation:* `new_hearts = min(current_hearts + calculated_hearts, MAX_HEARTS)`.
*   **Economy Migration Standard:** The regeneration interval (e.g., 15 minutes) MUST NOT be hardcoded into the mathematical calculation function. It must be stored globally (in Firestore or as an environment variable) to allow for safe balancing adjustments in the future.
*   **Network Failure Resilience (Atomic Spending):** When a user spends a Key to unlock a Hint, the backend must use a **Firestore Transaction**. The deduction of the Key and the unlocking of the Hint state must happen atomically. If the connection drops before the transaction completes, the Key is not deducted, ensuring users do not unfairly lose resources.

## 5. Database Architecture (Firestore)
The system requires a shift from tracking overall quiz scores to tracking atomic question states per user in a `user_question_states` collection.

```json
{
  "user_id": "string",
  "question_id": "string",
  "topic_id": "string",
  "status": "string (New | Retry | Learning | Mastered)",
  "attempts": "integer",
  "last_seen_timestamp": "timestamp"
}
```

## 6. Backend API Strategy (FastAPI)
The React/Vite frontend must remain strictly as a UI renderer. All logic resides in FastAPI.

*   `GET /practice/generate-round`: Accepts `user_id` and `topic_id`. Queries Firestore for the user's states, calculates the required ratio of New/Learning/Retry questions based on the current Phase, and returns the bundled queue array to the frontend.
*   `POST /practice/submit-answer`: Evaluates the submitted answer against the correct answer. Runs the state-machine logic and updates the Firestore document accordingly. Modifies resource balances and returns the updated state.
