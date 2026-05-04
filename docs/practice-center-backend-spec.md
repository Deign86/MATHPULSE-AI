# MathPulse AI: Practice Center - Backend Handoff Spec

## 1. Executive Summary
Backend requirements for the new gamified, dynamic Practice Center based on Bloom's Taxonomy. The system requires transitioning from rigid quizzes to a state-based Spaced Repetition system.

## 2. Database Schema Additions (Firestore)
### 2.1 Collection: `user_question_states`
Required to track the mastery loop for each atomic question. Multiple records per user.
```json
{
  "user_id": "string",
  "question_id": "string",
  "topic_id": "string",
  "status": "string", // Enum: "New" | "Retry" | "Learning" | "Mastered"
  "attempts": "integer", // Total times seen
  "last_seen_timestamp": "timestamp" // Firestore serverTimestamp
}
```

### 2.2 Revisions: `users` collection structure
Expand the `student` profile with economy fields:
```json
{
  "current_hearts": "integer",
  "max_hearts": "integer",
  "last_regen_timestamp": "timestamp",
  "current_keys": "integer"
}
```

## 3. Economy & Lazy Evaluation Mechanics [CRITICAL]
- **Time Source:** MUST use Server UTC (`datetime.now(timezone.utc)`) or `FieldValue.serverTimestamp()`. Do NOT trust client payloads for time.
- **Lazy Regen Logic:** On *any* request from a user, calculate: `time_delta = current_server_time - user.last_regen_timestamp`. Award hearts based on configured interval.
- **Clamp:** `new_hearts = min(current_hearts + awarded_hearts, MAX_HEARTS)`.
- **Transactions:** Spending a Key (Hint/Reveal) or spending a Heart (Incorrect Answer) MUST be wrapped in a Firestore Transaction to prevent race conditions and ensure atomic spending.
- **Config:** Store `REGEN_INTERVAL_MIN`, `MAX_HEARTS`, and cost values in Environment variables, not hardcoded.

## 4. API Endpoints (FastAPI)

### 4.1 `GET /practice/generate-round`
- **Params:** `user_id`, `topic_id`
- **Logic:** Query `user_question_states` for the topic.
- **Selection Algorithm:** Gather a mix based on Bloom's Phase (e.g., 60% New/Retry, 40% Learning/Mastered for Spaced Repetition depending on the user's ratio).
- **Return:** Array of question objects padded with current user state. Include the recalculated `current_hearts` from the lazy evaluator.

### 4.2 `POST /practice/submit-answer`
- **Payload:** `{ user_id, question_id, topic_id, selected_answer, used_reveal (boolean) }`
- **Logic:** 
  1. Grade answer.
  2. Proceed state machine:
     - IF Correct + New -> `Learning`
     - IF Incorrect + New/Learning -> `Retry`
     - IF Correct + Learning (No Reveal used) -> `Mastered`
  3. Deduct 1 Heart if incorrect (run lazy regen calc first using Firestore Transaction).
  4. Update `user_question_states` document.
- **Return:** Correct/Incorrect result, Explanation string, newly updated Status, and updated `current_hearts`/`current_keys` balances.

### 4.3 `POST /practice/use-assistance`
- **Payload:** `{ user_id, question_id, type: "Hint" | "Reveal" }`
- **Logic:**
  1. Firestore Transaction to deduct Keys based on `type` config.
  2. If insufficient keys, return HTTP 402/403.
- **Return:** Payload containing the Hint text or the Revealed answer string, and the updated `current_keys` balance.

## 5. Security Checklist
- [ ] Clock limit enforcement (server-side only).
- [ ] Atomic spends via Transactions.
- [ ] Economy config pulled from Env vars.