"""Services package - re-exports from ai_client and inference_client."""

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