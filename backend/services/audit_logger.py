import logging
import traceback
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from firebase_admin import firestore

logger = logging.getLogger("audit_logger")

async def log_audit_event(
    action: str,
    actor_uid: str,
    actor_name: str,
    actor_email: str,
    actor_role: str,
    description: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    route: Optional[str] = None,
    module: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    success: bool = True,
) -> None:
    """
    Log an audit event to the accessAuditLogs collection.
    Fails safely - will not crash the app if logging fails.
    """
    try:
        # Sanitize metadata to remove potential secrets
        safe_metadata = {}
        if metadata:
            for k, v in metadata.items():
                if "password" in k.lower() or "token" in k.lower() or "secret" in k.lower():
                    safe_metadata[k] = "[REDACTED]"
                else:
                    safe_metadata[k] = v

        db = firestore.client()
        
        log_entry = {
            "timestamp": firestore.SERVER_TIMESTAMP,
            "action": action,
            "actorUid": actor_uid,
            "actorName": actor_name,
            "actorEmail": actor_email,
            "actorRole": actor_role,
            "description": description,
            "success": success,
        }

        if target_type is not None:
            log_entry["targetType"] = target_type
        if target_id is not None:
            log_entry["targetId"] = target_id
        if target_name is not None:
            log_entry["targetName"] = target_name
        if route is not None:
            log_entry["route"] = route
        if module is not None:
            log_entry["module"] = module
        if safe_metadata:
            log_entry["metadata"] = safe_metadata

        db.collection("accessAuditLogs").add(log_entry)
        
    except Exception as e:
        logger.error(f"Failed to write audit log ({action}): {str(e)}")
        # We catch and log, but do not raise, so the main app flow continues
