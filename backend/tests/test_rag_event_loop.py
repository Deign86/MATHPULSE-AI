"""A slow RAG lesson must not block the server's event loop.

rag_lesson used to call the synchronous retrieval and inference client directly inside an async
handler, so a 15-18 s DeepSeek call froze every other request (health checks, learning paths,
lists) until it returned.
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from unittest.mock import patch

import httpx

os.environ["DEEPSEEK_API_KEY"] = "mock-key-for-testing"

import main as main_module
from main import app

BLOCKING_SECONDS = 1.0
CHUNKS = [
    {
        "content": "A rational function is a quotient of two polynomial functions.",
        "source_file": "SHS_GM_Q1.pdf",
        "score": 0.95,
        "content_domain": "general",
    }
]
PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "lessonTitle": "Introduction to Rational Functions",
}
LESSON_JSON = json.dumps({
    "sections": [
        {"type": "introduction", "content": "Intro."},
        {"type": "key_concepts", "content": "Concepts."},
        {"type": "video", "content": "Video."},
        {"type": "worked_examples", "examples": [{"problem": "Example."}]},
        {"type": "important_notes", "bulletPoints": ["Note."]},
        {"type": "try_it_yourself", "practiceProblems": [{"question": "Practice."}]},
        {"type": "summary", "content": "Summary."},
    ]
})


def _blocking_retrieval(*_args: object, **_kwargs: object) -> tuple[list[dict[str, object]], str]:
    time.sleep(BLOCKING_SECONDS)
    return CHUNKS, "exact_file"


class _BlockingInferenceClient:
    def generate_from_messages(self, _request: object) -> str:
        time.sleep(BLOCKING_SECONDS)
        return LESSON_JSON


def _blocking_reasoner_stream(*_args: object, **_kwargs: object) -> str:
    time.sleep(BLOCKING_SECONDS)
    return LESSON_JSON


async def _verified(reference_text: str, generated_text: str) -> dict[str, object]:
    return {"verified": True, "pCorrect": 0.95}


async def _lesson_while_polling_health() -> tuple[int, float, float]:
    """Poll /health for as long as the lesson runs; return the longest gap between answered polls."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", headers={"Authorization": "Bearer test-token"}) as client:
        started = time.perf_counter()
        lesson_task = asyncio.create_task(client.post("/api/rag/lesson", json=PAYLOAD))
        answered_at = [time.perf_counter()]
        while not lesson_task.done():
            health = await client.get("/health")
            assert health.status_code == 200
            answered_at.append(time.perf_counter())
            await asyncio.sleep(0.05)
        lesson = await lesson_task
        lesson_seconds = time.perf_counter() - started
        longest_gap = max(later - earlier for earlier, later in zip(answered_at, answered_at[1:]))
        return lesson.status_code, longest_gap, lesson_seconds


def test_health_answers_while_a_rag_lesson_is_blocked_in_retrieval_and_inference() -> None:
    with patch.object(
        main_module.firebase_auth,
        "verify_id_token",
        return_value={"uid": "student_S", "role": "student"},
    ), patch("routes.rag_routes.retrieve_lesson_pdf_context", _blocking_retrieval), patch(
        "routes.rag_routes._get_inference_client", return_value=_BlockingInferenceClient()
    ), patch("routes.rag_routes._stream_reasoner_lesson", _blocking_reasoner_stream), patch(
        "routes.rag_routes._lesson_primary_model", return_value="deepseek-v4-pro"
    ), patch("routes.rag_routes.verify_lesson_factuality", _verified), patch(
        "routes.rag_routes._fetch_youtube_videos", return_value=[]
    ), patch("routes.rag_routes._log_rag_usage", return_value=None):
        lesson_status, longest_gap, lesson_seconds = asyncio.run(_lesson_while_polling_health())

    assert lesson_status == 200
    assert lesson_seconds >= 2 * BLOCKING_SECONDS
    assert longest_gap < BLOCKING_SECONDS / 2, f"/health went unanswered for {longest_gap:.2f}s behind a blocked lesson"
