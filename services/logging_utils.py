import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def configure_structured_logging(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


def _safe_json(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=True, default=str)


def log_model_call(
    logger: logging.Logger,
    *,
    provider: str,
    model: str,
    endpoint: str,
    latency_ms: float,
    input_tokens: Optional[int],
    output_tokens: Optional[int],
    status: str,
    error_class: Optional[str] = None,
    error_message: Optional[str] = None,
    task_type: Optional[str] = None,
    request_tag: Optional[str] = None,
    retry_attempt: Optional[int] = None,
    fallback_depth: Optional[int] = None,
    route: Optional[str] = None,
) -> None:
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": "model_call",
        "provider": provider,
        "model": model,
        "endpoint": endpoint,
        "latency_ms": round(latency_ms, 2),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "status": status,
        "error_class": error_class,
        "error_message": error_message,
        "task_type": task_type,
        "request_tag": request_tag,
        "retry_attempt": retry_attempt,
        "fallback_depth": fallback_depth,
        "route": route,
    }
    if status == "ok":
        logger.info(_safe_json(payload))
    else:
        logger.error(_safe_json(payload))


def log_job_metric(
    logger: logging.Logger,
    *,
    job_name: str,
    run_id: str,
    metric_name: str,
    metric_value: Any,
    extras: Optional[Dict[str, Any]] = None,
) -> None:
    payload: Dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": "job_metric",
        "job_name": job_name,
        "run_id": run_id,
        "metric_name": metric_name,
        "metric_value": metric_value,
    }
    if extras:
        payload.update(extras)
    logger.info(_safe_json(payload))
