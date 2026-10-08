# backend/routes/ai_monitoring.py
# TODO: Review pricing after 2026-05-31
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Request
import logging

from config.ai_pricing import get_active_pricing, get_full_pricing, DEEPSEEK_PRICING

logger = logging.getLogger("mathpulse.ai_monitoring")

router = APIRouter(prefix="/api/admin/ai-monitoring", tags=["admin", "ai-monitoring"])
MANILA = ZoneInfo("Asia/Manila")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_firestore_client():
    try:
        from firebase_admin import firestore

        return firestore.client()
    except Exception as exc:
        logger.warning("AI monitoring Firestore unavailable: %s", exc)
        return None


def _as_datetime(value) -> datetime | None:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _aggregate_telemetry() -> dict:
    """Aggregate attempt events into Manila days; pending events count as failed attempts."""
    today = _now().astimezone(MANILA).date()
    first_day = today - timedelta(days=29)
    days: dict[date, dict] = {
        first_day + timedelta(days=offset): {
            "date": (first_day + timedelta(days=offset)).isoformat(),
            "totalAttempts": 0,
            "successfulAttempts": 0,
            "completedRequests": 0,
            "latencyTotalMs": 0.0,
        }
        for offset in range(30)
    }
    requests_by_task_type: dict[str, int] = {}
    start_at = datetime.combine(first_day, time.min, tzinfo=MANILA).astimezone(timezone.utc)
    end_at = datetime.combine(today + timedelta(days=1), time.min, tzinfo=MANILA).astimezone(timezone.utc)
    db = _get_firestore_client()
    if db is not None:
        try:
            events = (
                db.collection("ai_usage_logs")
                .where("timestamp", ">=", start_at)
                .where("timestamp", "<", end_at)
                .stream()
            )
            for snapshot in events:
                event = snapshot.to_dict() or {}
                timestamp = _as_datetime(event.get("timestamp"))
                if timestamp is None:
                    timestamp = _as_datetime(event.get("createdAtIso"))
                if timestamp is None:
                    continue
                bucket = timestamp.astimezone(MANILA).date()
                if bucket not in days:
                    continue
                daily = days[bucket]
                daily["totalAttempts"] += 1
                task_type = event.get("taskType")
                if isinstance(task_type, str) and task_type:
                    requests_by_task_type[task_type] = requests_by_task_type.get(task_type, 0) + 1
                if event.get("status") == "success":
                    daily["successfulAttempts"] += 1
                    latency_ms = event.get("latencyMs")
                    if isinstance(latency_ms, (int, float)) and latency_ms >= 0:
                        daily["completedRequests"] += 1
                        daily["latencyTotalMs"] += latency_ms
        except Exception as exc:
            logger.warning("AI monitoring telemetry read failed: %s", exc)

    daily_metrics = []
    total_attempts = successful_attempts = completed_requests = 0
    latency_total_ms = 0.0
    for daily in days.values():
        total_attempts += daily["totalAttempts"]
        successful_attempts += daily["successfulAttempts"]
        completed_requests += daily["completedRequests"]
        latency_total_ms += daily["latencyTotalMs"]
        daily_metrics.append({
            "date": daily["date"],
            "totalAttempts": daily["totalAttempts"],
            "successfulAttempts": daily["successfulAttempts"],
            "completedRequests": daily["completedRequests"],
            "averageLatencyMs": round(daily["latencyTotalMs"] / daily["completedRequests"], 2) if daily["completedRequests"] else None,
            "successRate": round(daily["successfulAttempts"] / daily["totalAttempts"] * 100, 1) if daily["totalAttempts"] else None,
        })

    return {
        "dailyMetrics": daily_metrics,
        "requestsByTaskType": requests_by_task_type,
        "totalAttempts": total_attempts,
        "successfulAttempts": successful_attempts,
        "completedRequests": completed_requests,
        "averageLatencyMs": round(latency_total_ms / completed_requests, 2) if completed_requests else None,
        "successRate": round(successful_attempts / total_attempts * 100, 1) if total_attempts else None,
        "latencyDefinition": "Mean generation time in milliseconds across completed requests only.",
        "successRateDefinition": "Successful attempts divided by all attempts, as a percentage.",
        "dayTimezone": "Asia/Manila",
    }


def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _build_pricing_meta(model_id: str = "deepseek-v4-pro") -> dict:
    """Build pricingMeta block for response."""
    pricing = get_active_pricing(model_id)
    full = get_full_pricing(model_id)
    now = datetime.now(timezone.utc)
    promo_config = DEEPSEEK_PRICING.get(model_id, {}).get("promotional", {})
    expires = promo_config.get("expires_utc", now)
    days_remaining = max(0, (expires - now).days) if pricing.get("is_promotional") else 0

    return {
        "activeModel": model_id,
        "isPromotional": pricing.get("is_promotional", False),
        "promoExpiresUtc": expires.isoformat() if pricing.get("is_promotional") else None,
        "daysUntilPromoEnds": days_remaining,
        "currentInputCacheMissRate": pricing["input_cache_miss_per_1m"],
        "currentOutputRate": pricing["output_per_1m"],
        "fullPriceInputRate": full["input_cache_miss_per_1m"],
        "fullPriceOutputRate": full["output_per_1m"],
    }


FEATURE_NAMES = {
    "chat": "AI Chat Tutor",
    "rag_lesson": "RAG Lessons",
    "lesson_generation": "Lesson Generation",
    "quiz_generation": "Quiz Generation",
    "verify_solution": "Solution Verification",
    "intervention_plan": "Intervention Plans",
    "class_report": "Class Reports",
    "daily_insight": "Daily Insights",
    "learning_path": "Learning Paths",
    "risk_narrative": "Risk Narratives",
}
COST_TRACKING_NOTE = (
    "Token usage, cost and cache hits are not logged; only attempt counts, outcomes and latency are measured."
)


def _aggregate_summary(telemetry: dict | None = None) -> dict:
    """Summarise measured attempts per task type. Cost and cache figures are not measured and stay null."""
    if telemetry is None:
        telemetry = _aggregate_telemetry()
    model_id = "deepseek-v4-pro"
    pricing = get_active_pricing(model_id)
    total_attempts = telemetry["totalAttempts"]
    by_task_type = sorted(telemetry["requestsByTaskType"].items(), key=lambda entry: (-entry[1], entry[0]))

    features = [
        {
            "featureId": task_type,
            "featureName": FEATURE_NAMES.get(task_type, task_type.replace("_", " ").title()),
            "modelId": model_id,
            "monthlyCost": None,
            "requestShare": round(count / total_attempts * 100, 1) if total_attempts else 0.0,
            "totalRequests": count,
            "totalInputTokens": None,
            "totalOutputTokens": None,
            "cacheHitRate": None,
            "isMostActive": position == 0,
            "isTopSpending": False,
            "icon": "Zap",
        }
        for position, (task_type, count) in enumerate(by_task_type)
    ]

    summary = {
        "systemStatus": "healthy",
        "actionRequired": False,
        "hasPerformanceIssues": False,
        "monthlyCost": None,
        "projectedMonthlyCost": None,
        "billingCycleLabel": "Last 30 days",
        "costBreakdown": None,
        "costTrackingNote": COST_TRACKING_NOTE,
        "totalUsage": total_attempts,
        "totalInputTokens": None,
        "totalOutputTokens": None,
        "cacheHitRate": None,
        "activeEngine": "DeepSeek-V4 Pro",
        "activeEngineModelId": model_id,
        "engineTier": "High-Performance LLM",
        "promotionalPricingActive": pricing.get("is_promotional", False),
        "promotionalPriceExpiresUtc": pricing.get("promo_expires_utc", ""),
        "estimatedCostAfterPromo": None,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }

    return {"summary": summary, "features": features}


@router.get("/summary")
def get_monitoring_summary(_admin=Depends(require_admin)):
    """Returns AI monitoring summary + feature metrics + pricing metadata."""
    telemetry = _aggregate_telemetry()
    aggregated = _aggregate_summary(telemetry)
    return {
        **aggregated["summary"],
        "features": aggregated["features"],
        "pricingMeta": _build_pricing_meta(),
        "telemetry": telemetry,
    }


@router.post("/refresh")
def refresh_monitoring(_admin=Depends(require_admin)):
    """Acknowledge a refresh; the summary endpoint re-aggregates on every read."""
    # TODO: Write to Firestore ai_monitoring/summary when Firestore admin SDK is available
    pricing = get_active_pricing("deepseek-v4-pro")
    return {
        "success": True,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "pricingUsed": pricing,
    }
