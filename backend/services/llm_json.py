"""Shared extraction of JSON payloads from LLM responses.

LLM providers wrap structured output in prose, markdown fences, thinking
blocks, smart quotes, trailing commas, or Python-literal syntax. Every route
that consumes model-produced JSON needs the same recovery ladder; this module
is the single implementation so a payload that parses on one route parses on
all of them.

Callers keep their own error type: this module raises ``LLMJsonError`` and each
route translates it into its existing ``HTTPException``/``ValueError``.
"""

from __future__ import annotations

import ast
import json
import re
from typing import Any, Dict, Iterable, List, Optional

__all__ = [
    "LLMJsonError",
    "strip_reasoning",
    "extract_json_blocks",
    "normalize_candidate",
    "loads_jsonish",
    "extract_json_value",
    "extract_json_object",
    "extract_json_list",
    "coerce_dict_list",
    "extract_dict_list",
    "collect_dict_objects",
]

# Wrapper keys models use when they nest a list inside an envelope object.
_LIST_WRAPPER_KEYS = ("questions", "items", "data", "results", "quiz", "practice_questions")


class LLMJsonError(ValueError):
    """Raised when no parseable JSON payload can be recovered from model output."""


_THINKING_PATTERNS = (
    re.compile(r"<think(?:ing)?>[\s\S]*?</think(?:ing)?>", re.IGNORECASE),
    re.compile(r"</think(?:ing)?>", re.IGNORECASE),
    re.compile(r"^\s*thinking\s*process\s*:\s*", re.IGNORECASE),
    re.compile(r"^\s*json\s*[:\-]?\s*", re.IGNORECASE),
)


def strip_reasoning(text: str) -> str:
    """Remove thinking blocks and reasoning preambles that precede JSON."""
    cleaned = (text or "").strip()
    for pattern in _THINKING_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    return cleaned.strip()


def extract_json_blocks(text: str) -> List[str]:
    """Return every balanced ``{...}``/``[...]`` span, ignoring brackets inside strings."""
    blocks: List[str] = []
    starts = [index for index, char in enumerate(text) if char in "[{"]
    for start in starts:
        opener = text[start]
        closer = "]" if opener == "[" else "}"
        depth = 0
        in_string = False
        escaped = False
        for index in range(start, len(text)):
            char = text[index]
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue
            if char == '"':
                in_string = True
                continue
            if char == opener:
                depth += 1
            elif char == closer:
                depth -= 1
                if depth == 0:
                    blocks.append(text[start : index + 1])
                    break
    return blocks


def normalize_candidate(candidate: str) -> str:
    """Repair the defects models introduce into otherwise valid JSON."""
    normalized = candidate.strip().lstrip("\ufeff")
    # Drop markdown code fences that wrap the payload.
    normalized = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n?", "", normalized)
    normalized = re.sub(r"\n?\s*```\s*$", "", normalized)
    normalized = (
        normalized.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    # Drop trailing commas before an object/array closer.
    return re.sub(r",(\s*[}\]])", r"\1", normalized)


def loads_jsonish(candidate: str) -> Any:
    """Parse a candidate as JSON, falling back to a Python-literal payload."""
    normalized = normalize_candidate(candidate)
    try:
        return json.loads(normalized)
    except json.JSONDecodeError:
        pass

    python_like = re.sub(r"\btrue\b", "True", normalized, flags=re.IGNORECASE)
    python_like = re.sub(r"\bfalse\b", "False", python_like, flags=re.IGNORECASE)
    python_like = re.sub(r"\bnull\b", "None", python_like, flags=re.IGNORECASE)
    try:
        return ast.literal_eval(python_like)
    except (ValueError, SyntaxError):
        return None


def extract_json_value(raw: str, *, preferred: type | tuple[type, ...] | None = None) -> Any:
    """Recover the first parseable JSON value from a raw model response.

    ``preferred`` restricts acceptance to a JSON type (``dict``/``list``); when
    omitted, the first successfully parsed block wins. Raises ``LLMJsonError``
    if nothing parses.
    """
    cleaned = strip_reasoning(raw)

    for candidate in extract_json_blocks(cleaned):
        parsed = loads_jsonish(candidate)
        if parsed is None:
            continue
        if preferred is None or isinstance(parsed, preferred):
            return parsed

    # Models sometimes emit bare JSON with no envelope; try the whole text.
    parsed = loads_jsonish(cleaned)
    if parsed is not None and (preferred is None or isinstance(parsed, preferred)):
        return parsed

    raise LLMJsonError("No parseable JSON payload found in model response")


def extract_json_object(raw: str) -> Optional[Dict[str, Any]]:
    """Recover a JSON object, or ``None`` when the response holds no object."""
    try:
        parsed = extract_json_value(raw, preferred=dict)
    except LLMJsonError:
        return None
    return parsed


def extract_json_list(raw: str) -> Optional[List[Any]]:
    """Recover a JSON array, or ``None`` when the response holds no array."""
    try:
        parsed = extract_json_value(raw, preferred=list)
    except LLMJsonError:
        return None
    return parsed


def coerce_dict_list(value: Any) -> List[Dict[str, Any]]:
    """Keep only the mapping entries of a list."""
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def extract_dict_list(payload: Any, wrapper_keys: Iterable[str] = _LIST_WRAPPER_KEYS) -> List[Dict[str, Any]]:
    """Unwrap a list of objects from either a bare array or an envelope object."""
    if isinstance(payload, list):
        return coerce_dict_list(payload)
    if isinstance(payload, dict):
        for key in wrapper_keys:
            nested = payload.get(key)
            if isinstance(nested, list):
                return coerce_dict_list(nested)
    return []


def collect_dict_objects(raw: str) -> List[Dict[str, Any]]:
    """Salvage every individually parseable object, for truncated responses."""
    cleaned = strip_reasoning(raw)
    objects: List[Dict[str, Any]] = []
    for candidate in extract_json_blocks(cleaned):
        if not candidate.lstrip().startswith("{"):
            continue
        parsed = loads_jsonish(candidate)
        if isinstance(parsed, dict):
            objects.append(parsed)
    return objects
