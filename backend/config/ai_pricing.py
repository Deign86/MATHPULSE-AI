# backend/config/ai_pricing.py
# DeepSeek V4 API Pricing Configuration
# TODO: Review pricing after 2026-05-31

from datetime import datetime, timezone

DEEPSEEK_PRICING = {
    "deepseek-v4-pro": {
        "promotional": {
            "active": True,
            "expires_utc": datetime(2026, 5, 31, 15, 59, 0, tzinfo=timezone.utc),
            "input_cache_hit_per_1m": 0.003625,
            "input_cache_miss_per_1m": 0.435,
            "output_per_1m": 0.87,
        },
        "full_price": {
            "input_cache_hit_per_1m": 0.0145,
            "input_cache_miss_per_1m": 1.74,
            "output_per_1m": 3.48,
        },
    },
    "deepseek-v4-flash": {
        "input_cache_hit_per_1m": 0.0028,
        "input_cache_miss_per_1m": 0.14,
        "output_per_1m": 0.28,
    },
}


def get_active_pricing(model_id: str) -> dict:
    """Returns the currently active pricing tier for a given model."""
    model = DEEPSEEK_PRICING.get(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")
    if "promotional" in model:
        promo = model["promotional"]
        if promo["active"] and datetime.now(timezone.utc) < promo["expires_utc"]:
            return {
                "input_cache_hit_per_1m": promo["input_cache_hit_per_1m"],
                "input_cache_miss_per_1m": promo["input_cache_miss_per_1m"],
                "output_per_1m": promo["output_per_1m"],
                "is_promotional": True,
                "promo_expires_utc": promo["expires_utc"].isoformat(),
            }
        return {**model["full_price"], "is_promotional": False}
    return {**model, "is_promotional": False}


def get_full_pricing(model_id: str) -> dict:
    """Returns the full (non-promotional) pricing for a model."""
    model = DEEPSEEK_PRICING.get(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")
    if "full_price" in model:
        return model["full_price"]
    return {
        "input_cache_hit_per_1m": model["input_cache_hit_per_1m"],
        "input_cache_miss_per_1m": model["input_cache_miss_per_1m"],
        "output_per_1m": model["output_per_1m"],
    }
