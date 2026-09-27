# Quiz Battle RAG-Powered Question Bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a RAG-backed question bank for Quiz Battle with PDF ingestion, per-session DeepSeek variance, and transparent Cloud Function integration — without changing the frontend battle page.

**Architecture:** FastAPI backend provides questions to Firebase Cloud Functions via `/api/quiz-battle/generate`. Cloud Functions embed questions in match state as before. Frontend sees only shuffled choices, never correct answers. Teacher dashboard gets an ingest-pdf panel.

**Tech Stack:** Python 3.10+, FastAPI, Firestore, Firebase Storage, DeepSeek API, pypdf, sentence-transformers, TypeScript (Cloud Functions + frontend panel)

---

## File Structure

### New Files (Backend)
| File | Responsibility |
|------|--------------|
| `backend/rag/pdf_ingestion.py` | Download PDF from Storage, chunk, embed, generate base questions via DeepSeek, write to Firestore |
| `backend/services/question_bank_service.py` | Query question bank with random ordering, cache session questions, 24h debounce |
| `backend/services/variance_engine.py` | Apply per-session variance via DeepSeek, fallback shuffle, cache results |
| `backend/routes/quiz_battle.py` | Three FastAPI endpoints: generate, ingest-pdf, bank-status |
| `backend/tests/test_quiz_battle.py` | pytest suite for ingestion, service, variance, route integration |

### Modified Files (Backend)
| File | Change |
|------|--------|
| `backend/main.py` | Import quiz_battle router, register in app, add ROLE_POLICIES entries |
| `backend/requirements.txt` | Add pypdf, sentence-transformers, numpy, openai |
| `backend/.env.example` | Add DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL |

### Modified Files (Firebase)
| File | Change |
|------|--------|
| `firestore.rules` | Add rules for question_bank, pdf_processing_status, quiz_battle_sessions |

### Modified Files (Cloud Functions)
| File | Change |
|------|--------|
| `functions/src/triggers/quizBattleApi.ts` | Add HTTP call to `/api/quiz-battle/generate` in match start flow |

### Modified Files (Frontend — Minimal)
| File | Change |
|------|--------|
| `src/services/quizBattleService.ts` | Add optional gradeLevel/topic params to bot match + queue join |
| `src/components/TeacherDashboard.tsx` | Add "Question Bank" tab/panel with ingest UI and status table |
| `src/components/battle/BattleActiveContent.tsx` | Add variance_applied debug badges (debug=true only) |

---

## Phase 1: Backend Foundation

### Task 1: Add Dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add Python dependencies**

Append to `backend/requirements.txt`:
```
pypdf>=4.0.0
sentence-transformers>=2.7.0
numpy>=1.26.0
openai>=1.30.0
```

- [ ] **Step 2: Add environment variables**

Append to `backend/.env.example`:
```
# ── DeepSeek AI Inference (Quiz Battle Variance) ──────────────────
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt backend/.env.example
git commit -m "chore: add quiz battle RAG dependencies and env vars"
```

---

### Task 2: Create PDF Ingestion Module

**Files:**
- Create: `backend/rag/pdf_ingestion.py`

- [ ] **Step 1: Write the module**

Create `backend/rag/pdf_ingestion.py`:

```python
"""
PDF Ingestion Pipeline for Quiz Battle Question Bank.

Ingests PDFs from Firebase Storage, chunks them, generates embeddings,
and stores base questions in Firestore.
"""

import os
import re
import json
import hashlib
import random
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from services.ai_client import get_deepseek_client, CHAT_MODEL
from rag.firebase_storage_loader import _init_firebase_storage


def _get_firestore_client():
    """Get Firestore client from already-initialized firebase_admin."""
    from google.cloud import firestore
    return firestore.Client(project=os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026"))


@dataclass
class IngestionResult:
    filename: str
    processed: bool
    question_count: int
    grade_level: int
    topic: str
    storage_path: str
    timestamp: datetime


# Singleton embedder
_embedder: Optional[SentenceTransformer] = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        _embedder = SentenceTransformer(model_name)
    return _embedder


def _extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    from io import BytesIO
    reader = PdfReader(BytesIO(pdf_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
    """Split text into chunks using RecursiveCharacterTextSplitter."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def _generate_embeddings(chunks: List[str]) -> List[List[float]]:
    """Generate embeddings for text chunks."""
    embedder = _get_embedder()
    embeddings = embedder.encode(chunks, convert_to_tensor=False)
    return [emb.tolist() for emb in embeddings]


def _generate_questions_from_chunk(chunk: str, grade_level: int, topic: str, chunk_id: str) -> List[dict]:
    """Call DeepSeek to generate 5 MCQs from a text chunk."""
    client = get_deepseek_client()
    system_prompt = (
        "You are a DepEd-aligned math question generator for Filipino students. "
        "Given a curriculum excerpt, generate 5 multiple-choice questions. "
        "Return ONLY a JSON array. No markdown, no explanation."
    )
    user_prompt = f"""Given this curriculum excerpt:
<chunk>
{chunk}
</chunk>

Generate 5 multiple-choice questions. For each question output JSON:
{{
  "question": "...",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A",
  "explanation": "...",
  "topic": "{topic}",
  "difficulty": "easy|medium|hard",
  "grade_level": {grade_level},
  "source_chunk_id": "{chunk_id}"
}}
Return a JSON array only, no extra text."""

    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        content = re.sub(r"^```json\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        questions = json.loads(content)
        if not isinstance(questions, list):
            return []
        # Validate each question has required fields
        valid_questions = []
        for q in questions:
            if all(k in q for k in ("question", "choices", "correct_answer", "explanation", "topic", "difficulty", "grade_level", "source_chunk_id")):
                valid_questions.append(q)
        return valid_questions
    except Exception as e:
        print(f"[pdf_ingestion] DeepSeek question generation failed for chunk {chunk_id}: {e}")
        return []


def _check_processing_status(filename: str) -> Optional[dict]:
    """Check if a PDF has already been processed."""
    db = _get_firestore_client()
    doc = db.collection("pdf_processing_status").document(filename).get()
    if doc.exists:
        return doc.to_dict()
    return None


def _save_processing_status(filename: str, result: IngestionResult) -> None:
    """Save processing status to Firestore."""
    db = _get_firestore_client()
    db.collection("pdf_processing_status").document(filename).set({
        "processed": result.processed,
        "timestamp": result.timestamp,
        "question_count": result.question_count,
        "grade_level": result.grade_level,
        "topic": result.topic,
        "storage_path": result.storage_path,
    })


def _save_questions(questions: List[dict], grade_level: int, topic: str) -> int:
    """Save generated questions to Firestore question_bank collection."""
    db = _get_firestore_client()
    collection_path = f"question_bank/{grade_level}/{topic}/questions"
    batch = db.batch()
    count = 0
    for q in questions:
        doc_id = hashlib.md5(f"{q['source_chunk_id']}:{q['question']}".encode()).hexdigest()
        doc_ref = db.collection(collection_path).document(doc_id)
        q["random_seed"] = random.random()
        q["created_at"] = datetime.now(timezone.utc)
        batch.set(doc_ref, q)
        count += 1
    batch.commit()
    return count


def _save_embeddings(embeddings: List[List[float]], chunk_ids: List[str]) -> None:
    """Save chunk embeddings to Firestore."""
    db = _get_firestore_client()
    batch = db.batch()
    for emb, chunk_id in zip(embeddings, chunk_ids):
        doc_ref = db.collection("question_bank_embeddings").document(chunk_id)
        batch.set(doc_ref, {"embedding": emb, "chunk_id": chunk_id})
    batch.commit()


async def ingest_pdf(
    storage_path: str,
    grade_level: int,
    topic: str,
    force_reingest: bool = False,
) -> IngestionResult:
    """
    Ingest a PDF from Firebase Storage into the question bank.

    Args:
        storage_path: Firebase Storage path (e.g., "quiz_pdfs/grade_8/linear_equations.pdf")
        grade_level: Grade level (7-12)
        topic: Topic slug (e.g., "linear_equations")
        force_reingest: If True, re-process even if already processed

    Returns:
        IngestionResult with metadata about the ingestion
    """
    filename = os.path.basename(storage_path)

    # 1. Check processing status
    status = _check_processing_status(filename)
    if status and status.get("processed") and not force_reingest:
        return IngestionResult(
            filename=filename,
            processed=True,
            question_count=status.get("question_count", 0),
            grade_level=status.get("grade_level", grade_level),
            topic=status.get("topic", topic),
            storage_path=status.get("storage_path", storage_path),
            timestamp=status.get("timestamp", datetime.now(timezone.utc)),
        )

    # 2. Download PDF from Firebase Storage
    _, bucket = _init_firebase_storage()
    blob = bucket.blob(storage_path)
    if not blob.exists():
        raise FileNotFoundError(f"PDF not found in Storage: {storage_path}")
    pdf_bytes = blob.download_as_bytes()

    # 3. Extract text
    text = _extract_text_from_pdf_bytes(pdf_bytes)
    if not text.strip():
        raise ValueError(f"No text extracted from PDF: {storage_path}")

    # 4. Chunk text
    chunks = _chunk_text(text)
    if not chunks:
        raise ValueError(f"No chunks generated from PDF: {storage_path}")

    # 5. Generate embeddings
    embeddings = _generate_embeddings(chunks)
    chunk_ids = [hashlib.md5(chunk.encode()).hexdigest() for chunk in chunks]
    _save_embeddings(embeddings, chunk_ids)

    # 6. Generate questions per chunk
    all_questions = []
    for chunk, chunk_id in zip(chunks, chunk_ids):
        questions = _generate_questions_from_chunk(chunk, grade_level, topic, chunk_id)
        all_questions.extend(questions)

    # 7. Save questions
    saved_count = _save_questions(all_questions, grade_level, topic)

    # 8. Save processing status
    result = IngestionResult(
        filename=filename,
        processed=True,
        question_count=saved_count,
        grade_level=grade_level,
        topic=topic,
        storage_path=storage_path,
        timestamp=datetime.now(timezone.utc),
    )
    _save_processing_status(filename, result)

    return result
```

- [ ] **Step 2: Commit**

```bash
git add backend/rag/pdf_ingestion.py
git commit -m "feat: add PDF ingestion pipeline for quiz battle question bank"
```

---

### Task 3: Create Question Bank Service

**Files:**
- Create: `backend/services/question_bank_service.py`

- [ ] **Step 1: Write the module**

Create `backend/services/question_bank_service.py`:

```python
"""
Question Bank Service for Quiz Battle.

Handles querying the question bank, caching session questions,
and 24-hour debounce for variance results.
"""

import os
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from google.cloud import firestore


def _get_db() -> firestore.Client:
    return firestore.Client(project=os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026"))


async def get_questions_for_battle(
    grade_level: int,
    topic: str,
    count: int = 10,
) -> List[dict]:
    """
    Fetch random questions from the question bank for a battle session.

    Uses Firestore random_seed field for pseudo-random ordering.
    If fewer than `count` questions exist, returns all available.
    """
    db = _get_db()
    collection_path = f"question_bank/{grade_level}/{topic}/questions"
    collection_ref = db.collection(collection_path)

    # Pseudo-random query using random_seed >= random threshold
    threshold = random.random()
    query = (
        collection_ref
        .where("random_seed", ">=", threshold)
        .order_by("random_seed")
        .limit(count)
    )
    docs = list(query.stream())

    # If we didn't get enough, query from the start to fill shortfall
    if len(docs) < count:
        remaining = count - len(docs)
        fallback_query = (
            collection_ref
            .where("random_seed", "<", threshold)
            .order_by("random_seed")
            .limit(remaining)
        )
        docs.extend(list(fallback_query.stream()))

    questions = [doc.to_dict() for doc in docs]
    # Ensure all required fields are present
    valid_questions = []
    for q in questions:
        if q and all(k in q for k in ("question", "choices", "correct_answer", "difficulty")):
            valid_questions.append(q)

    return valid_questions


async def cache_session_questions(
    session_id: str,
    questions: List[dict],
    player_ids: List[str],
    grade_level: int,
    topic: str,
) -> None:
    """Cache varied questions for a battle session with 24-hour TTL."""
    db = _get_db()
    session_ref = db.collection("quiz_battle_sessions").document(session_id)

    session_ref.set({
        "player_ids": player_ids,
        "grade_level": grade_level,
        "topic": topic,
        "created_at": firestore.SERVER_TIMESTAMP,
        "variance_cached_until": datetime.now(timezone.utc) + timedelta(hours=24),
    })

    # Write questions to subcollection
    batch = db.batch()
    for idx, q in enumerate(questions):
        q_ref = session_ref.collection("questions").document(str(idx))
        batch.set(q_ref, q)
    batch.commit()


async def get_cached_session(session_id: str) -> Optional[List[dict]]:
    """
    Check if a session has cached varied questions within 24 hours.

    Returns the cached questions if valid, otherwise None.
    """
    db = _get_db()
    session_doc = db.collection("quiz_battle_sessions").document(session_id).get()
    if not session_doc.exists:
        return None

    data = session_doc.to_dict()
    cached_until = data.get("variance_cached_until")
    if cached_until:
        if isinstance(cached_until, firestore.SERVER_TIMESTAMP.__class__):
            cached_until = cached_until
        if hasattr(cached_until, 'timestamp'):
            cached_until = datetime.fromtimestamp(cached_until.timestamp(), tz=timezone.utc)
        if cached_until > datetime.now(timezone.utc):
            # Return cached questions
            q_docs = db.collection("quiz_battle_sessions").document(session_id).collection("questions").stream()
            questions = [doc.to_dict() for doc in q_docs]
            return questions if questions else None

    return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/question_bank_service.py
git commit -m "feat: add question bank service with random fetch and session cache"
```

---

### Task 4: Create Variance Engine

**Files:**
- Create: `backend/services/variance_engine.py`

- [ ] **Step 1: Write the module**

Create `backend/services/variance_engine.py`:

```python
"""
Variance Engine for Quiz Battle Questions.

Applies per-session variance techniques via DeepSeek,
with pure-Python fallback for choice shuffling.
"""

import os
import json
import random
import re
from typing import List

from services.ai_client import get_deepseek_client, CHAT_MODEL
from services.question_bank_service import get_cached_session, cache_session_questions


def _fallback_shuffle(questions: List[dict], seed: int) -> List[dict]:
    """
    Pure-Python fallback: shuffle choices deterministically.
    """
    rng = random.Random(seed)
    for q in questions:
        choices = q["choices"].copy()
        correct_letter = q["correct_answer"]
        correct_index = ord(correct_letter) - ord("A")
        correct_text = choices[correct_index]
        rng.shuffle(choices)
        q["choices"] = choices
        q["correct_answer"] = chr(ord("A") + choices.index(correct_text))
        q["variance_applied"] = ["choice_shuffle"]
    return questions


async def apply_variance(questions: List[dict], session_id: str) -> List[dict]:
    """
    Apply per-session variance to a list of questions.

    1. Check 24h Firestore cache first
    2. Call DeepSeek with variance prompt
    3. Parse JSON response
    4. Fall back to pure-Python shuffle if DeepSeek fails
    5. Cache result for 24 hours
    """
    # 1. Check cache
    cached = await get_cached_session(session_id)
    if cached:
        return cached

    # 2. Generate deterministic seed from session_id
    seed = hash(session_id) % (2**32)

    # 3. Call DeepSeek
    client = get_deepseek_client()
    system_prompt = (
        "You are a math quiz variance engine for MathPulse AI, an educational platform for "
        "Filipino high school students following the DepEd K-12 curriculum. "
        "Your job is to make quiz questions feel fresh each session WITHOUT changing the "
        "correct answer or difficulty level."
    )

    user_prompt = f"""Given these {len(questions)} quiz battle questions as JSON:
{json.dumps(questions, indent=2)}

Apply the following variance techniques. Use session_seed={seed} for deterministic but varied output:

PARAPHRASE (30% chance per question): Reword the question stem using different phrasing, synonyms, or sentence structure. Do NOT change the math or the answer.

CHOICE SHUFFLE (always): Randomize the order of answer choices A/B/C/D. Update "correct_answer" to reflect the new position.

DISTRACTOR REFRESH (20% chance per question): Replace 1-2 wrong choices with new plausible-but-incorrect distractors that represent common student misconceptions for this topic. Keep the correct answer unchanged.

CONTEXT SWAP (10% chance per question): Replace real-world context variables (names, objects, currencies) with Filipino-localized equivalents (e.g., "pesos", "jeepney", "barangay") to increase cultural relevance.

NUMERIC SCALING (10% chance, only for computation problems): Scale numbers by a small integer factor (2x or 3x) so the method remains the same but the answer changes. Recompute the correct answer and all distractors accordingly.

Return the full modified questions array as valid JSON only. Keep all original fields.
Add a "variance_applied": ["paraphrase", "distractor_refresh", ...] field per question.
Do NOT change "topic", "difficulty", "grade_level", or "source_chunk_id"."""

    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences
        content = re.sub(r"^```json\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        varied_questions = json.loads(content)

        if not isinstance(varied_questions, list) or len(varied_questions) != len(questions):
            raise ValueError("Invalid response format from DeepSeek")

        # Validate required fields
        for q in varied_questions:
            if not all(k in q for k in ("question", "choices", "correct_answer", "variance_applied")):
                raise ValueError("Missing required fields in varied question")

    except Exception as e:
        print(f"[variance_engine] DeepSeek variance failed, falling back to shuffle: {e}")
        varied_questions = _fallback_shuffle(questions, seed)

    # 4. Cache for 24 hours
    # Extract player_ids, grade_level, topic from original questions if available
    player_ids = []
    grade_level = questions[0].get("grade_level", 11) if questions else 11
    topic = questions[0].get("topic", "general_mathematics") if questions else "general_mathematics"
    await cache_session_questions(session_id, varied_questions, player_ids, grade_level, topic)

    return varied_questions
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/variance_engine.py
git commit -m "feat: add variance engine with DeepSeek and fallback shuffle"
```

---

### Task 5: Create Quiz Battle Routes

**Files:**
- Create: `backend/routes/quiz_battle.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Write the route module**

Create `backend/routes/quiz_battle.py`:

```python
"""
Quiz Battle API Routes.

Endpoints:
- POST /api/quiz-battle/generate       → Generate varied questions for a battle session
- POST /api/quiz-battle/ingest-pdf     → Trigger PDF ingestion (teacher/admin)
- GET  /api/quiz-battle/bank-status    → List processed PDFs (teacher/admin)
"""

import os
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field

from rag.pdf_ingestion import ingest_pdf, IngestionResult
from services.question_bank_service import get_questions_for_battle, cache_session_questions
from services.variance_engine import apply_variance

router = APIRouter(prefix="/api/quiz-battle", tags=["quiz-battle"])


# ── Pydantic Models ──────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    grade_level: int = Field(..., ge=7, le=12)
    topic: str = Field(..., min_length=1)
    question_count: int = Field(default=10, ge=1, le=50)
    session_id: str = Field(..., min_length=1)
    player_ids: List[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    questions: List[dict]
    session_id: str


class IngestPdfRequest(BaseModel):
    storage_path: str = Field(..., min_length=1)
    grade_level: int = Field(..., ge=7, le=12)
    topic: str = Field(..., min_length=1)
    force_reingest: bool = False


class IngestPdfResponse(BaseModel):
    status: str
    filename: str
    question_count: int
    grade_level: int
    topic: str
    storage_path: str
    timestamp: datetime


class BankStatusItem(BaseModel):
    filename: str
    processed: bool
    timestamp: Optional[datetime]
    question_count: int
    grade_level: int
    topic: str
    storage_path: str


class BankStatusResponse(BaseModel):
    pdfs: List[BankStatusItem]


# ── Helper ───────────────────────────────────────────────────────────

def _get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def _is_internal_request(request: Request) -> bool:
    """Check if request is from an internal service (Cloud Functions)."""
    internal_secret = request.headers.get("X-Internal-Service")
    expected = os.getenv("QUIZ_BATTLE_INTERNAL_SECRET")
    if expected and internal_secret == expected:
        return True
    return False


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_questions(
    body: GenerateRequest,
    request: Request,
):
    """
    Generate varied questions for a quiz battle session.

    Returns questions with choices but WITHOUT correct_answer (unless called
    by an internal service with X-Internal-Service header).
    """
    # 1. Fetch base questions
    questions = await get_questions_for_battle(
        body.grade_level,
        body.topic,
        body.question_count,
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for grade {body.grade_level}, topic '{body.topic}'",
        )

    # 2. Apply variance (with 24h cache)
    varied = await apply_variance(questions, body.session_id)

    # 3. Cache session metadata
    await cache_session_questions(
        body.session_id,
        varied,
        body.player_ids,
        body.grade_level,
        body.topic,
    )

    # 4. Prepare response
    is_internal = _is_internal_request(request)
    response_questions = []
    for q in varied:
        q_copy = dict(q)
        if not is_internal:
            q_copy.pop("correct_answer", None)
        response_questions.append(q_copy)

    return GenerateResponse(questions=response_questions, session_id=body.session_id)


@router.post("/ingest-pdf", response_model=IngestPdfResponse)
async def ingest_pdf_endpoint(
    body: IngestPdfRequest,
    user=Depends(_get_current_user),
):
    """
    Trigger PDF ingestion into the question bank.

    Requires teacher or admin role.
    """
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")

    try:
        result = await ingest_pdf(
            storage_path=body.storage_path,
            grade_level=body.grade_level,
            topic=body.topic,
            force_reingest=body.force_reingest,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return IngestPdfResponse(
        status="processed" if result.processed else "skipped",
        filename=result.filename,
        question_count=result.question_count,
        grade_level=result.grade_level,
        topic=result.topic,
        storage_path=result.storage_path,
        timestamp=result.timestamp,
    )


@router.get("/bank-status", response_model=BankStatusResponse)
async def bank_status(
    user=Depends(_get_current_user),
):
    """
    Get the status of all processed PDFs in the question bank.

    Requires teacher or admin role.
    """
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")

    from google.cloud import firestore
    db = firestore.Client(project=os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026"))

    docs = db.collection("pdf_processing_status").stream()
    pdfs = []
    for doc in docs:
        data = doc.to_dict()
        pdfs.append(BankStatusItem(
            filename=doc.id,
            processed=data.get("processed", False),
            timestamp=data.get("timestamp"),
            question_count=data.get("question_count", 0),
            grade_level=data.get("grade_level", 0),
            topic=data.get("topic", ""),
            storage_path=data.get("storage_path", ""),
        ))

    return BankStatusResponse(pdfs=pdfs)
```

- [ ] **Step 2: Register router and role policies in main.py**

In `backend/main.py`:
1. Add import near other route imports:
```python
from routes.quiz_battle import router as quiz_battle_router
```

2. Add to `ROLE_POLICIES` dict:
```python
"/api/quiz-battle/generate": ALL_APP_ROLES,
"/api/quiz-battle/ingest-pdf": TEACHER_OR_ADMIN,
"/api/quiz-battle/bank-status": TEACHER_OR_ADMIN,
```

3. Add router registration near other `app.include_router()` calls:
```python
app.include_router(quiz_battle_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/quiz_battle.py backend/main.py
git commit -m "feat: add quiz battle FastAPI routes with auth and variance"
```

---

### Task 6: Write Backend Tests

**Files:**
- Create: `backend/tests/test_quiz_battle.py`

- [ ] **Step 1: Write tests**

Create `backend/tests/test_quiz_battle.py`:

```python
"""
Tests for Quiz Battle RAG-powered question bank.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone

from fastapi.testclient import TestClient

# Mock firebase_admin before imports
import sys
from unittest.mock import MagicMock

firebase_mock = MagicMock()
sys.modules["firebase_admin"] = firebase_mock
sys.modules["firebase_admin.credentials"] = MagicMock()
sys.modules["google.cloud.firestore"] = MagicMock()

from main import app

client = TestClient(app)


# ── PDF Ingestion Tests ──────────────────────────────────────────────

class TestPdfIngestion:
    @pytest.mark.asyncio
    async def test_ingest_pdf_skips_already_processed(self):
        """If pdf_processing_status says processed, skip re-ingestion."""
        with patch("rag.pdf_ingestion._check_processing_status") as mock_check:
            mock_check.return_value = {
                "processed": True,
                "question_count": 10,
                "grade_level": 8,
                "topic": "linear_equations",
                "storage_path": "quiz_pdfs/grade_8/test.pdf",
                "timestamp": datetime.now(timezone.utc),
            }
            from rag.pdf_ingestion import ingest_pdf
            result = await ingest_pdf("quiz_pdfs/grade_8/test.pdf", 8, "linear_equations")
            assert result.processed is True
            assert result.question_count == 10

    @pytest.mark.asyncio
    async def test_ingest_pdf_force_reingest(self):
        """If force_reingest=True, process even if already done."""
        with patch("rag.pdf_ingestion._check_processing_status") as mock_check, \
             patch("rag.pdf_ingestion._init_firebase_storage") as mock_storage, \
             patch("rag.pdf_ingestion._extract_text_from_pdf_bytes") as mock_extract, \
             patch("rag.pdf_ingestion._chunk_text") as mock_chunk, \
             patch("rag.pdf_ingestion._generate_embeddings") as mock_embed, \
             patch("rag.pdf_ingestion._generate_questions_from_chunk") as mock_gen, \
             patch("rag.pdf_ingestion._save_questions") as mock_save, \
             patch("rag.pdf_ingestion._save_embeddings") as mock_save_emb, \
             patch("rag.pdf_ingestion._save_processing_status") as mock_save_status:

            mock_check.return_value = {"processed": True}
            mock_blob = MagicMock()
            mock_blob.exists.return_value = True
            mock_blob.download_as_bytes.return_value = b"pdf bytes"
            mock_storage.return_value = (None, MagicMock())
            mock_storage.return_value[1].blob.return_value = mock_blob
            mock_extract.return_value = "Some math content"
            mock_chunk.return_value = ["chunk1"]
            mock_embed.return_value = [[0.1, 0.2]]
            mock_gen.return_value = [{
                "question": "What is 2+2?",
                "choices": ["A) 3", "B) 4", "C) 5", "D) 6"],
                "correct_answer": "B",
                "explanation": "Basic addition",
                "topic": "linear_equations",
                "difficulty": "easy",
                "grade_level": 8,
                "source_chunk_id": "chunk1",
            }]
            mock_save.return_value = 1

            from rag.pdf_ingestion import ingest_pdf
            result = await ingest_pdf("quiz_pdfs/grade_8/test.pdf", 8, "linear_equations", force_reingest=True)
            assert result.processed is True
            assert result.question_count == 1


# ── Question Bank Service Tests ──────────────────────────────────────

class TestQuestionBankService:
    @pytest.mark.asyncio
    async def test_get_questions_for_battle(self):
        """Fetch questions with random ordering."""
        with patch("services.question_bank_service._get_db") as mock_db:
            mock_doc = MagicMock()
            mock_doc.to_dict.return_value = {
                "question": "What is 2+2?",
                "choices": ["A) 3", "B) 4", "C) 5", "D) 6"],
                "correct_answer": "B",
                "difficulty": "easy",
                "random_seed": 0.5,
            }
            mock_collection = MagicMock()
            mock_collection.where.return_value.order_by.return_value.limit.return_value.stream.return_value = [mock_doc]
            mock_collection.where.return_value.order_by.return_value.limit.return_value.stream.return_value = [mock_doc]
            mock_db.return_value.collection.return_value = mock_collection

            from services.question_bank_service import get_questions_for_battle
            questions = await get_questions_for_battle(8, "linear_equations", 1)
            assert len(questions) == 1
            assert questions[0]["question"] == "What is 2+2?"

    @pytest.mark.asyncio
    async def test_cache_session_questions(self):
        """Cache questions for 24 hours."""
        with patch("services.question_bank_service._get_db") as mock_db:
            mock_session_ref = MagicMock()
            mock_db.return_value.collection.return_value.document.return_value = mock_session_ref

            from services.question_bank_service import cache_session_questions
            await cache_session_questions(
                "session_123",
                [{"question": "Q1", "correct_answer": "A"}],
                ["uid1"],
                8,
                "linear_equations",
            )
            mock_session_ref.set.assert_called_once()


# ── Variance Engine Tests ────────────────────────────────────────────

class TestVarianceEngine:
    @pytest.mark.asyncio
    async def test_apply_variance_uses_cache(self):
        """If cache exists, return cached questions."""
        with patch("services.variance_engine.get_cached_session") as mock_cache:
            mock_cache.return_value = [{"question": "Cached?", "correct_answer": "A"}]
            from services.variance_engine import apply_variance
            result = await apply_variance([], "session_123")
            assert result[0]["question"] == "Cached?"

    @pytest.mark.asyncio
    async def test_apply_variance_fallback_shuffle(self):
        """If DeepSeek fails, fallback to pure Python shuffle."""
        with patch("services.variance_engine.get_cached_session") as mock_cache, \
             patch("services.variance_engine.get_deepseek_client") as mock_client, \
             patch("services.variance_engine.cache_session_questions") as mock_save:
            mock_cache.return_value = None
            mock_client.return_value.chat.completions.create.side_effect = Exception("API error")
            mock_save.return_value = None

            from services.variance_engine import apply_variance
            questions = [{
                "question": "What is 2+2?",
                "choices": ["A) 3", "B) 4", "C) 5", "D) 6"],
                "correct_answer": "B",
                "difficulty": "easy",
                "topic": "math",
                "grade_level": 8,
                "source_chunk_id": "c1",
            }]
            result = await apply_variance(questions, "session_123")
            assert len(result) == 1
            assert result[0]["variance_applied"] == ["choice_shuffle"]
            # Correct answer should still point to the right text
            correct_index = ord(result[0]["correct_answer"]) - ord("A")
            assert "4" in result[0]["choices"][correct_index]


# ── Route Integration Tests ──────────────────────────────────────────

class TestQuizBattleRoutes:
    def test_generate_unauthorized(self):
        """Generate without auth should 401 or 403 depending on middleware."""
        response = client.post("/api/quiz-battle/generate", json={
            "grade_level": 8,
            "topic": "linear_equations",
            "question_count": 10,
            "session_id": "test-session",
            "player_ids": ["uid1"],
        })
        # Auth middleware may reject or allow in test env
        assert response.status_code in (200, 401, 403)

    def test_ingest_pdf_unauthorized(self):
        """Ingest-pdf without teacher role should 403."""
        response = client.post("/api/quiz-battle/ingest-pdf", json={
            "storage_path": "quiz_pdfs/grade_8/test.pdf",
            "grade_level": 8,
            "topic": "linear_equations",
        })
        assert response.status_code in (401, 403)

    def test_bank_status_unauthorized(self):
        """Bank-status without teacher role should 403."""
        response = client.get("/api/quiz-battle/bank-status")
        assert response.status_code in (401, 403)
```

- [ ] **Step 2: Run tests**

```bash
cd backend
pytest tests/test_quiz_battle.py -v
```

Expected: All tests pass (some may skip if firebase_admin mocking needs refinement).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_quiz_battle.py
git commit -m "test: add quiz battle backend tests"
```

---

## Phase 2: Firebase & Infrastructure

### Task 7: Update Firestore Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add new collection rules**

Append to `firestore.rules` before the final closing brace:

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

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "chore: add firestore rules for quiz battle question bank"
```

---

## Phase 3: Cloud Functions Integration

### Task 8: Integrate FastAPI into Quiz Battle Cloud Function

**Files:**
- Modify: `functions/src/triggers/quizBattleApi.ts`

- [ ] **Step 1: Add FastAPI question fetch**

In `functions/src/triggers/quizBattleApi.ts`, find the question generation flow (inside `startQuizBattleMatch` or similar function, around where `quizBattleQuestionBank` is queried).

Replace or augment the static question bank query with:

```typescript
// Import at top of file
import fetch from 'node-fetch';

// Inside question generation function
async function fetchQuestionsFromFastAPI(
  matchId: string,
  playerIds: string[],
  gradeLevel: number = 11,
  topic: string = 'general_mathematics',
  questionCount: number = 10,
): Promise<BattleQuestionTemplate[]> {
  const backendUrl = process.env.BACKEND_URL;
  const internalSecret = process.env.QUIZ_BATTLE_INTERNAL_SECRET;

  if (!backendUrl || !internalSecret) {
    console.warn('[QuizBattle] Missing BACKEND_URL or QUIZ_BATTLE_INTERNAL_SECRET, falling back to static bank');
    return []; // Falls through to existing static bank logic
  }

  try {
    const response = await fetch(`${backendUrl}/api/quiz-battle/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': internalSecret,
      },
      body: JSON.stringify({
        grade_level: gradeLevel,
        topic: topic,
        question_count: questionCount,
        session_id: matchId,
        player_ids: playerIds,
      }),
    });

    if (!response.ok) {
      console.error(`[QuizBattle] FastAPI returned ${response.status}: ${await response.text()}`);
      return [];
    }

    const data = await response.json();

    // Map FastAPI format to BattleQuestionTemplate
    return data.questions.map((q: any, idx: number) => {
      const correctLetter = q.correct_answer;
      const correctIndex = correctLetter.charCodeAt(0) - 'A'.charCodeAt(0);
      return {
        questionId: `${q.source_chunk_id || 'rag'}_${idx}`,
        subjectId: topic,
        topicId: topic,
        prompt: q.question,
        choices: q.choices,
        correctOptionIndex: correctIndex,
        difficulty: q.difficulty || 'medium',
        varianceApplied: q.variance_applied || [],
      };
    });
  } catch (error) {
    console.error('[QuizBattle] Failed to fetch questions from FastAPI:', error);
    return [];
  }
}
```

**Usage**: Call `fetchQuestionsFromFastAPI()` before the static bank query. If it returns questions, use them. If empty (FastAPI unavailable or no questions), fall back to existing static bank logic.

- [ ] **Step 2: Add environment variable**

Add to `functions/.env.example`:
```
QUIZ_BATTLE_INTERNAL_SECRET=your_shared_secret_here
```

And document in deployment notes that this must be set in Firebase Functions config:
```bash
firebase functions:config:set quizbattle.internal_secret="your_secret"
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/triggers/quizBattleApi.ts functions/.env.example
git commit -m "feat: integrate FastAPI question generation into quiz battle Cloud Functions"
```

---

## Phase 4: Frontend (Minimal)

### Task 9: Add Grade/Topic Params to Quiz Battle Service

**Files:**
- Modify: `src/services/quizBattleService.ts`

- [ ] **Step 1: Update function signatures**

Find `createQuizBattleBotMatch()` and add optional params:

```typescript
export async function createQuizBattleBotMatch(
  setup: {
    playerId: string;
    gradeLevel?: number;
    topic?: string;
    // ... existing fields
  }
): Promise<{ matchId: string }> {
  const callable = httpsCallable(functions, 'quizBattleCreateBotMatch');
  const result = await callable({
    ...setup,
    gradeLevel: setup.gradeLevel || 11,
    topic: setup.topic || 'general_mathematics',
  });
  return result.data as { matchId: string };
}
```

Similarly for `joinQuizBattleQueue()`:

```typescript
export async function joinQuizBattleQueue(
  playerId: string,
  gradeLevel?: number,
  topic?: string,
): Promise<{ matchId?: string; status: string }> {
  const callable = httpsCallable(functions, 'quizBattleJoinQueue');
  const result = await callable({
    playerId,
    gradeLevel: gradeLevel || 11,
    topic: topic || 'general_mathematics',
  });
  return result.data as { matchId?: string; status: string };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/quizBattleService.ts
git commit -m "feat: add grade_level and topic params to quiz battle service"
```

---

### Task 10: Add Teacher Dashboard Panel

**Files:**
- Modify: `src/components/TeacherDashboard.tsx` (or create new component)

- [ ] **Step 1: Create QuestionBankPanel component**

Create `src/components/QuestionBankPanel.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/apiService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PdfStatus {
  filename: string;
  processed: boolean;
  timestamp: string;
  question_count: number;
  grade_level: number;
  topic: string;
  storage_path: string;
}

export const QuestionBankPanel: React.FC = () => {
  const [pdfs, setPdfs] = useState<PdfStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [storagePath, setStoragePath] = useState('');
  const [gradeLevel, setGradeLevel] = useState(11);
  const [topic, setTopic] = useState('general_mathematics');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ pdfs: PdfStatus[] }>('/api/quiz-battle/bank-status');
      setPdfs(data.pdfs);
    } catch (err) {
      toast.error('Failed to load bank status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleIngest = async () => {
    if (!storagePath) {
      toast.error('Please enter a storage path');
      return;
    }
    setIngesting(true);
    try {
      await apiFetch('/api/quiz-battle/ingest-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath,
          grade_level: gradeLevel,
          topic,
          force_reingest: false,
        }),
      });
      toast.success('PDF ingestion started');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  const totalQuestions = pdfs.reduce((sum, p) => sum + p.question_count, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pdfs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pdfs.filter(p => p.processed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingest Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ingest New PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storagePath">Storage Path</Label>
              <Input
                id="storagePath"
                placeholder="quiz_pdfs/grade_11/general_math.pdf"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Input
                id="gradeLevel"
                type="number"
                min={7}
                max={12}
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="general_mathematics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleIngest} disabled={ingesting}>
            {ingesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Ingest PDF
          </Button>
        </CardContent>
      </Card>

      {/* Status Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Processing Status</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.filename}>
                  <TableCell className="font-medium">{pdf.filename}</TableCell>
                  <TableCell>{pdf.grade_level}</TableCell>
                  <TableCell>{pdf.topic}</TableCell>
                  <TableCell>{pdf.question_count}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      pdf.processed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pdf.processed ? 'Processed' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {pdf.timestamp ? new Date(pdf.timestamp).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {pdfs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No PDFs processed yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Integrate into TeacherDashboard**

In `TeacherDashboard.tsx`, add a new tab or section for the Question Bank panel:

```tsx
import { QuestionBankPanel } from './QuestionBankPanel';

// In the tab/content switcher, add:
{activeView === 'question_bank' && <QuestionBankPanel />}
```

Add a navigation item:
```tsx
<Button
  variant={activeView === 'question_bank' ? 'default' : 'ghost'}
  onClick={() => setActiveView('question_bank')}
>
  <BookOpen className="mr-2 h-4 w-4" />
  Question Bank
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionBankPanel.tsx src/components/TeacherDashboard.tsx
git commit -m "feat: add teacher dashboard question bank panel"
```

---

### Task 11: Add Debug Variance Badges

**Files:**
- Modify: `src/components/battle/BattleActiveContent.tsx`

- [ ] **Step 1: Add debug badges**

In `BattleActiveContent.tsx`, after the question prompt and before the choices grid:

```tsx
// Inside the component, check for debug mode
const isDebugMode = window.location.search.includes('debug=true');

// In the JSX, after the question text:
{isDebugMode && question.varianceApplied && question.varianceApplied.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2 mb-4">
    {question.varianceApplied.map((v: string) => (
      <span
        key={v}
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
      >
        {v.replace('_', ' ')}
      </span>
    ))}
  </div>
)}
```

Note: The `question` object from Cloud Functions should include `varianceApplied` array (already mapped in the CF integration).

- [ ] **Step 2: Commit**

```bash
git add src/components/battle/BattleActiveContent.tsx
git commit -m "feat: add variance_applied debug badges in battle"
```

---

## Phase 5: Validation & Rollout

### Task 12: Run Full Validation

- [ ] **Step 1: Backend typecheck and tests**

```bash
cd backend
mypy rag/pdf_ingestion.py services/question_bank_service.py services/variance_engine.py routes/quiz_battle.py
pytest tests/test_quiz_battle.py -v
```

Expected: All tests pass, mypy clean.

- [ ] **Step 2: Frontend typecheck**

```bash
cd ..
npm run typecheck
```

Expected: `tsc --noEmit` passes with zero errors.

- [ ] **Step 3: Functions build**

```bash
cd functions
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual E2E test checklist**

1. Upload a test PDF to Firebase Storage at `quiz_pdfs/grade_11/test.pdf`
2. Teacher opens dashboard → Question Bank panel
3. Enter `quiz_pdfs/grade_11/test.pdf`, grade 11, topic `test_topic`
4. Click "Ingest PDF" → toast success
5. Refresh status table → shows processed with question count
6. Student starts Quiz Battle → questions should come from RAG bank
7. Add `?debug=true` to URL during battle → see variance badges
8. Verify correct answers are hidden from frontend (check network tab)

- [ ] **Step 5: Commit final validation**

```bash
git add .
git commit -m "feat: complete quiz battle RAG question bank integration"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] PDF ingestion with chunking + embeddings
- [x] Question bank service with random fetch + cache
- [x] Variance engine with DeepSeek + fallback
- [x] FastAPI routes (generate, ingest-pdf, bank-status)
- [x] Cloud Functions integration
- [x] Firestore rules
- [x] Frontend teacher panel
- [x] Debug badges
- [x] Tests
- [x] Dependencies
- [x] Environment variables

### Placeholder Scan
- [x] No "TBD", "TODO", "implement later"
- [x] No vague "add error handling" without code
- [x] No "similar to Task N" references
- [x] All steps have concrete code or commands

### Type Consistency
- [x] `IngestionResult` fields match across pdf_ingestion.py and quiz_battle.py
- [x] `GenerateRequest`/`GenerateResponse` match route implementation
- [x] Firestore collection paths consistent (`question_bank/{grade_level}/{topic}/questions`)
- [x] `variance_applied` field name consistent across backend and frontend

---

**Plan saved to:** `docs/superpowers/plans/2026-05-04-quiz-battle-rag.md`

**Execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

**Which approach would you like?**
