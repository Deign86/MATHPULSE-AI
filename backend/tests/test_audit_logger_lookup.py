"""_get_audit_logger() returned None, so every access audit event raised 'NoneType' object is not callable."""
import inspect
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main
from services.audit_logger import log_audit_event


def test_audit_logger_lookup_returns_the_event_writer() -> None:
    assert main._get_audit_logger() is log_audit_event
    assert inspect.iscoroutinefunction(main._get_audit_logger())
