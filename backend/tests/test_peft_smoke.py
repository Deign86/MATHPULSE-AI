"""
backend/tests/test_peft_smoke.py
Lightweight smoke tests for local_peft provider routing.

Run with:
  python -m pytest backend/tests/test_peft_smoke.py -q
"""

import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.inference_client import InferenceClient, InferenceRequest


def _set_local_peft_env(monkeypatch):
    monkeypatch.setenv("INFERENCE_PROVIDER", "local_peft")
    monkeypatch.setenv("INFERENCE_ENABLE_PROVIDER_FALLBACK", "true")
    monkeypatch.setenv("INFERENCE_GPU_PROVIDER", "hf_inference")
    monkeypatch.setenv("INFERENCE_CPU_PROVIDER", "hf_inference")
    monkeypatch.setenv("LORA_BASE_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
    monkeypatch.setenv(
        "LORA_ADAPTER_MODEL_ID",
        "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora",
    )
    monkeypatch.setenv("LORA_LOAD_IN_4BIT", "true")
    monkeypatch.setenv("LORA_DEVICE_MAP", "auto")
    monkeypatch.setenv("LORA_DTYPE", "float16")
    monkeypatch.setenv("LORA_MAX_NEW_TOKENS", "576")


def test_local_peft_chat_provider_chain_prioritizes_adapter(monkeypatch):
    _set_local_peft_env(monkeypatch)
    client = InferenceClient()

    chat_chain = client._provider_chain_for_task("chat")
    assert chat_chain[0] == "local_peft"
    assert "hf_inference" in chat_chain

    # Non-chat tasks keep existing forced task provider mapping from models.yaml.
    verify_chain = client._provider_chain_for_task("verify_solution")
    assert verify_chain == ["hf_inference"]


def test_local_peft_generate_path_returns_text(monkeypatch):
    _set_local_peft_env(monkeypatch)

    def fake_call_local_peft(self, req, *, provider, route, fallback_depth):
        assert provider == "local_peft"
        assert req.task_type == "chat"
        return "Adapter-generated text"

    monkeypatch.setattr(InferenceClient, "_call_local_peft", fake_call_local_peft)
    client = InferenceClient()

    req = InferenceRequest(
        messages=[{"role": "user", "content": "Solve 2x + 4 = 10"}],
        task_type="chat",
        max_new_tokens=128,
    )
    text = client.generate_from_messages(req)

    assert isinstance(text, str)
    assert text == "Adapter-generated text"
