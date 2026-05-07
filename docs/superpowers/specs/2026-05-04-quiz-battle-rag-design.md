# Quiz Battle RAG-Powered Question Bank — Design Spec

**Date**: 2026-05-04  
**Status**: Approved  
**Author**: Sisyphus (AI Orchestrator)  
**Scope**: Backend (FastAPI + Firestore + Firebase Storage) + minimal frontend (teacher panel + debug badges)

---

## 1. Goals

1. **Ingest DepEd math curriculum PDFs** into a reusable, queryable question bank stored in Firestore.
2. **Cache the question bank** to avoid re-generation on every quiz session.
3. **Apply per-session variance** via DeepSeek (paraphrasing, choice shuffling, distractor regeneration, Filipino context swaps, numeric scaling).
4. **Integrate transparently** with existing Quiz Battle Cloud Functions so the 1,500-line frontend `QuizBattlePage.tsx` requires **zero changes**.

---

## 2. Architecture

```
Frontend (QuizBattlePage.tsx — NO CHANGES)
    │
    ▼
quizBattleService.ts (minimal param addition)
    │
    ▼
Firebase Cloud Functions (quizBattleApi.ts)
    │  ┌────────────────────────────────────────┐
    │  │ 1. Start match                        │
    │  │ 2. Call /api/quiz-battle/generate     │
    │  │ 3. Get varied questions               │
    │  │ 4. Embed in match state (as before)   │
    │  └────────────────────────────────────────┘
    │
    ▼ HTTPS
FastAPI Backend
    │
    ├── /api/quiz-battle/generate     → question_bank_service → variance_engine
    ├── /api/quiz-battle/ingest-pdf   → pdf_ingestion
    └── /api/quiz-battle/bank-status  → pdf_processing_status
    │
    ▼
Firestore ── question_bank, pdf_processing_status, quiz_battle_sessions
    │
    ▼
Firebase Storage ── quiz_pdfs/
```

**Integration pattern**: Cloud Functions call FastAPI as a question provider. FastAPI returns varied questions + `correct_answer` **over server-to-server HTTPS**. Cloud Functions strip `correct_answer` before sending to frontend. This is **Approach B** (trusted server-to-server).

---

## 3. Backend Modules

### 3.1 `backend/rag/pdf_ingestion.py`

**Purpose**: PDF → chunks → embeddings → base questions.

**Key function**:
```python
async def ingest_pdf(
    storage_path: str,
    grade_level: int,
    topic: str,
    force_reingest: bool = False,
) -> IngestionResult:
```

**Flow**:
1. Extract filename from `storage_path` → check `pdf_processing_status/{filename}.processed`
2. If `processed == true` and `force_reingest == false` → return cached result
3. Download PDF bytes from Firebase Storage via `blob.download_as_bytes()`
4. Extract text with `pypdf.PdfReader`
5. Chunk with `RecursiveCharacterTextSplitter` (~500 tokens, 50-token overlap)
6. Generate embeddings with `sentence-transformers` (`all-MiniLM-L6-v2`)
7. For each chunk, call DeepSeek with extraction prompt → 5 MCQs as JSON
8. Store questions in `question_bank/{grade_level}/{topic}/questions/{doc_id}`
9. Store embeddings in `question_bank_embeddings/{doc_id}` (float array)
10. Write manifest to `pdf_processing_status/{filename}`

**DeepSeek extraction prompt** (system + user):
```
You are a DepEd-aligned math question generator for Filipino students.
Given this curriculum excerpt:
<chunk>
Generate 5 multiple-choice questions. For each question output JSON:
{
  "question": "...",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A",
  "explanation": "...",
  "topic": "...",
  "difficulty": "easy|medium|hard",
  "grade_level": 7-12,
  "source_chunk_id": "..."
}
Return a JSON array only, no extra text.
```

**Return type**:
```python
class IngestionResult(BaseModel):
    filename: str
    processed: bool
    question_count: int
    grade_level: int
    topic: str
    storage_path: str
    timestamp: datetime
```

---

### 3.2 `backend/services/question_bank_service.py`

**Purpose**: Cache-aware question bank access.

**Key functions**:

```python
async def get_questions_for_battle(
    grade_level: int,
    topic: str,
    count: int = 10,
) -> list[dict]:
```
- Queries `question_bank/{grade_level}/{topic}/questions`
- Uses Firestore `random_seed` field for pseudo-random ordering:
  ```python
  random_threshold = random.random()
  query = (
      collection
      .where("random_seed", ">=", random_threshold)
      .order_by("random_seed")
      .limit(count)
  )
  ```
- If fewer than `count`, does a second query from the start to fill shortfall
- Returns question docs

```python
async def cache_session_questions(
    session_id: str,
    questions: list[dict],
    player_ids: list[str],
    grade_level: int,
    topic: str,
) -> None:
```
- Writes to `quiz_battle_sessions/{session_id}`:
  ```python
  {
      "player_ids": player_ids,
      "grade_level": grade_level,
      "topic": topic,
      "created_at": firestore.SERVER_TIMESTAMP,
      "variance_cached_until": datetime.now(timezone.utc) + timedelta(hours=24),
  }
  ```
- Writes questions to subcollection `quiz_battle_sessions/{session_id}/questions/`

```python
async def get_cached_session(session_id: str) -> Optional[dict]:
```
- Reads `quiz_battle_sessions/{session_id}`
- Returns questions + metadata if `variance_cached_until > now`
- Returns `None` if expired or missing

---

### 3.3 `backend/services/variance_engine.py`

**Purpose**: Per-session question variance via DeepSeek.

**Key function**:
```python
async def apply_variance(
    questions: list[dict],
    session_seed: int,
) -> list[dict]:
```

**Flow**:
1. Check `quiz_battle_sessions/{session_id}` for 24h cached variance result
2. If cache hit → return cached questions
3. Generate `session_seed = hash(session_id) % (2**32)`
4. Call DeepSeek with system + user prompt
5. Parse JSON response
6. If malformed JSON → fallback to pure-Python choice shuffling
7. Cache result in Firestore for 24 hours
8. Return varied questions

**DeepSeek system prompt**:
```
You are a math quiz variance engine for MathPulse AI, an educational platform for Filipino high school students following the DepEd K-12 curriculum.
Your job is to make quiz questions feel fresh each session WITHOUT changing the correct answer or difficulty level.
```

**DeepSeek user prompt**:
```
Given these {count} quiz battle questions as JSON:
<questions_json>

Apply the following variance techniques. Use session_seed={seed} for deterministic but varied output:

PARAPHRASE (30% chance per question): Reword the question stem using different phrasing, synonyms, or sentence structure. Do NOT change the math or the answer.

CHOICE SHUFFLE (always): Randomize the order of answer choices A/B/C/D. Update "correct_answer" to reflect the new position.

DISTRACTOR REFRESH (20% chance per question): Replace 1-2 wrong choices with new plausible-but-incorrect distractors that represent common student misconceptions for this topic. Keep the correct answer unchanged.

CONTEXT SWAP (10% chance per question): Replace real-world context variables (names, objects, currencies) with Filipino-localized equivalents (e.g., "pesos", "jeepney", "barangay") to increase cultural relevance.

NUMERIC SCALING (10% chance, only for computation problems): Scale numbers by a small integer factor (2x or 3x) so the method remains the same but the answer changes. Recompute the correct answer and all distractors accordingly.

Return the full modified questions array as valid JSON only. Keep all original fields.
Add a "variance_applied": ["paraphrase", "distractor_refresh", ...] field per question.
Do NOT change "topic", "difficulty", "grade_level", or "source_chunk_id".
```

**Fallback**:
```python
def _fallback_shuffle(questions: list[dict], seed: int) -> list[dict]:
    rng = random.Random(seed)
    for q in questions:
        choices = q["choices"].copy()
        correct_text = choices[ord(q["correct_answer"]) - ord("A")]
        rng.shuffle(choices)
        q["choices"] = choices
        q["correct_answer"] = chr(ord("A") + choices.index(correct_text))
        q["variance_applied"] = ["choice_shuffle"]
    return questions
```

---

### 3.4 `backend/routes/quiz_battle.py`

**Router**:
```python
router = APIRouter(prefix="/api/quiz-battle", tags=["quiz-battle"])
```

#### `POST /api/quiz-battle/generate`

**Request**:
```json
{
  "grade_level": 8,
  "topic": "linear_equations",
  "question_count": 10,
  "session_id": "uuid-string",
  "player_ids": ["uid1", "uid2"]
}
```

**Logic**:
1. `get_questions_for_battle(grade_level, topic, count)`
2. Check `get_cached_session(session_id)` — if valid, return cached
3. `session_seed = hash(session_id)`
4. `apply_variance(questions, session_seed)`
5. `cache_session_questions(session_id, varied, player_ids, grade_level, topic)`
6. Strip `correct_answer` from each question for public response
7. Return:
   ```json
   {
     "questions": [
       {
         "question": "...",
         "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
         "explanation": "...",
         "topic": "...",
         "difficulty": "medium",
         "grade_level": 8,
         "source_chunk_id": "...",
         "variance_applied": ["paraphrase", "choice_shuffle"]
       }
     ],
     "session_id": "uuid-string"
   }
   ```

**Server-to-server response** (used by Cloud Functions only, not exposed to frontend):
Same as above but **includes** `correct_answer` field. This is returned when a special `X-Internal-Service` header is present and validated against a shared secret.

#### `POST /api/quiz-battle/ingest-pdf`

**Auth**: `TEACHER_OR_ADMIN` (via `ROLE_POLICIES`)

**Request**:
```json
{
  "storage_path": "quiz_pdfs/grade_8/linear_equations.pdf",
  "grade_level": 8,
  "topic": "linear_equations",
  "force_reingest": false
}
```

**Response**:
```json
{
  "status": "processed",
  "filename": "linear_equations.pdf",
  "question_count": 45,
  "grade_level": 8,
  "topic": "linear_equations",
  "storage_path": "quiz_pdfs/grade_8/linear_equations.pdf",
  "timestamp": "2026-05-04T12:00:00Z"
}
```

#### `GET /api/quiz-battle/bank-status`

**Auth**: `TEACHER_OR_ADMIN`

**Response**:
```json
{
  "pdfs": [
    {
      "filename": "linear_equations.pdf",
      "processed": true,
      "timestamp": "2026-05-04T12:00:00Z",
      "question_count": 45,
      "grade_level": 8,
      "topic": "linear_equations",
      "storage_path": "quiz_pdfs/grade_8/linear_equations.pdf"
    }
  ]
}
```

---

## 4. Cloud Functions Integration

**File**: `functions/src/triggers/quizBattleApi.ts`

**Change**: In the question generation flow, add an HTTP call to FastAPI before embedding questions in match state.

**New code** (inserted into match start flow):
```typescript
const backendUrl = process.env.BACKEND_URL;
const internalSecret = process.env.QUIZ_BATTLE_INTERNAL_SECRET; // new env var

const response = await fetch(`${backendUrl}/api/quiz-battle/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceAccountToken}`,
    'Content-Type': 'application/json',
    'X-Internal-Service': internalSecret,
  },
  body: JSON.stringify({
    grade_level: matchConfig.gradeLevel || 11,
    topic: matchConfig.topic || 'general_mathematics',
    question_count: matchConfig.questionCount || 10,
    session_id: matchId,
    player_ids: match.playerIds,
  }),
});

const data = await response.json();

// Map to BattleQuestionTemplate (correct_answer kept server-side for scoring)
const questions = data.questions.map((q: any, idx: number) => ({
  questionId: `${q.source_chunk_id}_${idx}`,
  prompt: q.question,
  choices: q.choices,
  correctOptionIndex: ord(q.correct_answer) - ord('A'), // server-side only
  difficulty: q.difficulty,
  varianceApplied: q.variance_applied || [],
}));
```

**Environment variable additions** (for Cloud Functions):
```
QUIZ_BATTLE_INTERNAL_SECRET=shared_secret_between_cf_and_fastapi
```

---

## 5. Firestore Schema

### `question_bank/{grade_level}/{topic}/questions/{doc_id}`
```json
{
  "question": "What is the slope of y = 3x + 2?",
  "choices": ["A) 2", "B) 3", "C) -3", "D) 0"],
  "correct_answer": "B",
  "explanation": "The slope-intercept form is y = mx + b, where m is the slope.",
  "topic": "linear_equations",
  "difficulty": "easy",
  "grade_level": 8,
  "source_chunk_id": "chunk_abc123",
  "random_seed": 0.7234,
  "created_at": "2026-05-04T12:00:00Z"
}
```

### `pdf_processing_status/{pdf_filename}`
```json
{
  "processed": true,
  "timestamp": "2026-05-04T12:00:00Z",
  "question_count": 45,
  "grade_level": 8,
  "topic": "linear_equations",
  "storage_path": "quiz_pdfs/grade_8/linear_equations.pdf"
}
```

### `quiz_battle_sessions/{session_id}`
```json
{
  "player_ids": ["uid1", "uid2"],
  "grade_level": 8,
  "topic": "linear_equations",
  "created_at": "2026-05-04T12:00:00Z",
  "variance_cached_until": "2026-05-05T12:00:00Z"
}
```

**Subcollection**: `quiz_battle_sessions/{session_id}/questions/{q_idx}`  
Same schema as `question_bank` questions but with `variance_applied` field.

---

## 6. Firestore Rules Additions

```javascript
// ── Question bank (read for all authenticated users) ──
match /question_bank/{gradeLevel}/{topic}/{questionId} {
  allow read: if isSignedIn();
  allow write: if false; // Backend-only via firebase-admin
}

// ── PDF processing status (read for teachers/admins) ──
match /pdf_processing_status/{docId} {
  allow read: if isTeacherOrAdmin();
  allow write: if false; // Backend-only
}

// ── Quiz battle sessions (read for participants) ──
match /quiz_battle_sessions/{sessionId} {
  allow read: if isSignedIn() && resource.data.player_ids.hasAny([request.auth.uid]);
  allow write: if false; // Backend-only
}
```

---

## 7. Frontend Integration (Minimal)

### 7.1 `src/services/quizBattleService.ts` (minimal)
- Add optional `gradeLevel?: number` and `topic?: string` to `createQuizBattleBotMatch()` and `joinQuizBattleQueue()`
- Pass through to Cloud Functions callables — no other changes

### 7.2 Teacher Dashboard Panel
- Reuse `AdminContent.tsx` pattern: stats cards, filter bar, data table, modal form
- **Stats cards**: Total PDFs processed, Total questions in bank, PDFs pending
- **Table columns**: Filename, Grade, Topic, Questions, Status, Processed At
- **Actions**: Re-ingest button (with `force_reingest=true`)
- **Upload trigger**: File picker → uploads to Firebase Storage `quiz_pdfs/{grade_level}/` → calls `POST /api/quiz-battle/ingest-pdf`

### 7.3 Debug Badges
- In `BattleActiveContent.tsx` or `QuizBattlePage.tsx`
- Display `variance_applied` badges only when `window.location.search.includes('debug=true')`
- Badge style: small pill below question text, e.g., "Paraphrase • Choice Shuffle"

---

## 8. Dependencies & Environment

### `backend/requirements.txt` additions:
```
pypdf>=4.0.0
sentence-transformers>=2.7.0
numpy>=1.26.0
openai>=1.30.0
```

### `backend/.env.example` additions:
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### Cloud Functions `.env` additions:
```
QUIZ_BATTLE_INTERNAL_SECRET=shared_secret_between_cf_and_fastapi
```

---

## 9. Key Constraints

| # | Constraint | Implementation |
|---|---|---|
| 1 | Never re-ingest unless `force_reingest=true` | `pdf_ingestion.py` checks `pdf_processing_status/{filename}.processed` before any work |
| 2 | Variance is per-session, bank stays canonical | `variance_engine.py` reads from `question_bank`, writes varied copy to `quiz_battle_sessions` |
| 3 | Fallback if variance engine fails | `_fallback_shuffle()` — pure Python, no LLM call |
| 4 | Rate limit DeepSeek variance calls | 24h Firestore cache keyed by `session_id` |
| 5 | All new routes respect existing Firebase Auth | Add to `ROLE_POLICIES` dict in `main.py` |
| 6 | Follow existing code style | Snake_case Python, Pydantic models, FastAPI `APIRouter`, module-level Firestore client |

---

## 10. Testing Strategy

| Test | Location | Scope |
|---|---|---|
| PDF ingestion unit test | `backend/tests/test_quiz_battle.py` | Mock Firebase Storage, mock DeepSeek, verify Firestore writes |
| Question bank service unit test | `backend/tests/test_quiz_battle.py` | Mock Firestore, verify random query + cache logic |
| Variance engine unit test | `backend/tests/test_quiz_battle.py` | Mock DeepSeek, verify JSON parse + fallback shuffle |
| Route integration test | `backend/tests/test_quiz_battle.py` | FastAPI TestClient, verify auth + response shape |
| Cloud Functions integration | `functions/src/triggers/quizBattleApi.test.ts` | Verify FastAPI call mock + question mapping |

---

## 11. Rollout Plan

1. **Phase 1 — Backend**: Create `pdf_ingestion.py`, `question_bank_service.py`, `variance_engine.py`, `quiz_battle.py` routes. Register in `main.py`. Add dependencies.
2. **Phase 2 — Firestore**: Update `firestore.rules`. Manually test ingestion with sample PDF.
3. **Phase 3 — Cloud Functions**: Add FastAPI call to `quizBattleApi.ts`. Deploy with new env var.
4. **Phase 4 — Frontend**: Add teacher panel + debug badges. Deploy.
5. **Phase 5 — Validation**: Run full quiz battle E2E. Verify variance badges in debug mode.

---

**Approved by**: User (2026-05-04)  
**Approach B confirmed**: Correct answers returned server-to-server only (Cloud Functions store for scoring, frontend never sees them).
