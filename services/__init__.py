"""Shared service entrypoints - delegates to backend.services."""

import sys
import os

_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend_path = os.path.join(_repo_root, "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

from backend.services.ai_client import (
    get_deepseek_client,
    CHAT_MODEL,
    REASONER_MODEL,
    DEEPSEEK_BASE_URL,
    APIError,
    RateLimitError,
    APITimeoutError,
)

from backend.services.inference_client import (
    create_default_client,
    InferenceRequest,
    InferenceClient,
    is_sequential_model,
    get_current_runtime_config,
    get_model_for_task,
    set_runtime_model_profile,
    set_runtime_model_override,
    reset_runtime_overrides,
    model_supports_thinking,
    _MODEL_PROFILES,
)

__all__ = [
    "get_deepseek_client",
    "CHAT_MODEL",
    "REASONER_MODEL",
    "DEEPSEEK_BASE_URL",
    "APIError",
    "RateLimitError",
    "APITimeoutError",
    "create_default_client",
    "InferenceRequest",
    "InferenceClient",
    "is_sequential_model",
    "get_current_runtime_config",
    "get_model_for_task",
    "set_runtime_model_profile",
    "set_runtime_model_override",
    "reset_runtime_overrides",
    "model_supports_thinking",
    "_MODEL_PROFILES",
]