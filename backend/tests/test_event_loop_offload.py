"""Blocking Claude, RAG and YouTube work reached from async endpoints runs on a worker thread.

These calls make network round trips and sleep between retries, so running them on the event loop's own
thread freezes every other request. Each test records the thread the blocking function ran on and compares
it with the thread that drives the loop (asyncio.run drives it on the calling test thread).
"""
from __future__ import annotations

import asyncio
import importlib.util
import json
import threading
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import main as main_module
from routes import at_risk_resolution, video_routes

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _load_real_automation_engine():
    """test_api.py swaps sys.modules["automation_engine"] for a stub, so load the real file under its own name."""
    spec = importlib.util.spec_from_file_location("automation_engine_under_test", BACKEND_DIR / "automation_engine.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_at_risk_fallback_brief_is_generated_off_the_event_loop() -> None:
    loop_thread = threading.get_ident()
    ran_on: dict[str, int] = {}

    def retrieve(**_options: object) -> list[dict]:
        ran_on["retrieval"] = threading.get_ident()
        return []

    def complete(model: str, system_prompt: str, user_prompt: str, **_options: object) -> str:
        ran_on["completion"] = threading.get_ident()
        return json.dumps({"summary": "Quadratics review.", "key_concepts": ["factoring"]})

    resolved = at_risk_resolution.ResolvedTopic(
        topic_id="quadratics",
        subject="General Mathematics",
        quarter=1,
        confidence_score=0.0,
        resolution_state="coming_soon",
    )
    body = at_risk_resolution.ResolveRequest(
        uid="student-1",
        flagged_topics=[at_risk_resolution.FlaggedTopicInput(topic_id="quadratics", topic_name="Quadratic Equations")],
    )
    http_request = SimpleNamespace(state=SimpleNamespace(user=SimpleNamespace(role="teacher", uid="teacher-1")))

    with (
        patch.object(at_risk_resolution.fs, "client", return_value=MagicMock()),
        patch.object(at_risk_resolution, "_resolve_topic", return_value=resolved),
        patch.object(at_risk_resolution, "is_enabled", return_value=True),
        patch.object(at_risk_resolution, "retrieve_curriculum_context", retrieve),
        patch.object(at_risk_resolution, "rag_grounded_completion", complete),
    ):
        response = asyncio.run(at_risk_resolution.resolve_at_risk_topics(body, http_request))

    assert response.fallback_generated == 1
    assert ran_on.keys() == {"retrieval", "completion"}
    assert loop_thread not in ran_on.values()


@pytest.mark.parametrize(
    "generate",
    [
        lambda engine: engine._generate_learning_path(["Algebra"], [{"topic": "Factoring", "accuracy": 0.4}], "Grade 11"),
        lambda engine: engine._generate_teacher_interventions(
            {"Algebra": {"status": "At Risk"}}, [{"topic": "Factoring", "accuracy": 0.4}]
        ),
    ],
    ids=["learning-path", "teacher-interventions"],
)
def test_automation_engine_chat_calls_run_off_the_event_loop(generate) -> None:
    loop_thread = threading.get_ident()
    ran_on: list[int] = []

    def chat(*_args: object, **_options: object) -> str:
        ran_on.append(threading.get_ident())
        return "1. Review factoring."

    engine = _load_real_automation_engine().MathPulseAutomationEngine()
    with patch.object(main_module, "call_hf_chat", chat):
        reply = asyncio.run(generate(engine))

    assert reply == "1. Review factoring."
    assert ran_on
    assert loop_thread not in ran_on


def test_video_search_runs_the_blocking_lookup_off_the_event_loop() -> None:
    loop_thread = threading.get_ident()
    ran_on: list[int] = []

    def search(**_options: object) -> dict:
        ran_on.append(threading.get_ident())
        return {"videos": [], "cached": False}

    payload = video_routes.VideoSearchRequest(topic="quadratic equations")
    with patch.object(video_routes, "_get_youtube_service", return_value=(search, "test-key")):
        response = asyncio.run(video_routes.search_videos(None, payload))

    assert response.videos == []
    assert ran_on
    assert loop_thread not in ran_on
