# backend/tests/test_cost_calculator.py
"""Tests for services/cost_calculator.py covering each Claude model's rates and unknown models."""
import sys
import os

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cost_calculator import calculate_feature_cost
from config.ai_pricing import CLAUDE_PRICING, get_full_pricing


# model -> (cache read, uncached input, output) in USD per 1M tokens
RATES_PER_MILLION = {
    "claude-opus-5-5": (0.20, 4.00, 20.00),
    "claude-sonnet-5-5": (0.20, 2.00, 10.00),
    "claude-haiku-5-5": (0.01, 0.10, 0.50),
}


@pytest.mark.parametrize("model_id", RATES_PER_MILLION)
class TestCalculateFeatureCost:
    """One million tokens of each kind costs exactly that model's per-million rates."""

    def test_basic_calculation(self, model_id):
        cache_hit_rate, cache_miss_rate, output_rate = RATES_PER_MILLION[model_id]
        cost = calculate_feature_cost(
            model_id,
            cache_hit_tokens=1_000_000,
            cache_miss_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["cache_hit_cost"] == round(cache_hit_rate, 6)
        assert cost["cache_miss_cost"] == round(cache_miss_rate, 6)
        assert cost["output_cost"] == round(output_rate, 6)
        assert abs(cost["total_usd"] - (cache_hit_rate + cache_miss_rate + output_rate)) < 1e-5

    def test_zero_tokens(self, model_id):
        cost = calculate_feature_cost(model_id, 0, 0, 0)
        assert cost["total_usd"] == 0.0
        assert cost["cache_hit_cost"] == 0.0
        assert cost["cache_miss_cost"] == 0.0
        assert cost["output_cost"] == 0.0

    def test_only_cache_hits(self, model_id):
        cache_hit_rate = RATES_PER_MILLION[model_id][0]
        cost = calculate_feature_cost(model_id, 5_000_000, 0, 0)
        assert abs(cost["total_usd"] - 5 * cache_hit_rate) < 1e-5


class TestCalculateFeatureCostMixedUsage:
    def test_opus_request_with_partial_cache_hit(self):
        cost = calculate_feature_cost(
            "claude-opus-5-5", cache_hit_tokens=2_000, cache_miss_tokens=10_000, output_tokens=1_500
        )
        assert cost["total_usd"] == round(0.0004 + 0.04 + 0.03, 6)


class TestPricingTable:
    def test_five_minute_cache_write_rates(self):
        assert get_full_pricing("claude-opus-5-5")["cache_write_5m_per_1m"] == 5.00
        assert get_full_pricing("claude-sonnet-5-5")["cache_write_5m_per_1m"] == 2.50
        assert get_full_pricing("claude-haiku-5-5")["cache_write_5m_per_1m"] == 0.125

    def test_returned_pricing_is_a_copy(self):
        pricing = get_full_pricing("claude-haiku-5-5")
        pricing["output_per_1m"] = 999
        assert CLAUDE_PRICING["claude-haiku-5-5"]["output_per_1m"] == 0.50


class TestUnknownModel:
    """Tests for unknown model IDs."""

    def test_unknown_model_raises(self):
        with pytest.raises(ValueError, match="Unknown model"):
            calculate_feature_cost("nonexistent-model", 100, 100, 100)
