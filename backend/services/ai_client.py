"""Shared Claude (Anthropic Messages API) client and the request helpers every backend AI call goes through."""
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterator, List, Mapping, Optional, Sequence, Tuple, Union

from anthropic import (
    Anthropic,
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
    Timeout,
)
from anthropic.lib.streaming import BetaMessageStreamManager
from anthropic.types.beta import BetaMessage

from .llm_json import normalize_candidate

try:
    from dotenv import load_dotenv
    for _env_path in [
        Path(__file__).resolve().parents[1] / ".env.local",
        Path(__file__).resolve().parents[1] / ".env",
        Path(__file__).resolve().parents[2] / ".env.local",
        Path(__file__).resolve().parents[2] / ".env",
    ]:
        if _env_path.exists():
            load_dotenv(dotenv_path=_env_path, override=False)
except Exception:
    pass

__all__ = [
    "get_anthropic_client",
    "CHAT_MODEL",
    "REASONER_MODEL",
    "SUPPORTED_MODELS",
    "EFFORT_LEVELS",
    "current_model_id",
    "split_system",
    "create_message",
    "reply_text",
    "complete_text",
    "complete_json",
    "outer_json",
    "open_stream",
    "stream_text",
    "AIRefusalError",
    "APIError",
    "APIConnectionError",
    "APIStatusError",
    "APITimeoutError",
    "RateLimitError",
    "Timeout",
]

RequestTimeout = Union[float, Timeout, None]

EFFORT_LEVELS = frozenset({"low", "medium", "high", "xhigh", "max"})
_DEFAULT_THINKING_EFFORT = "medium"
# Opus and Sonnet always think and thinking tokens count toward max_tokens; this floor leaves room for the reply.
# It stays under the SDK's non-streaming guard (~21K tokens), so create_message never needs a stream.
_THINKING_MIN_MAX_TOKENS = 16384
# Haiku accepts thinking "disabled" only at effort high or below.
_HAIKU_NO_THINKING_EFFORTS = frozenset({None, "low", "medium", "high"})
# Models that accept server-side refusal fallbacks in their "default" (Anthropic-routed) form.
_FALLBACK_MODELS = frozenset({"claude-opus-5-5", "claude-sonnet-5-5"})
_FALLBACK_BETA = "server-side-fallback-2026-07-01"
_JSON_ONLY_INSTRUCTION = (
    "Respond with only the JSON value: no markdown code fences and no text before or after it."
)
_CODE_FENCE = re.compile(r"^```[\w-]*[ \t]*\n(.*?)\n?```$", re.DOTALL)


def current_model_id(model: str) -> str:
    """Return `model` when it names a Claude model, else "" so the caller falls back to its default.

    Stale ids from an earlier provider can still sit in env vars and the Firestore model config.
    """
    cleaned = (model or "").strip()
    return cleaned if cleaned.startswith("claude-") else ""


CHAT_MODEL = current_model_id(os.getenv("CLAUDE_CHAT_MODEL", "")) or "claude-haiku-5-5"
REASONER_MODEL = current_model_id(os.getenv("CLAUDE_REASONER_MODEL", "")) or "claude-opus-5-5"
# Models this client's request shapes are verified against; admin overrides must name one of them.
SUPPORTED_MODELS = frozenset({"claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", CHAT_MODEL, REASONER_MODEL})


class AIRefusalError(RuntimeError):
    """Claude declined the request (stop_reason "refusal"), after any server-side fallback model ran."""


@lru_cache(maxsize=1)
def get_anthropic_client() -> Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    # User-level API keys are not bound to a workspace, so every request must name one.
    workspace_id = os.getenv("ANTHROPIC_WORKSPACE_ID", "").strip()
    return Anthropic(
        api_key=api_key,
        max_retries=0,  # retries are owned by InferenceClient; SDK retries would stack under them
        default_headers={"anthropic-workspace-id": workspace_id} if workspace_id else None,
    )


def split_system(messages: Sequence[Mapping[str, str]]) -> Tuple[str, List[Dict[str, str]]]:
    """Split chat-style messages into Claude's top-level system prompt and its user/assistant turns.

    System messages anywhere in the list are joined in order; blank turns and tool/function turns are dropped,
    and leading assistant turns are dropped because a conversation must open with a user turn.
    """
    system_parts: List[str] = []
    turns: List[Dict[str, str]] = []
    for message in messages:
        role = (message.get("role") or "user").strip().lower()
        content = message.get("content") or ""
        if not content.strip():
            continue
        if role == "system":
            system_parts.append(content)
        elif role in ("user", "assistant") and (turns or role == "user"):
            turns.append({"role": role, "content": content})
    return "\n\n".join(system_parts), turns


def _request(
    messages: Sequence[Mapping[str, str]],
    *,
    model: str,
    max_tokens: int,
    json_output: bool,
    effort: Optional[str],
    schema: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    resolved_model = current_model_id(model) or CHAT_MODEL
    system, turns = split_system(messages)
    if json_output and schema is None:
        system = f"{system}\n\n{_JSON_ONLY_INSTRUCTION}".strip()
    request: Dict[str, Any] = {"model": resolved_model, "messages": turns}
    if system:
        request["system"] = system
    if resolved_model.startswith("claude-haiku") and effort in _HAIKU_NO_THINKING_EFFORTS:
        # The fast tier skips thinking: lower latency, and the whole budget goes to the reply.
        request["max_tokens"] = max_tokens
        request["thinking"] = {"type": "disabled"}
    else:
        request["max_tokens"] = max(max_tokens, _THINKING_MIN_MAX_TOKENS)
        effort = effort or _DEFAULT_THINKING_EFFORT
    output_config: Dict[str, Any] = {}
    if effort:
        output_config["effort"] = effort
    if schema is not None:
        # Structured outputs: the reply is guaranteed to be JSON matching the schema.
        output_config["format"] = {"type": "json_schema", "schema": schema}
    if output_config:
        request["output_config"] = output_config
    if resolved_model in _FALLBACK_MODELS:
        # On a safety-classifier refusal the API re-runs the request on Anthropic's recommended fallback model.
        request["betas"] = [_FALLBACK_BETA]
        request["fallbacks"] = "default"
    return request


def _client(timeout: RequestTimeout, max_retries: int) -> Anthropic:
    client = get_anthropic_client()
    if timeout is not None:
        client = client.with_options(timeout=timeout)
    if max_retries:
        client = client.with_options(max_retries=max_retries)
    return client


def _raise_if_refused(message: BetaMessage) -> None:
    if message.stop_reason == "refusal":
        category = message.stop_details.category if message.stop_details else None
        raise AIRefusalError(f"Claude declined the request (category={category})")


def create_message(
    messages: Sequence[Mapping[str, str]],
    *,
    model: str = "",
    max_tokens: int = 4096,
    json_output: bool = False,
    effort: Optional[str] = None,
    timeout: RequestTimeout = None,
    max_retries: int = 0,
    schema: Optional[Mapping[str, Any]] = None,
) -> BetaMessage:
    """Send chat-style messages to Claude and return the full message (usage, stop_reason, content blocks).

    `model` defaults to CHAT_MODEL; ids that do not name a Claude model fall back to it too.
    `schema` (a JSON Schema whose objects set additionalProperties: false) turns on structured outputs.
    Sampling parameters (temperature, top_p, top_k) are not accepted: current Claude models reject them.
    """
    request = _request(
        messages, model=model, max_tokens=max_tokens, json_output=json_output, effort=effort, schema=schema
    )
    return _client(timeout, max_retries).beta.messages.create(**request)


def outer_json(text: str) -> Optional[str]:
    """The text's outermost JSON object or array with surrounding prose removed; None unless that span is valid JSON.

    Only the span from the first opening bracket to the last closing one counts, so a truncated or malformed reply
    never yields one of its nested fragments.
    """
    starts = [index for index in (text.find("{"), text.find("[")) if index >= 0]
    end = max(text.rfind("}"), text.rfind("]"))
    if not starts or end < min(starts):
        return None
    candidate = text[min(starts) : end + 1]
    # Return the repaired span so the caller's json.loads keeps single-backslash LaTeX (\times, \sqrt) intact.
    repaired = normalize_candidate(candidate)
    try:
        json.loads(repaired)
    except json.JSONDecodeError:
        return None
    return repaired


def reply_text(message: BetaMessage, *, json_output: bool = False) -> str:
    """Join the reply's text blocks; raises AIRefusalError when Claude declined.

    With json_output a code fence or prose around a complete JSON value is removed, so the text can go straight to
    json.loads. A reply cut off at max_tokens comes back as-is for the caller's own salvage parsing.
    """
    _raise_if_refused(message)
    text = "".join(block.text for block in message.content if block.type == "text").strip()
    if not json_output:
        return text
    if fenced := _CODE_FENCE.match(text):
        text = fenced.group(1).strip()
    if message.stop_reason == "max_tokens":
        return text
    return outer_json(text) or text


def complete_text(
    messages: Sequence[Mapping[str, str]],
    *,
    model: str = "",
    max_tokens: int = 4096,
    json_output: bool = False,
    effort: Optional[str] = None,
    timeout: RequestTimeout = None,
    max_retries: int = 0,
) -> str:
    """create_message + reply_text: the reply text for chat-style messages."""
    message = create_message(
        messages,
        model=model,
        max_tokens=max_tokens,
        json_output=json_output,
        effort=effort,
        timeout=timeout,
        max_retries=max_retries,
    )
    return reply_text(message, json_output=json_output)


def complete_json(
    messages: Sequence[Mapping[str, str]],
    *,
    schema: Mapping[str, Any],
    model: str = "",
    max_tokens: int = 1024,
    effort: Optional[str] = None,
    timeout: RequestTimeout = None,
    max_retries: int = 0,
) -> Dict[str, Any]:
    """Structured-output call: the parsed JSON object Claude returned for `schema`."""
    message = create_message(
        messages,
        model=model,
        max_tokens=max_tokens,
        effort=effort,
        timeout=timeout,
        max_retries=max_retries,
        schema=schema,
    )
    parsed: Dict[str, Any] = json.loads(reply_text(message))
    return parsed


def open_stream(
    messages: Sequence[Mapping[str, str]],
    *,
    model: str = "",
    max_tokens: int = 4096,
    json_output: bool = False,
    effort: Optional[str] = None,
    timeout: RequestTimeout = None,
    max_retries: int = 0,
) -> BetaMessageStreamManager:
    """Open a streamed request; use as `with open_stream(...) as stream:`.

    Iterate `stream` for raw events (content_block_delta with delta.type "thinking_delta" or "text_delta"),
    or `stream.text_stream` for reply text, then `stream.get_final_message()` for stop_reason and usage.
    Thinking models stream summarized thinking so callers can show progress while the model reasons.
    """
    request = _request(messages, model=model, max_tokens=max_tokens, json_output=json_output, effort=effort)
    if "thinking" not in request:
        request["thinking"] = {"type": "adaptive", "display": "summarized"}
    return _client(timeout, max_retries).beta.messages.stream(**request)


def stream_text(
    messages: Sequence[Mapping[str, str]],
    *,
    model: str = "",
    max_tokens: int = 4096,
    effort: Optional[str] = None,
    timeout: RequestTimeout = None,
    max_retries: int = 0,
) -> Iterator[str]:
    """Yield reply text deltas; raises AIRefusalError after the stream if Claude declined."""
    with open_stream(
        messages,
        model=model,
        max_tokens=max_tokens,
        effort=effort,
        timeout=timeout,
        max_retries=max_retries,
    ) as stream:
        yield from stream.text_stream
        final = stream.get_final_message()
    _raise_if_refused(final)
