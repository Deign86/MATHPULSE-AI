"""parse_json_response feeds weakness detection and the at-risk brief; a reply it can't read falls back silently."""

import json

import pytest

from services.inference_client import parse_json_response

FLAGGED = {"flagged_topics": ["rational functions"], "confidence": {"rational functions": 0.8}}


@pytest.mark.parametrize(
    "reply",
    [
        '{"flagged_topics": ["rational functions"], "confidence": {"rational functions": 0.8}}',
        '```json\n{"flagged_topics": ["rational functions"], "confidence": {"rational functions": 0.8}}\n```',
        'Here is my analysis:\n{"flagged_topics": ["rational functions"], "confidence": {"rational functions": 0.8}}\nLet me know!',
    ],
    ids=["bare", "fenced", "wrapped-in-prose"],
)
def test_recovers_the_json_object(reply: str) -> None:
    assert parse_json_response(reply) == FLAGGED


def test_keeps_single_backslash_latex() -> None:
    # \t, \f decode as control characters and \s, \c are invalid JSON escapes unless repaired.
    reply = r'Result: {"a": "$\sqrt{x} \times 2 \frac{1}{2}$"}'
    assert parse_json_response(reply) == {"a": r"$\sqrt{x} \times 2 \frac{1}{2}$"}


def test_outer_json_returns_repaired_span() -> None:
    from services.ai_client import outer_json

    span = outer_json(r'text {"a": "$\sqrt{x} \times 2$"} end')
    assert span is not None
    assert json.loads(span) == {"a": r"$\sqrt{x} \times 2$"}


@pytest.mark.parametrize(
    "reply",
    [
        None,
        "",
        "I could not analyse these answers.",
        '["a list", "not an object"]',
        '{"summary": "Review rational functions", "practice": {"problem": "Find the domain", "solution": "x !=',
        '{"summary": "Review the "hole" rule", "practice": {"problem": "Find the domain", "solution": "x != 2"}}',
    ],
    ids=["none", "empty", "prose", "list", "truncated", "malformed-outer"],
)
def test_returns_none_without_a_complete_json_object(reply: str | None) -> None:
    # A truncated or malformed brief must not be replaced by one of its nested objects.
    assert parse_json_response(reply) is None
