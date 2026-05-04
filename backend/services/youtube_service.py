"""
Smart YouTube Video Search Service for MathPulse AI.
Uses YouTube Data API v3 (googleapiclient.discovery) to find relevant
educational math videos, enriched with RAG curriculum context.
Results are cached in Firestore video_cache/{lessonId} with 7-day TTL.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger("mathpulse.youtube")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()

# Known educational channel keywords and exact names for post-filtering
_EDUCATIONAL_CHANNEL_KEYWORDS = [
    "khan", "math", "academy", "education", "teacher", "professor",
    "tutorial", "lesson", "school", "university", "college", "deped",
    "philippines", "filipino", "pinoy", "stem", "learning", "study",
    "organic chemistry tutor", "patrickjmt", "3blue1brown", "numberphile",
    "math antics", "bright side", "crashcourse", "ted-ed", "ted ed",
    "nancy pi", "professor leonard", "mit", "stanford", "harvard",
]

_EDUCATIONAL_CHANNEL_EXACT = {
    "khan academy", "patrickjmt", "3blue1brown", "numberphile",
    "math antics", "the organic chemistry tutor", "professor leonard",
    "nancy pi", "ted-ed", "crashcourse", "bright side",
    "mit opencourseware", "stanford", "harvard",
}

# Minimum duration in seconds to filter out shorts (3 minutes)
_MIN_DURATION_SECONDS = 180
# Maximum duration in seconds to avoid extremely long videos (60 minutes)
_MAX_DURATION_SECONDS = 3600
# Cache TTL in seconds (7 days)
_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60


def _build_youtube_client():
    """Lazy-init googleapiclient YouTube client. Returns None if no API key."""
    if not YOUTUBE_API_KEY:
        return None
    try:
        from googleapiclient.discovery import build
        return build("youtube", "v3", developerKey=YOUTUBE_API_KEY, cache_discovery=False)
    except Exception as exc:
        logger.warning("Failed to build YouTube client: %s", exc)
        return None


def _parse_iso8601_duration(duration: str) -> int:
    """Parse ISO 8601 duration string like 'PT5M30S' to seconds."""
    if not duration:
        return 0
    hours_match = re.search(r"(\d+)H", duration)
    minutes_match = re.search(r"(\d+)M", duration)
    seconds_match = re.search(r"(\d+)S", duration)
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    seconds = int(seconds_match.group(1)) if seconds_match else 0
    return hours * 3600 + minutes * 60 + seconds


def _is_educational_channel(channel_title: str) -> bool:
    """Check if a channel appears to be educational."""
    lowered = channel_title.lower().strip()
    if lowered in _EDUCATIONAL_CHANNEL_EXACT:
        return True
    return any(kw in lowered for kw in _EDUCATIONAL_CHANNEL_KEYWORDS)


def _score_video_result(item: dict, query: str) -> float:
    """Score a video result for relevance. Higher is better."""
    score = 0.0
    title = (item.get("title") or "").lower()
    description = (item.get("description") or "").lower()
    channel = (item.get("channelTitle") or "").lower()
    query_lower = query.lower()

    # Title contains key math/education terms
    math_terms = ["tutorial", "lesson", "explain", "math", "mathematics",
                  "solution", "problem", "example", "learn", "how to"]
    for term in math_terms:
        if term in title:
            score += 2.0

    # Query terms appear in title
    for word in query_lower.split():
        if len(word) > 2 and word in title:
            score += 1.5

    # Educational channel bonus
    if _is_educational_channel(channel):
        score += 5.0

    # Description relevance
    for word in query_lower.split():
        if len(word) > 2 and word in description:
            score += 0.5

    # Duration sweet spot: 5-20 minutes
    duration = item.get("durationSeconds", 0)
    if 300 <= duration <= 1200:
        score += 2.0
    elif duration >= _MIN_DURATION_SECONDS:
        score += 1.0

    return score


def _enrich_query_with_rag(topic: str, subject: str, lesson_context: str = "") -> str:
    """
    Query the RAG vectorstore to extract curriculum keywords and enrich
    the YouTube search query for higher relevance.
    """
    enriched = topic
    if subject:
        enriched = f"{enriched} {subject}"
    if lesson_context:
        enriched = f"{enriched} {lesson_context}"

    try:
        from rag.curriculum_rag import retrieve_curriculum_context
        chunks = retrieve_curriculum_context(
            query=topic,
            subject=subject if subject else None,
            top_k=5,
        )
        if chunks:
            # Extract key terms from top chunk contents
            keywords: List[str] = []
            for chunk in chunks[:3]:
                content = str(chunk.get("content", "")).strip()
                # Extract meaningful words (skip math symbols, numbers, stop words)
                if content:
                    # Clean content: remove special chars, keep only alphabetic words
                    cleaned = re.sub(r'[^\w\s]', ' ', content)
                    words = [w for w in cleaned.split() if len(w) > 3 and w.isalpha()]
                    # Take up to 5 key words per chunk
                    keywords.extend(words[:5])
            if keywords:
                # Deduplicate and limit
                unique_keywords = list(dict.fromkeys(keywords))[:8]
                keyword_str = " ".join(unique_keywords)
                enriched = f"{enriched} {keyword_str}"
    except Exception as exc:
        logger.debug("RAG enrichment skipped: %s", exc)

    # Append standard DepEd/Philippines math context
    enriched = f"{enriched} DepEd Philippines mathematics tutorial"
    return enriched[:300]


def _get_cache_key(topic: str, subject: str, grade_level: str) -> str:
    """Generate a deterministic Firestore document ID for caching."""
    raw = f"{subject}|{topic}|{grade_level}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def get_cached_videos(lesson_id: str) -> Optional[List[Dict]]:
    """Check Firestore video_cache/{lessonId} for cached results (TTL 7 days)."""
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            return None

        db = firestore.client()
        doc_ref = db.collection("video_cache").document(lesson_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None

        data = doc.to_dict()
        if not data:
            return None

        cached_at = data.get("cachedAt")
        if cached_at:
            # Firestore timestamps have a .timestamp() method or are datetime objects
            if hasattr(cached_at, "timestamp"):
                cached_epoch = cached_at.timestamp()
            elif isinstance(cached_at, datetime):
                cached_epoch = cached_at.timestamp()
            else:
                cached_epoch = float(cached_at)
            now_epoch = datetime.now(timezone.utc).timestamp()
            if (now_epoch - cached_epoch) > _CACHE_TTL_SECONDS:
                logger.info("Video cache expired for lesson %s", lesson_id)
                return None

        videos = data.get("videos")
        if isinstance(videos, list) and len(videos) > 0:
            logger.info("Video cache hit for lesson %s (%d videos)", lesson_id, len(videos))
            return videos
    except Exception as exc:
        logger.debug("Could not read video cache: %s", exc)
    return None


def cache_videos(lesson_id: str, videos: List[Dict], topic: str) -> None:
    """Store search results in Firestore video_cache/{lessonId}."""
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            return

        db = firestore.client()
        db.collection("video_cache").document(lesson_id).set({
            "videos": videos,
            "cachedAt": firestore.SERVER_TIMESTAMP,
            "topic": topic,
        })
        logger.info("Cached %d videos for lesson %s", len(videos), lesson_id)
    except Exception as exc:
        logger.warning("Could not cache videos in Firestore: %s", exc)


def search_youtube_videos(
    topic: str,
    subject: str = "",
    lesson_context: str = "",
    grade_level: str = "",
    max_results: int = 3,
    language: str = "en",
) -> List[Dict]:
    """
    Search YouTube Data API v3 for relevant educational math videos.

    Returns up to `max_results` videos after applying filters:
    - Educational channels (post-filter by channel name)
    - Medium/long duration (>= 3 minutes, <= 60 minutes)
    - HD quality preferred (videoDefinition = high)
    - English or Filipino language

    Each result contains: videoId, title, channelTitle, thumbnailUrl, durationSeconds.
    """
    client = _build_youtube_client()
    if client is None:
        logger.warning("YOUTUBE_API_KEY not set. Video search disabled.")
        return []

    # Step 1: Enrich query with RAG curriculum context
    enriched_query = _enrich_query_with_rag(topic, subject, lesson_context)
    logger.info("YouTube search query (enriched): %s", enriched_query)

    try:
        # Step 2: Search for videos
        search_response = client.search().list(
            part="snippet",
            q=enriched_query,
            type="video",
            maxResults=15,  # Fetch more to allow post-filtering
            relevanceLanguage=language,
            videoDefinition="high",
            videoDuration="medium",  # 4-20 minutes
            safeSearch="strict",
            order="relevance",
        ).execute()

        items = search_response.get("items", [])
        if not items:
            logger.info("No YouTube results for query: %s", enriched_query)
            return []

        # Step 3: Get video details (duration, etc.)
        video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
        if not video_ids:
            return []

        details_response = client.videos().list(
            part="contentDetails,statistics,snippet",
            id=",".join(video_ids),
        ).execute()

        details_map = {}
        for detail in details_response.get("items", []):
            vid = detail.get("id")
            if vid:
                details_map[vid] = detail

        # Step 4: Build results with filtering
        results = []
        for item in items:
            video_id = item.get("id", {}).get("videoId", "")
            if not video_id:
                continue

            detail = details_map.get(video_id, {})
            snippet = detail.get("snippet", item.get("snippet", {}))
            content_details = detail.get("contentDetails", {})

            title = snippet.get("title", "")
            channel_title = snippet.get("channelTitle", "")
            description = snippet.get("description", "")
            duration = content_details.get("duration", "")
            duration_secs = _parse_iso8601_duration(duration)

            # Filter: duration
            if duration_secs < _MIN_DURATION_SECONDS or duration_secs > _MAX_DURATION_SECONDS:
                continue

            # Filter: educational channels
            if not _is_educational_channel(channel_title):
                # Still allow if title strongly suggests math tutorial
                lowered_title = title.lower()
                if not any(term in lowered_title for term in ["tutorial", "lesson", "math", "explain"]):
                    continue

            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
            # Prefer hqdefault if available
            thumbs = snippet.get("thumbnails", {})
            if "high" in thumbs:
                thumbnail_url = thumbs["high"]["url"]
            elif "medium" in thumbs:
                thumbnail_url = thumbs["medium"]["url"]

            results.append({
                "videoId": video_id,
                "title": title,
                "channelTitle": channel_title,
                "thumbnailUrl": thumbnail_url,
                "durationSeconds": duration_secs,
                "description": description[:200] if description else "",
            })

        # Step 5: Score and sort, return top N
        for r in results:
            r["_score"] = _score_video_result(r, enriched_query)

        results.sort(key=lambda x: x["_score"], reverse=True)
        for r in results:
            r.pop("_score", None)

        top_results = results[:max_results]
        logger.info("YouTube search returned %d results (top %d)", len(results), len(top_results))
        return top_results

    except Exception as exc:
        logger.error("YouTube search failed: %s", exc)
        return []


def get_video_search_results(
    topic: str,
    subject: str = "",
    lesson_context: str = "",
    grade_level: str = "",
    lesson_id: Optional[str] = None,
    max_results: int = 3,
) -> Dict:
    """
    High-level wrapper: check cache first, then search YouTube, then cache results.

    Returns {"videos": [...], "cached": bool}.
    """
    cache_key = lesson_id or _get_cache_key(topic, subject, grade_level)

    # Check cache first
    cached = get_cached_videos(cache_key)
    if cached is not None:
        return {"videos": cached, "cached": True}

    # Search YouTube
    videos = search_youtube_videos(
        topic=topic,
        subject=subject,
        lesson_context=lesson_context,
        grade_level=grade_level,
        max_results=max_results,
    )

    if videos:
        cache_videos(cache_key, videos, topic)

    return {"videos": videos, "cached": False}
