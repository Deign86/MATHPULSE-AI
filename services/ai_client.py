"""DeepSeek AI client - delegates to backend.services.ai_client."""

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

__all__ = [
    "get_deepseek_client",
    "CHAT_MODEL",
    "REASONER_MODEL",
    "DEEPSEEK_BASE_URL",
    "APIError",
    "RateLimitError",
    "APITimeoutError",
]