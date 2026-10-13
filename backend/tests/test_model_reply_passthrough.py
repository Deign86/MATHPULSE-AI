"""Model replies reach their callers whole.

call_hf_chat used to pass every non-streaming reply through a repetition stripper written for small models that
looped. It took ordinary Markdown paragraphs for repeats and deleted them: a tutor reply came back as its last
paragraph, a first-turn chat came back empty, and pretty-printed quiz JSON stopped parsing.
"""
from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main

TUTOR_PARAGRAPHS = [
    "Great question! Finding the domain of a rational function comes down to one idea.",
    "**Step 1:** Look at the denominator, because division by zero is undefined for every real number.",
    "**Step 2:** Set the denominator equal to zero and solve, so you know which x-values to exclude.",
    "What value of x makes x - 2 equal to zero?",
    "Once you find that value, think about what it means for the domain. Give it a try and tell me what you get!",
]
TUTOR_REPLY = "\n\n".join(TUTOR_PARAGRAPHS)
QUIZ_REPLY = json.dumps(
    [
        {
            "questionType": "multiple_choice",
            "question": f"What is the domain of f(x) = 1/(x - {number})?",
            "options": [f"A) x != {number}", "B) all real numbers", "C) x > 0", "D) x < 0"],
            "correctAnswer": "A",
            "bloomLevel": "understand",
            "difficulty": "medium",
            "topic": "Domain and Range of Functions",
            "points": 1,
            "explanation": f"Division by zero is undefined, so x cannot equal {number}.",
        }
        for number in range(1, 11)
    ],
    indent=2,
)


class ReplyingInferenceClient:
    """The inference client's contract: a request in, the model's reply text out."""

    def __init__(self, reply: str) -> None:
        self.reply = reply

    def generate_from_messages(self, _request: object) -> str:
        return self.reply


def serve_model_reply(monkeypatch: pytest.MonkeyPatch, reply: str) -> None:
    client = ReplyingInferenceClient(reply)
    monkeypatch.setattr(main, "get_inference_client", lambda: client)


@pytest.mark.parametrize("reply", [TUTOR_REPLY, QUIZ_REPLY], ids=["markdown-tutor-reply", "pretty-printed-quiz"])
def test_call_hf_chat_returns_the_reply_unchanged(monkeypatch: pytest.MonkeyPatch, reply: str) -> None:
    serve_model_reply(monkeypatch, reply)

    assert main.call_hf_chat([{"role": "user", "content": "Help me"}], task_type="chat") == reply


@pytest.mark.asyncio
async def test_a_first_turn_chat_reply_reaches_the_student_whole(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    monkeypatch.setattr(main, "retrieve_curriculum_context", lambda **_: [])
    monkeypatch.setattr(main, "retrieve_chat_context", lambda _message: "")

    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    serve_model_reply(monkeypatch, TUTOR_REPLY)

    response = await main.chat_tutor(
        main.ChatRequest(message="How do I find the domain of f(x) = (x + 1)/(x - 2)?")
    )

    for paragraph in TUTOR_PARAGRAPHS:
        assert paragraph in response.response
