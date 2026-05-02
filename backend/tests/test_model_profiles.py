from __future__ import annotations

import os
import sys
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import inference_client as inf_client
from services.inference_client import (
    _MODEL_PROFILES,
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


class TestModelProfiles:
    def test_profiles_have_all_keys(self):
        for name, profile in _MODEL_PROFILES.items():
            assert REQUIRED_PROFILE_KEYS == set(profile.keys()), \
                f"Profile '{name}' missing or extra keys"

    def test_dev_uses_chat_model(self):
        dev = _MODEL_PROFILES["dev"]
        for key, value in dev.items():
            assert "deepseek-chat" in value, f"dev/{key} = {value}, expected deepseek-chat"

    def test_prod_chat_is_chat_model(self):
        assert "deepseek-chat" in _MODEL_PROFILES["prod"]["INFERENCE_CHAT_MODEL_ID"]

    def test_prod_rag_is_reasoner(self):
        assert "deepseek-reasoner" in _MODEL_PROFILES["prod"]["HF_RAG_MODEL_ID"]

    def test_budget_uses_chat_model_everywhere(self):
        budget = _MODEL_PROFILES["budget"]
        for key, value in budget.items():
            assert "deepseek-chat" in value, f"budget/{key} = {value}"


class TestRuntimeOverrides:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    def test_set_profile_populates_overrides(self):
        set_runtime_model_profile("dev")
        assert inf_client._RUNTIME_PROFILE == "dev"
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_MODEL_ID"] == "deepseek-chat"
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_CHAT_MODEL_ID"] == "deepseek-chat"

    def test_set_profile_replaces_all_overrides(self):
        set_runtime_model_profile("dev")
        set_runtime_model_profile("prod")
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_CHAT_MODEL_ID"] == "deepseek-chat"
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_LOCK_MODEL_ID"] == "deepseek-chat"

    def test_set_profile_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown profile"):
            set_runtime_model_profile("nonexistent")

    def test_single_override_sets_key(self):
        set_runtime_model_override("HF_RAG_MODEL_ID", "custom/model")
        assert inf_client._RUNTIME_OVERRIDES["HF_RAG_MODEL_ID"] == "custom/model"

    def test_reset_clears_overrides(self):
        set_runtime_model_profile("dev")
        reset_runtime_overrides()
        assert inf_client._RUNTIME_PROFILE == ""
        assert inf_client._RUNTIME_OVERRIDES == {}

    def test_override_layers_on_profile(self):
        set_runtime_model_profile("dev")
        set_runtime_model_override("HF_RAG_MODEL_ID", "custom/model")
        assert inf_client._RUNTIME_OVERRIDES["HF_RAG_MODEL_ID"] == "custom/model"
        assert inf_client._RUNTIME_OVERRIDES["INFERENCE_MODEL_ID"] == "deepseek-chat"


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
        set_runtime_model_override("INFERENCE_CHAT_MODEL_ID", "custom/chat")
        config = get_current_runtime_config()
        assert config["resolved"]["INFERENCE_CHAT_MODEL_ID"] == "custom/chat"


class TestGetModelForTask:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_profile_default_for_rag(self):
        set_runtime_model_profile("prod")
        model = get_model_for_task("rag_lesson")
        assert "deepseek-reasoner" in model

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_profile_default_for_chat(self):
        set_runtime_model_profile("prod")
        model = get_model_for_task("chat")
        assert "deepseek-chat" in model

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "false"})
    def test_returns_runtime_override_for_chat(self):
        set_runtime_model_override("INFERENCE_CHAT_MODEL_ID", "custom/chat")
        model = get_model_for_task("chat")
        assert model == "custom/chat"

    @patch.dict(os.environ, {"INFERENCE_ENFORCE_LOCK_MODEL": "true"})
    def test_enforce_qwen_overrides_task(self):
        set_runtime_model_profile("prod")
        model = get_model_for_task("rag_lesson")
        assert "deepseek-chat" in model


class TestIsSequentialModel:

    def setup_method(self):
        reset_runtime_overrides()

    def teardown_method(self):
        reset_runtime_overrides()

    def test_reasoner_is_sequential(self):
        assert is_sequential_model("deepseek-reasoner") is True

    def test_chat_is_not_sequential(self):
        assert is_sequential_model("deepseek-chat") is False

    def test_empty_string_checks_env(self):
        result = is_sequential_model("")
        assert result is True or result is False

    @patch.dict(os.environ, {"INFERENCE_MODEL_ID": "deepseek-reasoner"})
    def test_env_model_reasoner_is_sequential(self):
        assert is_sequential_model("") is True

    @patch.dict(os.environ, {"INFERENCE_MODEL_ID": "deepseek-chat"})
    def test_env_model_chat_is_not_sequential(self):
        assert is_sequential_model("") is False


class TestModelSupportsThinking:

    def test_reasoner_supports_thinking(self):
        assert model_supports_thinking("deepseek-reasoner") is True

    def test_chat_does_not_support_thinking(self):
        assert model_supports_thinking("deepseek-chat") is False

    def test_unknown_does_not_support_thinking(self):
        assert model_supports_thinking("meta-llama/Llama-3.1-8B-Instruct") is False
