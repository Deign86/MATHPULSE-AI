"""Regression coverage for the chat context pipeline and sanitized model output.

Guards the behaviours introduced with scoped RAG:
* both chat endpoints share one system-prompt builder, so streaming gets
  curriculum grounding and cross-session memory is kept alongside working memory;
* the posted transcript is budgeted (turn count + chars) instead of forwarded whole;
* small-talk turns never hit the vector store;
* model prose returned to the client is cleaned (think tags, fences, TeX delimiters).
"""
from __future__ import annotations

import json
from typing import Any

import pytest

import main


@pytest.fixture(autouse=True)
def isolate(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    monkeypatch.setattr(main, "route_student_intent", None, raising=False)
    monkeypatch.setattr(main, "_enforce_chat_rate_limit", lambda *_a, **_k: None, raising=False)


def _history(n: int, size: int = 10) -> list[main.ChatMessage]:
    return [
        main.ChatMessage(role="user" if i % 2 == 0 else "assistant", content=f"turn{i} " + ("x" * size))
        for i in range(n)
    ]


class TestHistoryBudget:
    def test_keeps_recent_tail_only(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_TURNS", 4)
        out = main._budgeted_chat_history(_history(10))
        assert [m["content"].split()[0] for m in out] == ["turn6", "turn7", "turn8", "turn9"]

    def test_long_turn_is_truncated_from_head(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_CHARS_PER_TURN", 200)
        out = main._budgeted_chat_history([main.ChatMessage(role="user", content="P" * 1000)])
        assert out[0]["content"].startswith("P" * 200)
        assert len(out[0]["content"]) < 210

    def test_total_budget_drops_oldest(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_TOTAL_CHARS", 1000)
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_CHARS_PER_TURN", 2500)
        out = main._budgeted_chat_history(_history(6, size=400))
        assert len(out) < 6
        assert out[-1]["content"].startswith("turn5")

    def test_blank_turns_skipped(self) -> None:
        out = main._budgeted_chat_history([main.ChatMessage(role="user", content="   ")])
        assert out == []


class TestSystemPromptLayers:
    @pytest.mark.asyncio
    async def test_memory_cross_session_and_rag_all_present(self, monkeypatch: pytest.MonkeyPatch) -> None:
        async def fake_memory(**kwargs: Any) -> str:
            assert kwargs["include_recent_turns"] is False
            return "MEMORY CONTEXT — profile"

        monkeypatch.setattr(main, "collect_memory_context", fake_memory)
        monkeypatch.setattr(main, "retrieve_chat_context", lambda _m: "RELEVANT CURRICULUM REFERENCE: slope")

        req = main.ChatRequest(
            message="How do I find the slope?",
            history=_history(2),
            userId="u1",
            sessionId="s1",
            crossSessionMemory="Conversation: earlier chat about functions",
        )
        prompt = await main._chat_system_prompt(req, include_recent_turns=not req.history)

        assert prompt.index("MEMORY CONTEXT") < prompt.index("PRIOR CONVERSATIONS") < prompt.index("RELEVANT CURRICULUM") < prompt.index(main.MATH_TUTOR_SYSTEM_PROMPT[:40])
        assert "earlier chat about functions" in prompt

    @pytest.mark.asyncio
    async def test_rag_failure_is_non_fatal(self, monkeypatch: pytest.MonkeyPatch) -> None:
        def boom(_m: str) -> str:
            raise RuntimeError("chroma down")

        monkeypatch.setattr(main, "collect_memory_context", None)
        monkeypatch.setattr(main, "retrieve_chat_context", boom)
        prompt = await main._chat_system_prompt(main.ChatRequest(message="What is a function?"), include_recent_turns=True)
        assert prompt == main.MATH_TUTOR_SYSTEM_PROMPT

    @pytest.mark.asyncio
    async def test_small_talk_never_queries_store(self, monkeypatch: pytest.MonkeyPatch) -> None:
        calls: list[str] = []
        monkeypatch.setattr(main, "collect_memory_context", None)
        monkeypatch.setattr(
            "rag.curriculum_rag.retrieve_curriculum_context",
            lambda **kw: calls.append(kw["query"]) or [],
        )
        await main._chat_system_prompt(main.ChatRequest(message="thanks!"), include_recent_turns=True)
        assert calls == []


class TestChatEndpoints:
    @pytest.mark.asyncio
    async def test_non_stream_uses_budgeted_history_and_cleans_answer(self, monkeypatch: pytest.MonkeyPatch) -> None:
        observed: list[dict[str, str]] = []

        async def llm(messages: list[dict[str, str]], **_k: Any) -> str:
            observed.extend(messages)
            return "<think>plan</think>\nThe slope is \\(m = 2\\)."

        monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_TURNS", 3)
        monkeypatch.setattr(main, "call_hf_chat_async", llm)
        monkeypatch.setattr(main, "retrieve_chat_context", lambda _m: "RELEVANT CURRICULUM REFERENCE: slope")

        res = await main.chat_tutor(main.ChatRequest(message="How do I find the slope of a line?", history=_history(8)))

        assert res.response == "The slope is $m = 2$."
        assert observed[0]["role"] == "system" and "RELEVANT CURRICULUM REFERENCE" in observed[0]["content"]
        # system + 3 budgeted turns + current message
        assert len(observed) == 5
        assert observed[-1]["content"] == "How do I find the slope of a line?"

    @pytest.mark.asyncio
    async def test_stream_endpoint_injects_rag_and_budgets_history(self, monkeypatch: pytest.MonkeyPatch) -> None:
        observed: list[dict[str, str]] = []

        async def llm_stream(messages: list[dict[str, str]], **_k: Any):
            observed.extend(messages)
            yield "The slope "
            yield "is 2."

        monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
        monkeypatch.setattr(main, "CHAT_HISTORY_MAX_TURNS", 2)
        monkeypatch.setattr(main, "call_hf_chat_stream_async", llm_stream)
        monkeypatch.setattr(main, "retrieve_chat_context", lambda _m: "RELEVANT CURRICULUM REFERENCE: slope")

        response = await main.chat_tutor_stream(
            main.ChatRequest(message="How do I find the slope of a line?", history=_history(6))
        )
        body = "".join([chunk.decode() if isinstance(chunk, bytes) else chunk async for chunk in response.body_iterator])

        chunks = [json.loads(line[len("data: "):])["chunk"] for line in body.splitlines() if line.startswith("data: {")]
        assert "".join(chunks) == "The slope is 2."
        assert "RELEVANT CURRICULUM REFERENCE" in observed[0]["content"]
        assert len(observed) == 4  # system + 2 turns + current

    @pytest.mark.asyncio
    async def test_stream_scope_boundary_skips_context_build(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
        monkeypatch.setattr(main, "get_scope_boundary_response", lambda *_a, **_k: "I only help with math.")

        async def must_not_run(*_a: Any, **_k: Any) -> str:
            raise AssertionError("context build must be skipped for boundary replies")

        monkeypatch.setattr(main, "_chat_system_prompt", must_not_run)
        response = await main.chat_tutor_stream(main.ChatRequest(message="write me a poem"))
        body = "".join([chunk.decode() if isinstance(chunk, bytes) else chunk async for chunk in response.body_iterator])
        assert "I only help with math." in body


class TestQuizOutputSanitized:
    def test_validate_quiz_questions_strips_markup(self) -> None:
        raw = [{
            "question": "<think>x</think>Find **the** slope of \\(y = 2x\\).",
            "correctAnswer": "B. **2**",
            "options": ["A. **1**", "B. **2**", "C) 3", "(d) 4"],
            "explanation": "```\nThe slope is the coefficient.\n```",
            "questionType": "multiple_choice",
            "difficulty": "easy",
            "bloomLevel": "understand",
        }]
        [q] = main._validate_quiz_questions(raw, [{}], topics=["Linear"])
        assert q.question == "Find **the** slope of $y = 2x$."
        assert q.options == ["1", "2", "3", "4"]
        assert q.correctAnswer == "2"
        assert q.explanation == "The slope is the coefficient."
        assert q.correctAnswer in q.options

    def test_quizforge_parser_strips_markup(self) -> None:
        from routes.quiz_generation_routes import _parse_quiz_response

        payload = json.dumps([
            {
                "question_text": "What is \\(2^3\\)?",
                "type": "multiple_choice",
                "options": [{"key": "A", "text": "**6**"}, {"key": "B", "text": "B. 8"}, {"key": "C", "text": "9"}],
                "correct_answer": "B",
                "explanation": "2 × 2 × 2 = 8\\nSo **8**.",
                "hints": ["<think>t</think>Multiply 2 by itself three times", ""],
            }
        ] * 3)
        qs = _parse_quiz_response(payload, expected_count=3)
        q = qs[0]
        assert q["question"] == "What is $2^3$?"
        assert q["options"] == ["6", "8", "9"]
        assert q["correctAnswer"] == "8"
        assert q["explanation"] == "2 × 2 × 2 = 8\nSo **8**."
        assert q["hints"] == ["Multiply 2 by itself three times"]
