"""Services package - compatibility shim for backend.services."""

import importlib
import sys

from .ai_client import (
    get_deepseek_client,
    CHAT_MODEL,
    REASONER_MODEL,
    DEEPSEEK_BASE_URL,
    APIError,
    RateLimitError,
    APITimeoutError,
)

from .inference_client import (
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


def _alias_backend_services() -> None:
    """Expose backend.services.* modules under services.* for test imports."""
    try:
        backend_services = importlib.import_module("backend.services")
    except Exception:
        return

    module_names = (
        "audit_logger",
        "question_bank_service",
        "variance_engine",
        "youtube_service",
    )

    for name in module_names:
        full_name = f"backend.services.{name}"
        alias_name = f"services.{name}"
        try:
            module = importlib.import_module(full_name)
        except Exception:
            continue
        sys.modules[alias_name] = module


_alias_backend_services()
