# backend/config/ai_pricing.py
# Claude API pricing in USD per million tokens, from Anthropic's published API pricing.
# "cache hit" is a cache read, "cache miss" is uncached input, and cache writes use the 5-minute rate.
# Haiku rates apply to prompts up to 100K tokens; longer prompts bill input at 0.50 and output at 2.50.

CLAUDE_PRICING = {
    "claude-opus-5-5": {
        "input_cache_hit_per_1m": 0.20,
        "input_cache_miss_per_1m": 4.00,
        "cache_write_5m_per_1m": 5.00,
        "output_per_1m": 20.00,
    },
    "claude-sonnet-5-5": {
        "input_cache_hit_per_1m": 0.20,
        "input_cache_miss_per_1m": 2.00,
        "cache_write_5m_per_1m": 2.50,
        "output_per_1m": 10.00,
    },
    "claude-haiku-5-5": {
        "input_cache_hit_per_1m": 0.01,
        "input_cache_miss_per_1m": 0.10,
        "cache_write_5m_per_1m": 0.125,
        "output_per_1m": 0.50,
    },
}


def get_full_pricing(model_id: str) -> dict:
    """Returns the per-million-token rates for a model."""
    model = CLAUDE_PRICING.get(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")
    return dict(model)
