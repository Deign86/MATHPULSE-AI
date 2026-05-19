"""
Tests for the context-aware intent gate (is_continuation_reply).

Verifies that short/vague student replies during active tutoring sessions
are NOT rejected as off-topic, while genuinely off-topic messages still are.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock
from main import is_continuation_reply


def _make_active_state(active_topic: str = "", current_problem: str = ""):
    """Create a mock WorkingMemoryState."""
    state = MagicMock()
    state.active_topic = active_topic
    state.current_problem = current_problem
    return state


def _make_history(messages: list[tuple[str, str]]) -> list[dict]:
    """Create history list from (role, content) tuples."""
    return [{"role": role, "content": content} for role, content in messages]


# ─── Tests: Should return True (continuation) ─────────────────────

class TestContinuationPositive:
    def test_di_ko_alam_with_active_topic(self):
        state = _make_active_state(active_topic="Functions and Their Graphs")
        assert is_continuation_reply("di ko alam", state, []) is True

    def test_idk_with_current_problem(self):
        state = _make_active_state(current_problem="Solve x^2 + 3x - 4 = 0")
        assert is_continuation_reply("idk", state, []) is True

    def test_huh_after_tutor_question(self):
        history = _make_history([
            ("user", "what is a function?"),
            ("assistant", "A function maps each input to exactly one output. Can you give me an example?"),
        ])
        assert is_continuation_reply("huh?", None, history) is True

    def test_thanks_with_active_topic(self):
        state = _make_active_state(active_topic="Quadratic Equations")
        assert is_continuation_reply("thanks", state, []) is True

    def test_hindi_ko_gets_no_state_but_phrase_match(self):
        # Filipino phrase match should trigger even without active state
        assert is_continuation_reply("hindi ko gets", None, []) is True

    def test_short_reply_with_active_context(self):
        state = _make_active_state(active_topic="Linear Equations")
        assert is_continuation_reply("I'm confused", state, []) is True

    def test_ano_with_active_problem(self):
        state = _make_active_state(current_problem="Find the derivative of f(x)=3x^2")
        assert is_continuation_reply("ano?", state, []) is True

    def test_paano_po(self):
        assert is_continuation_reply("paano po", None, []) is True

    def test_sige_with_context(self):
        state = _make_active_state(active_topic="Statistics")
        assert is_continuation_reply("sige", state, []) is True

    def test_help_me(self):
        assert is_continuation_reply("help me", None, []) is True

    def test_short_msg_after_solve_prompt(self):
        history = _make_history([
            ("assistant", "Try to solve this: What is 2x + 5 = 11?"),
        ])
        assert is_continuation_reply("what", None, history) is True

    def test_ok_with_active_topic(self):
        state = _make_active_state(active_topic="Trigonometry")
        assert is_continuation_reply("ok", state, []) is True


# ─── Tests: Should return False (not a continuation) ──────────────

class TestContinuationNegative:
    def test_explicit_offtopic_no_context(self):
        assert is_continuation_reply(
            "who is the president of the philippines?", None, []
        ) is False

    def test_write_essay_no_context(self):
        assert is_continuation_reply("write my essay", None, []) is False

    def test_long_offtopic_no_context(self):
        assert is_continuation_reply(
            "can you tell me about the history of the roman empire", None, []
        ) is False

    def test_empty_message(self):
        assert is_continuation_reply("", None, []) is False

    def test_long_non_math_no_state(self):
        assert is_continuation_reply(
            "what is the meaning of life and why are we here on earth",
            None,
            [],
        ) is False

    def test_explicit_offtopic_even_with_history_no_question(self):
        history = _make_history([
            ("assistant", "Great job solving that equation!"),
        ])
        # Long off-topic message, no active state, last assistant msg not a question
        assert is_continuation_reply(
            "tell me about basketball players in the NBA this season",
            None,
            history,
        ) is False
