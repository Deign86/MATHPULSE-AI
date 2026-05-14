import pytest
from services.wri_service import compute_wri

class TestComputeWRI:
    """TDD: Write failing tests first, then implement."""
    
    def test_standard_weights_safe(self):
        """WRI = 0.3(90) + 0.4(85) + 0.3(80) = 27 + 34 + 24 = 85 → safe"""
        result = compute_wri(d=90, g=85, p=80)
        assert result["wri"] == 85.0
        assert result["risk_status"] == "safe"
    
    def test_standard_weights_at_risk(self):
        """WRI = 0.3(60) + 0.4(70) + 0.3(65) = 18 + 28 + 19.5 = 65.5 → at_risk"""
        result = compute_wri(d=60, g=70, p=65)
        assert result["wri"] == 65.5
        assert result["risk_status"] == "at_risk"
    
    def test_standard_weights_monitoring(self):
        """WRI = 0.3(78) + 0.4(76) + 0.3(74) = 23.4 + 30.4 + 22.2 = 76.0 → monitoring"""
        result = compute_wri(d=78, g=76, p=74)
        assert result["wri"] == 76.0
        assert result["risk_status"] == "monitoring"
    
    def test_missing_g_defaults_to_d(self):
        """When G is None/missing, it defaults to D value."""
        result = compute_wri(d=70, g=None, p=80)
        assert result["wri"] == 0.3*70 + 0.4*70 + 0.3*80  # G=70 (defaulted from D)
        assert result["g_fallback"] is True
    
    def test_missing_p_defaults_to_d(self):
        """When P is None/missing, it defaults to D value."""
        result = compute_wri(d=75, g=85, p=None)
        assert result["wri"] == 0.3*75 + 0.4*85 + 0.3*75  # P=75 (defaulted from D)
        assert result["p_fallback"] is True
    
    def test_missing_g_and_p_both_default_to_d(self):
        """Both G and P missing → both default to D."""
        result = compute_wri(d=68, g=None, p=None)
        assert result["wri"] == 0.3*68 + 0.4*68 + 0.3*68  # = 68.0
        assert result["g_fallback"] is True
        assert result["p_fallback"] is True
    
    def test_no_diagnostic_returns_none(self):
        """When D is None → cannot compute WRI, return pending status."""
        result = compute_wri(d=None, g=80, p=90)
        assert result["wri"] is None
        assert result["risk_status"] == "pending_assessment"
    
    def test_invalid_weights_raise_error(self):
        """Weights that don't sum to 1.0 → ValueError."""
        with pytest.raises(ValueError, match="Weights must sum to 1.0"):
            compute_wri(d=80, g=80, p=80, weights={"w1": 0.5, "w2": 0.5, "w3": 0.5})
    
    def test_weights_close_to_one_are_valid(self):
        """Allow small floating-point tolerance (abs diff <= 0.001)."""
        result = compute_wri(d=80, g=80, p=80, weights={"w1": 0.333, "w2": 0.333, "w3": 0.334})
        assert result["wri"] == 80.0
        assert result["risk_status"] == "safe"
    
    def test_wri_rounds_to_2_decimal_places(self):
        """WRI result must be rounded to 2 decimal places."""
        result = compute_wri(d=77.777, g=88.888, p=66.666)
        assert result["wri"] == round(0.3*77.777 + 0.4*88.888 + 0.3*66.666, 2)
    
    def test_boundary_80_is_safe(self):
        """Exactly WRI=80 should be classified as safe."""
        result = compute_wri(d=80, g=80, p=80)
        assert result["wri"] == 80.0
        assert result["risk_status"] == "safe"
    
    def test_boundary_75_is_monitoring(self):
        """Exactly WRI=75 should be classified as monitoring."""
        result = compute_wri(d=75, g=75, p=75)
        assert result["wri"] == 75.0
        assert result["risk_status"] == "monitoring"
    
    def test_boundary_74_point_999_is_at_risk(self):
        """WRI just below 75 (e.g. 74.99) should be at_risk."""
        result = compute_wri(d=74.99, g=74.99, p=74.99)
        assert result["wri"] == 74.99
        assert result["risk_status"] == "at_risk"
    
    def test_custom_weights(self):
        """Custom weights w1=0.2, w2=0.5, w3=0.3"""
        result = compute_wri(d=70, g=90, p=80, weights={"w1": 0.2, "w2": 0.5, "w3": 0.3})
        expected = 0.2*70 + 0.5*90 + 0.3*80
        assert result["wri"] == round(expected, 2)
    
    def test_zero_scores(self):
        """All zero scores → WRI = 0 → at_risk"""
        result = compute_wri(d=0, g=0, p=0)
        assert result["wri"] == 0.0
        assert result["risk_status"] == "at_risk"
    
    def test_perfect_scores(self):
        """All perfect scores → WRI = 100 → safe"""
        result = compute_wri(d=100, g=100, p=100)
        assert result["wri"] == 100.0
        assert result["risk_status"] == "safe"

    def test_result_includes_inputs(self):
        """Result dict should include the input values used."""
        result = compute_wri(d=80, g=85, p=90)
        assert result["inputs"]["D"] == 80
        assert result["inputs"]["G"] == 85
        assert result["inputs"]["P"] == 90
