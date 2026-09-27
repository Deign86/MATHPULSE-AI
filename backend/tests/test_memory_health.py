"""Regression test for issue #161: /api/memory/health 500 NameError.

check_memory_health() used bare `firebase_admin` / `firestore` names and
missed `import time`, crashing with NameError instead of returning a
health payload. It must never raise NameError.
"""
from backend.services.memory_service import check_memory_health


def test_check_memory_health_never_raises_nameerror():
    result = check_memory_health("health_check_regression_probe")
    assert "NameError" not in str(result)
    assert set(result) >= {
        "firestore_available",
        "profile_writable",
        "active_state_writable",
        "session_summary_writable",
    }
