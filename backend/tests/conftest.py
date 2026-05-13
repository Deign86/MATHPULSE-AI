"""pytest conftest: force backend/ to sys.path[0].

Project root has services/ dir that shadows backend/services/ and
lacks curriculum_service.py.  pytest puts rootdir parent on
sys.path[0], so we must force backend/ to position 0.
"""

import sys
import os

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
while _backend_dir in sys.path:
    sys.path.remove(_backend_dir)
sys.path.insert(0, _backend_dir)

print(f"  [conftest] sys.path[0]={sys.path[0]}", file=sys.stderr)
# Check if services is already cached from wrong location
if 'services' in sys.modules:
    svc = sys.modules['services']
    print(f"  [conftest] services ALREADY in sys.modules!", file=sys.stderr)
    print(f"  [conftest] services.__file__={getattr(svc, '__file__', 'N/A')}", file=sys.stderr)
    print(f"  [conftest] services.__path__={list(getattr(svc, '__path__', []))}", file=sys.stderr)
else:
    print(f"  [conftest] services NOT yet loaded", file=sys.stderr)
