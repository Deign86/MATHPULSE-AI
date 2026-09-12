"""
WRI CLASSIFICATION — Prevention-First 5-Band System

This module implements at-risk classification based on DepEd DO No. 8, s. 2015
(Policy Guidelines on Classroom Assessment for the K to 12 Basic Education Program).

Official Passing Grade: 75 (Did Not Meet Expectations = below 75)

Prevention-first WRI thresholds (DepEd 75 is the FLOOR, not the trigger):
- WRI >= 88 → safe      (On Track — no intervention needed)
- WRI >= 80 → watch     (Slight decline — system adjusts difficulty)
- WRI >= 75 → intervene (Approaching DepEd threshold — teacher notified)
- WRI >= 68 → critical  (Urgent — structured intervention required)
- WRI < 68  → at_risk   (Near or below DepEd failing mark)

IMPORTANT: WRI is a SUPPORT TOOL, not a replacement for teacher judgment.
Final academic decisions must still be made by the teacher in accordance
with official DepEd grading policies.
"""

from typing import Dict, Literal, Optional, get_args

DEFAULT_WEIGHTS = {"w1": 0.30, "w2": 0.40, "w3": 0.30}
WEIGHT_TOLERANCE = 0.001

# ─── Canonical risk vocabulary ────────────────────────────────────────────
# Single owner. Every module that needs the bands, one of the subsets below,
# or a zeroed distribution imports from here instead of re-transcribing the
# closed set. Drift here previously left stale counters compiling silently.
RiskLevel = Literal["safe", "watch", "intervene", "critical", "at_risk", "pending_assessment"]
CANONICAL_RISK_STATUSES: tuple = get_args(RiskLevel)
CANONICAL_RISK_BANDS: tuple = tuple(
    status for status in CANONICAL_RISK_STATUSES if status != "pending_assessment"
)
# Above the DepEd floor — the system adjusts difficulty or nudges the student.
FLAGGED_RISK_STATUSES: tuple = ("watch", "intervene", "critical", "at_risk")
# Approaching or below the DepEd passing mark — the teacher is notified.
ATTENTION_RISK_STATUSES: tuple = ("intervene", "critical", "at_risk")
# Escalation-worthy — structured intervention or teacher review required.
ESCALATION_RISK_STATUSES: tuple = ("critical", "at_risk")

# DepEd DO No. 8, s. 2015 — prevention-first bands. See the module docstring.
_BAND_THRESHOLDS: tuple = (
    (88.0, "safe"),
    (80.0, "watch"),
    (75.0, "intervene"),
    (68.0, "critical"),
)


def band_for_score(score: float) -> RiskLevel:
    """Classify a 0-100 WRI score into the canonical 5-band DepEd scale."""
    for threshold, band in _BAND_THRESHOLDS:
        if score >= threshold:
            return band
    return "at_risk"


def empty_risk_distribution() -> Dict[str, int]:
    """Zeroed counter keyed by every canonical risk status."""
    return dict.fromkeys(CANONICAL_RISK_STATUSES, 0)


def normalize_risk_band(band: Optional[str]) -> RiskLevel:
    """Normalize legacy or mixed-case risk status strings to canonical 5-band WRI format."""
    if not band:
        return "pending_assessment"
    normalized = band.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in CANONICAL_RISK_STATUSES:
        return normalized
    tier_map = {
        "low": "safe",
        "low_risk": "safe",
        "on_track": "safe",
        "moderate": "watch",
        "medium": "watch",
        "medium_risk": "watch",
        "high": "intervene",
        "high_risk": "intervene",
        "urgent": "critical",
        "failing": "at_risk",
        "unassessed": "pending_assessment",
        "pending": "pending_assessment",
    }
    return tier_map.get(normalized, "pending_assessment")



def compute_wri(
    d: Optional[float],
    g: Optional[float],
    p: Optional[float],
    weights: dict = None,
) -> dict:
    """
    Computes the Weighted Risk Index (WRI) and returns classification.
    
    Args:
        d: Diagnostic baseline score (0-100), set once after initial assessment
        g: External grades average (0-100), from teacher-imported class records
        p: System performance average (0-100), from quiz/activity scores
        weights: w1 (diagnostic), w2 (external), w3 (system) — must sum to 1.0
    
    Returns:
        dict with keys:
            wri: float (rounded to 2 decimal places) or None if D is missing
            risk_status: 'safe' | 'watch' | 'intervene' | 'critical' | 'at_risk' | 'pending_assessment'
            inputs: {'D': float, 'G': float, 'P': float} (actual values used, after defaults)
            g_fallback: bool (True if G defaulted to D)
            p_fallback: bool (True if P defaulted to D)
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS.copy()
    
    w1 = weights.get("w1", DEFAULT_WEIGHTS["w1"])
    w2 = weights.get("w2", DEFAULT_WEIGHTS["w2"])
    w3 = weights.get("w3", DEFAULT_WEIGHTS["w3"])
    
    # Validate weights sum to 1.0
    if abs((w1 + w2 + w3) - 1.0) > WEIGHT_TOLERANCE:
        raise ValueError(f"Weights must sum to 1.0, got w1={w1}, w2={w2}, w3={w3}")
    
    # Cannot compute without diagnostic baseline
    if d is None:
        return {
            "wri": None,
            "risk_status": "pending_assessment",
            "inputs": {"D": None, "G": g, "P": p},
            "g_fallback": False,
            "p_fallback": False,
        }
    
    # Apply defaults: missing G and/or P default to D
    g_fallback = g is None
    p_fallback = p is None
    g_val = g if g is not None else d
    p_val = p if p is not None else d
    
    # Compute WRI
    wri = round((w1 * d) + (w2 * g_val) + (w3 * p_val), 2)
    
    # 5-band prevention-first classification (thresholds owned by band_for_score)
    status = band_for_score(wri)
    
    return {
        "wri": wri,
        "risk_status": status,
        "inputs": {"D": d, "G": g_val, "P": p_val},
        "g_fallback": g_fallback,
        "p_fallback": p_fallback,
    }
