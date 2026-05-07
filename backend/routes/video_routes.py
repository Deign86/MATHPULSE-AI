"""
Video lesson search routes for MathPulse AI.
POST /api/lessons/videos/search — smart YouTube video search with RAG enrichment.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.youtube_service import (
    get_video_search_results,
    YOUTUBE_API_KEY,
)

logger = logging.getLogger("mathpulse.videos")
router = APIRouter(prefix="/api/lessons/videos", tags=["videos"])


class VideoSearchRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    grade_level: str = Field(default="Grade 11", max_length=50)
    subject: str = Field(default="General Mathematics", max_length=100)
    lesson_context: str = Field(default="", max_length=1000)
    lesson_id: Optional[str] = Field(default=None, max_length=100)


class VideoResult(BaseModel):
    videoId: str
    title: str
    channelTitle: str
    thumbnailUrl: str
    durationSeconds: int


class VideoSearchResponse(BaseModel):
    videos: List[VideoResult]
    cached: bool = False


@router.post("/search", response_model=VideoSearchResponse)
async def search_videos(request: Request, payload: VideoSearchRequest):
    """
    Search for relevant educational YouTube videos for a lesson topic.

    - Checks Firestore video_cache first (7-day TTL)
    - Enriches the search query with RAG curriculum keywords
    - Filters for educational channels, medium/long duration, HD quality
    - Returns up to 3 video results
    """
    # Graceful degradation: if YouTube API key is not configured, return 503
    # so the frontend can hide the video section silently
    if not YOUTUBE_API_KEY:
        logger.warning("YouTube API key not configured")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "youtube_api_not_configured",
                "message": "YouTube API key is not configured on the server.",
            },
        )

    try:
        result = get_video_search_results(
            topic=payload.topic,
            subject=payload.subject,
            lesson_context=payload.lesson_context,
            grade_level=payload.grade_level,
            lesson_id=payload.lesson_id,
            max_results=3,
        )

        videos = [
            VideoResult(
                videoId=v["videoId"],
                title=v["title"],
                channelTitle=v["channelTitle"],
                thumbnailUrl=v["thumbnailUrl"],
                durationSeconds=v["durationSeconds"],
            )
            for v in result.get("videos", [])
        ]

        return VideoSearchResponse(
            videos=videos,
            cached=result.get("cached", False),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Video search endpoint error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "video_search_failed",
                "message": f"Failed to search videos: {exc}",
            },
        )
