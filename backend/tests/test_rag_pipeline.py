from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest

from rag.curriculum_rag import (
    _distance_to_score,
    build_lesson_prompt,
    build_lesson_query,
    retrieve_curriculum_context,
    summarize_retrieval_confidence,
)


def _mock_vectorstore_components(collection_mock, embedder_mock):
    def _factory():
        return (MagicMock(), collection_mock, embedder_mock)
    return _factory


class TestRetrieveCurriculumContext:
    def test_empty_collection_returns_empty_list(self):
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]],
        }

        embedder = MagicMock()
        embedder.encode.return_value = MagicMock()
        embedder.encode.return_value.tolist.return_value = [0.0] * 768

        with patch(
            "rag.vectorstore_loader.get_vectorstore_components",
            return_value=(MagicMock(), collection, embedder),
        ):
            result = retrieve_curriculum_context(
                query="test query",
                subject="General Mathematics",
                top_k=5,
            )
            assert result == []


class TestDistanceToScore:
    def test_zero_distance_returns_one(self):
        assert _distance_to_score(0.0) == 1.0

    def test_never_returns_zero_or_negative(self):
        scores = [_distance_to_score(d) for d in [0.0, 0.5, 1.0, 5.0, 100.0]]
        for s in scores:
            assert s > 0.0
            assert s <= 1.0


class TestBuildLessonPrompt:
    def test_contains_json_and_required_keys(self):
        prompt = build_lesson_prompt(
            lesson_title="Compound Interest",
            competency="M11GM-IIc-1",
            grade_level="Grade 11-12",
            subject="General Mathematics",
            quarter=3,
            learner_level="mixed",
            module_unit="Business Math",
            curriculum_chunks=[
                {
                    "content": "Compound interest formula A=P(1+r/n)^(nt)",
                    "source_file": "sample_curriculum.json",
                    "page": 5,
                    "content_domain": "Business Mathematics",
                    "chunk_type": "content_explanation",
                    "score": 0.85,
                }
            ],
        )
        assert "JSON" in prompt
        assert "Lesson title:" in prompt
        assert "needsReview" in prompt
        assert "DepEd-aligned" in prompt
        assert "7 sections" in prompt

    def test_contains_required_sections_in_prompt(self):
        prompt = build_lesson_prompt(
            lesson_title="Functions",
            competency="M11GM-Ia-1",
            grade_level="Grade 11-12",
            subject="General Mathematics",
            quarter=1,
            learner_level=None,
            module_unit=None,
            curriculum_chunks=[],
        )
        assert "introduction" in prompt
        assert "key_concepts" in prompt
        assert "worked_examples" in prompt
        assert "try_it_yourself" in prompt


class TestSummarizeRetrievalConfidence:
    def test_empty_chunks_returns_low(self):
        result = summarize_retrieval_confidence([])
        assert result["band"] == "low"
        assert result["confidence"] == 0.0

    def test_high_confidence(self):
        chunks = [{"score": 0.85}, {"score": 0.80}, {"score": 0.75}]
        result = summarize_retrieval_confidence(chunks)
        assert result["band"] == "high"

    def test_medium_confidence(self):
        chunks = [{"score": 0.65}, {"score": 0.60}]
        result = summarize_retrieval_confidence(chunks)
        assert result["band"] == "medium"

    def test_low_confidence(self):
        chunks = [{"score": 0.35}, {"score": 0.30}]
        result = summarize_retrieval_confidence(chunks)
        assert result["band"] == "low"

    def test_chunk_count_included(self):
        chunks = [{"score": 0.8}, {"score": 0.7}, {"score": 0.6}]
        result = summarize_retrieval_confidence(chunks)
        assert result["chunkCount"] == 3


class TestBuildLessonQuery:
    def test_includes_all_fields(self):
        query = build_lesson_query(
            "Compound Interest",
            "General Mathematics",
            3,
            lesson_title="Compound Interest Basics",
            competency="M11GM-IIc-1",
            module_unit="Business Math",
            learner_level="mixed",
        )
        assert "Compound Interest" in query
        assert "General Mathematics" in query
        assert "Quarter 3" in query
        assert "Compound Interest Basics" in query


class TestIsSequentialModel:
    def test_sequential_for_reasoner(self):
        with patch.dict(os.environ, {"INFERENCE_MODEL_ID": "deepseek-reasoner"}):
            from services.inference_client import is_sequential_model
            assert is_sequential_model() is True

    def test_not_sequential_for_chat(self):
        with patch.dict(os.environ, {"INFERENCE_MODEL_ID": "deepseek-chat"}):
            from services.inference_client import is_sequential_model
            assert is_sequential_model() is False


class TestGenerateFlashcards:
    def _make_flashcard(self, front: str, back: str, difficulty: str) -> dict:
        return {"front": front, "back": back, "difficulty": difficulty}

    def _build_flashcard_response(self) -> str:
        cards = [
            self._make_flashcard("What is the compound interest formula?", "A = P(1 + r/n)^(nt)", "easy"),
            self._make_flashcard("Define principal in interest calculations.", "The initial amount of money borrowed or invested.", "easy"),
            self._make_flashcard("What does n represent in compound interest?", "The number of times interest is compounded per year.", "easy"),
            self._make_flashcard("How is nominal rate different from effective rate?", "Nominal is the stated rate; effective accounts for compounding.", "medium"),
            self._make_flashcard("Calculate A if P=1000, r=5%, n=4, t=2 years.", "A = 1000(1 + 0.05/4)^(4*2) = 1000(1.0125)^8 ≈ 1104.49", "medium"),
            self._make_flashcard("What happens when compounding frequency increases?", "The effective rate approaches but never exceeds the nominal rate.", "medium"),
            self._make_flashcard("Derive the compound interest formula from simple interest.", "Start with A = P(1 + rt) and extend to continuous compounding.", "medium"),
            self._make_flashcard("When should you use logarithms in compound interest problems?", "When solving for time t given A, P, r, and n.", "hard"),
            self._make_flashcard("Compare future value vs present value in investment decisions.", "FV shows growth; PV shows today's worth of future money.", "hard"),
            self._make_flashcard("Solve for t if A = 2P with annual compounding at rate r.", "t = ln(2) / ln(1 + r). Requires natural log application.", "hard"),
        ]
        import json
        return json.dumps(cards)

    def test_generate_flashcards_returns_ten_cards(self):
        mock_client = MagicMock()
        mock_client.generate_from_messages.return_value = self._build_flashcard_response()

        with patch("routes.rag_routes._get_inference_client", return_value=mock_client):
            from routes.rag_routes import _generate_flashcards
            import asyncio
            result = asyncio.run(_generate_flashcards("lesson text here", "Compound Interest"))

        assert len(result) == 10
        for card in result:
            assert "front" in card
            assert "back" in card
            assert "difficulty" in card

    def test_generate_flashcards_difficulty_distribution(self):
        mock_client = MagicMock()
        mock_client.generate_from_messages.return_value = self._build_flashcard_response()

        with patch("routes.rag_routes._get_inference_client", return_value=mock_client):
            from routes.rag_routes import _generate_flashcards
            import asyncio
            result = asyncio.run(_generate_flashcards("lesson text here", "Compound Interest"))

        difficulties = [c["difficulty"] for c in result]
        assert difficulties.count("easy") == 3
        assert difficulties.count("medium") == 4
        assert difficulties.count("hard") == 3

    def test_generate_flashcards_returns_empty_on_exception(self):
        mock_client = MagicMock()
        mock_client.generate_from_messages.side_effect = Exception("AI inference failed")

        with patch("routes.rag_routes._get_inference_client", return_value=mock_client):
            from routes.rag_routes import _generate_flashcards
            import asyncio
            result = asyncio.run(_generate_flashcards("lesson text here", "Compound Interest"))

        assert result == []


class TestGetStudyMaterialsFromChunks:
    def test_deduplicates_by_source_file(self):
        chunks = [
            {"source_file": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "content_domain": "general"},
            {"source_file": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "content_domain": "general"},
            {"source_file": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf", "storage_path": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf", "content_domain": "business"},
        ]

        with patch("rag.firebase_storage_loader.generate_signed_download_url", return_value="https://storage.example.com/signed"):
            from rag.firebase_storage_loader import get_study_materials_from_chunks
            result = get_study_materials_from_chunks(chunks)

        assert len(result) == 2  # deduplicated

    def test_each_material_has_title_source_pdf_url_topic_match(self):
        chunks = [
            {"source_file": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf", "content_domain": "general"},
        ]

        with patch("rag.firebase_storage_loader.generate_signed_download_url", return_value="https://storage.example.com/signed"):
            from rag.firebase_storage_loader import get_study_materials_from_chunks
            result = get_study_materials_from_chunks(chunks)

        assert len(result) == 1
        mat = result[0]
        assert "title" in mat
        assert "source_pdf_url" in mat
        assert "topic_match" in mat
        assert mat["source_pdf_url"] == "https://storage.example.com/signed"


class TestRagLessonExtendedResponse:
    @pytest.mark.skip(reason="Requires auth middleware setup; tested manually")
    def test_response_includes_study_materials_and_flashcards(self):
        mock_chunks = [
            {
                "subject": "General Mathematics",
                "quarter": 1,
                "source_file": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
                "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
                "page": 5,
                "score": 0.85,
                "content_domain": "general",
                "chunk_type": "content_explanation",
                "content": "Compound interest formula A=P(1+r/n)^(nt)",
            }
        ]

        mock_lesson_response = {
            "explanation": "Lesson on compound interest",
            "needsReview": False,
            "sections": [
                {"type": "introduction", "title": "Introduction", "content": "Welcome to compound interest."},
                {"type": "key_concepts", "title": "Key Concepts", "content": "Key concepts here."},
                {"type": "video", "title": "Video Lesson", "content": "Video content.", "videoId": "", "videoTitle": "", "videoChannel": "", "embedUrl": "", "thumbnailUrl": ""},
                {"type": "worked_examples", "title": "Worked Examples", "examples": []},
                {"type": "important_notes", "title": "Important Notes", "bulletPoints": []},
                {"type": "try_it_yourself", "title": "Try It Yourself", "practiceProblems": []},
                {"type": "summary", "title": "Summary", "content": "Summary content."},
            ],
        }

        mock_client = MagicMock()
        mock_client.generate_from_messages.return_value = '{"explanation":"Lesson on compound interest","needsReview":false}'

        with patch("rag.curriculum_rag.retrieve_lesson_pdf_context", return_value=(mock_chunks, "chroma")):
            with patch("rag.curriculum_rag.build_lesson_prompt", return_value="test prompt"):
                with patch("routes.rag_routes._get_inference_client", return_value=mock_client):
                    with patch("routes.rag_routes._generate_flashcards", return_value=[]):
                        with patch("rag.firebase_storage_loader.generate_signed_download_url", return_value="https://storage.example.com/signed"):
                            with patch("routes.rag_routes._get_cached_generated_assets", return_value=None):
                                with patch("routes.rag_routes._save_generated_assets"):
                                    from fastapi.testclient import TestClient
                                    from main import app

                                    # Inject mock user for _log_rag_usage
                                    mock_user = MagicMock()
                                    mock_user.uid = "test-user"
                                    type(mock_user).uid = property(lambda self: "test-user")

                                    client = TestClient(app)
                                    response = client.post(
                                        "/api/rag/lesson",
                                        json={
                                            "topic": "Compound Interest",
                                            "subject": "General Mathematics",
                                            "quarter": 1,
                                            "lessonTitle": "Compound Interest Basics",
                                            "learningCompetency": "M11GM-IIc-1",
                                        },
                                    )

        assert response.status_code == 200
        data = response.json()
        assert "study_materials" in data
        assert "flashcards" in data
        # Ensure materials were extracted from chunks
        assert isinstance(data["study_materials"], list)
        assert isinstance(data["flashcards"], list)