"""Class Analytics API routes."""

import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("mathpulse.class_analytics_routes")

router = APIRouter(prefix="/api/analytics/class", tags=["class-analytics"])

# Rate limit: 1 refresh per 5 min per class
_refresh_timestamps: dict[str, float] = {}


def _require_teacher(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")
    return user


@router.get("/{class_id}")
async def get_class_analytics(class_id: str, request: Request, refresh: bool = False):
    """Get full class analytics report. Cached for 30 min unless refresh=true."""
    user = _require_teacher(request)

    from services.class_analytics_engine import get_class_analytics_engine
    engine = get_class_analytics_engine()
    report = await engine.get_class_analytics(class_id, user.uid, force_refresh=refresh)
    return report.model_dump()


@router.get("/{class_id}/students")
async def get_class_students(
    class_id: str, request: Request, filter: Optional[str] = "all"
):
    """Get student summaries for a class with optional filtering."""
    user = _require_teacher(request)

    from services.class_analytics_engine import get_class_analytics_engine
    engine = get_class_analytics_engine()
    report = await engine.get_class_analytics(class_id, user.uid)

    students = report.students
    if filter == "top_performers":
        students = sorted(
            [s for s in students if s.quiz_attempt_count > 0],
            key=lambda s: s.avg_score,
            reverse=True,
        )[:10]
    elif filter == "needs_attention":
        students = sorted(
            [s for s in students if s.risk_level in ("High Risk", "Critical", "Unassessed")],
            key=lambda s: s.avg_score,
        )

    return [s.model_dump() for s in students]


@router.get("/{class_id}/topics")
async def get_class_topics(class_id: str, request: Request):
    """Get topic performance sorted by accuracy (worst first)."""
    user = _require_teacher(request)

    from services.class_analytics_engine import get_class_analytics_engine
    engine = get_class_analytics_engine()
    report = await engine.get_class_analytics(class_id, user.uid)

    topics = report.insights.topic_performance if report.insights else []
    return [t.model_dump() for t in topics]


@router.post("/{class_id}/refresh-insights")
async def refresh_class_insights(class_id: str, request: Request):
    """Force regeneration of AI insights. Rate limited: 1 per 5 min per class."""
    user = _require_teacher(request)

    last_refresh = _refresh_timestamps.get(class_id, 0)
    if time.time() - last_refresh < 300:
        raise HTTPException(
            status_code=429,
            detail="Insights can only be refreshed once every 5 minutes.",
        )

    from services.class_analytics_engine import get_class_analytics_engine
    engine = get_class_analytics_engine()
    engine.invalidate_cache(class_id)
    report = await engine.get_class_analytics(class_id, user.uid, force_refresh=True)
    _refresh_timestamps[class_id] = time.time()

    if report.insights:
        return report.insights.model_dump()
    return {"error": "Failed to generate insights"}


@router.post("/{class_id}/invalidate-cache")
async def invalidate_class_cache(class_id: str, request: Request):
    """Invalidate cached analytics for a class (called after quiz completion)."""
    # Allow any authenticated user (student completing quiz triggers this)
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    from services.class_analytics_engine import get_class_analytics_engine
    engine = get_class_analytics_engine()
    engine.invalidate_cache(class_id)
    return {"status": "cache_invalidated", "class_id": class_id}
