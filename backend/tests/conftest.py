"""pytest conftest: force backend/ to sys.path[0] and mock Firebase Admin auth.

This conftest:
1. Ensures backend/ is at sys.path[0] so `services.*` resolves to backend/services/.
2. Mocks Firebase Admin auth so test tokens (Bearer mock_token_<uid>)
   work without real Firebase credentials.
3. Keeps tests off the live Claude API.
"""

import sys
import os
from types import SimpleNamespace

import pytest

# services.ai_client loads .env.local without overriding variables that are already set. A variable pinned here, even
# to "", therefore beats a developer's .env.local; one that is merely unset would be refilled from it.
# A test that forgets to mock a Claude call must fail instead of spending real credits. This base URL has no HTTP
# scheme, so the SDK raises APIConnectionError at once; a refused localhost connect also fails, but takes ~2 s on
# Windows.
os.environ["ANTHROPIC_API_KEY"] = "test-anthropic-key"
os.environ["ANTHROPIC_BASE_URL"] = "unmocked-claude-call://blocked"
os.environ["ANTHROPIC_WORKSPACE_ID"] = ""
os.environ["CLAUDE_CHAT_MODEL"] = ""
os.environ["CLAUDE_REASONER_MODEL"] = ""
os.environ["MODEL_PROFILE"] = ""
os.environ["AI_ENABLED"] = "true"
# A non-default id in any of these would redirect or flatten the tasks the routing tests resolve.
for _routing_variable in (
    "INFERENCE_MODEL_ID",
    "INFERENCE_CHAT_MODEL_ID",
    "INFERENCE_CHAT_MODEL_TEMP_OVERRIDE",
    "INFERENCE_LOCK_MODEL_ID",
    "INFERENCE_ENFORCE_LOCK_MODEL",
    "INFERENCE_FALLBACK_MODELS",
    "HF_QUIZ_MODEL_ID",
    "HF_RAG_MODEL_ID",
):
    os.environ[_routing_variable] = ""

# ─── Firebase Auth Mock ────────────────────────────────────────────────────────
# Intercept firebase_admin.auth.verify_id_token so that test tokens like
# "Bearer mock_token_<uid>" work without real Firebase credentials.
# The mock extracts the uid from the token string (e.g. "mock_token_abc" → uid="abc").
# Non-mock tokens fall through to the real Firebase implementation.

_mock_orig_verify = None  # Lazily resolved


def _get_mock_verify():
    """Return the real verify_id_token, lazily resolved."""
    global _mock_orig_verify
    if _mock_orig_verify is None:
        import firebase_admin.auth as fa_auth

        _mock_orig_verify = getattr(fa_auth, "verify_id_token", None) or (lambda t, **k: {}.get("uid"))
    return _mock_orig_verify


def _mock_verify_id_token(token: str, *, check_revoked: bool = False) -> dict:
    """Return fake Firebase claims dict for tokens with 'mock_token_' or 'test-' prefix."""
    if token and (token.startswith("mock_token_") or token.startswith("test-")):
        uid = token.replace("mock_token_", "").replace("test-", "")
        role = "teacher" if ("teacher" in token or "auth" in token) else "student"
        return {
            "uid": uid or "test-user-id",
            "sub": uid or "test-user-id",
            "email": f"{uid or 'test'}@test.mathpulse.ai",
            "email_verified": True,
            "role": role,
        }
    # Non-mock tokens: call the real Firebase implementation
    real_verify = _get_mock_verify()
    if real_verify is not None and real_verify is not _mock_verify_id_token:
        return real_verify(token, check_revoked=check_revoked)
    return {
        "uid": "test-user-id",
        "sub": "test-user-id",
        "email": "test@test.mathpulse.ai",
        "email_verified": True,
        "role": "student",
    }


def _apply_firebase_mock():
    """Apply the mock to firebase_admin.auth.verify_id_token (idempotent)."""
    try:
        import firebase_admin.auth
        global _mock_orig_verify

        current = firebase_admin.auth.verify_id_token
        if not hasattr(current, "_mathpulse_mock"):
            _mock_orig_verify = current
            firebase_admin.auth.verify_id_token = _mock_verify_id_token
            firebase_admin.auth.verify_id_token._mathpulse_mock = True
    except Exception:
        pass


# Apply immediately at conftest load time (covers tests that import main.py
# before any test runs, e.g. via module-level TestClient instantiation).
_apply_firebase_mock()


_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Force backend/ to sys.path[0]
while _backend_dir in sys.path:
    sys.path.remove(_backend_dir)
sys.path.insert(0, _backend_dir)

@pytest.fixture(autouse=True)
def _mock_firebase_auth():
    """Re-apply Firebase auth mock before every test.

    Some test files import main.py after conftest.py is loaded, which may
    overwrite the firebase_admin.auth.verify_id_token reference. This fixture
    ensures the mock is always active when tests run.
    """
    try:
        import firebase_admin
        import firebase_admin.auth

        # Only re-apply if not already our mock (avoid infinite recursion)
        current = firebase_admin.auth.verify_id_token
        if not getattr(current, "_is_mocked", False):
            firebase_admin.auth.verify_id_token = _mock_verify_id_token
            firebase_admin.auth.verify_id_token._is_mocked = True
    except Exception:
        pass
    yield


@pytest.fixture
def isolated_mock_student_auth(monkeypatch):
    """Give authorization regression tests stable, request-specific Firebase roles."""
    import main as main_module

    def verify_id_token(token: str) -> dict:
        token_uid = token.removeprefix("mock_token_")
        role = "teacher" if "teacher" in token or "auth" in token else "student"
        return {
            "uid": token_uid or "test-user-id",
            "sub": token_uid or "test-user-id",
            "email": f"{token_uid or 'test'}@test.mathpulse.ai",
            "role": role,
        }

    monkeypatch.setattr(main_module, "_firebase_ready", True)
    monkeypatch.setattr(main_module, "_init_firebase_admin", lambda: None)
    monkeypatch.setattr(main_module, "firebase_auth", SimpleNamespace(verify_id_token=verify_id_token))
