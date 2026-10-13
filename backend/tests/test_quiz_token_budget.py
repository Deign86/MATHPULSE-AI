"""Output-token budgets of the three quiz paths.

Claude Haiku 5.5 writes about 355 tokens per question (~400 on verbose topics), so the old 320/260 per-question
budgets cut every 10-question reply off mid-quiz: each attempt was regenerated, and one request ended in a 502.
Every budget is asserted at the call_hf_chat_async contract, as the model would receive it.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main

TOKENS_PER_QUESTION = 500
# The SDK refuses non-streaming requests above ~21K tokens.
TOKEN_CAP = 16000
# generate_quiz answers 400 above this classroom cap, though the request model accepts up to 30.
ROUTE_MAX_QUESTIONS = 12
STUDENT_AUTH = {"Authorization": "Bearer mock_token_student-1"}


def quiz_reply(num_questions: int) -> str:
    return json.dumps([
        {
            "questionType": "identification",
            "question": f"Question {index + 1}",
            "correctAnswer": "Answer",
            "bloomLevel": "remember",
            "difficulty": "easy",
            "topic": "Algebra",
            "points": 1,
            "explanation": "Because.",
        }
        for index in range(num_questions)
    ])


def capture_model_calls(monkeypatch: pytest.MonkeyPatch, reply: str) -> list[dict[str, Any]]:
    """Keyword arguments of every model call, recorded where the quiz code hands its request to the model."""
    calls: list[dict[str, Any]] = []

    async def reply_with(_messages: list[dict[str, str]], **kwargs: Any) -> str:
        calls.append(kwargs)
        return reply

    monkeypatch.setattr(main, "call_hf_chat_async", reply_with)
    return calls


@pytest.mark.usefixtures("isolated_mock_student_auth")
@pytest.mark.parametrize("num_questions", [10, ROUTE_MAX_QUESTIONS])
def test_generate_route_budgets_the_whole_quiz_in_one_call(
    monkeypatch: pytest.MonkeyPatch, num_questions: int
) -> None:
    monkeypatch.setattr(main, "firebase_firestore", None)
    calls = capture_model_calls(monkeypatch, quiz_reply(num_questions))

    response = TestClient(main.app).post(
        "/api/quiz/generate",
        headers=STUDENT_AUTH,
        json={"topics": ["Algebra"], "gradeLevel": "Grade 11", "numQuestions": num_questions},
    )

    assert response.status_code == 200
    assert len(response.json()["questions"]) == num_questions
    assert len(calls) == 1
    assert num_questions * TOKENS_PER_QUESTION <= calls[0]["max_tokens"] <= TOKEN_CAP


@pytest.mark.asyncio
@pytest.mark.parametrize("num_questions", [10, main.MAX_QUESTIONS_LIMIT])
async def test_json_repair_budgets_the_whole_quiz(monkeypatch: pytest.MonkeyPatch, num_questions: int) -> None:
    calls = capture_model_calls(monkeypatch, quiz_reply(num_questions))

    repaired = await main._repair_quiz_json_with_llm(
        "[{broken", num_questions=num_questions, timeout=120, model_id=None
    )

    assert len(repaired) == num_questions
    assert len(calls) == 1
    assert num_questions * TOKENS_PER_QUESTION <= calls[0]["max_tokens"] <= TOKEN_CAP


@pytest.mark.asyncio
@pytest.mark.parametrize("num_questions", [10, main.MAX_QUESTIONS_LIMIT])
async def test_strict_regeneration_budgets_the_whole_quiz(
    monkeypatch: pytest.MonkeyPatch, num_questions: int
) -> None:
    calls = capture_model_calls(monkeypatch, quiz_reply(num_questions))

    regenerated = await main._regenerate_quiz_json_strict(
        original_prompt="Q1: type=identification", num_questions=num_questions, timeout=120, model_id=None
    )

    assert len(regenerated) == num_questions
    assert len(calls) == 1
    assert num_questions * TOKENS_PER_QUESTION <= calls[0]["max_tokens"] <= TOKEN_CAP


def test_budget_keeps_a_floor_for_tiny_quizzes_and_a_cap_for_huge_ones() -> None:
    assert main._quiz_output_token_budget(1) >= 3072
    assert main._quiz_output_token_budget(1000) == TOKEN_CAP
