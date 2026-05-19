"""
RAG-grounded DeepSeek client wrapper.

All calls go through `rag_grounded_completion()` which enforces:
- DEEPSEEK_ENABLED feature flag check
- Retry with exponential backoff on 429
- Token usage logging
"""

import os
import time
import json
import logging
from typing import Optional

from services.ai_client import get_deepseek_client, CHAT_MODEL, REASONER_MODEL, RateLimitError

logger = logging.getLogger(__name__)

DEEPSEEK_ENABLED = os.getenv("DEEPSEEK_ENABLED", "true").lower() in ("true", "1", "yes")
MAX_RETRIES = 3
BACKOFF_DELAYS = [2, 4, 8]


def is_enabled() -> bool:
    return DEEPSEEK_ENABLED


def rag_grounded_completion(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> Optional[str]:
    """
    Call DeepSeek with retry on 429. Returns response text or None if disabled/failed.
    Logs token usage per call.
    """
    if not DEEPSEEK_ENABLED:
        logger.info("[DEEPSEEK] Disabled via DEEPSEEK_ENABLED flag, skipping.")
        return None

    client = get_deepseek_client()

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
            )
            usage = response.usage
            if usage:
                logger.info(
                    "[DEEPSEEK] model=%s prompt_tokens=%d completion_tokens=%d total=%d",
                    model, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens,
                )
            return response.choices[0].message.content or ""
        except RateLimitError:
            delay = BACKOFF_DELAYS[attempt] if attempt < len(BACKOFF_DELAYS) else 8
            logger.warning("[DEEPSEEK] 429 rate limited, retry %d/%d in %ds", attempt + 1, MAX_RETRIES, delay)
            time.sleep(delay)
        except Exception as e:
            logger.error("[DEEPSEEK] Call failed: %s", e)
            return None

    logger.error("[DEEPSEEK] All %d retries exhausted.", MAX_RETRIES)
    return None


def parse_json_response(text: Optional[str]) -> Optional[dict]:
    """Attempt to parse JSON from DeepSeek response, handling markdown fences."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("[DEEPSEEK] Failed to parse JSON response")
        return None
