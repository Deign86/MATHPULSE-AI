"""Exact-file retrieval perf: encode-once cache, healthy-index fast path, prompt budget."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from rag import curriculum_rag
from rag.curriculum_rag import format_retrieved_chunks, retrieve_curriculum_context

PATH = "curriculum/gen_math/SHS_GM_Q1.pdf"


@pytest.fixture(autouse=True)
def _fresh_caches():
    curriculum_rag.reset_exact_file_cache()
    yield
    curriculum_rag.reset_exact_file_cache()


def _md(**extra):
    base = {
        "subject": "general_mathematics",
        "quarter": 1,
        "content_domain": "general",
        "chunk_type": "concept",
        "source_file": "SHS_GM_Q1.pdf",
        "storage_path": PATH,
    }
    base.update(extra)
    return base


def _embedder():
    """encode(str) -> query vector; encode(list) -> unit rows (first row == query)."""
    embedder = MagicMock()

    def encode(value, **_kwargs):
        if isinstance(value, str):
            return np.array([1.0, 0.0], dtype=np.float32)
        rows = [[1.0, 0.0] if i == 0 else [0.0, 1.0] for i in range(len(value))]
        return np.array(rows, dtype=np.float32)

    embedder.encode.side_effect = encode
    return embedder


def _collection(count=3, indexed=None):
    collection = MagicMock()
    collection.count.return_value = count
    collection.get.return_value = {
        "ids": ["a", "b"],
        "documents": ["close chunk", "far chunk"],
        "metadatas": [_md(), _md()],
    }
    n_indexed = count if indexed is None else indexed
    collection.query.return_value = {
        "ids": [[str(i) for i in range(n_indexed)]],
        "documents": [["fast chunk"]],
        "metadatas": [[_md()]],
        "distances": [[0.25]],
    }
    return collection


def _retrieve(collection, embedder, **kwargs):
    with patch(
        "rag.vectorstore_loader.get_vectorstore_components",
        return_value=(MagicMock(), collection, embedder),
    ):
        return retrieve_curriculum_context(query="functions", storage_path=PATH, top_k=5, **kwargs)


class TestEncodeCache:
    def test_encode_chunks_once_across_repeated_calls(self):
        collection, embedder = _collection(count=3, indexed=1), _embedder()
        first = _retrieve(collection, embedder, subject="General Mathematics", quarter=1)
        _retrieve(collection, embedder, subject="General Mathematics")
        _retrieve(collection, embedder)
        chunk_encodes = [c for c in embedder.encode.call_args_list if isinstance(c.args[0], list)]
        assert len(chunk_encodes) == 1
        assert collection.get.call_count == 1
        assert [r["content"] for r in first] == ["close chunk", "far chunk"]
        assert first[0]["score"] == 1.0  # cosine distance 0 -> score 1.0
        assert first[1]["score"] == 0.5  # orthogonal -> distance 1 -> score 0.5

    def test_python_filters_still_apply_to_cached_rows(self):
        collection, embedder = _collection(count=3, indexed=1), _embedder()
        assert len(_retrieve(collection, embedder, quarter=1)) == 2
        assert _retrieve(collection, embedder, quarter=2) == []


class TestFastPath:
    def test_healthy_index_uses_filtered_query_without_encoding_chunks(self):
        collection, embedder = _collection(count=3), _embedder()
        rows = _retrieve(collection, embedder, subject="General Mathematics", quarter=1)
        assert [r["content"] for r in rows] == ["fast chunk"]
        assert all(isinstance(c.args[0], str) for c in embedder.encode.call_args_list)
        collection.get.assert_not_called()
        assert any("where" in c.kwargs for c in collection.query.call_args_list)

    def test_broken_index_never_attempts_filtered_query(self):
        collection, embedder = _collection(count=3, indexed=1), _embedder()
        _retrieve(collection, embedder)
        _retrieve(collection, embedder)
        assert all("where" not in c.kwargs for c in collection.query.call_args_list)
        assert collection.query.call_count == 1  # single health probe, cached

    def test_filtered_query_error_falls_back_to_cached_encode(self):
        collection, embedder = _collection(count=3), _embedder()
        probe_result = collection.query.return_value

        def query(**kwargs):
            if "where" in kwargs:
                raise RuntimeError("Error finding id")
            return probe_result

        collection.query.side_effect = query
        rows = _retrieve(collection, embedder)
        assert [r["content"] for r in rows] == ["close chunk", "far chunk"]


class TestBudget:
    def test_budget_caps_each_excerpt(self):
        text = format_retrieved_chunks([{"content": "x" * 5000, "source_file": "f", "page": 1}])
        assert "…[truncated]" in text
        assert len(text) < 1500

    def test_budget_caps_total_context(self):
        chunks = [{"content": "y" * 1100, "source_file": "f", "page": i} for i in range(30)]
        text = format_retrieved_chunks(chunks)
        assert len(text) <= 9000 + len("…[truncated]")
        assert "30. [" not in text

    def test_budget_leaves_small_context_untouched(self):
        text = format_retrieved_chunks([{"content": "short", "source_file": "f", "page": 2}])
        assert "truncated" not in text
        assert text.endswith("Excerpt: short")
        assert format_retrieved_chunks([]) == "No curriculum context retrieved."
