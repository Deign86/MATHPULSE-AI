import os
from pathlib import Path
from openai import OpenAI, APIError, RateLimitError, APITimeoutError
from functools import lru_cache

try:
    from dotenv import load_dotenv
    for _env_path in [
        Path(__file__).resolve().parents[1] / ".env.local",
        Path(__file__).resolve().parents[1] / ".env",
        Path(__file__).resolve().parents[2] / ".env.local",
        Path(__file__).resolve().parents[2] / ".env",
    ]:
        if _env_path.exists():
            load_dotenv(dotenv_path=_env_path, override=False)
except Exception:
    pass

__all__ = [
    "get_deepseek_client",
    "CHAT_MODEL",
    "REASONER_MODEL",
    "thinking_body",
    "current_model_id",
    "DEEPSEEK_BASE_URL",
    "APIError",
    "RateLimitError",
    "APITimeoutError",
]

DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
# API ids from GET /models: deepseek-flash serves V4.1-Flash, deepseek-v4-pro serves V4-Pro.
# Both think by default, so the thinking toggle is sent on every request (see get_deepseek_client).
# Retired DeepSeek names still sit in env vars and the Firestore model config; they resolve to the current ids.
_RETIRED_MODEL_IDS = {"deepseek-chat": "deepseek-flash", "deepseek-reasoner": "deepseek-v4-pro"}


def current_model_id(model: str) -> str:
    return _RETIRED_MODEL_IDS.get(model, model)


CHAT_MODEL = current_model_id(os.getenv("DEEPSEEK_MODEL", "deepseek-flash"))
REASONER_MODEL = current_model_id(os.getenv("DEEPSEEK_REASONER_MODEL", "deepseek-v4-pro"))


def thinking_body(model: str) -> dict:
    """DeepSeek's thinking toggle: on for the reasoner model, off for chat so fast tasks don't reason."""
    return {"thinking": {"type": "enabled" if model == REASONER_MODEL else "disabled"}}


@lru_cache(maxsize=1)
def get_deepseek_client() -> OpenAI:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY environment variable not set")
    client = OpenAI(
        api_key=api_key,
        base_url=DEEPSEEK_BASE_URL,
        max_retries=0,  # retries are owned by InferenceClient; SDK retries would stack under them
    )
    create = client.chat.completions.create

    def create_with_thinking(*args, **kwargs):
        if "model" in kwargs:
            kwargs["model"] = current_model_id(kwargs["model"])
        # An explicit extra_body "thinking" from the caller wins.
        kwargs["extra_body"] = {**thinking_body(kwargs.get("model", "")), **(kwargs.get("extra_body") or {})}
        return create(*args, **kwargs)

    client.chat.completions.create = create_with_thinking  # type: ignore[method-assign]
    return client
