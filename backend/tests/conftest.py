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
    """Return fake Firebase claims dict for tokens with 'mock_token_' or 'test-' prefix."""
    if token and (token.startswith("mock_token_") or token.startswith("test-")):
        uid = token.replace("mock_token_", "").replace("test-", "")
        if uid in {"teacher", "auth-token"}:
            uid = "test-teacher-uid"
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


def _install_main_auth_wrapper() -> None:
    """Keep token identity deterministic without overriding test-specific mocks.

    Some test modules replace ``main.firebase_auth`` with a MagicMock whose
    verifier always returns one teacher.  Wrapping that verifier preserves its
    intentional behavior for ordinary test tokens while ensuring the shared
    ``mock_token_<uid>`` convention remains order-independent.
    """
    main_module = sys.modules.get("main")
    firebase_auth = getattr(main_module, "firebase_auth", None)
    verifier = getattr(firebase_auth, "verify_id_token", None)
    if firebase_auth is None or verifier is None or getattr(verifier, "_mathpulse_test_wrapper", False) is True:
        return

    def _verify_for_test(token: str, *, check_revoked: bool = False) -> dict:
        if token and (token.startswith("mock_token_") or token.startswith("test-")):
            return _mock_verify_id_token(token, check_revoked=check_revoked)
        return verifier(token, check_revoked=check_revoked)

    _verify_for_test._mathpulse_test_wrapper = True
    firebase_auth.verify_id_token = _verify_for_test


@pytest.fixture(autouse=True)
def _mock_firebase_auth():
    """Re-apply Firebase auth mock before every test without leaking state."""
    main_module = sys.modules.get("main")
    original_firestore = getattr(main_module, "firebase_firestore", None)
    try:
        import firebase_admin
        import firebase_admin.auth

        current = firebase_admin.auth.verify_id_token
        if not getattr(current, "_is_mocked", False):
            firebase_admin.auth.verify_id_token = _mock_verify_id_token
            firebase_admin.auth.verify_id_token._is_mocked = True
        _install_main_auth_wrapper()
    except Exception:
        pass
    yield
    if main_module is not None:
        main_module.firebase_firestore = original_firestore
