"""DeepSeek's current models think by default; the shared client must set the toggle per model."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from services import ai_client


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    ai_client.get_deepseek_client.cache_clear()
    client = ai_client.get_deepseek_client()
    requests: list = []
    # The SDK merges extra_body (options.extra_json) into the JSON body it sends.
    monkeypatch.setattr(client.chat.completions, "_post", lambda *args, **kwargs: requests.append({**kwargs["body"], **(kwargs["options"].get("extra_json") or {})}))
    yield requests
    ai_client.get_deepseek_client.cache_clear()


def test_default_model_ids_are_current_api_ids() -> None:
    assert ai_client.CHAT_MODEL == "deepseek-flash"
    assert ai_client.REASONER_MODEL == "deepseek-v4-pro"


def test_chat_model_disables_thinking(sent: list) -> None:
    ai_client.get_deepseek_client().chat.completions.create(model=ai_client.CHAT_MODEL, messages=[{"role": "user", "content": "hi"}])
    assert sent[0]["thinking"] == {"type": "disabled"}


def test_reasoner_model_enables_thinking(sent: list) -> None:
    ai_client.get_deepseek_client().chat.completions.create(model=ai_client.REASONER_MODEL, messages=[{"role": "user", "content": "hi"}])
    assert sent[0]["thinking"] == {"type": "enabled"}


def test_caller_thinking_wins(sent: list) -> None:
    ai_client.get_deepseek_client().chat.completions.create(
        model=ai_client.CHAT_MODEL,
        messages=[{"role": "user", "content": "hi"}],
        extra_body={"thinking": {"type": "enabled"}},
    )
    assert sent[0]["thinking"] == {"type": "enabled"}


def test_retired_ids_map_to_current_ids(sent: list) -> None:
    ai_client.get_deepseek_client().chat.completions.create(model="deepseek-reasoner", messages=[{"role": "user", "content": "hi"}])
    assert sent[0]["model"] == "deepseek-v4-pro"
    assert sent[0]["thinking"] == {"type": "enabled"}
    assert ai_client.current_model_id("deepseek-chat") == "deepseek-flash"


def test_stale_firestore_override_resolves_to_current_id(monkeypatch: pytest.MonkeyPatch) -> None:
    from services import inference_client

    monkeypatch.setitem(inference_client._RUNTIME_OVERRIDES, "HF_RAG_MODEL_ID", "deepseek-reasoner")
    assert inference_client.get_model_for_task("rag_lesson") == "deepseek-v4-pro"
