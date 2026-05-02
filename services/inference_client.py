import os
import time
import json
import re
import random
from threading import Lock
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
import yaml
from openai import OpenAI, APIError, RateLimitError, APITimeoutError

from .ai_client import get_deepseek_client, CHAT_MODEL, REASONER_MODEL, DEEPSEEK_BASE_URL
from .logging_utils import configure_structured_logging, log_model_call

LOGGER = configure_structured_logging("mathpulse.inference")
TEMP_CHAT_MODEL_OVERRIDE_ENV = "INFERENCE_CHAT_MODEL_TEMP_OVERRIDE"

# ── Model Profiles ────────────────────────────────────────────────────────────
# A profile sets multiple env defaults in one shot.
# Individual env vars (DEEPSEEK_MODEL, DEEPSEEK_REASONER_MODEL, etc.) still override.
# Usage: MODEL_PROFILE=dev  or  MODEL_PROFILE=prod  or  MODEL_PROFILE=budget
# Profiles can also be applied at runtime via the admin panel without restart.

_MODEL_PROFILES: dict[str, dict[str, str]] = {
    "dev": {
        "INFERENCE_MODEL_ID": CHAT_MODEL,
        "INFERENCE_CHAT_MODEL_ID": CHAT_MODEL,
        "HF_QUIZ_MODEL_ID": CHAT_MODEL,
        "HF_RAG_MODEL_ID": CHAT_MODEL,
        "INFERENCE_LOCK_MODEL_ID": CHAT_MODEL,
    },
    "prod": {
        "INFERENCE_MODEL_ID": CHAT_MODEL,
        "INFERENCE_CHAT_MODEL_ID": CHAT_MODEL,
        "HF_QUIZ_MODEL_ID": CHAT_MODEL,
        "HF_RAG_MODEL_ID": REASONER_MODEL,
        "INFERENCE_LOCK_MODEL_ID": CHAT_MODEL,
    },
    "budget": {
        "INFERENCE_MODEL_ID": CHAT_MODEL,
        "INFERENCE_CHAT_MODEL_ID": CHAT_MODEL,
        "HF_QUIZ_MODEL_ID": CHAT_MODEL,
        "HF_RAG_MODEL_ID": CHAT_MODEL,
        "INFERENCE_LOCK_MODEL_ID": CHAT_MODEL,
    },
}

# ── Runtime Override Store ────────────────────────────────────────────────────
# Mutated at runtime by the admin panel via /api/admin/model-config.
# Priority: above env vars, below INFERENCE_ENFORCE_LOCK_MODEL.
# Persisted to Firestore so backend cold-restarts restore the last admin-set config.

_RUNTIME_OVERRIDES: dict[str, str] = {}
_RUNTIME_PROFILE: str = ""

_FS_COLLECTION = "system_config"
_FS_DOC = "active_model_config"


def _save_runtime_config_to_firestore() -> None:
    try:
        from firebase_admin import firestore as fs

        db = fs.client()
        db.collection(_FS_COLLECTION).document(_FS_DOC).set(
            {
                "profile": _RUNTIME_PROFILE,
                "overrides": _RUNTIME_OVERRIDES,
                "updatedAt": fs.SERVER_TIMESTAMP,
            }
        )
    except Exception as e:
        LOGGER.warning("Could not persist model config to Firestore: %s", e)


def _load_runtime_config_from_firestore() -> None:
    try:
        from firebase_admin import firestore as fs

        db = fs.client()
        doc = db.collection(_FS_COLLECTION).document(_FS_DOC).get()
        if not doc.exists:
            return
        data = doc.to_dict() or {}
        profile = str(data.get("profile", "")).strip().lower()
        overrides = data.get("overrides", {})
        if profile and profile in _MODEL_PROFILES:
            global _RUNTIME_PROFILE
            _RUNTIME_PROFILE = profile
            _RUNTIME_OVERRIDES.clear()
            _RUNTIME_OVERRIDES.update(_MODEL_PROFILES[profile])
        if isinstance(overrides, dict):
            for key, value in overrides.items():
                _RUNTIME_OVERRIDES[str(key)] = str(value)
        LOGGER.info("Restored runtime model config from Firestore: profile=%s", profile)
    except ImportError:
        LOGGER.debug("Firebase not available (optional for DeepSeek-only)")
    except Exception as e:
        LOGGER.warning("Could not restore model config from Firestore: %s", e)


def _apply_model_profile() -> None:
    profile_name = os.getenv("MODEL_PROFILE", "").strip().lower()
    if not profile_name:
        return
    profile = _MODEL_PROFILES.get(profile_name)
    if profile is None:
        LOGGER.warning("MODEL_PROFILE='%s' is not a known profile.", profile_name)
        return
    for key, value in profile.items():
        if not os.environ.get(key):
            os.environ[key] = value
    LOGGER.info("Startup model profile applied: %s", profile_name)


_apply_model_profile()
_load_runtime_config_from_firestore()


def set_runtime_model_profile(profile_name: str) -> None:
    """Apply a named profile at runtime without restarting the process."""
    global _RUNTIME_PROFILE, _RUNTIME_OVERRIDES
    normalized = profile_name.strip().lower()
    profile = _MODEL_PROFILES.get(normalized)
    if not profile:
        raise ValueError(
            f"Unknown profile: '{profile_name}'. Valid values: {list(_MODEL_PROFILES.keys())}"
        )
    _RUNTIME_PROFILE = normalized
    _RUNTIME_OVERRIDES.clear()
    _RUNTIME_OVERRIDES.update(profile)
    LOGGER.info("Runtime model profile switched to: %s", profile_name)
    _save_runtime_config_to_firestore()


def set_runtime_model_override(key: str, value: str) -> None:
    """Set a single model env key at runtime."""
    _RUNTIME_OVERRIDES[key] = value
    LOGGER.info("Runtime model override set: %s = %s", key, value)
    _save_runtime_config_to_firestore()


def reset_runtime_overrides() -> None:
    """Clear all runtime overrides."""
    global _RUNTIME_PROFILE
    _RUNTIME_OVERRIDES.clear()
    _RUNTIME_PROFILE = ""
    LOGGER.info("Runtime model overrides cleared.")
    _save_runtime_config_to_firestore()


def get_current_runtime_config() -> dict:
    resolved: dict[str, str] = {}
    for key in {
        "INFERENCE_MODEL_ID", "INFERENCE_CHAT_MODEL_ID",
        "HF_QUIZ_MODEL_ID", "HF_RAG_MODEL_ID", "INFERENCE_LOCK_MODEL_ID",
    }:
        resolved[key] = _resolve_key(key)
    return {
        "profile": _RUNTIME_PROFILE,
        "overrides": dict(_RUNTIME_OVERRIDES),
        "resolved": resolved,
    }


def _resolve_key(key: str) -> str:
    if value := _RUNTIME_OVERRIDES.get(key):
        return value
    if _RUNTIME_PROFILE and _RUNTIME_PROFILE in _MODEL_PROFILES:
        if value := _MODEL_PROFILES[_RUNTIME_PROFILE].get(key):
            return value
    return os.getenv(key, "")


def get_model_for_task(task_type: str) -> str:
    task = (task_type or "default").strip().lower()
    enforce_lock = os.getenv("INFERENCE_ENFORCE_LOCK_MODEL", "true").strip().lower() in {"1", "true", "yes", "on"}
    if enforce_lock:
        override = (
            _RUNTIME_OVERRIDES.get("INFERENCE_LOCK_MODEL_ID")
            or os.getenv("INFERENCE_LOCK_MODEL_ID")
            or CHAT_MODEL
        )
        return override
    task_key_map = {
        "chat": "INFERENCE_CHAT_MODEL_ID",
        "quiz_generation": "HF_QUIZ_MODEL_ID",
        "rag_lesson": "HF_RAG_MODEL_ID",
        "rag_problem": "HF_RAG_MODEL_ID",
        "rag_analysis_context": "HF_RAG_MODEL_ID",
    }
    if env_key := task_key_map.get(task):
        if resolved := _resolve_key(env_key):
            return resolved
    return _resolve_key("INFERENCE_MODEL_ID") or CHAT_MODEL


def model_supports_thinking(model_id: str = "") -> bool:
    mid = (model_id or os.getenv("INFERENCE_MODEL_ID") or "").strip()
    return mid == REASONER_MODEL


def _normalize_local_space_url(raw_url: str) -> str:
    """Accept either hf.space host or huggingface.co/spaces URL for local_space provider."""
    cleaned = (raw_url or "").strip().rstrip("/")
    if not cleaned:
        return "http://127.0.0.1:7860"

    match = re.match(r"^https?://huggingface\.co/spaces/([^/]+)/([^/]+)$", cleaned, re.IGNORECASE)
    if match:
        owner = match.group(1).strip().lower()
        space = match.group(2).strip().lower()
        return f"https://{owner}-{space}.hf.space"

    return cleaned


@dataclass
class InferenceRequest:
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    task_type: str = "default"
    request_tag: str = ""
    max_new_tokens: int = 900
    temperature: float = 0.2
    top_p: float = 0.9
    repetition_penalty: float = 1.15
    timeout_sec: Optional[int] = None
    enable_thinking: bool = False


class InferenceClient:
    def __init__(self, firestore_client: Optional[Any] = None) -> None:
        self.firestore = firestore_client
        self._last_persist_time = 0.0
        self._persist_throttle_sec = 30.0

        config_paths = [
            Path("./config/models.yaml"),
            Path("/config/models.yaml"),
            Path("/app/config/models.yaml"),
            Path.cwd() / "config" / "models.yaml",
            Path(__file__).resolve().parents[2] / "config" / "models.yaml",
        ]

        config: Dict[str, object] = {}
        config_path = None

        for path in config_paths:
            if path.exists():
                config_path = path
                with path.open("r", encoding="utf-8") as fh:
                    config = yaml.safe_load(fh) or {}
                LOGGER.info(f"??? Loaded config from {config_path}")
                break

        if not config_path:
            LOGGER.warning(f"??????  Config file not found. Checked: {[str(p) for p in config_paths]}")
            LOGGER.warning(f"    CWD: {Path.cwd()}")
            LOGGER.warning(f"    Using hardcoded defaults")

        primary: Dict[str, object] = {}
        if isinstance(config, dict):
            models_cfg = config.get("models", {})
            if isinstance(models_cfg, dict):
                primary_cfg = models_cfg.get("primary", {})
                if isinstance(primary_cfg, dict):
                    primary = primary_cfg

        self.provider = "deepseek"
        self.ds_api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.ds_base_url = os.getenv("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL)
        self.ds_chat_model = os.getenv("DEEPSEEK_MODEL", CHAT_MODEL)
        self.ds_reasoner_model = os.getenv("DEEPSEEK_REASONER_MODEL", REASONER_MODEL)

        self.local_space_url = _normalize_local_space_url(
            os.getenv("INFERENCE_LOCAL_SPACE_URL", "http://127.0.0.1:7860")
        )
        self.local_generate_path = os.getenv("INFERENCE_LOCAL_SPACE_GENERATE_PATH", "/gradio_api/call/generate")

        self.enforce_lock_model = os.getenv("INFERENCE_ENFORCE_LOCK_MODEL", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.lock_model_id = os.getenv("INFERENCE_LOCK_MODEL_ID", CHAT_MODEL).strip() or CHAT_MODEL

        default_model_fallback = str(primary.get("id") or CHAT_MODEL)
        env_model_id = os.getenv("INFERENCE_MODEL_ID", "").strip()
        self.default_model = env_model_id or default_model_fallback

        default_max_tokens = str(primary.get("max_new_tokens") or 512)
        self.default_max_new_tokens = int(os.getenv("INFERENCE_MAX_NEW_TOKENS", default_max_tokens))

        default_temp = str(primary.get("temperature") or 0.2)
        self.default_temperature = float(os.getenv("INFERENCE_TEMPERATURE", default_temp))

        default_top_p = str(primary.get("top_p") or 0.9)
        self.default_top_p = float(os.getenv("INFERENCE_TOP_P", default_top_p))

        self.chat_model_override = os.getenv("INFERENCE_CHAT_MODEL_ID", "").strip()
        self.chat_model_temp_override = os.getenv(TEMP_CHAT_MODEL_OVERRIDE_ENV, "").strip()
        self.chat_strict_model_only = os.getenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true").strip().lower() in {"1", "true", "yes", "on"}

        self.ds_timeout_sec = int(os.getenv("INFERENCE_HF_TIMEOUT_SEC", "90"))
        self.local_timeout_sec = int(os.getenv("INFERENCE_LOCAL_SPACE_TIMEOUT_SEC", "90"))
        self.max_retries = int(os.getenv("INFERENCE_MAX_RETRIES", "3"))
        self.backoff_sec = float(os.getenv("INFERENCE_BACKOFF_SEC", "1.5"))
        self.interactive_timeout_sec = int(os.getenv("INFERENCE_INTERACTIVE_TIMEOUT_SEC", str(self.ds_timeout_sec)))
        self.background_timeout_sec = int(os.getenv("INFERENCE_BACKGROUND_TIMEOUT_SEC", str(self.ds_timeout_sec)))
        self.interactive_max_retries = int(os.getenv("INFERENCE_INTERACTIVE_MAX_RETRIES", str(self.max_retries)))
        self.background_max_retries = int(os.getenv("INFERENCE_BACKGROUND_MAX_RETRIES", str(self.max_retries)))
        self.interactive_backoff_sec = float(os.getenv("INFERENCE_INTERACTIVE_BACKOFF_SEC", str(self.backoff_sec)))
        self.background_backoff_sec = float(os.getenv("INFERENCE_BACKGROUND_BACKOFF_SEC", str(self.backoff_sec)))

        fallback_raw = os.getenv("INFERENCE_FALLBACK_MODELS", "")
        self.fallback_models = [v.strip() for v in fallback_raw.split(",") if v.strip()]

        gpu_tasks_raw = os.getenv(
            "INFERENCE_GPU_REQUIRED_TASKS",
            "chat,quiz_generation,lesson_generation,learning_path,verify_solution,variant_generation,eval_generation",
        )
        self.gpu_required_tasks = {v.strip().lower() for v in gpu_tasks_raw.split(",") if v.strip()}

        cpu_tasks_raw = os.getenv(
            "INFERENCE_CPU_ONLY_TASKS",
            "risk_classification,analytics_aggregation,file_parsing,auth,default_cpu",
        )
        self.cpu_only_tasks = {v.strip().lower() for v in cpu_tasks_raw.split(",") if v.strip()}

        interactive_tasks_raw = os.getenv(
            "INFERENCE_INTERACTIVE_TASKS",
            "chat,verify_solution,daily_insight",
        )
        self.interactive_tasks = {v.strip().lower() for v in interactive_tasks_raw.split(",") if v.strip()}
        self.interactive_max_fallback_depth = max(
            0,
            int(os.getenv("INFERENCE_INTERACTIVE_MAX_FALLBACK_DEPTH", "1")),
        )

        # Default task-to-model routing.
        self.task_model_map: Dict[str, str] = {
            "chat": CHAT_MODEL,
            "verify_solution": CHAT_MODEL,
            "lesson_generation": CHAT_MODEL,
            "quiz_generation": CHAT_MODEL,
            "learning_path": CHAT_MODEL,
            "daily_insight": CHAT_MODEL,
            "risk_classification": CHAT_MODEL,
            "risk_narrative": CHAT_MODEL,
        }
        self.task_fallback_model_map: Dict[str, List[str]] = {
            "chat": [CHAT_MODEL],
            "verify_solution": [CHAT_MODEL],
        }
        self.model_provider_map: Dict[str, str] = {}
        self.task_provider_map: Dict[str, str] = {}
        if isinstance(config, dict):
            routing_cfg = config.get("routing", {})
            if isinstance(routing_cfg, dict):
                task_models = routing_cfg.get("task_model_map", {})
                if isinstance(task_models, dict):
                    config_task_models = {
                        str(task).strip().lower(): str(model).strip()
                        for task, model in task_models.items()
                        if str(task).strip() and str(model).strip()
                    }
                    self.task_model_map.update(config_task_models)
                task_fallback_models = routing_cfg.get("task_fallback_model_map", {})
                if isinstance(task_fallback_models, dict):
                    parsed: Dict[str, List[str]] = {}
                    for task, models in task_fallback_models.items():
                        task_key = str(task).strip().lower()
                        if not task_key:
                            continue
                        if isinstance(models, list):
                            cleaned = [str(m).strip() for m in models if str(m).strip()]
                            if cleaned:
                                parsed[task_key] = cleaned
                        elif isinstance(models, str):
                            cleaned = [v.strip() for v in models.split(",") if v.strip()]
                            if cleaned:
                                parsed[task_key] = cleaned
                    self.task_fallback_model_map = parsed
                task_providers = routing_cfg.get("task_provider_map", {})
                if isinstance(task_providers, dict):
                    self.task_provider_map = {
                        str(task).strip().lower(): str(provider).strip().lower()
                        for task, provider in task_providers.items()
                        if str(task).strip() and str(provider).strip()
                    }

        # Override all task model mappings with INFERENCE_MODEL_ID env var if set.
        if env_model_id:
            original_map = dict(self.task_model_map)
            for task_key in list(self.task_model_map.keys()):
                self.task_model_map[task_key] = env_model_id
            LOGGER.info(
                f"???? INFERENCE_MODEL_ID env var override applied: {env_model_id}"
            )
            LOGGER.info(
                f"   Task model mappings changed from: {original_map}"
            )
            env_override_note = " (env override active)"
        else:
            env_override_note = ""

        if self.enforce_lock_model:
            lock_map_before = dict(self.task_model_map)
            self.default_model = self.lock_model_id
            for task_key in list(self.task_model_map.keys()):
                self.task_model_map[task_key] = self.lock_model_id
            self.fallback_models = []
            self.task_fallback_model_map = {
                task_key: [] for task_key in self.task_model_map.keys()
            }
            LOGGER.info(f"???? INFERENCE_ENFORCE_LOCK_MODEL enabled: locking all inference tasks to {self.lock_model_id}")
            LOGGER.info(f"   Cleared fallback models")
            LOGGER.info(f"   Task model mappings forced from: {lock_map_before}")

        config_status = "from file" if config_path else "hardcoded defaults (no config file found)"
        effective_chat_model_for_logs = self.chat_model_override or self.task_model_map.get("chat", self.default_model)
        LOGGER.info(f"??? InferenceClient initialized {config_status}{env_override_note}")
        LOGGER.info(f"   Default model: {self.default_model}")
        LOGGER.info(f"   Chat model: {effective_chat_model_for_logs}")
        LOGGER.info(f"   Chat temp override ({TEMP_CHAT_MODEL_OVERRIDE_ENV}): {self.chat_model_temp_override or 'disabled'}")
        LOGGER.info(f"   Chat strict model lock: {self.chat_strict_model_only}")
        LOGGER.info(f"   Global model lock: {self.enforce_lock_model}")
        LOGGER.info(f"   Verify solution model: {self.task_model_map.get('verify_solution', self.default_model)}")
        LOGGER.info(f"   Full task_model_map: {self.task_model_map}")

        self._metrics_started_at = time.time()
        self._metrics_lock = Lock()
        self._metrics: Dict[str, Any] = {
            "requests_total": 0,
            "requests_ok": 0,
            "requests_error": 0,
            "retries_total": 0,
            "fallback_attempts": 0,
            "latency_sum_ms": 0.0,
            "latency_count": 0,
            "route_counts": {},
            "task_counts": {},
            "provider_counts": {},
            "status_code_counts": {},
        }

        self._load_persistent_metrics()

    def _bump_metric(self, key: str, inc: int = 1) -> None:
        with self._metrics_lock:
            current = self._metrics.get(key) or 0
            if not isinstance(current, int):
                current = 0
            self._metrics[key] = current + inc
        self._persist_metrics()

    def _bump_bucket(self, key: str, bucket: str, inc: int = 1) -> None:
        with self._metrics_lock:
            mapping = self._metrics.get(key)
            if not isinstance(mapping, dict):
                mapping = {}
                self._metrics[key] = mapping
            current = mapping.get(bucket) or 0
            if not isinstance(current, int):
                current = 0
            mapping[bucket] = current + inc
        self._persist_metrics()

    def _record_completion(self, *, latency_ms: float) -> None:
        with self._metrics_lock:
            self._metrics["latency_sum_ms"] = (self._metrics.get("latency_sum_ms") or 0.0) + latency_ms
            self._metrics["latency_count"] = (self._metrics.get("latency_count") or 0) + 1
        self._persist_metrics()

    def _load_persistent_metrics(self) -> None:
        if not self.firestore:
            return
        try:
            doc_ref = self.firestore.collection("system_metrics").document("inference_stats")
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict() or {}
                with self._metrics_lock:
                    for k, v in data.items():
                        if k in self._metrics:
                            if isinstance(v, (int, float)):
                                self._metrics[k] = v
                            elif isinstance(v, dict) and isinstance(self._metrics[k], dict):
                                self._metrics[k].update(v)
                LOGGER.info("??? Persistent inference metrics loaded from Firestore")
        except Exception as e:
            LOGGER.warning(f"?????? Failed to load persistent metrics: {e}")

    def _persist_metrics(self, force: bool = False) -> None:
        if not self.firestore:
            return

        now = time.time()
        if not force and (now - self._last_persist_time < self._persist_throttle_sec):
            return

        try:
            self._last_persist_time = now
            doc_ref = self.firestore.collection("system_metrics").document("inference_stats")
            with self._metrics_lock:
                snapshot = dict(self._metrics)

            doc_ref.set(snapshot, merge=True)
        except Exception as e:
            LOGGER.warning(f"?????? Failed to persist metrics: {e}")

    def _record_attempt(self, *, task_type: str, provider: str, route: str, fallback_depth: int) -> None:
        self._bump_metric("requests_total", 1)
        self._bump_bucket("task_counts", (task_type or "default").strip().lower(), 1)
        self._bump_bucket("provider_counts", provider, 1)
        self._bump_bucket("route_counts", route, 1)
        if fallback_depth > 0:
            self._bump_metric("fallback_attempts", 1)

    def snapshot_metrics(self) -> Dict[str, Any]:
        with self._metrics_lock:
            l_sum = self._metrics.get("latency_sum_ms") or 0.0
            l_count = self._metrics.get("latency_count") or 0
            avg_latency = round(l_sum / l_count, 2) if l_count > 0 else 0.0

            snapshot = {
                "uptime_sec": round(max(0.0, time.time() - self._metrics_started_at), 2),
                "requests_total": self._metrics.get("requests_total") or 0,
                "requests_ok": self._metrics.get("requests_ok") or 0,
                "requests_error": self._metrics.get("requests_error") or 0,
                "retries_total": self._metrics.get("retries_total") or 0,
                "fallback_attempts": self._metrics.get("fallback_attempts") or 0,
                "avg_latency_ms": avg_latency,
                "active_model": self.default_model,
                "primary_provider": self.provider,
                "route_counts": dict(self._metrics.get("route_counts") or {}),
                "task_counts": dict(self._metrics.get("task_counts") or {}),
                "provider_counts": dict(self._metrics.get("provider_counts") or {}),
                "status_code_counts": dict(self._metrics.get("status_code_counts") or {}),
            }
        return snapshot

    def generate_from_messages(self, req: InferenceRequest) -> str:
        effective_task = (req.task_type or "default").strip().lower()
        request_tag = req.request_tag.strip() or f"{effective_task}-{int(time.time() * 1000)}"
        selected_model, model_selection_source = self._resolve_primary_model(req)

        model_chain = self._model_chain_for_task(effective_task, selected_model)
        last_error: Optional[Exception] = None

        model_base = selected_model

        LOGGER.info(
            f"???? request_tag={request_tag} task={effective_task} source={model_selection_source} "
            f"selected_model={model_base} (primary)"
        )
        LOGGER.info(f"   fallback_chain={model_chain[1:] if len(model_chain) > 1 else 'none'}")

        for fallback_depth, model_name in enumerate(model_chain):
            request_for_model = InferenceRequest(
                messages=req.messages,
                model=model_name,
                task_type=req.task_type,
                request_tag=request_tag,
                max_new_tokens=req.max_new_tokens or self.default_max_new_tokens,
                temperature=req.temperature if req.temperature is not None else self.default_temperature,
                top_p=req.top_p if req.top_p is not None else self.default_top_p,
                repetition_penalty=req.repetition_penalty,
                timeout_sec=req.timeout_sec,
            )

            try:
                result = self._call_deepseek(request_for_model, fallback_depth)
                if fallback_depth > 0:
                    LOGGER.info(f"??? Fallback succeeded at depth={fallback_depth} model={model_name}")
                return result
            except Exception as exc:
                last_error = exc
                fallback_hint = f" (depth {fallback_depth})" if fallback_depth > 0 else ""
                LOGGER.warning(
                    f"??????  Attempt failed{fallback_hint}: task={request_for_model.task_type} "
                    f"model={model_name} error={exc.__class__.__name__}: {str(exc)[:100]}"
                )

        if last_error:
            raise last_error
        raise RuntimeError("Inference failed with empty model chain")

    def _runtime_chat_model_override(self) -> str:
        return os.getenv(TEMP_CHAT_MODEL_OVERRIDE_ENV, "").strip()

    def _resolve_primary_model(self, req: InferenceRequest) -> Tuple[str, str]:
        effective_task = (req.task_type or "default").strip().lower()
        runtime_chat_override = self._runtime_chat_model_override()

        if effective_task == "chat" and runtime_chat_override:
            selected_model = runtime_chat_override
            model_selection_source = "chat_temp_override_env"
        elif req.model:
            selected_model = req.model
            model_selection_source = "explicit_request"
        elif effective_task == "chat" and self.chat_model_override:
            selected_model = self.chat_model_override
            model_selection_source = "chat_override_env"
        else:
            selected_model = self.task_model_map.get(effective_task, self.default_model)
            model_selection_source = "task_map"

        if self.enforce_lock_model:
            effective_lock_model_id = self.lock_model_id
            if effective_task == "chat":
                effective_lock_model_id = runtime_chat_override or self.chat_model_override or self.lock_model_id

            selected_base = (selected_model or "").split(":", 1)[0].strip()
            lock_base = (effective_lock_model_id or "").split(":", 1)[0].strip()
            if selected_base != lock_base:
                LOGGER.warning(
                    f"?????? Model lock replaced requested model {selected_model} with {effective_lock_model_id}"
                )
            selected_model = effective_lock_model_id
            model_selection_source = f"{model_selection_source}:model_lock"

        if effective_task == "chat" and self.chat_strict_model_only:
            return selected_model, f"{model_selection_source}:chat_strict_model_only"

        return selected_model, model_selection_source

    def _model_chain_for_task(self, task_type: str, selected_model: str) -> List[str]:
        normalized = (task_type or "default").strip().lower()
        runtime_chat_override = self._runtime_chat_model_override() if normalized == "chat" else ""
        chat_lock_model_id = runtime_chat_override or (self.chat_model_override if normalized == "chat" else "")

        if self.enforce_lock_model:
            if normalized == "chat":
                locked_model = (chat_lock_model_id or self.lock_model_id or "").strip()
            else:
                locked_model = (self.lock_model_id or "").strip()
            return [locked_model] if locked_model else []

        if normalized == "chat" and self.chat_strict_model_only:
            chat_model = (chat_lock_model_id or selected_model or "").strip()
            return [chat_model] if chat_model else []

        per_task_candidates = self.task_fallback_model_map.get(task_type, [])
        combined = [selected_model] + per_task_candidates + self.fallback_models

        deduped: List[str] = []
        seen = set()
        for model_id in combined:
            model_name = (model_id or "").strip()
            if not model_name or model_name in seen:
                continue
            seen.add(model_name)
            deduped.append(model_name)

        if normalized in self.interactive_tasks:
            max_models = 1 + self.interactive_max_fallback_depth
            return deduped[:max_models]
        return deduped

    def _retry_profile(self, task_type: str) -> Tuple[int, float]:
        normalized = (task_type or "default").strip().lower()
        if normalized in self.interactive_tasks:
            return self.interactive_max_retries, self.interactive_backoff_sec
        return self.background_max_retries, self.background_backoff_sec

    def _timeout_for(self, req: InferenceRequest, provider: str) -> int:
        if req.timeout_sec:
            return req.timeout_sec
        if provider == "local_space":
            return self.local_timeout_sec
        normalized = (req.task_type or "default").strip().lower()
        if normalized in self.interactive_tasks:
            return self.interactive_timeout_sec
        return self.background_timeout_sec

    def _messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        parts: List[str] = []
        for msg in messages:
            role = (msg.get("role") or "user").strip().lower()
            content = (msg.get("content") or "").strip()
            if not content or role in {"tool", "function"}:
                continue
            prefix = "USER"
            if role == "system":
                prefix = "SYSTEM"
            elif role == "assistant":
                prefix = "ASSISTANT"
            parts.append(f"{prefix}:\n{content}")
        parts.append("ASSISTANT:")
        return "\n\n".join(parts)

    def _latest_user_message(self, messages: List[Dict[str, str]]) -> str:
        for msg in reversed(messages):
            role = (msg.get("role") or "").strip().lower()
            content = (msg.get("content") or "").strip()
            if role == "user" and content:
                return content
        return self._messages_to_prompt(messages)

    def _call_deepseek(self, req: InferenceRequest, fallback_depth: int) -> str:
        """Call DeepSeek API with OpenAI-compatible chat completions."""
        if not self.ds_api_key:
            raise RuntimeError("DEEPSEEK_API_KEY is not set")

        target_model = req.model or self.default_model
        route = "deepseek"
        task_type = req.task_type or "default"

        LOGGER.debug(
            f"???? Calling DeepSeek: task={task_type} model={target_model} "
            f"route={route} depth={fallback_depth}"
        )

        timeout = self._timeout_for(req, "deepseek")
        max_retries, backoff_sec = self._retry_profile(task_type)

        client = get_deepseek_client()

        # Build chat completions params
        params: Dict[str, Any] = {
            "model": target_model,
            "messages": req.messages,
            "max_tokens": req.max_new_tokens or self.default_max_new_tokens,
        }

        if target_model == REASONER_MODEL:
            params["max_tokens"] = req.max_new_tokens or 1024
        else:
            params["temperature"] = req.temperature
            params["top_p"] = req.top_p

        # Use JSON mode for quiz generation
        if task_type == "quiz_generation" and target_model != REASONER_MODEL:
            params["response_format"] = {"type": "json_object"}

        for attempt in range(max_retries):
            self._record_attempt(
                task_type=task_type,
                provider="deepseek",
                route=route,
                fallback_depth=fallback_depth,
            )
            start = time.perf_counter()
            try:
                response = client.chat.completions.create(**params, timeout=timeout)
                latency_ms = (time.perf_counter() - start) * 1000

                content = response.choices[0].message.content or ""
                reasoning = getattr(response.choices[0].message, "reasoning_content", None)

                text = content.strip()
                if reasoning:
                    text = f"{reasoning}\n{text}"

                log_model_call(
                    LOGGER,
                    provider="deepseek",
                    model=target_model,
                    endpoint=self.ds_base_url,
                    latency_ms=latency_ms,
                    input_tokens=None,
                    output_tokens=None,
                    status="ok",
                    task_type=task_type,
                    request_tag=req.request_tag,
                    retry_attempt=attempt + 1,
                    fallback_depth=fallback_depth,
                    route=route,
                )
                self._record_attempt(
                    task_type=task_type,
                    provider="deepseek",
                    route=route,
                    fallback_depth=fallback_depth,
                )
                self._record_completion(latency_ms=latency_ms)
                self._bump_metric("requests_ok", 1)
                return text

            except RateLimitError:
                latency_ms = (time.perf_counter() - start) * 1000
                if attempt < max_retries - 1:
                    log_model_call(
                        LOGGER,
                        provider="deepseek",
                        model=target_model,
                        endpoint=self.ds_base_url,
                        latency_ms=latency_ms,
                        input_tokens=None,
                        output_tokens=None,
                        status="error",
                        error_class="RateLimitError",
                        error_message="rate limited",
                        task_type=task_type,
                        request_tag=req.request_tag,
                        retry_attempt=attempt + 1,
                        fallback_depth=fallback_depth,
                        route=route,
                    )
                    self._bump_metric("retries_total", 1)
                    time.sleep(backoff_sec * (attempt + 1) * random.uniform(0.9, 1.2))
                    continue
                self._bump_metric("requests_error", 1)
                raise RuntimeError("DeepSeek API rate limit reached. Please try again shortly.")

            except APITimeoutError:
                latency_ms = (time.perf_counter() - start) * 1000
                if attempt < max_retries - 1:
                    log_model_call(
                        LOGGER,
                        provider="deepseek",
                        model=target_model,
                        endpoint=self.ds_base_url,
                        latency_ms=latency_ms,
                        input_tokens=None,
                        output_tokens=None,
                        status="error",
                        error_class="APITimeoutError",
                        error_message="timeout",
                        task_type=task_type,
                        request_tag=req.request_tag,
                        retry_attempt=attempt + 1,
                        fallback_depth=fallback_depth,
                        route=route,
                    )
                    self._bump_metric("retries_total", 1)
                    time.sleep(backoff_sec * (attempt + 1) * random.uniform(0.9, 1.2))
                    continue
                self._bump_metric("requests_error", 1)
                raise RuntimeError("DeepSeek API timed out. Please retry.")

            except APIError as e:
                latency_ms = (time.perf_counter() - start) * 1000
                if attempt < max_retries - 1:
                    log_model_call(
                        LOGGER,
                        provider="deepseek",
                        model=target_model,
                        endpoint=self.ds_base_url,
                        latency_ms=latency_ms,
                        input_tokens=None,
                        output_tokens=None,
                        status="error",
                        error_class="APIError",
                        error_message=str(e)[:200],
                        task_type=task_type,
                        request_tag=req.request_tag,
                        retry_attempt=attempt + 1,
                        fallback_depth=fallback_depth,
                        route=route,
                    )
                    self._bump_metric("retries_total", 1)
                    time.sleep(backoff_sec * (attempt + 1) * random.uniform(0.9, 1.2))
                    continue
                self._bump_metric("requests_error", 1)
                raise RuntimeError(f"DeepSeek API error: {str(e)}")

            except Exception as exc:
                latency_ms = (time.perf_counter() - start) * 1000
                self._bump_metric("requests_error", 1)
                log_model_call(
                    LOGGER,
                    provider="deepseek",
                    model=target_model,
                    endpoint=self.ds_base_url,
                    latency_ms=latency_ms,
                    input_tokens=None,
                    output_tokens=None,
                    status="error",
                    error_class=exc.__class__.__name__,
                    error_message=str(exc)[:200],
                    task_type=task_type,
                    request_tag=req.request_tag,
                    retry_attempt=attempt + 1,
                    fallback_depth=fallback_depth,
                    route=route,
                )
                raise

        raise RuntimeError(f"DeepSeek call failed after {max_retries} attempts")

    def _call_local_space(self, req: InferenceRequest, *, provider: str, route: str, fallback_depth: int) -> str:
        target_model = req.model or self.default_model
        url = f"{self.local_space_url.rstrip('/')}{self.local_generate_path}"

        prompt = self._messages_to_prompt(req.messages)
        payload: Dict[str, object] = {
            "data": [
                prompt,
                [],
                req.temperature,
                req.top_p,
                req.max_new_tokens,
            ]
        }
        headers = {"Content-Type": "application/json"}

        timeout = self._timeout_for(req, provider)

        self._record_attempt(
            task_type=req.task_type,
            provider=provider,
            route=route,
            fallback_depth=fallback_depth,
        )
        start = time.perf_counter()

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            log_model_call(
                LOGGER,
                provider=provider,
                model=target_model,
                endpoint=url,
                latency_ms=latency_ms,
                input_tokens=None,
                output_tokens=None,
                status="error",
                error_class=exc.__class__.__name__,
                error_message=str(exc),
                task_type=req.task_type,
                request_tag=req.request_tag,
                retry_attempt=1,
                fallback_depth=fallback_depth,
                route=route,
            )
            self._bump_metric("requests_error", 1)
            raise

        latency_ms = (time.perf_counter() - start) * 1000
        self._bump_bucket("status_code_counts", str(resp.status_code), 1)

        if resp.status_code != 200:
            self._bump_metric("requests_error", 1)
            raise RuntimeError(f"Local Space error {resp.status_code}: {resp.text}")

        data = resp.json()
        event_id = data.get("event_id")
        if not event_id:
            return self._extract_text(data)

        result_url = f"{self.local_space_url.rstrip('/')}/gradio_api/call/generate/{event_id}"
        result_resp = requests.get(result_url, timeout=req.timeout_sec or self.local_timeout_sec)
        if result_resp.status_code != 200:
            raise RuntimeError(f"Local Space result error {result_resp.status_code}: {result_resp.text}")

        line_data = None
        for line in result_resp.text.splitlines():
            if line.startswith("data:"):
                line_data = line.split("data:", 1)[1].strip()

        if not line_data:
            raise RuntimeError("Local Space result stream missing data")

        parsed = json.loads(line_data)
        output_payload = parsed if isinstance(parsed, dict) else {"data": parsed}
        text = self._extract_text(output_payload)
        log_model_call(
            LOGGER,
            provider=provider,
            model=target_model,
            endpoint=url,
            latency_ms=latency_ms,
            input_tokens=None,
            output_tokens=None,
            status="ok",
            task_type=req.task_type,
            request_tag=req.request_tag,
            retry_attempt=1,
            fallback_depth=fallback_depth,
            route=route,
        )
        self._bump_metric("requests_ok", 1)
        return text

    def _extract_text(self, data: object) -> str:
        """Extract clean text from inference response, stripping JSON artifacts."""
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                val = (first.get("generated_text") or "").strip()
                if val:
                    return self._clean_response_text(val)

        if isinstance(data, dict):
            direct = (data.get("generated_text") or "").strip()
            if direct:
                return self._clean_response_text(direct)

            choices = data.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                msg = (message.get("content") or "").strip()
                if msg:
                    return self._clean_response_text(msg)
                reasoning = (message.get("reasoning") or "").strip()
                if reasoning:
                    return self._clean_response_text(reasoning)

            generic_data = data.get("data")
            if isinstance(generic_data, list) and generic_data:
                first = generic_data[0]
                if isinstance(first, str) and first.strip():
                    return self._clean_response_text(first.strip())

        raise RuntimeError(f"Unexpected inference response format: {data}")

    def _clean_response_text(self, text: str) -> str:
        """Strip JSON braces, template artifacts, and whitespace from response text."""
        text = text.strip()

        if text.startswith("{") and text.endswith("}"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    if "content" in parsed:
                        text = str(parsed["content"]).strip()
                    elif "text" in parsed:
                        text = str(parsed["text"]).strip()
            except json.JSONDecodeError:
                text = text.strip("{}")

        if text.startswith("```json") or text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
        if text.endswith("```"):
            text = text[:-3].strip()

        return text.strip()


def create_default_client(firestore_client: Optional[Any] = None) -> InferenceClient:
    return InferenceClient(firestore_client=firestore_client)


def is_sequential_model(model_id: str = "") -> bool:
    mid = (model_id or os.getenv("INFERENCE_MODEL_ID") or "").strip()
    if not mid:
        return False
    if mid == REASONER_MODEL:
        return True
    if _RUNTIME_OVERRIDES:
        lock = _RUNTIME_OVERRIDES.get("INFERENCE_LOCK_MODEL_ID", "")
        if lock == REASONER_MODEL:
            return True
    return False
