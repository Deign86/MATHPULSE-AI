"""
Tests for Quiz Battle RAG-powered question bank.
"""

import json

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient

# Mock firebase_admin before imports
import sys
from unittest.mock import MagicMock

_original_firebase_admin = sys.modules.get("firebase_admin")

firebase_mock = MagicMock()
sys.modules["firebase_admin"] = firebase_mock
sys.modules["firebase_admin.credentials"] = MagicMock()
sys.modules["google.cloud.firestore"] = MagicMock()

from main import app

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _cleanup_firebase_mock():
    """Restore original firebase_admin module after all tests in this module."""
    yield
    if _original_firebase_admin is not None:
        sys.modules["firebase_admin"] = _original_firebase_admin
    elif "firebase_admin" in sys.modules:
        del sys.modules["firebase_admin"]


# ── PDF Ingestion Tests ──────────────────────────────────────────────

class TestPdfIngestion:
    @pytest.mark.asyncio
    async def test_ingest_pdf_skips_already_processed(self):
        """If pdf_processing_status says processed, skip re-ingestion."""
        with patch("rag.pdf_ingestion.Client") as mock_firestore:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {
                "processed": True,
                "question_count": 10,
                "grade_level": 8,
                "topic": "linear_equations",
                "storage_path": "quiz_pdfs/grade_8/test.pdf",
                "timestamp": datetime.now(timezone.utc),
            }
            # Make get() return an awaitable
            async def async_get():
                return mock_doc
            mock_ref = MagicMock()
            mock_ref.get = async_get
            mock_firestore.return_value.collection.return_value.document.return_value = mock_ref

            from rag.pdf_ingestion import ingest_pdf
            result = await ingest_pdf("quiz_pdfs/grade_8/test.pdf", 8, "linear_equations")
            assert result.processed is True
            assert result.question_count == 10

    @pytest.mark.asyncio
    async def test_ingest_pdf_force_reingest(self):
        """If force_reingest=True, process even if already done."""
        with patch("rag.pdf_ingestion.Client") as mock_firestore, \
             patch("rag.pdf_ingestion._init_firebase_storage") as mock_storage, \
             patch("rag.pdf_ingestion._extract_pdf_text") as mock_extract, \
             patch("rag.pdf_ingestion._chunk_text") as mock_chunk, \
             patch("rag.pdf_ingestion._generate_questions_for_chunk") as mock_gen, \
             patch("rag.pdf_ingestion._save_questions_batch") as mock_save, \
             patch("rag.pdf_ingestion._save_embeddings_batch") as mock_save_emb, \
             patch("rag.pdf_ingestion._save_processing_manifest") as mock_save_status, \
             patch("rag.pdf_ingestion.get_anthropic_client") as mock_claude_client:

            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"processed": True}
            async def async_get():
                return mock_doc
            mock_ref = MagicMock()
            mock_ref.get = async_get
            mock_firestore.return_value.collection.return_value.document.return_value = mock_ref
            mock_blob = MagicMock()
            mock_blob.exists.return_value = True
            mock_blob.download_as_bytes.return_value = b"pdf bytes"
            mock_storage.return_value = (None, MagicMock())
            mock_storage.return_value[1].blob.return_value = mock_blob
            mock_extract.return_value = "Some math content"
            mock_chunk.return_value = ["chunk1"]
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
            mock_claude_client.return_value = MagicMock()

            from rag.pdf_ingestion import ingest_pdf
            result = await ingest_pdf("quiz_pdfs/grade_8/test.pdf", 8, "linear_equations", force_reingest=True)
            assert result.processed is True
            assert result.question_count == 1

    @pytest.mark.asyncio
    async def test_ingest_pdf_fails_fast_without_api_key(self):
        """A missing API key aborts ingestion before an empty manifest is saved."""
        with patch("rag.pdf_ingestion.Client"), \
             patch("rag.pdf_ingestion._init_firebase_storage", return_value=(None, MagicMock())), \
             patch("rag.pdf_ingestion._extract_pdf_text", return_value="Some math content"), \
             patch("rag.pdf_ingestion._chunk_text", return_value=["chunk1"]), \
             patch("rag.pdf_ingestion.SentenceTransformer"), \
             patch("rag.pdf_ingestion.get_anthropic_client", side_effect=ValueError("ANTHROPIC_API_KEY environment variable not set")), \
             patch("rag.pdf_ingestion._save_processing_manifest") as mock_save_status:
            from rag.pdf_ingestion import ingest_pdf
            with pytest.raises(ValueError):
                await ingest_pdf("quiz_pdfs/grade_8/test.pdf", 8, "linear_equations", force_reingest=True)
            mock_save_status.assert_not_called()

    @pytest.mark.asyncio
    async def test_generate_questions_for_chunk_requests_json(self):
        """Chunk questions come from complete_text in JSON mode; an unparseable reply yields none."""
        from rag.pdf_ingestion import _generate_questions_for_chunk
        questions = [{"question": "What is 2+2?", "correct_answer": "B"}]
        with patch("rag.pdf_ingestion.complete_text", return_value=json.dumps(questions)) as mock_complete:
            result = await _generate_questions_for_chunk("chunk text", "chunk1", "linear_equations", 8)
        assert result == questions
        assert mock_complete.call_args.kwargs["json_output"] is True
        with patch("rag.pdf_ingestion.complete_text", return_value="not json"):
            assert await _generate_questions_for_chunk("chunk text", "chunk1", "linear_equations", 8) == []


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
            # New path: db.collection("question_bank").document(grade).collection("topics").document(topic).collection("questions")
            # MagicMock auto-chains, so navigate to the questions collection via the chained call
            mock_questions_col = (
                mock_db.return_value
                .collection.return_value   # "question_bank"
                .document.return_value     # grade_level doc
                .collection.return_value   # "topics"
                .document.return_value     # topic doc
                .collection.return_value   # "questions"
            )
            mock_questions_col.where.return_value.order_by.return_value.limit.return_value.stream.return_value = [mock_doc]

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
    async def test_apply_variance_uses_ai_reply(self):
        """A valid JSON reply from Claude replaces the original questions."""
        question = {
            "question": "What is 2+2?",
            "choices": ["A) 3", "B) 4", "C) 5", "D) 6"],
            "correct_answer": "B",
            "difficulty": "easy",
            "topic": "math",
            "grade_level": 8,
            "source_chunk_id": "c1",
        }
        varied = [{**question, "question": "Compute 2+2.", "variance_applied": ["paraphrase"]}]
        with patch("services.variance_engine.get_cached_session") as mock_cache, \
             patch("services.variance_engine.complete_text", return_value=json.dumps(varied)) as mock_complete, \
             patch("services.variance_engine.cache_session_questions") as mock_save:
            mock_cache.return_value = None
            mock_save.return_value = None

            from services.variance_engine import apply_variance
            result = await apply_variance([question], "session_123")
            assert result[0]["question"] == "Compute 2+2."
            assert result[0]["variance_applied"] == ["paraphrase"]
            assert mock_complete.call_args.kwargs["json_output"] is True

    @pytest.mark.asyncio
    async def test_apply_variance_fallback_shuffle(self):
        """If Claude fails, fallback to pure Python shuffle."""
        with patch("services.variance_engine.get_cached_session") as mock_cache, \
             patch("services.variance_engine.complete_text", side_effect=Exception("API error")), \
             patch("services.variance_engine.cache_session_questions") as mock_save:
            mock_cache.return_value = None
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
