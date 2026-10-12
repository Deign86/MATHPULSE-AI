"""Wire-level contract of the shared Claude client: what each request carries and how replies are read."""
from __future__ import annotations

import json
import os
import sys
from types import SimpleNamespace
from typing import Callable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anthropic
import httpx2
import pytest

from services import ai_client

USER_HI = [{"role": "user", "content": "hi"}]
CODE_FENCED_JSON = '```json\n{"score": 3}\n```'
REFUSAL_DETAILS = {"type": "refusal", "category": "cyber", "explanation": None}
SCORE_SCHEMA = {
    "type": "object",
    "properties": {"score": {"type": "integer"}},
    "required": ["score"],
    "additionalProperties": False,
}


def _text_block(text: str) -> dict:
    return {"type": "text", "text": text}


def _message_response(*content: dict, stop_reason: str = "end_turn", stop_details: dict | None = None) -> httpx2.Response:
    return httpx2.Response(
        200,
        json={
            "id": "msg_test",
            "type": "message",
            "role": "assistant",
            "model": ai_client.CHAT_MODEL,
            "content": list(content),
            "stop_reason": stop_reason,
            "stop_sequence": None,
            "stop_details": stop_details,
            "usage": {"input_tokens": 11, "output_tokens": 7},
        },
    )


def _stream_response(*, thinking: str = "", stop_reason: str = "end_turn", stop_details: dict | None = None) -> httpx2.Response:
    """A server-sent-event reply that streams an optional thinking block, then the text "Hel" + "lo"."""
    events = [
        {
            "type": "message_start",
            "message": {
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": ai_client.REASONER_MODEL,
                "content": [],
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {"input_tokens": 9, "output_tokens": 1},
            },
        }
    ]
    index = 0
    if thinking:
        events += [
            {"type": "content_block_start", "index": index, "content_block": {"type": "thinking", "thinking": "", "signature": ""}},
            {"type": "content_block_delta", "index": index, "delta": {"type": "thinking_delta", "thinking": thinking}},
            {"type": "content_block_delta", "index": index, "delta": {"type": "signature_delta", "signature": "sig"}},
            {"type": "content_block_stop", "index": index},
        ]
        index += 1
    events += [
        {"type": "content_block_start", "index": index, "content_block": {"type": "text", "text": ""}},
        {"type": "content_block_delta", "index": index, "delta": {"type": "text_delta", "text": "Hel"}},
        {"type": "content_block_delta", "index": index, "delta": {"type": "text_delta", "text": "lo"}},
        {"type": "content_block_stop", "index": index},
        {
            "type": "message_delta",
            "delta": {"stop_reason": stop_reason, "stop_sequence": None, "stop_details": stop_details},
            "usage": {"output_tokens": 5},
        },
        {"type": "message_stop"},
    ]
    body = "".join(f"event: {event['type']}\ndata: {json.dumps(event)}\n\n" for event in events)
    return httpx2.Response(200, headers={"content-type": "text/event-stream"}, content=body.encode())


class MockApi:
    """Stands in for api.anthropic.com: records each request and answers with `reply()`."""

    def __init__(self) -> None:
        self.sent: list[SimpleNamespace] = []
        self.reply: Callable[[], httpx2.Response] = lambda: _message_response(_text_block("ok"))

    def handle(self, request: httpx2.Request) -> httpx2.Response:
        self.sent.append(SimpleNamespace(headers=request.headers, body=json.loads(request.content)))
        return self.reply()


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch):
    """Build the shared client for real, but over a mock transport so nothing reaches the network."""
    mock_api = MockApi()
    sdk_client = anthropic.Anthropic
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
    monkeypatch.delenv("ANTHROPIC_WORKSPACE_ID", raising=False)
    monkeypatch.setattr(
        ai_client,
        "Anthropic",
        lambda **options: sdk_client(**options, http_client=httpx2.Client(transport=httpx2.MockTransport(mock_api.handle))),
    )
    ai_client.get_anthropic_client.cache_clear()
    yield mock_api
    ai_client.get_anthropic_client.cache_clear()


def test_default_model_ids_are_current_api_ids() -> None:
    assert ai_client.CHAT_MODEL == "claude-haiku-5-5"
    assert ai_client.REASONER_MODEL == "claude-opus-5-5"


def test_current_model_id_keeps_claude_ids_and_blanks_the_rest() -> None:
    assert ai_client.current_model_id(" claude-opus-5-5 ") == "claude-opus-5-5"
    assert ai_client.current_model_id("retired-chat-model") == ""
    assert ai_client.current_model_id("") == ""


def test_client_requires_an_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    ai_client.get_anthropic_client.cache_clear()
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        ai_client.get_anthropic_client()


def test_chat_model_request_disables_thinking(api: MockApi) -> None:
    ai_client.create_message(USER_HI, model=ai_client.CHAT_MODEL, max_tokens=300)
    request = api.sent[0]
    assert request.body["model"] == ai_client.CHAT_MODEL
    assert request.body["thinking"] == {"type": "disabled"}
    assert request.body["max_tokens"] == 300
    assert "output_config" not in request.body
    assert "fallbacks" not in request.body
    assert "anthropic-beta" not in request.headers


def test_reasoner_request_sets_effort_token_floor_and_refusal_fallback(api: MockApi) -> None:
    ai_client.create_message(USER_HI, model=ai_client.REASONER_MODEL, max_tokens=500)
    request = api.sent[0]
    assert request.body["model"] == ai_client.REASONER_MODEL
    assert request.body.get("thinking", {}).get("type") != "disabled"
    assert request.body["output_config"] == {"effort": "medium"}
    assert request.body["max_tokens"] >= 16384
    assert request.headers["anthropic-beta"] == "server-side-fallback-2026-07-01"
    assert request.body["fallbacks"] == "default"


def test_effort_argument_reaches_the_request(api: MockApi) -> None:
    ai_client.create_message(USER_HI, model=ai_client.REASONER_MODEL, effort="high")
    ai_client.create_message(USER_HI, model=ai_client.CHAT_MODEL, effort="low")
    assert [request.body["output_config"] for request in api.sent] == [{"effort": "high"}, {"effort": "low"}]
    assert api.sent[1].body["thinking"] == {"type": "disabled"}


def test_sampling_parameters_are_not_accepted(api: MockApi) -> None:
    with pytest.raises(TypeError):
        ai_client.create_message(USER_HI, temperature=0.2)  # type: ignore[call-arg]
    for model in (ai_client.CHAT_MODEL, ai_client.REASONER_MODEL):
        ai_client.create_message(USER_HI, model=model)
    for request in api.sent:
        assert not {"temperature", "top_p", "top_k"} & request.body.keys()


def test_workspace_id_is_sent_as_a_header_when_configured(api: MockApi, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_WORKSPACE_ID", "wrkspc_test")
    ai_client.get_anthropic_client.cache_clear()
    ai_client.create_message(USER_HI)
    assert api.sent[0].headers["anthropic-workspace-id"] == "wrkspc_test"


def test_workspace_header_is_omitted_by_default(api: MockApi) -> None:
    ai_client.create_message(USER_HI)
    assert "anthropic-workspace-id" not in api.sent[0].headers


def test_system_messages_are_hoisted_to_the_system_parameter(api: MockApi) -> None:
    ai_client.create_message(
        [
            {"role": "system", "content": "Be brief."},
            {"role": "user", "content": "Hi"},
            {"role": "system", "content": "Use plain words."},
            {"role": "assistant", "content": "Hello"},
            {"role": "user", "content": "Add 2 and 2"},
        ]
    )
    body = api.sent[0].body
    assert body["system"] == "Be brief.\n\nUse plain words."
    assert body["messages"] == [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello"},
        {"role": "user", "content": "Add 2 and 2"},
    ]


def test_leading_assistant_and_blank_turns_are_dropped(api: MockApi) -> None:
    ai_client.create_message(
        [
            {"role": "assistant", "content": "Welcome back"},
            {"role": "user", "content": "   "},
            {"role": "user", "content": "Hi"},
        ]
    )
    body = api.sent[0].body
    assert body["messages"] == [{"role": "user", "content": "Hi"}]
    assert "system" not in body


def test_json_output_adds_an_instruction_and_strips_the_code_fence(api: MockApi) -> None:
    api.reply = lambda: _message_response(_text_block(CODE_FENCED_JSON))
    reply = ai_client.complete_text(
        [{"role": "system", "content": "Grade it."}, {"role": "user", "content": "2 + 2"}], json_output=True
    )
    assert json.loads(reply) == {"score": 3}
    system = api.sent[0].body["system"]
    assert system.startswith("Grade it.")
    assert "JSON" in system


def test_json_output_recovers_json_wrapped_in_prose(api: MockApi) -> None:
    api.reply = lambda: _message_response(
        _text_block('Here is the classification:\n{"risk_label": "high risk of failing", "confidence": 0.91}\nHope it helps.')
    )
    reply = ai_client.complete_text(USER_HI, json_output=True)
    assert json.loads(reply) == {"risk_label": "high risk of failing", "confidence": 0.91}


def test_json_output_returns_the_text_when_no_json_can_be_recovered(api: MockApi) -> None:
    api.reply = lambda: _message_response(_text_block("I cannot classify this."))
    assert ai_client.complete_text(USER_HI, json_output=True) == "I cannot classify this."


def test_json_output_keeps_a_truncated_reply_whole_for_the_callers_salvage_parser(api: MockApi) -> None:
    truncated = '[{"question": "Q1", "answer": "A"}, {"question": "Q2", "answer": "B"}, {"question": "Q3", "ans'
    api.reply = lambda: _message_response(_text_block(truncated), stop_reason="max_tokens")
    assert ai_client.complete_text(USER_HI, json_output=True) == truncated


def test_json_output_never_returns_a_nested_fragment_of_malformed_json(api: MockApi) -> None:
    malformed = '{"summary": "Review the "hole" rule", "practice": {"problem": "Find the domain", "solution": "x != 2"}}'
    api.reply = lambda: _message_response(_text_block(malformed))
    assert ai_client.complete_text(USER_HI, json_output=True) == malformed


def test_reply_keeps_the_code_fence_unless_json_output_is_requested(api: MockApi) -> None:
    api.reply = lambda: _message_response(_text_block(CODE_FENCED_JSON))
    assert ai_client.complete_text(USER_HI) == CODE_FENCED_JSON
    assert "system" not in api.sent[0].body


def test_schema_turns_on_structured_outputs_without_a_json_instruction(api: MockApi) -> None:
    ai_client.create_message(
        [{"role": "system", "content": "Grade it."}, {"role": "user", "content": "2 + 2"}], schema=SCORE_SCHEMA
    )
    body = api.sent[0].body
    assert body["output_config"] == {"format": {"type": "json_schema", "schema": SCORE_SCHEMA}}
    assert body["system"] == "Grade it."


def test_structured_outputs_keep_the_effort_setting(api: MockApi) -> None:
    ai_client.create_message(USER_HI, model=ai_client.REASONER_MODEL, schema=SCORE_SCHEMA)
    assert api.sent[0].body["output_config"] == {
        "effort": "medium",
        "format": {"type": "json_schema", "schema": SCORE_SCHEMA},
    }


def test_complete_json_returns_the_parsed_object(api: MockApi) -> None:
    api.reply = lambda: _message_response(_text_block('{"score": 3}'))
    assert ai_client.complete_json(USER_HI, schema=SCORE_SCHEMA) == {"score": 3}
    assert api.sent[0].body["output_config"]["format"]["schema"] == SCORE_SCHEMA


def test_complete_json_raises_when_claude_declines(api: MockApi) -> None:
    api.reply = lambda: _message_response(stop_reason="refusal", stop_details=REFUSAL_DETAILS)
    with pytest.raises(ai_client.AIRefusalError):
        ai_client.complete_json(USER_HI, schema=SCORE_SCHEMA)


@pytest.mark.parametrize("stale_id", ["retired-chat-model", "custom/model", ""])
def test_non_claude_model_id_is_replaced_by_the_chat_model(api: MockApi, stale_id: str) -> None:
    ai_client.create_message(USER_HI, model=stale_id)
    assert api.sent[0].body["model"] == ai_client.CHAT_MODEL


def test_reply_text_joins_text_blocks_and_skips_thinking(api: MockApi) -> None:
    api.reply = lambda: _message_response(
        {"type": "thinking", "thinking": "Considering.", "signature": "sig"},
        _text_block("Hello "),
        _text_block("world"),
    )
    assert ai_client.complete_text(USER_HI, model=ai_client.REASONER_MODEL) == "Hello world"


def test_refusal_raises_ai_refusal_error(api: MockApi) -> None:
    api.reply = lambda: _message_response(stop_reason="refusal", stop_details=REFUSAL_DETAILS)
    message = ai_client.create_message(USER_HI)
    assert message.stop_reason == "refusal"
    with pytest.raises(ai_client.AIRefusalError, match="cyber"):
        ai_client.reply_text(message)
    with pytest.raises(ai_client.AIRefusalError):
        ai_client.complete_text(USER_HI)


def test_rate_limit_surfaces_without_sdk_retries(api: MockApi) -> None:
    api.reply = lambda: httpx2.Response(
        429, json={"type": "error", "error": {"type": "rate_limit_error", "message": "slow down"}}
    )
    with pytest.raises(ai_client.RateLimitError):
        ai_client.create_message(USER_HI)
    assert len(api.sent) == 1, "retries belong to InferenceClient; SDK retries would stack under them"


def test_stream_text_yields_text_deltas_and_streams_summarized_thinking(api: MockApi) -> None:
    api.reply = lambda: _stream_response(thinking="Weighing options.")
    assert list(ai_client.stream_text(USER_HI, model=ai_client.REASONER_MODEL)) == ["Hel", "lo"]
    body = api.sent[0].body
    assert body["stream"] is True
    assert body["thinking"] == {"type": "adaptive", "display": "summarized"}


def test_chat_model_stream_keeps_thinking_disabled(api: MockApi) -> None:
    api.reply = lambda: _stream_response()
    assert "".join(ai_client.stream_text(USER_HI, model=ai_client.CHAT_MODEL)) == "Hello"
    assert api.sent[0].body["thinking"] == {"type": "disabled"}


def _drain_open_stream(model: str) -> None:
    with ai_client.open_stream(USER_HI, model=model) as stream:
        stream.get_final_message()


def _drain_stream_text(model: str) -> None:
    list(ai_client.stream_text(USER_HI, model=model))


STREAM_ENTRY_POINTS = pytest.mark.parametrize(
    "drain", [_drain_open_stream, _drain_stream_text], ids=["open_stream", "stream_text"]
)


@STREAM_ENTRY_POINTS
def test_reasoner_stream_carries_the_refusal_fallback(api: MockApi, drain: Callable[[str], None]) -> None:
    api.reply = lambda: _stream_response(thinking="Weighing options.")
    drain(ai_client.REASONER_MODEL)
    request = api.sent[0]
    assert request.body["stream"] is True
    assert request.headers["anthropic-beta"] == "server-side-fallback-2026-07-01"
    assert request.body["fallbacks"] == "default"


@STREAM_ENTRY_POINTS
def test_chat_model_stream_carries_no_refusal_fallback(api: MockApi, drain: Callable[[str], None]) -> None:
    api.reply = lambda: _stream_response()
    drain(ai_client.CHAT_MODEL)
    request = api.sent[0]
    assert request.body["stream"] is True
    assert "anthropic-beta" not in request.headers
    assert "fallbacks" not in request.body


def test_open_stream_exposes_thinking_deltas_and_final_usage(api: MockApi) -> None:
    api.reply = lambda: _stream_response(thinking="Weighing options.")
    with ai_client.open_stream(USER_HI, model=ai_client.REASONER_MODEL) as stream:
        deltas = [event.delta for event in stream if event.type == "content_block_delta"]
        final = stream.get_final_message()
    assert "".join(delta.thinking for delta in deltas if delta.type == "thinking_delta") == "Weighing options."
    assert "".join(delta.text for delta in deltas if delta.type == "text_delta") == "Hello"
    assert final.stop_reason == "end_turn"
    assert (final.usage.input_tokens, final.usage.output_tokens) == (9, 5)


def test_stream_text_raises_after_the_stream_when_claude_declines(api: MockApi) -> None:
    api.reply = lambda: _stream_response(stop_reason="refusal", stop_details=REFUSAL_DETAILS)
    received: list[str] = []
    with pytest.raises(ai_client.AIRefusalError):
        for chunk in ai_client.stream_text(USER_HI, model=ai_client.CHAT_MODEL):
            received.append(chunk)
    assert received == ["Hel", "lo"]
