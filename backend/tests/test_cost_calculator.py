# backend/tests/test_cost_calculator.py
"""Tests for services/cost_calculator.py covering promo active, promo expired, V4 Flash, and edge cases."""
import sys
import os
from unittest.mock import patch
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cost_calculator import calculate_feature_cost, calculate_full_price_cost
from config.ai_pricing import get_active_pricing, DEEPSEEK_PRICING


class TestCalculateFeatureCostPromoActive:
    """Tests when promotional pricing is active (before 2026-05-31)."""

    def test_basic_calculation(self):
        result = calculate_feature_cost(
            "deepseek-v4-pro",
            cache_hit_tokens=1_000_000,
            cache_miss_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert result["is_promotional"] is True
        assert result["cache_hit_cost"] == round(0.003625, 6)
        assert result["cache_miss_cost"] == round(0.435, 6)
        assert result["output_cost"] == round(0.87, 6)
        expected_total = 0.003625 + 0.435 + 0.87
        assert abs(result["total_usd"] - expected_total) < 1e-5

    def test_zero_tokens(self):
        result = calculate_feature_cost("deepseek-v4-pro", 0, 0, 0)
        assert result["total_usd"] == 0.0
        assert result["cache_hit_cost"] == 0.0
        assert result["cache_miss_cost"] == 0.0
        assert result["output_cost"] == 0.0
        assert result["is_promotional"] is True

    def test_only_cache_hits(self):
        result = calculate_feature_cost("deepseek-v4-pro", 5_000_000, 0, 0)
        expected = (5_000_000 / 1_000_000) * 0.003625
        assert abs(result["total_usd"] - expected) < 1e-5


class TestCalculateFeatureCostPromoExpired:
    """Tests when promotional pricing has expired."""

    def test_full_price_after_expiry(self):
        expired_time = datetime(2026, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
        with patch("config.ai_pricing.datetime") as mock_dt:
            mock_dt.now.return_value = expired_time
            mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
            pricing = get_active_pricing("deepseek-v4-pro")
            assert pricing["is_promotional"] is False


class TestCalculateFeatureCostFlash:
    """Tests for deepseek-v4-flash (no promotional pricing)."""

    def test_flash_pricing(self):
        result = calculate_feature_cost(
            "deepseek-v4-flash",
            cache_hit_tokens=1_000_000,
            cache_miss_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert result["is_promotional"] is False
        assert result["cache_hit_cost"] == round(0.0028, 6)
        assert result["cache_miss_cost"] == round(0.14, 6)
        assert result["output_cost"] == round(0.28, 6)

    def test_flash_zero_tokens(self):
        result = calculate_feature_cost("deepseek-v4-flash", 0, 0, 0)
        assert result["total_usd"] == 0.0


class TestCalculateFullPriceCost:
    """Tests for calculate_full_price_cost."""

    def test_full_price_v4_pro(self):
        cost = calculate_full_price_cost("deepseek-v4-pro", 1_000_000, 1_000_000, 1_000_000)
        expected = 0.0145 + 1.74 + 3.48
        assert abs(cost - expected) < 1e-5

    def test_full_price_flash(self):
        cost = calculate_full_price_cost("deepseek-v4-flash", 1_000_000, 1_000_000, 1_000_000)
        expected = 0.0028 + 0.14 + 0.28
        assert abs(cost - expected) < 1e-5


class TestUnknownModel:
    """Tests for unknown model IDs."""

    def test_unknown_model_raises(self):
        import pytest
        with pytest.raises(ValueError, match="Unknown model"):
            calculate_feature_cost("nonexistent-model", 100, 100, 100)

    def test_unknown_model_full_price_raises(self):
        import pytest
        with pytest.raises(ValueError, match="Unknown model"):
            calculate_full_price_cost("nonexistent-model", 100, 100, 100)
