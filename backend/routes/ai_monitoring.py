# backend/routes/ai_monitoring.py
# TODO: Review pricing after 2026-05-31
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Request
import logging

from config.ai_pricing import get_active_pricing, get_full_pricing, DEEPSEEK_PRICING
from services.cost_calculator import calculate_feature_cost, calculate_full_price_cost

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


def _aggregate_summary() -> dict:
    """
    Aggregate AI monitoring summary from in-memory/mock data.
    In production, this reads from Firestore ai_usage_logs collection.
    """
    # TODO: Replace with actual Firestore aggregation when usage logging is wired
    model_id = "deepseek-v4-pro"
    pricing = get_active_pricing(model_id)

    # Feature definitions with estimated token distributions
    features_config = [
        {"id": "ai_chat_tutor", "name": "AI Chat Tutor", "model": model_id, "share": 0.35, "cache_hit_rate": 0.62, "icon": "MessageCircle"},
        {"id": "hint_generation", "name": "Hint Generation", "model": model_id, "share": 0.28, "cache_hit_rate": 0.58, "icon": "Lightbulb"},
        {"id": "lesson_generation", "name": "Lesson Generation", "model": model_id, "share": 0.18, "cache_hit_rate": 0.35, "icon": "GraduationCap"},
        {"id": "learning_paths", "name": "Learning Paths", "model": model_id, "share": 0.09, "cache_hit_rate": 0.40, "icon": "Target"},
        {"id": "quiz_generation", "name": "Quiz Generation", "model": model_id, "share": 0.09, "cache_hit_rate": 0.38, "icon": "PenTool"},
        {"id": "other", "name": "Other AI Features", "model": model_id, "share": 0.01, "cache_hit_rate": 0.50, "icon": "Zap"},
    ]

    total_requests = 6900
    total_input_tokens = 8_500_000
    total_output_tokens = 3_200_000

    features = []
    total_cost = 0.0
    total_full_price_cost = 0.0
    total_cache_hit_tokens = 0
    total_cache_miss_tokens = 0

    for fc in features_config:
        req_count = int(total_requests * fc["share"])
        input_share = int(total_input_tokens * fc["share"])
        output_share = int(total_output_tokens * fc["share"])
        cache_hit = int(input_share * fc["cache_hit_rate"])
        cache_miss = input_share - cache_hit

        cost = calculate_feature_cost(fc["model"], cache_hit, cache_miss, output_share)
        full_cost = calculate_full_price_cost(fc["model"], cache_hit, cache_miss, output_share)

        total_cost += cost["total_usd"]
        total_full_price_cost += full_cost
        total_cache_hit_tokens += cache_hit
        total_cache_miss_tokens += cache_miss

        features.append({
            "featureId": fc["id"],
            "featureName": fc["name"],
            "modelId": fc["model"],
            "monthlyCost": round(cost["total_usd"], 4),
            "costShare": round(fc["share"] * 100, 1),
            "totalRequests": req_count,
            "totalInputTokens": input_share,
            "totalOutputTokens": output_share,
            "cacheHitRate": fc["cache_hit_rate"],
            "isMostActive": fc["id"] == "ai_chat_tutor",
            "isTopSpending": fc["id"] == "ai_chat_tutor",
            "icon": fc["icon"],
        })

    overall_cache_hit_rate = total_cache_hit_tokens / (total_cache_hit_tokens + total_cache_miss_tokens) if (total_cache_hit_tokens + total_cache_miss_tokens) > 0 else 0

    # Cost breakdown
    total_cache_hit_cost = (total_cache_hit_tokens / 1_000_000) * pricing["input_cache_hit_per_1m"]
    total_cache_miss_cost = (total_cache_miss_tokens / 1_000_000) * pricing["input_cache_miss_per_1m"]
    total_output_cost = (total_output_tokens / 1_000_000) * pricing["output_per_1m"]

    summary = {
        "systemStatus": "healthy",
        "actionRequired": False,
        "hasPerformanceIssues": False,
        "monthlyCost": round(total_cost, 4),
        "projectedMonthlyCost": round(total_cost * 1.1, 4),
        "billingCycleLabel": "Current Billable Cycle",
        "costBreakdown": {
            "cacheHitCost": round(total_cache_hit_cost, 6),
            "cacheMissCost": round(total_cache_miss_cost, 6),
            "outputCost": round(total_output_cost, 6),
        },
        "totalUsage": total_requests,
        "totalInputTokens": total_cache_hit_tokens + total_cache_miss_tokens,
        "totalOutputTokens": total_output_tokens,
        "cacheHitRate": round(overall_cache_hit_rate, 4),
        "activeEngine": "DeepSeek-V4 Pro",
        "activeEngineModelId": model_id,
        "engineTier": "High-Performance LLM",
        "promotionalPricingActive": pricing.get("is_promotional", False),
        "promotionalPriceExpiresUtc": pricing.get("promo_expires_utc", ""),
        "estimatedCostAfterPromo": round(total_full_price_cost, 4),
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }

    return {"summary": summary, "features": features}


@router.get("/summary")
def get_monitoring_summary(_admin=Depends(require_admin)):
    """Returns AI monitoring summary + feature metrics + pricing metadata."""
    data = _aggregate_summary()
    return {
        **data["summary"],
        "features": data["features"],
        "pricingMeta": _build_pricing_meta(),
        "telemetry": _aggregate_telemetry(),
    }


@router.post("/refresh")
def refresh_monitoring(_admin=Depends(require_admin)):
    """Re-aggregate usage metrics and recalculate costs."""
    data = _aggregate_summary()
    # TODO: Write to Firestore ai_monitoring/summary when Firestore admin SDK is available
    pricing = get_active_pricing("deepseek-v4-pro")
    return {
        "success": True,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "pricingUsed": pricing,
    }
