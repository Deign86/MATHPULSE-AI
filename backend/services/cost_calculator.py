# backend/services/cost_calculator.py
# TODO: Review pricing after 2026-05-31
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.ai_pricing import get_active_pricing, get_full_pricing


def calculate_feature_cost(
    model_id: str,
    cache_hit_tokens: int,
    cache_miss_tokens: int,
    output_tokens: int,
) -> dict:
    """Calculate cost for a feature's token usage using active pricing."""
    # TODO: Review pricing after 2026-05-31
    pricing = get_active_pricing(model_id)
    cache_hit_cost = (cache_hit_tokens / 1_000_000) * pricing["input_cache_hit_per_1m"]
    cache_miss_cost = (cache_miss_tokens / 1_000_000) * pricing["input_cache_miss_per_1m"]
    output_cost = (output_tokens / 1_000_000) * pricing["output_per_1m"]
    total = cache_hit_cost + cache_miss_cost + output_cost
    return {
        "total_usd": round(total, 6),
        "cache_hit_cost": round(cache_hit_cost, 6),
        "cache_miss_cost": round(cache_miss_cost, 6),
        "output_cost": round(output_cost, 6),
        "is_promotional": pricing["is_promotional"],
    }


def calculate_full_price_cost(
    model_id: str,
    cache_hit_tokens: int,
    cache_miss_tokens: int,
    output_tokens: int,
) -> float:
    """Calculate what the same usage would cost at full (non-promo) price."""
    # TODO: Review pricing after 2026-05-31
    full = get_full_pricing(model_id)
    cache_hit_cost = (cache_hit_tokens / 1_000_000) * full["input_cache_hit_per_1m"]
    cache_miss_cost = (cache_miss_tokens / 1_000_000) * full["input_cache_miss_per_1m"]
    output_cost = (output_tokens / 1_000_000) * full["output_per_1m"]
    return round(cache_hit_cost + cache_miss_cost + output_cost, 6)
