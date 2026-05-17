# MathPulse AI — Firestore Schema (Practice Center)

## Collection: practice_sessions

### Document: practice_sessions/{session_id}

Purpose: stores the generated question set for a practice session.

Ownership: user-owned via `userId`.

Written by: backend `/api/practice/generate` endpoint.

Read by: backend `/api/practice/submit` endpoint.

Retention: kept for debugging and audit, can be cleaned up after result is stored.

| Field | Type | Description |
|-------|------|-------------|
| session_id | string | UUID |
| userId | string | Firebase UID |
| subject | string | Subject name |
| competency | string | Competency/topic |
| difficulty | string | Practice, Challenge, or Mastery |
| questions | array | Array of question objects |
| generated_at | timestamp | When generated |

```json
{
  "session_id": "uuid string",
  "userId": "firebase uid",
  "subject": "Algebra | Geometry | ...",
  "competency": "string",
  "difficulty": "Practice | Challenge | Mastery",
  "questions": [
    {
      "id": "q1",
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_index": 1,
      "explanation": "Basic addition...",
      "competency": "Basic Arithmetic",
      "difficulty": "Practice",
      "bloomsLevel": "Remember"
    }
  ],
  "generated_at": "ISO timestamp"
}
```

**Indexes needed:** None, single doc reads by `session_id`.

## Collection: practice_results/{userId}/sessions

### Document: practice_results/{userId}/sessions/{session_id}

Purpose: stores the result of a completed practice session.

Ownership: user-owned subcollection under `practice_results/{userId}`.

Written by: backend `/api/practice/submit` endpoint.

Read by: backend `/api/practice/stats` and `/api/practice/history` endpoints.

| Field | Type | Description |
|-------|------|-------------|
| session_id | string | UUID |
| userId | string | Firebase UID |
| score_percent | number | Score percentage |
| correct_count | number | Correct answers |
| total | number | Total questions |
| xp_earned | number | XP earned |
| subject | string | Subject name |
| difficulty | string | Practice, Challenge, or Mastery |
| answers | array | Selected answers per question |
| per_question_feedback | array | Per-question feedback objects |
| submitted_at | timestamp | When submitted |

```json
{
  "session_id": "uuid string",
  "userId": "firebase uid",
  "score_percent": 80,
  "correct_count": 8,
  "total": 10,
  "xp_earned": 130,
  "subject": "Algebra",
  "difficulty": "Challenge",
  "answers": [
    { "question_id": "q1", "selected_index": 1 }
  ],
  "per_question_feedback": [
    {
      "question_id": "q1",
      "selected_index": 1,
      "correct_index": 1,
      "is_correct": true,
      "explanation": "..."
    }
  ],
  "submitted_at": "ISO timestamp"
}
```

**Indexes needed:** `submitted_at DESC` for history queries.

## User Stats Updated by Practice

| Field | Update Rule |
|-------|-------------|
| totalXP | Increment by `xp_earned` |
| quizzesCompleted | Increment by 1 |
| averageScore | Rolling average: `(old_avg * old_count + new_score) / (old_count + 1)` |

## Query Patterns

- `practice_results/{userId}/sessions` ordered by `submitted_at DESC` for history
- `practice_results/{userId}/sessions` limit 10 for recent sessions used in stats
- `users/{userId}` read `totalXP`, `quizzesCompleted`, `averageScore`
