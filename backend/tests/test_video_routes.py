"""
Tests for the video search endpoint and YouTube service.
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Mock Firebase auth BEFORE importing the app
from main import app as _app_import
import main as main_module

if getattr(main_module, "firebase_auth", None) is None:
    main_module.firebase_auth = MagicMock()
main_module.firebase_auth.verify_id_token = MagicMock(
    return_value={
        "uid": "test-student-uid",
        "email": "student@example.com",
        "role": "student",
    }
)

client = TestClient(_app_import, headers={"Authorization": "Bearer test-auth-token"})


# ─── Fixtures ───────────────────────────────────────────────────

@pytest.fixture
def mock_youtube_api_key(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test_youtube_api_key")


@pytest.fixture
def no_youtube_api_key(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "")


# ─── YouTube Service Tests ──────────────────────────────────────

def test_parse_iso8601_duration():
    from services.youtube_service import _parse_iso8601_duration
    assert _parse_iso8601_duration("PT5M30S") == 330
    assert _parse_iso8601_duration("PT1H2M3S") == 3723
    assert _parse_iso8601_duration("PT0S") == 0
    assert _parse_iso8601_duration("") == 0


def test_is_educational_channel():
    from services.youtube_service import _is_educational_channel
    assert _is_educational_channel("Khan Academy") is True
    assert _is_educational_channel("Math Antics") is True
    assert _is_educational_channel("3Blue1Brown") is True
    assert _is_educational_channel("Gaming Channel") is False
    assert _is_educational_channel("Random Vlogs") is False


def test_enrich_query_with_rag_fallback(monkeypatch):
    """When RAG is unavailable, enrichment falls back to topic + subject."""
    from services.youtube_service import _enrich_query_with_rag
    # Mock RAG to simulate unavailability — patch where it's used, not where it's imported
    with patch("rag.curriculum_rag.retrieve_curriculum_context", side_effect=Exception("RAG unavailable")):
        result = _enrich_query_with_rag("quadratic equations", "General Mathematics")
    assert "quadratic equations" in result
    assert "General Mathematics" in result
    assert "DepEd Philippines mathematics" in result


def test_get_cache_key():
    from services.youtube_service import _get_cache_key
    key1 = _get_cache_key("quadratic equations", "General Mathematics", "Grade 11")
    key2 = _get_cache_key("quadratic equations", "General Mathematics", "Grade 11")
    key3 = _get_cache_key("linear equations", "General Mathematics", "Grade 11")
    assert key1 == key2
    assert key1 != key3
    assert len(key1) == 32


def test_cache_and_retrieve(mock_youtube_api_key, monkeypatch):
    from services.youtube_service import cache_videos, get_cached_videos

    lesson_id = "test-lesson-123"
    videos = [
        {"videoId": "abc123", "title": "Test Video", "channelTitle": "Test Channel",
         "thumbnailUrl": "http://example.com/thumb.jpg", "durationSeconds": 300}
    ]

    # Mock Firebase at the module level where it's imported inside functions
    mock_doc = MagicMock()
    mock_doc.get.return_value.exists = False
    mock_db = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_doc

    with patch("firebase_admin.firestore.client", return_value=mock_db):
        with patch("firebase_admin._apps", {"default": MagicMock()}):
            # Store should call set
            cache_videos(lesson_id, videos, "quadratic equations")
            mock_doc.set.assert_called_once()

            # Retrieve should return None since we mock doc.exists = False
            result = get_cached_videos(lesson_id)
            assert result is None


def test_search_youtube_videos_no_api_key(no_youtube_api_key):
    from services.youtube_service import search_youtube_videos
    result = search_youtube_videos("quadratic equations")
    assert result == []


# ─── Route Tests ────────────────────────────────────────────────

def test_video_search_endpoint_no_api_key(no_youtube_api_key):
    """Should return 503 when YouTube API key is not configured."""
    response = client.post("/api/lessons/videos/search", json={
        "topic": "quadratic equations",
        "subject": "General Mathematics",
        "grade_level": "Grade 11",
    })
    assert response.status_code == 503
    data = response.json()
    assert data["detail"]["error"] == "youtube_api_not_configured"


def test_video_search_endpoint_success(mock_youtube_api_key):
    """Should return video results when search succeeds."""
    mock_videos = [
        {"videoId": "vid1", "title": "Video 1", "channelTitle": "Channel 1",
         "thumbnailUrl": "http://example.com/1.jpg", "durationSeconds": 300},
        {"videoId": "vid2", "title": "Video 2", "channelTitle": "Channel 2",
         "thumbnailUrl": "http://example.com/2.jpg", "durationSeconds": 450},
    ]

    with patch("routes.video_routes.YOUTUBE_API_KEY", "test_key"):
        with patch("routes.video_routes.get_video_search_results") as mock_search:
            mock_search.return_value = {"videos": mock_videos, "cached": False}
            response = client.post("/api/lessons/videos/search", json={
                "topic": "quadratic equations",
                "subject": "General Mathematics",
                "grade_level": "Grade 11",
                "lesson_id": "lesson-123",
            })

    assert response.status_code == 200
    data = response.json()
    assert len(data["videos"]) == 2
    assert data["cached"] is False
    assert data["videos"][0]["videoId"] == "vid1"


def test_video_search_endpoint_empty_results(mock_youtube_api_key):
    """Should return empty list when no videos found."""
    with patch("routes.video_routes.YOUTUBE_API_KEY", "test_key"):
        with patch("routes.video_routes.get_video_search_results") as mock_search:
            mock_search.return_value = {"videos": [], "cached": False}
            response = client.post("/api/lessons/videos/search", json={
                "topic": "very obscure topic xyz123",
                "subject": "General Mathematics",
            })

    assert response.status_code == 200
    data = response.json()
    assert data["videos"] == []
    assert data["cached"] is False


def test_video_search_endpoint_cached(mock_youtube_api_key):
    """Should return cached results."""
    mock_videos = [
        {"videoId": "vid1", "title": "Cached Video", "channelTitle": "Channel 1",
         "thumbnailUrl": "http://example.com/1.jpg", "durationSeconds": 300},
    ]

    with patch("routes.video_routes.YOUTUBE_API_KEY", "test_key"):
        with patch("routes.video_routes.get_video_search_results") as mock_search:
            mock_search.return_value = {"videos": mock_videos, "cached": True}
            response = client.post("/api/lessons/videos/search", json={
                "topic": "linear equations",
                "lesson_id": "lesson-456",
            })

    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert len(data["videos"]) == 1


def test_video_search_endpoint_validation_error(mock_youtube_api_key):
    """Should return 422 when topic is missing or too long."""
    with patch("routes.video_routes.YOUTUBE_API_KEY", "test_key"):
        response = client.post("/api/lessons/videos/search", json={
            "topic": "",
            "subject": "General Mathematics",
        })
    assert response.status_code == 422

    with patch("routes.video_routes.YOUTUBE_API_KEY", "test_key"):
        response = client.post("/api/lessons/videos/search", json={
            "topic": "x" * 201,
            "subject": "General Mathematics",
        })
    assert response.status_code == 422
