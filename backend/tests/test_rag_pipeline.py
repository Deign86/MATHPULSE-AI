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
        collection_get_result = collection.get.return_value
        collection_get_result.__getitem__.return_value = []

        embedder = MagicMock()

        with patch(
            "rag.curriculum_rag.get_vectorstore_components",
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
        assert "lessonTitle" in prompt
        assert "needsReview" in prompt
        ph_context_terms = [
            "payroll", "VAT", "discounts", "loans", "Pag-IBIG", "school",
        ]
        assert any(term in prompt for term in ph_context_terms)

    def test_contains_thinking_hint(self):
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
        assert "Think step by step" in prompt


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
    def test_sequential_for_235b(self):
        with patch.dict(os.environ, {"HF_MODEL_ID": "Qwen/Qwen3-235B-A22B"}):
            from services.inference_client import is_sequential_model
            assert is_sequential_model() is True

    def test_not_sequential_for_qwq(self):
        with patch.dict(os.environ, {"HF_MODEL_ID": "Qwen/QwQ-32B"}):
            from services.inference_client import is_sequential_model
            assert is_sequential_model() is False