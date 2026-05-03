"""
YouTube search service for lesson video embeddings.
Uses YouTube Data API v3 to find relevant educational videos.
"""

from __future__ import annotations

import os
import logging
from typing import Optional

logger = logging.getLogger("mathpulse.youtube")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")


def _parse_iso8601_duration(duration: str) -> int:
    """Parse ISO 8601 duration string like 'PT5M30S' to seconds."""
    import re
    if not duration:
        return 0
    hours_match = re.search(r'(\d+)H', duration)
    minutes_match = re.search(r'(\d+)M', duration)
    seconds_match = re.search(r'(\d+)S', duration)
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    seconds = int(seconds_match.group(1)) if seconds_match else 0
    return hours * 3600 + minutes * 60 + seconds


def search_youtube_video(
    query: str,
    max_results: int = 5,
    min_duration_seconds: int = 180,
    language: str = "en",
) -> Optional[dict]:
    """
    Search YouTube Data API v3 for relevant educational videos.

    Args:
        query: Search query combining lesson title, subject, and competency
        max_results: Maximum number of results to return
        min_duration_seconds: Minimum video duration (filter out shorts)
        language: Preferred video language

    Returns:
        Best video match with videoId, title, channel, embedUrl, thumbnailUrl
    """
    if not YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not set. Video search disabled.")
        return None

    import urllib.parse
    import json

    search_query = f"{query} DepEd Philippines Grade 11 Grade 12 mathematics"
    encoded_query = urllib.parse.quote(search_query)

    search_url = (
        f"https://www.googleapis.com/youtube/v3/search"
        f"?part=snippet&type=video&q={encoded_query}"
        f"&maxResults={max_results}&relevanceLanguage={language}"
        f"&key={YOUTUBE_API_KEY}"
    )

    try:
        import urllib.request
        with urllib.request.urlopen(search_url, timeout=10) as response:
            data = json.loads(response.read().decode())

        video_results = []
        for item in data.get("items", []):
            video_id = item.get("id", {}).get("videoId", "")
            if not video_id:
                continue

            title = item.get("snippet", {}).get("title", "")
            channel = item.get("snippet", {}).get("channelTitle", "")
            description = item.get("snippet", {}).get("description", "")

            video_details_url = (
                f"https://www.googleapis.com/youtube/v3/videos"
                f"?part=contentDetails,statistics&id={video_id}&key={YOUTUBE_API_KEY}"
            )

            try:
                with urllib.request.urlopen(video_details_url, timeout=10) as vd_response:
                    vd_data = json.loads(vd_response.read().decode())
                    vd_item = vd_data.get("items", [{}])[0]
                    content_details = vd_item.get("contentDetails", {})
                    duration = content_details.get("duration", "")

                    duration_secs = _parse_iso8601_duration(duration)
            except Exception:
                duration_secs = 600

            if duration_secs < min_duration_seconds:
                continue

            embed_url = f"https://www.youtube.com/embed/{video_id}"
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"

            video_results.append({
                "videoId": video_id,
                "videoTitle": title,
                "videoChannel": channel,
                "embedUrl": embed_url,
                "thumbnailUrl": thumbnail_url,
                "durationSeconds": duration_secs,
                "description": description[:200],
            })

        if not video_results:
            return None

        for vr in video_results:
            if any(term in vr["videoTitle"].lower() or term in vr["description"].lower()
                   for term in ["tutorial", "lesson", "explain", "math", "solution"]):
                return vr

        return video_results[0] if video_results else None

    except Exception as e:
        logger.error("YouTube search failed: %s", e)
        return None


def get_video_for_lesson(
    lesson_title: str,
    subject: str,
    competency: str = "",
    quarter: int = 1,
) -> Optional[dict]:
    """Get the best YouTube video for a lesson."""
    query = " ".join(filter(None, [lesson_title, subject, competency]))[:200]
    return search_youtube_video(query)


def store_video_in_firestore(lesson_id: str, video_data: dict):
    """Persist chosen video to Firestore for caching."""
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            return
        db = firestore.client()
        doc_ref = db.collection("curriculumDocuments").document(lesson_id)
        doc_ref.collection("videoEmbed").document("primary").set({
            **video_data,
            "storedAt": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        logger.warning("Could not store video in Firestore: %s", e)


def get_cached_video(lesson_id: str) -> Optional[dict]:
    """Retrieve cached video from Firestore."""
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            return None
        db = firestore.client()
        doc = db.collection("curriculumDocuments").document(lesson_id)
        video_doc = doc.collection("videoEmbed").document("primary").get()
        if video_doc.exists:
            return video_doc.to_dict()
    except Exception:
        pass
    return None