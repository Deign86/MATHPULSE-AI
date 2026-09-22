"""Regression tests for issue #160: POST /api/rag/lesson 503 retrieval_failed.

chroma 1.5.9 raises `InternalError: Error finding id` whenever
`collection.query(..., where=...)` matches stored chunks, so retrieval must
never pass `where` to `query` (filter in Python; exact-file path via get).
Quarter validation must reject out-of-range ints (422) instead of letting
retrieval fail first (503).
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from rag.curriculum_rag import retrieve_curriculum_context
from routes.rag_routes import RagLessonRequest


def _mock_components(collection, n_dims: int = 4):
    embedder = MagicMock()
    vec = MagicMock()
    vec.tolist.return_value = [0.1] * n_dims
    embedder.encode.return_value = vec
    return (MagicMock(), collection, embedder)


def _md(subject="general_mathematics", quarter=1, **extra):
    base = {
        "subject": subject,
        "quarter": quarter,
        "content_domain": "general",
        "chunk_type": "concept",
        "source_file": "SHS_GM_Q1.pdf",
        "storage_path": "curriculum/gen_math/SHS_GM_Q1.pdf",
    }
    base.update(extra)
    return base


class TestNoWhereInQuery:
    def test_query_omits_where_and_filters_in_python(self):
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [["gen content", "stat content"]],
            "metadatas": [[_md(), _md(subject="statistics_and_probability")]],
            "distances": [[0.2, 0.3]],
        }
        with patch(
            "rag.vectorstore_loader.get_vectorstore_components",
            return_value=_mock_components(collection),
        ):
            rows = retrieve_curriculum_context(
                query="functions", subject="General Mathematics", quarter=1, top_k=8
            )
        _, kwargs = collection.query.call_args
        assert "where" not in kwargs
        assert [r["subject"] for r in rows] == ["general_mathematics"]

    def test_quarter_mismatch_filtered_out(self):
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [["q1 content", "q2 content"]],
            "metadatas": [[_md(quarter=1), _md(quarter=2)]],
            "distances": [[0.2, 0.1]],
        }
        with patch(
            "rag.vectorstore_loader.get_vectorstore_components",
            return_value=_mock_components(collection),
        ):
            rows = retrieve_curriculum_context(
                query="functions", subject="General Mathematics", quarter=1, top_k=8
            )
        assert [r["quarter"] for r in rows] == [1]


class TestExactFilePath:
    def test_storage_path_uses_get_and_never_query(self):
        collection = MagicMock()
        collection.get.return_value = {
            "ids": ["a-1", "a-2"],
            "documents": ["file content one", "file content two"],
            "metadatas": [_md(), _md()],
        }
        with patch(
            "rag.vectorstore_loader.get_vectorstore_components",
            return_value=_mock_components(collection),
        ):
            rows = retrieve_curriculum_context(
                query="functions",
                subject="General Mathematics",
                quarter=1,
                storage_path="curriculum/gen_math/SHS_GM_Q1.pdf",
                top_k=5,
            )
        collection.query.assert_not_called()
        collection.get.assert_called_once()
        assert len(rows) == 2
        assert all(r["source_file"] == "SHS_GM_Q1.pdf" for r in rows)


class TestQuarterValidation:
    @pytest.mark.parametrize("value", [1, 2, 3, 4, "Q1", "Q4", "Quarter 2"])
    def test_accepts_valid_quarters(self, value):
        req = RagLessonRequest(topic="t", subject="General Mathematics", quarter=value)
        assert req.quarter in (1, 2, 3, 4)

    @pytest.mark.parametrize("value", [0, 5, 9, -1, "abc", "Q9", "14", "", True])
    def test_rejects_invalid_quarters(self, value):
        with pytest.raises(ValidationError):
            RagLessonRequest(topic="t", subject="General Mathematics", quarter=value)
