from __future__ import annotations

import asyncio
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import main as main_module
from routes import rag_routes
from services import inference_client as inf_client
from services.ai_client import CHAT_MODEL, REASONER_MODEL
from services.inference_client import (
    _MODEL_PROFILES,
    InferenceClient,
    InferenceRequest,
    get_current_runtime_config,
    get_model_for_task,
    is_sequential_model,
    model_supports_thinking,
    reset_runtime_overrides,
    set_runtime_model_override,
    set_runtime_model_profile,
)


REQUIRED_PROFILE_KEYS = {
    "INFERENCE_MODEL_ID", "INFERENCE_CHAT_MODEL_ID",
    "HF_QUIZ_MODEL_ID", "HF_RAG_MODEL_ID", "INFERENCE_LOCK_MODEL_ID",
}
ALTERNATE_MODEL = "claude-sonnet-5-5"
STALE_MODEL = "retired-model"
MODEL_ENV_KEYS = (
    "INFERENCE_MODEL_ID",
    "INFERENCE_CHAT_MODEL_ID",
    "INFERENCE_LOCK_MODEL_ID",
    inf_client.TEMP_CHAT_MODEL_OVERRIDE_ENV,
    "INFERENCE_FALLBACK_MODELS",
)


def _firestore_holding_model_config(stored: dict) -> SimpleNamespace:
    """Stands in for firestore.client() where system_config/active_model_config holds `stored`."""
    document = SimpleNamespace(
        get=lambda: SimpleNamespace(exists=True, to_dict=lambda: stored),
        set=lambda *_args, **_kwargs: None,
    )
    documents = {("system_config", "active_model_config"): document}
    return SimpleNamespace(collection=lambda name: SimpleNamespace(document=lambda doc_id: documents[(name, doc_id)]))


class TestModelProfiles:
    def test_profiles_have_all_keys(self):
        for name, profile in _MODEL_PROFILES.items():
            assert REQUIRED_PROFILE_KEYS == set(profile.keys()), \
                f"Profile '{name}' missing or extra keys"

    def test_dev_uses_chat_model(self):
        dev = _MODEL_PROFILES["dev"]
        for key, value in dev.items():
            assert value == CHAT_MODEL, f"dev/{key} = {value}, expected {CHAT_MODEL}"

    def test_prod_chat_is_chat_model(self):
        assert _MODEL_PROFILES["prod"]["INFERENCE_CHAT_MODEL_ID"] == CHAT_MODEL

    def test_prod_rag_is_reasoner(self):
        assert _MODEL_PROFILES["prod"]["HF_RAG_MODEL_ID"] == REASONER_MODEL

    def test_budget_uses_chat_model_everywhere(self):
        budget = _MODEL_PROFILES["budget"]
        for key, value in budget.items():
            assert value == CHAT_MODEL, f"budget/{key} = {value}"


class TestRuntimeOverrides:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    def test_set_profile_populates_overrides(self):
        set_runtime_model_profile("dev")
        assert inf_client._RUNTIME_PROFILE == "dev"
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_MODEL_ID"] == CHAT_MODEL
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_CHAT_MODEL_ID"] == CHAT_MODEL

    def test_set_profile_replaces_all_overrides(self):
        set_runtime_model_profile("dev")
        set_runtime_model_profile("prod")
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_CHAT_MODEL_ID"] == CHAT_MODEL
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_LOCK_MODEL_ID"] == CHAT_MODEL
        assert inf_client._RUNTIME_OVERRIDES["HF_RAG_MODEL_ID"] == REASONER_MODEL

    def test_set_profile_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown profile"):
            set_runtime_model_profile("nonexistent")

    def test_single_override_sets_key(self):
        set_runtime_model_override("HF_RAG_MODEL_ID", ALTERNATE_MODEL)
        assert inf_client._RUNTIME_OVERRIDES["HF_RAG_MODEL_ID"] == ALTERNATE_MODEL

    def test_reset_clears_overrides(self):
        set_runtime_model_profile("dev")
        reset_runtime_overrides()
        assert inf_client._RUNTIME_PROFILE == ""
        assert inf_client._RUNTIME_OVERRIDES == {}

    def test_override_layers_on_profile(self):
        set_runtime_model_profile("dev")
        set_runtime_model_override("HF_RAG_MODEL_ID", ALTERNATE_MODEL)
        assert inf_client._RUNTIME_OVERRIDES["HF_RAG_MODEL_ID"] == ALTERNATE_MODEL
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_MODEL_ID"] == CHAT_MODEL


class TestGetCurrentRuntimeConfig:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    def test_returns_resolved_dict_with_all_keys(self):
        set_runtime_model_profile("dev")
        config = get_current_runtime_config()
        assert config["profile"] == "dev"
        for key in REQUIRED_PROFILE_KEYS:
            assert key in config["resolved"], f"Missing {key}"

    def test_override_takes_priority_over_profile(self):
        set_runtime_model_profile("dev")
        set_runtime_model_override("INFERENCE_CHAT_MODEL_ID", ALTERNATE_MODEL)
        config = get_current_runtime_config()
        assert config["resolved"]["INFERENCE_CHAT_MODEL_ID"] == ALTERNATE_MODEL

    def test_non_claude_override_resolves_to_not_configured(self):
        set_runtime_model_override("HF_RAG_MODEL_ID", STALE_MODEL)
        config = get_current_runtime_config()
        assert config["overrides"]["HF_RAG_MODEL_ID"] == STALE_MODEL
        assert config["resolved"]["HF_RAG_MODEL_ID"] == ""

    def test_non_claude_override_falls_back_to_profile_value(self):
        set_runtime_model_profile("prod")
        set_runtime_model_override("HF_RAG_MODEL_ID", STALE_MODEL)
        assert get_current_runtime_config()["resolved"]["HF_RAG_MODEL_ID"] == REASONER_MODEL

    def test_stale_firestore_config_resolves_to_the_profile_models(self, monkeypatch):
        stored = {
            "profile": "prod",
            "overrides": {"INFERENCE_MODEL_ID": STALE_MODEL, "HF_RAG_MODEL_ID": STALE_MODEL},
        }
        monkeypatch.setattr("firebase_admin.firestore.client", lambda: _firestore_holding_model_config(stored))

        inf_client.load_runtime_config_from_firestore()

        resolved = get_current_runtime_config()["resolved"]
        assert resolved["INFERENCE_MODEL_ID"] == CHAT_MODEL
        assert resolved["HF_RAG_MODEL_ID"] == REASONER_MODEL


def _start_backend(monkeypatch: pytest.MonkeyPatch, firebase_initializes: bool) -> None:
    """Run main's lifespan startup with its other warm-ups stubbed, and wait for the background tasks it starts."""

    def init_firebase_admin() -> None:
        main_module._firebase_ready = firebase_initializes

    monkeypatch.setattr(main_module, "_firebase_ready", False)
    monkeypatch.setattr(main_module, "_backend_ready", False)
    monkeypatch.setattr(main_module, "_init_firebase_admin", init_firebase_admin)
    monkeypatch.setattr(main_module, "_mark_interrupted_async_jobs", lambda: 0)
    monkeypatch.setattr(main_module, "validate_anthropic_auth", lambda _timeout: {"status": "ok", "key_suffix": "test"})
    monkeypatch.setattr(main_module, "get_inference_client", lambda: None)
    monkeypatch.setattr("rag.vectorstore_loader.get_vectorstore_health", lambda: {"chunkCount": 1, "subjects": {}})

    async def start_and_settle() -> None:
        async with main_module.app_lifespan(main_module.app):
            await asyncio.gather(*(asyncio.all_tasks() - {asyncio.current_task()}))

    asyncio.run(start_and_settle())


class TestAdminModelConfigSurvivesRestart:
    """The model config an admin saves lives in Firestore and must be back in effect after every backend start."""

    @pytest.fixture(autouse=True)
    def _fresh_process_state(self, monkeypatch):
        monkeypatch.setattr(inf_client, "_RUNTIME_OVERRIDES", {})
        monkeypatch.setattr(inf_client, "_RUNTIME_PROFILE", "")
        for key in ("HF_RAG_MODEL_ID", "INFERENCE_MODEL_ID", "INFERENCE_ENFORCE_LOCK_MODEL"):
            monkeypatch.setenv(key, "")

    def test_startup_applies_the_override_saved_in_firestore(self, monkeypatch):
        saved_config = {"profile": "prod", "overrides": {"HF_RAG_MODEL_ID": ALTERNATE_MODEL}}
        monkeypatch.setattr("firebase_admin.firestore.client", lambda: _firestore_holding_model_config(saved_config))
        monkeypatch.setattr(rag_routes, "get_vectorstore_health", lambda: {"chunkCount": 1, "subjects": {}})
        assert get_model_for_task("rag_lesson") == CHAT_MODEL, "env alone must not already route lessons to the override"

        _start_backend(monkeypatch, firebase_initializes=True)

        assert get_current_runtime_config()["profile"] == "prod"
        assert get_model_for_task("rag_lesson") == ALTERNATE_MODEL
        assert TestClient(main_module.app).get("/api/rag/health").json()["activeModel"] == ALTERNATE_MODEL

    def test_startup_without_a_firebase_app_keeps_profile_and_env_routing(self, monkeypatch):
        def missing_default_app():
            raise ValueError(
                "The default Firebase app does not exist. Make sure to initialize the SDK by calling initialize_app()."
            )

        monkeypatch.setattr("firebase_admin.firestore.client", missing_default_app)

        _start_backend(monkeypatch, firebase_initializes=False)
        inf_client.load_runtime_config_from_firestore()

        assert get_current_runtime_config()["overrides"] == {}
        assert get_model_for_task("rag_lesson") == CHAT_MODEL


class TestGetModelForTask:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_profile_default_for_rag(self):
        set_runtime_model_profile("prod")
        assert get_model_for_task("rag_lesson") == REASONER_MODEL

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_profile_default_for_chat(self):
        set_runtime_model_profile("prod")
        assert get_model_for_task("chat") == CHAT_MODEL

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_runtime_override_for_chat(self):
        set_runtime_model_override("INFERENCE_CHAT_MODEL_ID", ALTERNATE_MODEL)
        assert get_model_for_task("chat") == ALTERNATE_MODEL

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "true"})
    def test_model_lock_overrides_task(self):
        set_runtime_model_profile("prod")
        assert get_model_for_task("rag_lesson") == CHAT_MODEL

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false", "INFERENCE_MODEL_ID": ""})
    def test_non_claude_override_falls_back_to_chat_model(self):
        set_runtime_model_override("HF_QUIZ_MODEL_ID", STALE_MODEL)
        assert get_model_for_task("quiz_generation") == CHAT_MODEL

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "true", "INFERENCE_LOCK_MODEL_ID": STALE_MODEL})
    def test_non_claude_lock_model_falls_back_to_chat_model(self):
        assert get_model_for_task("rag_lesson") == CHAT_MODEL


class TestInferenceClientIgnoresNonClaudeModelIds:
    """Leftover ids from an earlier provider in env vars must never be routed to."""

    def test_non_claude_env_ids_are_ignored(self, monkeypatch):
        for key in MODEL_ENV_KEYS:
            monkeypatch.setenv(key, STALE_MODEL)
        monkeypatch.setenv("INFERENCE_ENFORCE_LOCK_MODEL", "false")

        client = InferenceClient()

        assert client.default_model == CHAT_MODEL
        assert client.lock_model_id == CHAT_MODEL
        assert client.chat_model_override == ""
        assert client.chat_model_temp_override == ""
        assert client.fallback_models == []
        assert client.task_model_map["rag_lesson"] == REASONER_MODEL, "a stale INFERENCE_MODEL_ID must not flatten the task map"

    def test_non_claude_requested_model_falls_back_to_the_task_default(self, monkeypatch):
        for key in MODEL_ENV_KEYS:
            monkeypatch.delenv(key, raising=False)
        monkeypatch.setenv("INFERENCE_ENFORCE_LOCK_MODEL", "false")
        client = InferenceClient()

        model, source = client._resolve_primary_model(
            InferenceRequest(messages=[], task_type="rag_lesson", model=STALE_MODEL)
        )

        assert model == REASONER_MODEL
        assert source == "task_map"

    def test_model_chain_drops_non_claude_ids(self, monkeypatch):
        for key in MODEL_ENV_KEYS:
            monkeypatch.delenv(key, raising=False)
        monkeypatch.setenv("INFERENCE_ENFORCE_LOCK_MODEL", "false")
        client = InferenceClient()
        client.fallback_models = [STALE_MODEL, ALTERNATE_MODEL]

        chain = client._model_chain_for_task("rag_lesson", STALE_MODEL)

        assert chain == [CHAT_MODEL, ALTERNATE_MODEL]

    def test_startup_profile_replaces_non_claude_env_ids(self):
        with patch.dict(
            os.environ,
            {"MODEL_PROFILE": "prod", "HF_RAG_MODEL_ID": STALE_MODEL, "INFERENCE_CHAT_MODEL_ID": ALTERNATE_MODEL},
        ):
            inf_client._apply_model_profile()
            assert os.environ["HF_RAG_MODEL_ID"] == REASONER_MODEL
            assert os.environ["INFERENCE_CHAT_MODEL_ID"] == ALTERNATE_MODEL


class TestIsSequentialModel:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    def test_reasoner_is_sequential(self):
        assert is_sequential_model(REASONER_MODEL) is True

    def test_chat_is_not_sequential(self):
        assert is_sequential_model(CHAT_MODEL) is False

    def test_empty_string_checks_env(self):
        result = is_sequential_model("")
        assert result is True or result is False

    @patch.dict(os.environ, {"INFERENCE_MODEL_ID": REASONER_MODEL})
    def test_env_model_reasoner_is_sequential(self):
        assert is_sequential_model("") is True

    @patch.dict(os.environ, {"INFERENCE_MODEL_ID": CHAT_MODEL})
    def test_env_model_chat_is_not_sequential(self):
        assert is_sequential_model("") is False


class TestModelSupportsThinking:

    def test_reasoner_supports_thinking(self):
        assert model_supports_thinking(REASONER_MODEL) is True

    def test_chat_does_not_support_thinking(self):
        assert model_supports_thinking(CHAT_MODEL) is False

    def test_unknown_does_not_support_thinking(self):
        assert model_supports_thinking("custom/model") is False
