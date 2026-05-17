"""pytest conftest: force backend/ to sys.path[0] and prevent stale services shadow.

Project root has stale services/ dir (with __init__.py) that shadows
backend/services/ and lacks several service modules needed by routes/tests.

This conftest:
1. Ensures backend/ is at sys.path[0]
2. Evicts any stale 'services' package from sys.modules so subsequent
   imports resolve to backend/services/ instead of the project-root copy.
3. Mocks Firebase Admin auth so test tokens (Bearer mock_token_<uid>)
   work without real Firebase credentials.
"""

import sys
import os

import pytest

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
    """Return fake Firebase claims dict for tokens with 'mock_token_' prefix."""
    if token and token.startswith("mock_token_"):
        uid = token[len("mock_token_"):]
        return {
            "uid": uid,
            "sub": uid,
            "email": f"{uid}@test.mathpulse.ai",
            "email_verified": True,
            "role": "student",
        }
    # Non-mock tokens: call the real Firebase implementation
    real_verify = _get_mock_verify()
    return real_verify(token, check_revoked=check_revoked)


def _apply_firebase_mock():
    """Apply the mock to firebase_admin.auth.verify_id_token (idempotent)."""
    try:
        import firebase_admin.auth

        current = firebase_admin.auth.verify_id_token
        if not hasattr(current, "_mathpulse_mock"):
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

# 2. Evict stale 'services' package from import cache.
#    The project root services/ has __init__.py making it a regular package,
#    and it shadows backend/services/ in sys.path resolution.
_keys_to_evict = [k for k in sys.modules if k == "services" or k.startswith("services.")]
for k in _keys_to_evict:
    del sys.modules[k]


def _evict_stale_services():
    """Remove stale 'services' entry from sys.modules if it exists."""
    for k in list(sys.modules.keys()):
        if k == "services" or k.startswith("services."):
            # Only evict if it's NOT the backend/services/* version
            mod = sys.modules[k]
            mod_file = getattr(mod, "__file__", "") or ""
            if _backend_dir in mod_file:
                continue  # keep backend/services/* entries
            del sys.modules[k]


@pytest.fixture(autouse=True)
def _auto_evict_stale_services():
    """Re-evict stale services before every test to prevent cross-file pollution."""
    _evict_stale_services()
    yield


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
