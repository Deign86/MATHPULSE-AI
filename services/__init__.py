"""Services package - re-exports from ai_client and inference_client."""

import importlib
import sys
import pkgutil

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
    """Expose all backend.services.* modules under services.* for test imports."""
    try:
        backend_services = importlib.import_module("backend.services")
    except Exception:
        return

    for importer, modname, ispkg in pkgutil.iter_modules(backend_services.__path__):
        if ispkg:
            continue
        # Skip modules that already exist in the root services package
        # (ai_client, inference_client are already re-exported directly)
        full_name = f"backend.services.{modname}"
        alias_name = f"services.{modname}"
        if alias_name in sys.modules:
            continue
        try:
            module = importlib.import_module(full_name)
        except Exception:
            continue
        sys.modules[alias_name] = module


_alias_backend_services()