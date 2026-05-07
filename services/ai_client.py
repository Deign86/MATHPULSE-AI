import os
from openai import OpenAI, APIError, RateLimitError, APITimeoutError
from functools import lru_cache

__all__ = [
    "get_deepseek_client",
    "CHAT_MODEL",
    "REASONER_MODEL",
    "DEEPSEEK_BASE_URL",
    "APIError",
    "RateLimitError",
    "APITimeoutError",
]

DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
CHAT_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
REASONER_MODEL = os.getenv("DEEPSEEK_REASONER_MODEL", "deepseek-reasoner")


@lru_cache(maxsize=1)
def get_deepseek_client() -> OpenAI:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY environment variable not set")
    return OpenAI(
        api_key=api_key,
        base_url=DEEPSEEK_BASE_URL,
    )
