"""Retrieval returns only what the prompt needs: bounded windows, filtered
server-side when the index is complete, deduped overlapping chunks, and
chat turns that skip the store when there is nothing to look up."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from rag import curriculum_rag
from rag.curriculum_rag import (
    format_retrieved_chunks,
    retrieve_chat_context,
    retrieve_curriculum_context,
    should_retrieve_for_chat,
)


def _components(collection, n_dims: int = 4):
    embedder = MagicMock()
    vec = MagicMock()
    vec.tolist.return_value = [0.1] * n_dims
    embedder.encode.return_value = vec
    return (MagicMock(), collection, embedder)


def _md(**extra):
    base = {"subject": "general_mathematics", "quarter": 1, "source_file": "GM_Q1.pdf", "page": 3}
    base.update(extra)
    return base


def _patched(collection):
    curriculum_rag.reset_exact_file_cache()
    return patch("rag.vectorstore_loader.get_vectorstore_components", return_value=_components(collection))


class TestBoundedWindow:
    def test_unfiltered_query_fetches_small_window(self):
        collection = MagicMock()
        collection.query.return_value = {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        with _patched(collection):
            retrieve_curriculum_context(query="functions", top_k=3)
        _, kwargs = collection.query.call_args
        assert kwargs["n_results"] <= 12
        assert "where" not in kwargs

    def test_filtered_fallback_uses_larger_window_but_no_where(self):
        collection = MagicMock()  # count() is a MagicMock → index treated as unhealthy
        collection.query.return_value = {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        with _patched(collection):
            retrieve_curriculum_context(query="functions", subject="General Mathematics", top_k=3)
        _, kwargs = collection.query.call_args
        assert "where" not in kwargs
        assert kwargs["n_results"] >= 40

    def test_healthy_index_filters_server_side(self):
        collection = MagicMock()
        collection.count.return_value = 2
        collection.query.side_effect = [
            {"ids": [["a", "b"]], "distances": [[0.1, 0.2]]},  # health probe
            {
                "documents": [["gen content"]],
                "metadatas": [[_md()]],
                "distances": [[0.2]],
            },
        ]
        with _patched(collection):
            rows = retrieve_curriculum_context(query="functions", subject="General Mathematics", top_k=3)
        _, kwargs = collection.query.call_args
        assert "where" in kwargs
        assert [r["subject"] for r in rows] == ["general_mathematics"]


class TestDedupeAndThreshold:
    def test_overlapping_windows_collapsed(self):
        shared = "The slope of a line measures its steepness and is computed as rise over run " * 4
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [[shared + " tail A", shared + " tail B", "Unrelated passage about functions and relations."]],
            "metadatas": [[_md(), _md(page=4), _md(page=9)]],
            "distances": [[0.1, 0.15, 0.3]],
        }
        with _patched(collection):
            rows = retrieve_curriculum_context(query="slope", top_k=3)
        assert len(rows) == 2
        assert rows[0]["page"] == 3

    def test_min_score_drops_weak_matches(self):
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [["strong match passage here", "weak passage somewhere else"]],
            "metadatas": [[_md(), _md(page=7)]],
            "distances": [[0.2, 1.5]],
        }
        with _patched(collection):
            rows = retrieve_curriculum_context(query="slope", top_k=3, min_score=0.5)
        assert [r["page"] for r in rows] == [3]


class TestFormatCaps:
    def test_custom_caps_and_sentence_trim(self):
        chunk = {"content": "First sentence. Second sentence. Third sentence that is long.", "source_file": "f.pdf", "page": 1,
                 "content_domain": "general", "chunk_type": "concept", "score": 0.8}
        out = format_retrieved_chunks([chunk], max_excerpt_chars=40, include_scores=False)
        assert "score=" not in out
        assert "…[truncated]" in out
        assert "Second sentence." in out and "Third" not in out


class TestChatGating:
    def test_small_talk_skips_store(self):
        for text in ("ok", "thanks!", "hi", "next", "yes please", "??", "k"):
            assert not should_retrieve_for_chat(text)

    def test_real_question_retrieves(self):
        assert should_retrieve_for_chat("How do I find the slope of a line through two points?")

    def test_retrieve_chat_context_compact(self):
        collection = MagicMock()
        collection.query.return_value = {
            "documents": [["Slope is rise over run. " * 60]],
            "metadatas": [[_md()]],
            "distances": [[0.2]],
        }
        with _patched(collection):
            ctx = retrieve_chat_context("How do I find the slope of a line through two points?")
        assert ctx.startswith("RELEVANT CURRICULUM REFERENCE")
        assert len(ctx) < 1000

    def test_no_store_call_for_small_talk(self):
        collection = MagicMock()
        with _patched(collection):
            assert retrieve_chat_context("thanks") == ""
        collection.query.assert_not_called()
