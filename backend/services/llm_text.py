"""Shared cleanup for free-text (non-JSON) model output.

Models wrap prose in ``<think>`` blocks, markdown code fences, literal ``\\n``
sequences, "Word count: 123" trailers, or TeX ``\\(...\\)`` delimiters that the
frontend renderers don't recognise. Every route that returns model prose to
the client should pass it through this module so the UI gets one predictable
shape:

* ``clean_llm_text``  — for fields the frontend renders as Markdown+LaTeX
  (chat answers, explanations, hints, lesson sections). Keeps Markdown, fixes
  delimiters and escapes.
* ``to_plain_text``   — for fields the frontend renders verbatim (titles,
  answer options, short labels, notification copy). Strips Markdown syntax
  entirely while keeping ``$...$`` math untouched.
* ``sanitize_tree``   — walks a parsed JSON payload and cleans every string,
  with per-key control over which fields are plain text.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Iterable, Mapping, Optional

from services.llm_json import TEX_N_COMMANDS

__all__ = [
    "clean_llm_text",
    "to_plain_text",
    "normalize_math_delimiters",
    "sanitize_tree",
    "PLAIN_TEXT_KEYS",
]

_THINK_BLOCK_RE = re.compile(r"<\s*think(?:ing)?\b[^>]*>[\s\S]*?<\s*/\s*think(?:ing)?\s*>", re.IGNORECASE)
_THINK_TAG_RE = re.compile(r"<\s*/?\s*think(?:ing)?\b[^>]*>", re.IGNORECASE)
_ESCAPED_THINK_RE = re.compile(r"&lt;\s*(/?)\s*think(?:ing)?\b[^&]*&gt;", re.IGNORECASE)
_WHOLE_FENCE_RE = re.compile(r"^\s*```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```\s*$")
_WORD_COUNT_RE = re.compile(r"\s*[*_(\[]*\s*word\s*count\s*[:=]?\s*[*_]*\s*\d+\s*(?:words?)?\s*[*_)\]]*\s*$", re.IGNORECASE)
_LEADING_LABEL_RE = re.compile(
    r"^\s*(?:(?:final\s+)?answer|response|message|explanation|hint|output)\s*:\s*",
    re.IGNORECASE,
)
_DISPLAY_TEX_RE = re.compile(r"\\\[([\s\S]*?)\\\]")
_INLINE_TEX_RE = re.compile(r"\\\(([\s\S]*?)\\\)")
_MATH_SEGMENT_RE = re.compile(r"(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)")
_CODE_SEGMENT_RE = re.compile(r"(```[\s\S]*?```|`[^`\n]+`)")
_TRAILING_WS_RE = re.compile(r"[ \t]+\n")
_MULTI_BLANK_RE = re.compile(r"\n{3,}")

# Keys whose values the UI renders as plain strings (no Markdown pass).
PLAIN_TEXT_KEYS: frozenset = frozenset({
    "title",
    "lessontitle",
    "headline",
    "label",
    "name",
    "topic",
    "subject",
    "options",
    "choices",
    "correctanswer",
    "correct_answer",
    "answer",
    "correctanswertext",
    "videotitle",
    "videochannel",
    "suggested_action",
    "suggestedaction",
    "tone",
    "type",
})


def _strip_think_blocks(text: str) -> str:
    cleaned = _ESCAPED_THINK_RE.sub(lambda m: f"<{m.group(1)}think>", text)
    previous = None
    while previous != cleaned:
        previous = cleaned
        cleaned = _THINK_BLOCK_RE.sub("", cleaned)
    # An unclosed <think> at the start swallows everything up to the first blank line.
    lowered = cleaned.lower()
    open_idx = lowered.find("<think")
    if open_idx != -1 and "</think" not in lowered[open_idx:]:
        after = cleaned[open_idx:]
        split = after.find("\n\n")
        cleaned = cleaned[:open_idx] + (after[split + 2:] if split != -1 else "")
    return _THINK_TAG_RE.sub("", cleaned)


def _unwrap_fence(text: str) -> str:
    match = _WHOLE_FENCE_RE.match(text)
    return match.group(1) if match else text


def normalize_math_delimiters(text: str) -> str:
    """Rewrite ``\\(x\\)`` → ``$x$`` and ``\\[x\\]`` → ``$$x$$`` so remark-math parses them."""
    if not text or "\\" not in text:
        return text
    text = _DISPLAY_TEX_RE.sub(lambda m: f"$${m.group(1).strip()}$$", text)
    text = _INLINE_TEX_RE.sub(lambda m: f"${m.group(1).strip()}$", text)
    return text


def _outside_code(text: str, fn: Callable[[str], str]) -> str:
    parts = _CODE_SEGMENT_RE.split(text)
    return "".join(part if i % 2 else fn(part) for i, part in enumerate(parts))


def _outside_math(text: str, fn: Callable[[str], str]) -> str:
    parts = _MATH_SEGMENT_RE.split(text)
    return "".join(part if i % 2 else fn(part) for i, part in enumerate(parts))


def _fix_escapes(segment: str) -> str:
    # JSON-escaped newlines/tabs that survived parsing as literal text.
    # A letter run after \n or \t can be a TeX command (\neq, \times): keep those.
    segment = segment.replace("\\r\\n", "\n")
    segment = re.sub(
        r"\\n([A-Za-z]*)",
        lambda m: m.group(0) if "n" + m.group(1) in TEX_N_COMMANDS else "\n" + m.group(1),
        segment,
    )
    segment = re.sub(r"\\t(?![A-Za-z])", "  ", segment)
    # Double-escaped TeX from over-escaped JSON strings: \\frac → \frac
    segment = re.sub(r"\\\\(?=[A-Za-z])", r"\\", segment)
    # Escaped dollars in front of TeX commands block the math delimiter.
    segment = re.sub(r"\\\$(?=\\)", "$", segment)
    return segment


def clean_llm_text(text: Any, *, max_chars: Optional[int] = None) -> str:
    """Normalise model prose for Markdown+LaTeX rendering on the client."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = _strip_think_blocks(cleaned)
    cleaned = _WORD_COUNT_RE.sub("", cleaned)
    cleaned = _unwrap_fence(cleaned.strip())
    cleaned = _outside_code(cleaned, _fix_escapes)
    cleaned = _outside_code(cleaned, normalize_math_delimiters)
    cleaned = _WORD_COUNT_RE.sub("", cleaned)
    cleaned = _TRAILING_WS_RE.sub("\n", cleaned)
    cleaned = _MULTI_BLANK_RE.sub("\n\n", cleaned).strip()
    # Model echoing the label it was asked for ("Message: ...").
    if cleaned.count("\n") <= 2:
        cleaned = _LEADING_LABEL_RE.sub("", cleaned, count=1)
    # Whole-answer wrapped in matching quotes.
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in "\"“”'":
        cleaned = cleaned[1:-1].strip()
    if max_chars is not None and len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rstrip()
    return cleaned


_MD_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+", re.MULTILINE)
_MD_BULLET_RE = re.compile(r"^\s{0,3}(?:[-*+•]|\d+[.)])\s+", re.MULTILINE)
_MD_QUOTE_RE = re.compile(r"^\s{0,3}>\s?", re.MULTILINE)
_MD_BOLD_RE = re.compile(r"(\*\*|__)(?=\S)([\s\S]*?\S)\1")
_MD_ITALIC_RE = re.compile(r"(?<![*\w\\])(\*|_)(?=\S)([^*_\n]*?\S)\1(?![*\w])")
_MD_STRIKE_RE = re.compile(r"~~(?=\S)([\s\S]*?\S)~~")
_MD_CODE_RE = re.compile(r"`([^`\n]*)`")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((?:[^)]+)\)")
_MD_HR_RE = re.compile(r"^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$", re.MULTILINE)
_LEADING_OPTION_LABEL_RE = re.compile(r"^\s*(?:\(?[A-Da-d][).:]|[A-Da-d]\s*[-–])\s+")


def _strip_markdown_segment(segment: str) -> str:
    segment = _MD_HR_RE.sub("", segment)
    segment = _MD_HEADING_RE.sub("", segment)
    segment = _MD_QUOTE_RE.sub("", segment)
    segment = _MD_LINK_RE.sub(r"\1", segment)
    previous = None
    while previous != segment:
        previous = segment
        segment = _MD_BOLD_RE.sub(r"\2", segment)
    segment = _MD_ITALIC_RE.sub(r"\2", segment)
    segment = _MD_STRIKE_RE.sub(r"\1", segment)
    segment = _MD_CODE_RE.sub(r"\1", segment)
    return segment


def to_plain_text(
    text: Any,
    *,
    single_line: bool = False,
    strip_bullets: bool = True,
    strip_option_label: bool = False,
    max_chars: Optional[int] = None,
) -> str:
    """Strip Markdown syntax for fields the UI shows verbatim; math stays delimited."""
    cleaned = clean_llm_text(text)
    if not cleaned:
        return ""
    if strip_bullets:
        cleaned = _MD_BULLET_RE.sub("", cleaned)
    cleaned = _outside_math(cleaned, _strip_markdown_segment)
    if strip_option_label:
        cleaned = _LEADING_OPTION_LABEL_RE.sub("", cleaned, count=1)
    if single_line:
        cleaned = re.sub(r"\s*\n+\s*", " ", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned).strip()
    if max_chars is not None and len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rstrip()
    return cleaned


def sanitize_tree(
    value: Any,
    *,
    plain_keys: Iterable[str] = PLAIN_TEXT_KEYS,
    skip_keys: Iterable[str] = (),
    _key: Optional[str] = None,
    _plain: bool = False,
) -> Any:
    """Recursively clean every string in a parsed model payload.

    Strings under a key in ``plain_keys`` (case-insensitive) go through
    ``to_plain_text``; everything else through ``clean_llm_text``. Keys in
    ``skip_keys`` (ids, urls, codes) are returned untouched.
    """
    plain = {k.lower() for k in plain_keys}
    skip = {k.lower() for k in skip_keys} | {"id", "url", "embedurl", "thumbnailurl", "videoid", "code", "competencycode", "competency_code", "storage_path", "storagepath", "source_file"}
    key_l = (_key or "").lower()
    if key_l in skip:
        return value
    if isinstance(value, str):
        return to_plain_text(value, single_line=True) if _plain or key_l in plain else clean_llm_text(value)
    if isinstance(value, Mapping):
        return {
            k: sanitize_tree(v, plain_keys=plain_keys, skip_keys=skip_keys, _key=str(k), _plain=False)
            for k, v in value.items()
        }
    if isinstance(value, list):
        # A list under a plain key (e.g. "options") is a list of plain strings.
        inherit_plain = _plain or key_l in plain
        return [
            sanitize_tree(v, plain_keys=plain_keys, skip_keys=skip_keys, _key=_key, _plain=inherit_plain)
            for v in value
        ]
    return value
