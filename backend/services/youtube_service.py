"""
Smart YouTube Video Search Service for MathPulse AI.
Uses YouTube Data API v3 (googleapiclient.discovery) to find relevant
educational math videos, enriched with RAG curriculum context and DeepSeek
query generation for contextual fallback when exact matches don't exist.
Results are cached in Firestore video_cache/{lessonId} with 7-day TTL.
"""

from __future__ import annotations

import hashlib
import json
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
    "mashup math", "mathcoach", "mathologer", "stand-up maths",
    "eddie woo", "black pen red pen", "michel van biezen", "brian mclogan",
    "mathbff", "krista king", "mathMeeting", "mathbyfives", "yourteacher",
    "virtual nerd", "study.com", "coursera", "edx", "brilliant",
    "filipino math", "tagalog math", "pinoy teacher", "math philippines",
    "shs math", "senior high school math", "grade 11 math", "grade 12 math",
    "general mathematics", "business math", "statistics", "probability",
    "finite math", "precalculus", "calculus", "algebra", "geometry",
    "trigonometry", "functions", "equations", "problem solving",
]

_EDUCATIONAL_CHANNEL_EXACT = {
    "khan academy", "patrickjmt", "3blue1brown", "numberphile",
    "math antics", "the organic chemistry tutor", "professor leonard",
    "nancy pi", "ted-ed", "crashcourse", "bright side",
    "mit opencourseware", "stanford", "harvard", "mashup math",
    "mathcoach", "mathologer", "stand-up maths", "eddie woo",
    "black pen red pen", "michel van biezen", "brian mclogan",
    "mathbff", "krista king", "mathmeeting", "mathbyfives", "yourteacher",
    "virtual nerd", "study.com", "coursera", "brilliant.org",
}

# Duration filters
_MIN_DURATION_SECONDS = 120   # 2 minutes (allow shorter tutorials)
_MAX_DURATION_SECONDS = 3600  # 60 minutes
_TARGET_MIN_SECONDS = 300     # 5 minutes (ideal)
_TARGET_MAX_SECONDS = 1200    # 20 minutes (ideal)

# Cache TTL in seconds (7 days)
_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

# Guaranteed fallback videos by subject — these are well-known educational videos
# that are extremely likely to exist and be relevant. Used as nuclear option
# when YouTube API returns nothing for all search strategies.
_GUARANTEED_FALLBACK_VIDEOS = {
    "default": [
        {
            "videoId": "p6j8HhfJ5Mc",
            "title": "The Essence of Calculus",
            "channelTitle": "3Blue1Brown",
            "thumbnailUrl": "https://img.youtube.com/vi/p6j8HhfJ5Mc/hqdefault.jpg",
            "durationSeconds": 1024,
            "description": "A beautiful introduction to calculus concepts.",
        },
        {
            "videoId": "fNk_zzaMoSs",
            "title": "Introduction to Algebra",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
            "durationSeconds": 720,
            "description": "Fundamentals of algebraic thinking and equations.",
        },
    ],
    "general mathematics": [
        {
            "videoId": "fNk_zzaMoSs",
            "title": "Introduction to Algebra",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
            "durationSeconds": 720,
            "description": "Fundamentals of algebraic thinking and equations.",
        },
        {
            "videoId": "5I_1G5CNA5E",
            "title": "Functions and Their Graphs",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/5I_1G5CNA5E/hqdefault.jpg",
            "durationSeconds": 685,
            "description": "Understanding functions, domain, range, and graphing.",
        },
    ],
    "business math": [
        {
            "videoId": "Dc2V7_ur_yY",
            "title": "Simple Interest and Compound Interest",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/Dc2V7_ur_yY/hqdefault.jpg",
            "durationSeconds": 780,
            "description": "Understanding interest calculations for business applications.",
        },
        {
            "videoId": "BFGj4mkHbHc",
            "title": "Business Mathematics Tutorial",
            "channelTitle": "Math Meeting",
            "thumbnailUrl": "https://img.youtube.com/vi/BFGj4mkHbHc/hqdefault.jpg",
            "durationSeconds": 890,
            "description": "Essential business math concepts and problem solving.",
        },
    ],
    "statistics": [
        {
            "videoId": "qBigTkBLU6g",
            "title": "Statistics Intro: Mean, Median, and Mode",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/qBigTkBLU6g/hqdefault.jpg",
            "durationSeconds": 512,
            "description": "Introduction to measures of central tendency.",
        },
        {
            "videoId": "oXdM3XVCzIM",
            "title": "Standard Deviation Explained",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/oXdM3XVCzIM/hqdefault.jpg",
            "durationSeconds": 635,
            "description": "Understanding variance and standard deviation.",
        },
    ],
    "probability": [
        {
            "videoId": "uzkc-qNVoOk",
            "title": "Probability Explained",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/uzkc-qNVoOk/hqdefault.jpg",
            "durationSeconds": 480,
            "description": "Introduction to probability concepts and calculations.",
        },
        {
            "videoId": "SkidyvDkNYQ",
            "title": "Probability of Independent Events",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/SkidyvDkNYQ/hqdefault.jpg",
            "durationSeconds": 520,
            "description": "Calculating probabilities for independent and dependent events.",
        },
    ],
    "finite math": [
        {
            "videoId": "fNk_zzaMoSs",
            "title": "Introduction to Algebra",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
            "durationSeconds": 720,
            "description": "Fundamentals of algebraic thinking and equations.",
        },
        {
            "videoId": "5I_1G5CNA5E",
            "title": "Functions and Their Graphs",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/5I_1G5CNA5E/hqdefault.jpg",
            "durationSeconds": 685,
            "description": "Understanding functions, domain, range, and graphing.",
        },
    ],
    "calculus": [
        {
            "videoId": "p6j8HhfJ5Mc",
            "title": "The Essence of Calculus",
            "channelTitle": "3Blue1Brown",
            "thumbnailUrl": "https://img.youtube.com/vi/p6j8HhfJ5Mc/hqdefault.jpg",
            "durationSeconds": 1024,
            "description": "A beautiful introduction to calculus concepts.",
        },
        {
            "videoId": "WUvTyaaNkzM",
            "title": "Limits and Continuity",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/WUvTyaaNkzM/hqdefault.jpg",
            "durationSeconds": 780,
            "description": "Understanding limits and continuity in calculus.",
        },
    ],
    "algebra": [
        {
            "videoId": "fNk_zzaMoSs",
            "title": "Introduction to Algebra",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
            "durationSeconds": 720,
            "description": "Fundamentals of algebraic thinking and equations.",
        },
        {
            "videoId": "5I_1G5CNA5E",
            "title": "Functions and Their Graphs",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/5I_1G5CNA5E/hqdefault.jpg",
            "durationSeconds": 685,
            "description": "Understanding functions, domain, range, and graphing.",
        },
    ],
    "geometry": [
        {
            "videoId": "302eJ3TzJQU",
            "title": "Geometry Introduction",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/302eJ3TzJQU/hqdefault.jpg",
            "durationSeconds": 540,
            "description": "Basic geometry concepts and terminology.",
        },
        {
            "videoId": "Jn0YxbqEjHk",
            "title": "Trigonometry Introduction",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/Jn0YxbqEjHk/hqdefault.jpg",
            "durationSeconds": 680,
            "description": "Introduction to trigonometric functions and identities.",
        },
    ],
    "trigonometry": [
        {
            "videoId": "Jn0YxbqEjHk",
            "title": "Trigonometry Introduction",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/Jn0YxbqEjHk/hqdefault.jpg",
            "durationSeconds": 680,
            "description": "Introduction to trigonometric functions and identities.",
        },
        {
            "videoId": "PUB0TaZ7bhA",
            "title": "Unit Circle Definition of Trig Functions",
            "channelTitle": "Khan Academy",
            "thumbnailUrl": "https://img.youtube.com/vi/PUB0TaZ7bhA/hqdefault.jpg",
            "durationSeconds": 590,
            "description": "Understanding sine and cosine on the unit circle.",
        },
    ],
}


def _get_guaranteed_fallback_videos(subject: str = "", max_results: int = 3) -> List[Dict]:
    """Return guaranteed fallback videos when YouTube API returns nothing."""
    subject_lower = subject.lower().strip()
    
    # Try exact subject match
    if subject_lower in _GUARANTEED_FALLBACK_VIDEOS:
        videos = _GUARANTEED_FALLBACK_VIDEOS[subject_lower]
    else:
        # Try partial match
        matched = False
        for key, videos_list in _GUARANTEED_FALLBACK_VIDEOS.items():
            if key != "default" and (key in subject_lower or subject_lower in key):
                videos = videos_list
                matched = True
                break
        if not matched:
            videos = _GUARANTEED_FALLBACK_VIDEOS["default"]
    
    return videos[:max_results]


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


def _score_video_result(item: dict, query: str, topic: str, subject: str) -> float:
    """Score a video result for relevance. Higher is better."""
    score = 0.0
    title = (item.get("title") or "").lower()
    description = (item.get("description") or "").lower()
    channel = (item.get("channelTitle") or "").lower()
    query_lower = query.lower()
    topic_lower = topic.lower()
    subject_lower = subject.lower() if subject else ""

    # Topic relevance (highest weight)
    topic_words = [w for w in topic_lower.split() if len(w) > 2]
    for word in topic_words:
        if word in title:
            score += 4.0
        if word in description:
            score += 1.5

    # Subject relevance
    if subject_lower:
        subject_words = [w for w in subject_lower.split() if len(w) > 2]
        for word in subject_words:
            if word in title:
                score += 2.0
            if word in description:
                score += 0.5

    # Query terms appear in title
    for word in query_lower.split():
        if len(word) > 2 and word in title:
            score += 1.0

    # Educational channel bonus
    if _is_educational_channel(channel):
        score += 3.0

    # Math/education terms in title
    math_terms = ["tutorial", "lesson", "explain", "math", "mathematics",
                  "solution", "problem", "example", "learn", "how to",
                  "introduction", "basics", "overview", "guide"]
    for term in math_terms:
        if term in title:
            score += 1.5

    # Duration scoring
    duration = item.get("durationSeconds", 0)
    if _TARGET_MIN_SECONDS <= duration <= _TARGET_MAX_SECONDS:
        score += 2.0
    elif _MIN_DURATION_SECONDS <= duration <= _MAX_DURATION_SECONDS:
        score += 1.0
    elif duration > 0:
        score += 0.3  # Still count very short/long videos, just less

    return score


def _extract_meaningful_keywords(chunks: List[dict]) -> List[str]:
    """Extract meaningful keywords from curriculum chunks."""
    keywords: List[str] = []
    for chunk in chunks[:3]:
        content = str(chunk.get("content", "")).strip()
        if not content:
            continue
        # Split into sentences and take first few
        sentences = content.split('.')[:2]
        for sentence in sentences:
            # Extract important words (nouns, concepts) - heuristic approach
            words = re.findall(r'\b[A-Za-z][a-z]{3,}\b', sentence)
            # Filter out common stop words
            stop_words = {
                'this', 'that', 'with', 'from', 'they', 'have', 'will',
                'would', 'there', 'their', 'what', 'said', 'each',
                'which', 'about', 'could', 'other', 'after', 'first',
                'these', 'think', 'where', 'being', 'every', 'great',
                'might', 'shall', 'while', 'through', 'during', 'before',
                'between', 'among', 'within', 'without', 'against',
                'students', 'student', 'learning', 'learn', 'understand',
                'objective', 'objectives', 'competency', 'competencies',
            }
            meaningful = [w.lower() for w in words if w.lower() not in stop_words]
            keywords.extend(meaningful[:8])
    
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for kw in keywords:
        if kw not in seen and len(kw) > 3:
            seen.add(kw)
            unique.append(kw)
    return unique[:12]


def _enrich_query_with_rag(topic: str, subject: str, lesson_context: str = "") -> str:
    """
    Query the RAG vectorstore to extract curriculum keywords and enrich
    the YouTube search query for higher relevance.
    """
    enriched = topic
    if subject:
        enriched = f"{enriched} {subject}"
    if lesson_context:
        # Only add lesson context if it's not too similar to topic
        if lesson_context.lower() not in topic.lower():
            enriched = f"{enriched} {lesson_context}"

    try:
        from rag.curriculum_rag import retrieve_curriculum_context
        chunks = retrieve_curriculum_context(
            query=topic,
            subject=subject if subject else None,
            top_k=5,
        )
        if chunks:
            keywords = _extract_meaningful_keywords(chunks)
            if keywords:
                keyword_str = " ".join(keywords[:10])
                enriched = f"{enriched} {keyword_str}"
    except Exception as exc:
        logger.debug("RAG enrichment skipped: %s", exc)

    # Append standard DepEd/Philippines math context
    enriched = f"{enriched} DepEd Philippines mathematics tutorial"
    return enriched[:300]


def _generate_search_queries_with_ai(
    topic: str,
    subject: str,
    lesson_context: str,
    grade_level: str,
) -> List[str]:
    """
    Use DeepSeek to generate multiple targeted YouTube search queries.
    Falls back to heuristic queries if AI is unavailable.
    
    Returns a list of queries ordered from most specific to most general.
    """
    try:
        from services.inference_client import InferenceRequest, create_default_client
        
        prompt = (
            f"You are helping find educational YouTube videos for a Filipino senior high school math lesson.\n"
            f"Topic: {topic}\n"
            f"Subject: {subject}\n"
            f"Context: {lesson_context or 'General mathematics lesson'}\n"
            f"Grade: {grade_level or 'Grade 11-12'}\n\n"
            f"Generate exactly 4 YouTube search queries that would find the most relevant educational videos.\n"
            f"Rules:\n"
            f"1. Query 1: Most specific - exact topic with 'tutorial' or 'lesson'\n"
            f"2. Query 2: Slightly broader - related concepts or prerequisite topics\n"
            f"3. Query 3: Even broader - the general subject area with key concepts\n"
            f"4. Query 4: Last resort - basic subject + 'introduction' or 'basics'\n"
            f"5. Each query should be 3-8 words\n"
            f"6. Use terms that real educational channels would use\n"
            f"7. If the exact topic is very specific/niche, include related more common topics\n\n"
            f"Return ONLY a JSON array of 4 strings, nothing else:\n"
            f'["query1", "query2", "query3", "query4"]'
        )
        
        client = create_default_client()
        request = InferenceRequest(
            messages=[
                {"role": "system", "content": "You generate YouTube search queries. Return only JSON arrays."},
                {"role": "user", "content": prompt},
            ],
            task_type="lesson_generation",
            max_new_tokens=200,
            temperature=0.3,
            top_p=0.9,
        )
        response = client.generate_from_messages(request)
        
        # Parse JSON array from response
        text = response.strip()
        # Try to find JSON array
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            queries = json.loads(match.group())
            if isinstance(queries, list) and len(queries) >= 2:
                # Validate and clean queries
                cleaned = []
                for q in queries:
                    if isinstance(q, str) and len(q.strip()) > 3:
                        cleaned.append(q.strip()[:200])
                if len(cleaned) >= 2:
                    logger.info("AI generated %d search queries", len(cleaned))
                    return cleaned
    except Exception as exc:
        logger.debug("AI query generation failed, using fallback: %s", exc)
    
    # Fallback heuristic queries
    return _generate_fallback_queries(topic, subject, lesson_context)


def _generate_fallback_queries(topic: str, subject: str, lesson_context: str) -> List[str]:
    """Generate fallback search queries when AI is unavailable."""
    queries = [
        f"{topic} {subject} tutorial lesson",
        f"{topic} mathematics explained",
        f"{subject} {topic} how to",
    ]
    
    # Add broader queries
    if lesson_context and lesson_context.lower() not in topic.lower():
        queries.insert(1, f"{lesson_context} tutorial")
    
    # Extract core concept from topic (e.g., "quadratic equations" -> "quadratic")
    core_words = [w for w in topic.split() if len(w) > 3]
    if core_words:
        core = core_words[0]
        queries.append(f"{core} math lesson introduction")
    
    # Add subject-level query as last resort
    queries.append(f"{subject} basics tutorial")
    
    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for q in queries:
        if q.lower() not in seen:
            seen.add(q.lower())
            unique.append(q)
    
    return unique[:5]


def _find_related_topics_with_ai(topic: str, subject: str) -> List[str]:
    """
    When exact topic has no videos, ask DeepSeek for related/similar topics
    that are more likely to have educational video content.
    """
    try:
        from services.inference_client import InferenceRequest, create_default_client
        
        prompt = (
            f"The topic '{topic}' in {subject} has very few or no YouTube videos.\n"
            f"Suggest 3 related, more commonly taught topics that would have educational videos.\n"
            f"These should cover similar or prerequisite concepts.\n"
            f"Return ONLY a JSON array of 3 short topic phrases (2-4 words each).\n"
            f'["topic1", "topic2", "topic3"]'
        )
        
        client = create_default_client()
        request = InferenceRequest(
            messages=[
                {"role": "system", "content": "You suggest related math topics. Return only JSON arrays."},
                {"role": "user", "content": prompt},
            ],
            task_type="lesson_generation",
            max_new_tokens=150,
            temperature=0.4,
            top_p=0.9,
        )
        response = client.generate_from_messages(request)
        
        text = response.strip()
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            topics = json.loads(match.group())
            if isinstance(topics, list):
                cleaned = [t.strip()[:100] for t in topics if isinstance(t, str) and len(t.strip()) > 2]
                if cleaned:
                    logger.info("AI suggested %d related topics for '%s'", len(cleaned), topic)
                    return cleaned
    except Exception as exc:
        logger.debug("AI related topics failed: %s", exc)
    
    # Fallback: generate simple related topics
    return _generate_fallback_related_topics(topic, subject)


def _generate_fallback_related_topics(topic: str, subject: str) -> List[str]:
    """Generate simple related topic fallbacks."""
    related = []
    
    # Try subject + common subtopics
    if "equation" in topic.lower():
        related.extend([f"{subject} functions", f"{subject} graphing"])
    elif "function" in topic.lower():
        related.extend([f"{subject} equations", f"{subject} domain range"])
    elif "probability" in topic.lower():
        related.extend([f"{subject} statistics", "basic probability concepts"])
    elif "statistics" in topic.lower():
        related.extend([f"{subject} data analysis", "measures of central tendency"])
    elif "geometry" in topic.lower() or "angle" in topic.lower():
        related.extend([f"{subject} trigonometry", "basic geometry concepts"])
    elif "calculus" in topic.lower() or "derivative" in topic.lower():
        related.extend(["limits and continuity", f"{subject} functions"])
    else:
        related.extend([
            f"{subject} fundamentals",
            f"{subject} basic concepts",
            f"{subject} introduction",
        ])
    
    return related[:3]


def _execute_youtube_search(
    client,
    query: str,
    max_results: int = 15,
    video_duration: Optional[str] = "medium",
    video_definition: Optional[str] = "high",
    language: str = "en",
) -> List[dict]:
    """Execute a single YouTube search and return raw items with details."""
    try:
        search_params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "relevanceLanguage": language,
            "order": "relevance",
        }
        
        if video_duration:
            search_params["videoDuration"] = video_duration
        if video_definition:
            search_params["videoDefinition"] = video_definition
        
        search_response = client.search().list(**search_params).execute()
        items = search_response.get("items", [])
        
        if not items:
            return []
        
        # Get video details
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
        
        # Build enriched items
        results = []
        for item in items:
            video_id = item.get("id", {}).get("videoId", "")
            if not video_id:
                continue
            
            detail = details_map.get(video_id, {})
            snippet = detail.get("snippet", item.get("snippet", {}))
            content_details = detail.get("contentDetails", {})
            
            duration = content_details.get("duration", "")
            duration_secs = _parse_iso8601_duration(duration)
            
            # Build thumbnail URL
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
            thumbs = snippet.get("thumbnails", {})
            if "high" in thumbs:
                thumbnail_url = thumbs["high"]["url"]
            elif "medium" in thumbs:
                thumbnail_url = thumbs["medium"]["url"]
            
            results.append({
                "videoId": video_id,
                "title": snippet.get("title", ""),
                "channelTitle": snippet.get("channelTitle", ""),
                "thumbnailUrl": thumbnail_url,
                "durationSeconds": duration_secs,
                "description": snippet.get("description", "")[:300],
            })
        
        return results
    except Exception as exc:
        logger.warning("YouTube search execution failed for query '%s': %s", query, exc)
        return []


def _filter_and_score_results(
    items: List[dict],
    query: str,
    topic: str,
    subject: str,
    require_educational: bool = True,
    min_duration: int = 120,
    max_duration: int = 3600,
) -> List[dict]:
    """Filter and score video results."""
    results = []
    for item in items:
        duration_secs = item.get("durationSeconds", 0)
        channel_title = item.get("channelTitle", "")
        title = item.get("title", "")
        
        # Duration filter
        if duration_secs < min_duration or duration_secs > max_duration:
            continue
        
        # Educational channel filter
        is_edu = _is_educational_channel(channel_title)
        if require_educational and not is_edu:
            # Allow if title strongly suggests math tutorial
            lowered_title = title.lower()
            if not any(term in lowered_title for term in [
                "tutorial", "lesson", "math", "explain", "how to",
                "introduction", "basics", "learn", "example", "problem"
            ]):
                continue
        
        # Score
        score = _score_video_result(item, query, topic, subject)
        item["_score"] = score
        results.append(item)
    
    results.sort(key=lambda x: x["_score"], reverse=True)
    for r in results:
        r.pop("_score", None)
    
    return results


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
    
    Uses a multi-strategy approach to guarantee at least 1 result:
    1. AI-generated targeted queries with strict filters
    2. Fallback to heuristic queries with relaxed filters  
    3. Broader subject-level searches
    4. Related topics suggested by AI
    5. Emergency unfiltered search as last resort
    
    Returns up to `max_results` videos.
    """
    client = _build_youtube_client()
    if client is None:
        logger.warning("YOUTUBE_API_KEY not set. Video search disabled.")
        return []

    all_results: List[dict] = []
    seen_video_ids = set()
    
    # Generate search queries using AI + fallback
    queries = _generate_search_queries_with_ai(topic, subject, lesson_context, grade_level)
    logger.info("YouTube search queries: %s", queries)
    
    # ─── Strategy 1: AI queries with standard filters ───────────────────────
    for query in queries:
        items = _execute_youtube_search(
            client, query,
            max_results=10,
            video_duration="medium",
            video_definition="high",
            language=language,
        )
        filtered = _filter_and_score_results(
            items, query, topic, subject,
            require_educational=True,
            min_duration=_MIN_DURATION_SECONDS,
            max_duration=_MAX_DURATION_SECONDS,
        )
        for item in filtered:
            vid = item["videoId"]
            if vid not in seen_video_ids:
                seen_video_ids.add(vid)
                all_results.append(item)
        
        if len(all_results) >= max_results:
            break
    
    # ─── Strategy 2: Same queries, relaxed filters ──────────────────────────
    if len(all_results) < max_results:
        for query in queries:
            items = _execute_youtube_search(
                client, query,
                max_results=10,
                video_duration=None,  # Any duration
                video_definition=None,  # Any quality
                language=language,
            )
            filtered = _filter_and_score_results(
                items, query, topic, subject,
                require_educational=False,  # Less strict
                min_duration=60,  # Allow shorter
                max_duration=7200,  # Allow longer
            )
            for item in filtered:
                vid = item["videoId"]
                if vid not in seen_video_ids:
                    seen_video_ids.add(vid)
                    all_results.append(item)
            
            if len(all_results) >= max_results:
                break
    
    # ─── Strategy 3: Broader subject-level searches ─────────────────────────
    if len(all_results) < 1:
        broad_queries = [
            f"{subject} {topic.split()[0] if topic else ''} tutorial",
            f"{subject} mathematics lesson",
            f"{topic} explained simply",
        ]
        for query in broad_queries:
            if not query.strip():
                continue
            items = _execute_youtube_search(
                client, query,
                max_results=10,
                video_duration=None,
                video_definition=None,
                language=language,
            )
            filtered = _filter_and_score_results(
                items, query, topic, subject,
                require_educational=False,
                min_duration=60,
                max_duration=7200,
            )
            for item in filtered:
                vid = item["videoId"]
                if vid not in seen_video_ids:
                    seen_video_ids.add(vid)
                    all_results.append(item)
            
            if len(all_results) >= max_results:
                break
    
    # ─── Strategy 4: AI-suggested related topics ────────────────────────────
    if len(all_results) < 1:
        related_topics = _find_related_topics_with_ai(topic, subject)
        for related_topic in related_topics:
            query = f"{related_topic} tutorial"
            items = _execute_youtube_search(
                client, query,
                max_results=8,
                video_duration=None,
                video_definition=None,
                language=language,
            )
            filtered = _filter_and_score_results(
                items, query, topic, subject,
                require_educational=False,
                min_duration=60,
                max_duration=7200,
            )
            for item in filtered:
                vid = item["videoId"]
                if vid not in seen_video_ids:
                    seen_video_ids.add(vid)
                    all_results.append(item)
            
            if len(all_results) >= max_results:
                break
    
    # ─── Strategy 5: Emergency unfiltered search ────────────────────────────
    if len(all_results) < 1:
        emergency_queries = [
            topic,
            f"{topic} math",
            subject,
        ]
        for query in emergency_queries:
            if not query or not query.strip():
                continue
            items = _execute_youtube_search(
                client, query,
                max_results=5,
                video_duration=None,
                video_definition=None,
                language=language,
            )
            # Accept ANY result in emergency mode
            for item in items:
                vid = item["videoId"]
                if vid not in seen_video_ids:
                    seen_video_ids.add(vid)
                    all_results.append(item)
            
            if len(all_results) >= 1:
                break
    
    # ─── Final: Return top results or guaranteed fallback ───────────────────
    if not all_results:
        logger.warning(
            "All YouTube search strategies failed for topic: %s. Using guaranteed fallback videos.",
            topic,
        )
        fallback = _get_guaranteed_fallback_videos(subject, max_results)
        if fallback:
            logger.info("Returning %d guaranteed fallback videos for subject: %s", len(fallback), subject)
            return fallback
        return []
    
    # Re-score all collected results against the original topic
    for item in all_results:
        item["_score"] = _score_video_result(item, topic, topic, subject)
    
    all_results.sort(key=lambda x: x["_score"], reverse=True)
    for item in all_results:
        item.pop("_score", None)
    
    top_results = all_results[:max_results]
    logger.info("YouTube search returned %d results (top %d) for topic: %s", 
                len(all_results), len(top_results), topic)
    return top_results


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