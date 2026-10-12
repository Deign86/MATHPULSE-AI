"""parse_json_response feeds weakness detection and the at-risk brief; a reply it can't read falls back silently."""

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
