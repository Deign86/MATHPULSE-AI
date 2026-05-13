"""pytest conftest: force backend/ to sys.path[0] and prevent stale services shadow.

Project root has stale services/ dir (with __init__.py) that shadows
backend/services/ and lacks several service modules needed by routes/tests.

This conftest:
1. Ensures backend/ is at sys.path[0]
2. Evicts any stale 'services' package from sys.modules so subsequent
   imports resolve to backend/services/ instead of the project-root copy.
3. Re-evicts before every test function via autouse fixture (some test
   files re-import stale services during collection, polluting others).
"""

import sys
import os

import pytest

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
