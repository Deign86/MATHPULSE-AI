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
from huggingface_hub import InferenceClient as HFInferenceClient

from .logging_utils import configure_structured_logging, log_model_call

LOGGER = configure_structured_logging("mathpulse.inference")
TEMP_CHAT_MODEL_OVERRIDE_ENV = "INFERENCE_CHAT_MODEL_TEMP_OVERRIDE"


def _normalize_local_space_url(raw_url: str) -> str:
    """Accept either hf.space host or huggingface.co/spaces URL for local_space provider."""
    cleaned = (raw_url or "").strip().rstrip("/")
    if not cleaned:
        return "http://127.0.0.1:7860"

    # Convert page URL format to runtime host format:
    # https://huggingface.co/spaces/{owner}/{space} -> https://{owner}-{space}.hf.space
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
        self._persist_throttle_sec = 30.0  # Persist at most every 30 seconds
        # Try multiple config paths (HF Space, Docker, local development)
        # The deploy script uploads config/ to the space root
        config_paths = [
            Path("./config/models.yaml"),  # Current working directory (most reliable)
            Path("/config/models.yaml"),  # HF Space root
            Path("/app/config/models.yaml"),  # App directory
            Path.cwd() / "config" / "models.yaml",  # CWD with config subdir
            Path(__file__).resolve().parents[2] / "config" / "models.yaml",  # Package root
        ]
        
        config: Dict[str, object] = {}
        config_path = None
        
        for path in config_paths:
            if path.exists():
                config_path = path
                with path.open("r", encoding="utf-8") as fh:
                    config = yaml.safe_load(fh) or {}
                LOGGER.info(f"✅ Loaded config from {config_path}")
                break
        
        if not config_path:
            LOGGER.warning(f"⚠️  Config file not found. Checked: {[str(p) for p in config_paths]}")
            LOGGER.warning(f"    CWD: {Path.cwd()}")
            LOGGER.warning(f"    Using hardcoded defaults")

        primary: Dict[str, object] = {}
        if isinstance(config, dict):
            models_cfg = config.get("models", {})
            if isinstance(models_cfg, dict):
                primary_cfg = models_cfg.get("primary", {})
                if isinstance(primary_cfg, dict):
                    primary = primary_cfg

        self.provider = os.getenv("INFERENCE_PROVIDER", "hf_inference").strip().lower()
        self.pro_provider = os.getenv("INFERENCE_PRO_PROVIDER", "hf_inference").strip().lower()
        self.gpu_provider = os.getenv("INFERENCE_GPU_PROVIDER", "hf_inference").strip().lower()
        self.cpu_provider = os.getenv("INFERENCE_CPU_PROVIDER", "hf_inference").strip().lower()
        self.enable_provider_fallback = os.getenv("INFERENCE_ENABLE_PROVIDER_FALLBACK", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.pro_enabled = os.getenv("INFERENCE_PRO_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
        self.hf_token = os.getenv(
            "HF_TOKEN",
            os.getenv("HUGGING_FACE_API_TOKEN", os.getenv("HUGGINGFACE_API_TOKEN", "")),
        )
        self.hf_base_url = os.getenv("INFERENCE_HF_BASE_URL", "https://router.huggingface.co/hf-inference/models")
        self.hf_chat_url = os.getenv("INFERENCE_HF_CHAT_URL", "https://router.huggingface.co/v1/chat/completions")
        
        # Featherless AI for Qwen math models (used as fallback when HF router fails)
        self.featherless_api_key = os.getenv("FEATHERLESS_API_KEY", "")
        self.featherless_chat_url = os.getenv("FEATHERLESS_CHAT_URL", "https://api.featherless.ai/openai/v1/chat/completions")
        
        self.local_space_url = _normalize_local_space_url(
            os.getenv("INFERENCE_LOCAL_SPACE_URL", "http://127.0.0.1:7860")
        )
        self.local_generate_path = os.getenv("INFERENCE_LOCAL_SPACE_GENERATE_PATH", "/gradio_api/call/generate")
        self.pro_route_header_name = os.getenv("INFERENCE_PRO_ROUTE_HEADER_NAME", "")
        self.pro_route_header_value = os.getenv("INFERENCE_PRO_ROUTE_HEADER_VALUE", "true")

        self.enforce_qwen_only = os.getenv("INFERENCE_ENFORCE_QWEN_ONLY", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.qwen_lock_model = os.getenv("INFERENCE_QWEN_LOCK_MODEL", "Qwen/Qwen3-32B").strip() or "Qwen/Qwen3-32B"

        default_model_fallback = str(primary.get("id") or "Qwen/Qwen3-32B")
        env_model_id = os.getenv("INFERENCE_MODEL_ID", "").strip()
        self.default_model = env_model_id or default_model_fallback
        
        default_max_tokens = str(primary.get("max_new_tokens") or 512)
        self.default_max_new_tokens = int(os.getenv("INFERENCE_MAX_NEW_TOKENS", default_max_tokens))
        
        default_temp = str(primary.get("temperature") or 0.2)
        self.default_temperature = float(os.getenv("INFERENCE_TEMPERATURE", default_temp))
        
        default_top_p = str(primary.get("top_p") or 0.9)
        self.default_top_p = float(os.getenv("INFERENCE_TOP_P", default_top_p))
        
        # Task-specific model overrides via environment variables
        self.chat_model_override = os.getenv("INFERENCE_CHAT_MODEL_ID", "").strip()
        self.chat_model_temp_override = os.getenv(TEMP_CHAT_MODEL_OVERRIDE_ENV, "").strip()
        self.chat_strict_model_only = os.getenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.chat_hard_model = os.getenv("INFERENCE_CHAT_HARD_MODEL_ID", "meta-llama/Meta-Llama-3-70B-Instruct").strip()
        self.chat_hard_trigger_enabled = os.getenv("INFERENCE_CHAT_HARD_TRIGGER_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
        self.chat_hard_prompt_chars = max(256, int(os.getenv("INFERENCE_CHAT_HARD_PROMPT_CHARS", "800")))
        self.chat_hard_history_chars = max(
            self.chat_hard_prompt_chars,
            int(os.getenv("INFERENCE_CHAT_HARD_HISTORY_CHARS", "1800")),
        )
        hard_keywords_raw = os.getenv(
            "INFERENCE_CHAT_HARD_KEYWORDS",
            "step-by-step,show all steps,derive,proof,prove,rigorous,multi-step,word problem",
        )
        self.chat_hard_keywords = [kw.strip().lower() for kw in hard_keywords_raw.split(",") if kw.strip()]

        self.hf_timeout_sec = int(os.getenv("INFERENCE_HF_TIMEOUT_SEC", "90"))
        self.local_timeout_sec = int(os.getenv("INFERENCE_LOCAL_SPACE_TIMEOUT_SEC", "90"))
        self.max_retries = int(os.getenv("INFERENCE_MAX_RETRIES", "3"))
        self.backoff_sec = float(os.getenv("INFERENCE_BACKOFF_SEC", "1.5"))
        self.interactive_timeout_sec = int(os.getenv("INFERENCE_INTERACTIVE_TIMEOUT_SEC", str(self.hf_timeout_sec)))
        self.background_timeout_sec = int(os.getenv("INFERENCE_BACKGROUND_TIMEOUT_SEC", str(self.hf_timeout_sec)))
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

        pro_tasks_raw = os.getenv(
            "INFERENCE_PRO_PRIORITY_TASKS",
            "chat,quiz_generation,lesson_generation,learning_path,verify_solution",
        )
        self.pro_priority_tasks = {v.strip().lower() for v in pro_tasks_raw.split(",") if v.strip()}

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
        # Keep all tasks pinned to Qwen3-32B when qwen-only lock is active.
        self.task_model_map: Dict[str, str] = {
            "chat": "Qwen/Qwen3-32B",
            "verify_solution": "Qwen/Qwen3-32B",
            "lesson_generation": "Qwen/Qwen3-32B",
            "quiz_generation": "Qwen/Qwen3-32B",
            "learning_path": "Qwen/Qwen3-32B",
            "daily_insight": "Qwen/Qwen3-32B",
            "risk_classification": "Qwen/Qwen3-32B",
            "risk_narrative": "Qwen/Qwen3-32B",
        }
        # Fallback chains (only to other HF-supported models, no featherless-ai)
        self.task_fallback_model_map: Dict[str, List[str]] = {
            "chat": [
                "meta-llama/Llama-3.1-8B-Instruct",
                "google/gemma-2-2b-it",
            ],
            "verify_solution": [
                "meta-llama/Llama-3.1-8B-Instruct",
                "google/gemma-2-2b-it",
            ],
        }
        # Model-to-provider mappings (not needed when using model:provider syntax directly)
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
                    # Merge config models with defaults (config overrides defaults)
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
                f"🔄 INFERENCE_MODEL_ID env var override applied: {env_model_id}"
            )
            LOGGER.info(
                f"   Task model mappings changed from: {original_map}"
            )
            env_override_note = " (env override active)"
        else:
            env_override_note = ""

        if self.enforce_qwen_only:
            qwen_map_before = dict(self.task_model_map)
            self.default_model = self.qwen_lock_model
            for task_key in list(self.task_model_map.keys()):
                self.task_model_map[task_key] = self.qwen_lock_model
            self.fallback_models = []
            self.task_fallback_model_map = {
                task_key: [] for task_key in self.task_model_map.keys()
            }
            self.chat_hard_trigger_enabled = False
            LOGGER.info(f"🔒 INFERENCE_ENFORCE_QWEN_ONLY enabled: locking all inference tasks to {self.qwen_lock_model}")
            LOGGER.info(f"   Cleared fallback models and hard-escalation path")
            LOGGER.info(f"   Task model mappings forced from: {qwen_map_before}")

        # Log configuration loaded for debugging
        config_status = "from file" if config_path else "hardcoded defaults (no config file found)"
        effective_chat_model_for_logs = self.chat_model_override or self.task_model_map.get("chat", self.default_model)
        LOGGER.info(f"✅ InferenceClient initialized {config_status}{env_override_note}")
        LOGGER.info(f"   Default model: {self.default_model}")
        LOGGER.info(f"   Chat model: {effective_chat_model_for_logs}")
        LOGGER.info(f"   Chat temp override ({TEMP_CHAT_MODEL_OVERRIDE_ENV}): {self.chat_model_temp_override or 'disabled'}")
        LOGGER.info(f"   Chat strict model lock: {self.chat_strict_model_only}")
        LOGGER.info(f"   Global Qwen-only lock: {self.enforce_qwen_only}")
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
        
        # Load persistent metrics if available
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
                    # Merge persistent data into current metrics
                    # We only override counters, keeping local objects if needed
                    for k, v in data.items():
                        if k in self._metrics:
                            if isinstance(v, (int, float)):
                                self._metrics[k] = v
                            elif isinstance(v, dict) and isinstance(self._metrics[k], dict):
                                self._metrics[k].update(v)
                LOGGER.info("✅ Persistent inference metrics loaded from Firestore")
        except Exception as e:
            LOGGER.warning(f"⚠️ Failed to load persistent metrics: {e}")

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
            
            # Use set with merge=True to be safe
            doc_ref.set(snapshot, merge=True)
        except Exception as e:
            LOGGER.warning(f"⚠️ Failed to persist metrics: {e}")

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
        provider_chain = self._provider_chain_for_task(req.task_type)
        
        # Normalize model name (remove any provider suffix since we use hf_inference router)
        model_base = selected_model.split(":")[0] if ":" in selected_model else selected_model
        
        # Log model selection for debugging - confirm which model will actually be used
        LOGGER.info(
            f"🎯 request_tag={request_tag} task={effective_task} source={model_selection_source} "
            f"selected_model={model_base} (primary) provider_chain={provider_chain}"
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
            
            for provider in provider_chain:
                try:
                    result = self._generate_with_provider(request_for_model, provider, fallback_depth)
                    if fallback_depth > 0:
                        LOGGER.info(f"✅ Fallback succeeded at depth={fallback_depth} model={model_name} provider={provider}")
                    return result
                except Exception as exc:
                    last_error = exc
                    fallback_hint = f" (depth {fallback_depth})" if fallback_depth > 0 else ""
                    LOGGER.warning(
                        f"⚠️  Attempt failed{fallback_hint}: task={request_for_model.task_type} "
                        f"provider={provider} model={model_name} error={exc.__class__.__name__}: {str(exc)[:100]}"
                    )

        if last_error:
            raise last_error
        raise RuntimeError("Inference failed with empty model chain")

    def _runtime_chat_model_override(self) -> str:
        return os.getenv(TEMP_CHAT_MODEL_OVERRIDE_ENV, "").strip()

    def _resolve_primary_model(self, req: InferenceRequest) -> Tuple[str, str]:
        effective_task = (req.task_type or "default").strip().lower()
        runtime_chat_override = self._runtime_chat_model_override()

        def _base_model(model_name: str) -> str:
            return (model_name or "").split(":", 1)[0].strip()

        # Check explicit request model first, then chat override env, then task map/default.
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

        if self.enforce_qwen_only:
            effective_qwen_lock_model = self.qwen_lock_model
            if effective_task == "chat":
                effective_qwen_lock_model = runtime_chat_override or self.chat_model_override or self.qwen_lock_model

            selected_base = _base_model(selected_model)
            lock_base = _base_model(effective_qwen_lock_model)
            if selected_base != lock_base:
                LOGGER.warning(
                    f"⚠️ Qwen-only lock replaced requested model {selected_model} with {effective_qwen_lock_model}"
                )
            selected_model = effective_qwen_lock_model
            model_selection_source = f"{model_selection_source}:qwen_only"

        if effective_task == "chat" and self.chat_strict_model_only:
            return selected_model, f"{model_selection_source}:chat_strict_model_only"

        if effective_task == "chat" and self.chat_hard_trigger_enabled and self.chat_hard_model:
            should_escalate, reason = self._should_escalate_chat_to_hard_model(req.messages)
            if should_escalate and selected_model != self.chat_hard_model:
                return self.chat_hard_model, f"chat_hard_escalation:{reason}"

        return selected_model, model_selection_source

    def _should_escalate_chat_to_hard_model(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        latest_user = self._latest_user_message(messages)
        if not latest_user:
            return False, "no_user_message"

        latest_norm = latest_user.lower()
        prompt_chars = len(latest_user)
        history_chars = 0
        for msg in messages:
            content = (msg.get("content") or "") if isinstance(msg, dict) else ""
            history_chars += len(content)

        keyword_hit = ""
        for kw in self.chat_hard_keywords:
            if kw and kw in latest_norm:
                keyword_hit = kw
                break

        math_marker_count = len(
            re.findall(
                r"(=|\bintegral\b|\bderivative\b|\bmatrix\b|\blimit\b|\bproof\b|\bderive\b|\bsolve\b)",
                latest_norm,
            )
        )

        long_prompt = prompt_chars >= self.chat_hard_prompt_chars
        long_history = history_chars >= self.chat_hard_history_chars
        immediate_hard_request = any(
            phrase in latest_norm
            for phrase in (
                "show all steps",
                "step-by-step",
                "step by step",
                "rigorous proof",
                "formal proof",
            )
        )

        # Escalate immediately for long step-by-step prompts or heavy math density.
        escalate = bool(keyword_hit and immediate_hard_request)
        if not escalate:
            escalate = bool(keyword_hit and (long_prompt or long_history or math_marker_count >= 2))
        if not escalate and long_prompt and math_marker_count >= 2:
            escalate = True
        if not escalate and long_history and math_marker_count >= 2:
            escalate = True

        if not escalate:
            return False, "normal"

        reasons: List[str] = []
        if long_prompt:
            reasons.append(f"prompt_chars={prompt_chars}")
        if long_history:
            reasons.append(f"history_chars={history_chars}")
        if keyword_hit:
            reasons.append(f"keyword={keyword_hit}")
        if immediate_hard_request:
            reasons.append("immediate_hard_request")
        if math_marker_count >= 2:
            reasons.append(f"math_markers={math_marker_count}")
        return True, ",".join(reasons) if reasons else "hard_prompt"

    def _model_chain_for_task(self, task_type: str, selected_model: str) -> List[str]:
        normalized = (task_type or "default").strip().lower()
        runtime_chat_override = self._runtime_chat_model_override() if normalized == "chat" else ""
        chat_qwen_lock_model = runtime_chat_override or (self.chat_model_override if normalized == "chat" else "")

        if self.enforce_qwen_only:
            if normalized == "chat":
                locked_model = (chat_qwen_lock_model or self.qwen_lock_model or "").strip()
            else:
                locked_model = (self.qwen_lock_model or "").strip()
            return [locked_model] if locked_model else []

        if normalized == "chat" and self.chat_strict_model_only:
            chat_model = (chat_qwen_lock_model or selected_model or "").strip()
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

    def _provider_chain_for_task(self, task_type: str) -> List[str]:
        normalized = (task_type or "default").strip().lower()
        forced_provider = self.task_provider_map.get(normalized)
        if forced_provider:
            return [forced_provider]

        if normalized in self.cpu_only_tasks:
            return [self.cpu_provider]

        if self.pro_enabled and normalized in self.pro_priority_tasks:
            chain = [self.pro_provider]
            if self.enable_provider_fallback and self.gpu_provider not in chain:
                chain.append(self.gpu_provider)
            if self.enable_provider_fallback and self.provider not in chain:
                chain.append(self.provider)
            return chain

        if normalized in self.gpu_required_tasks:
            chain = [self.gpu_provider]
            if self.enable_provider_fallback and self.cpu_provider != self.gpu_provider:
                chain.append(self.cpu_provider)
            return chain

        chain = [self.provider]
        if self.enable_provider_fallback and self.cpu_provider not in chain:
            chain.append(self.cpu_provider)
        return chain

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

    def _resolve_route_label(self, provider: str, task_type: str) -> str:
        normalized = (task_type or "default").strip().lower()
        if self.pro_enabled and normalized in self.pro_priority_tasks and provider == self.pro_provider:
            return "pro-priority"
        return "standard"

    def _generate_with_provider(self, req: InferenceRequest, provider: str, fallback_depth: int) -> str:
        route = self._resolve_route_label(provider, req.task_type)
        if provider == "local_space":
            return self._call_local_space(req, provider=provider, route=route, fallback_depth=fallback_depth)
        
        # All models use HF inference router directly (including Qwen/Qwen3-32B)
        return self._call_hf_inference(req, provider=provider, route=route, fallback_depth=fallback_depth)

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
            parts.append(f"{prefix}:\\n{content}")
        parts.append("ASSISTANT:")
        return "\\n\\n".join(parts)

    def _latest_user_message(self, messages: List[Dict[str, str]]) -> str:
        for msg in reversed(messages):
            role = (msg.get("role") or "").strip().lower()
            content = (msg.get("content") or "").strip()
            if role == "user" and content:
                return content
        return self._messages_to_prompt(messages)

    def _post_with_retry(
        self,
        url: str,
        *,
        headers: Dict[str, str],
        payload: Dict[str, object],
        timeout: int,
        provider: str,
        model: str,
        task_type: str,
        request_tag: str,
        fallback_depth: int,
        route: str,
    ) -> Tuple[requests.Response, float, int]:
        self._record_attempt(
            task_type=task_type,
            provider=provider,
            route=route,
            fallback_depth=fallback_depth,
        )
        max_retries, backoff_sec = self._retry_profile(task_type)
        attempt = 0

        def _retry_sleep(retry_attempt: int) -> None:
            # Small jitter reduces synchronized retry storms during transient provider issues.
            jitter_factor = random.uniform(0.9, 1.2)
            time.sleep(backoff_sec * retry_attempt * jitter_factor)

        while True:
            start = time.perf_counter()
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
            except Exception as exc:
                latency_ms = (time.perf_counter() - start) * 1000
                log_model_call(
                    LOGGER,
                    provider=provider,
                    model=model,
                    endpoint=url,
                    latency_ms=latency_ms,
                    input_tokens=None,
                    output_tokens=None,
                    status="error",
                    error_class=exc.__class__.__name__,
                    error_message=str(exc),
                    task_type=task_type,
                    request_tag=request_tag,
                    retry_attempt=attempt + 1,
                    fallback_depth=fallback_depth,
                    route=route,
                )
                if attempt >= max_retries - 1:
                    self._bump_metric("requests_error", 1)
                    raise
                attempt += 1
                self._bump_metric("retries_total", 1)
                _retry_sleep(attempt)
                continue

            latency_ms = (time.perf_counter() - start) * 1000
            if resp.status_code in {408, 429, 500, 502, 503, 504} and attempt < max_retries - 1:
                log_model_call(
                    LOGGER,
                    provider=provider,
                    model=model,
                    endpoint=url,
                    latency_ms=latency_ms,
                    input_tokens=None,
                    output_tokens=None,
                    status="error",
                    error_class="HTTPRetry",
                    error_message=f"status={resp.status_code}",
                    task_type=task_type,
                    request_tag=request_tag,
                    retry_attempt=attempt + 1,
                    fallback_depth=fallback_depth,
                    route=route,
                )
                attempt += 1
                self._bump_metric("retries_total", 1)
                _retry_sleep(attempt)
                continue
            return resp, latency_ms, attempt + 1

    def _call_hf_inference_direct(self, req: InferenceRequest, *, provider: str, route: str, fallback_depth: int) -> str:
        """
        Call Qwen models via Featherless AI provider.
        Uses HF InferenceClient with provider="featherless-ai" for direct model access.
        """
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not set")

        target_model = req.model or self.default_model
        target_model_base = target_model.split(":")[0] if ":" in target_model else target_model
        
        timeout = self._timeout_for(req, provider)
        start = time.perf_counter()
        
        try:
            # Use HF InferenceClient with featherless-ai provider for Qwen models.
            client = HFInferenceClient(
                model=target_model_base,
                token=self.hf_token,
                provider="featherless-ai",
                timeout=timeout
            )
            
            response = client.chat_completion(
                messages=req.messages,
                max_tokens=req.max_new_tokens or self.default_max_new_tokens,
                temperature=req.temperature or self.default_temperature,
                top_p=req.top_p or self.default_top_p,
            )
            latency_ms = (time.perf_counter() - start) * 1000
            
            # Extract text from response
            if hasattr(response, "choices") and response.choices:
                content = response.choices[0].message.content or ""
                text = content.strip()
            else:
                text = self._extract_text(response)
            
            log_model_call(
                LOGGER,
                provider="featherless-ai",
                model=target_model_base,
                endpoint="featherless-ai_inference",
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
            self._record_attempt(
                task_type=req.task_type,
                provider="featherless-ai",
                route=route,
                fallback_depth=fallback_depth,
            )
            self._record_completion(latency_ms=latency_ms)
            self._bump_metric("requests_ok", 1)
            return text
            
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            self._bump_metric("requests_error", 1)
            log_model_call(
                LOGGER,
                provider="featherless-ai",
                model=target_model_base,
                endpoint="featherless-ai_inference",
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
            LOGGER.warning(
                "task=%s provider=featherless-ai model=%s fallback_depth=%s failed: %s",
                req.task_type,
                target_model_base,
                fallback_depth,
                exc,
            )
            raise

    def _call_hf_inference(self, req: InferenceRequest, *, provider: str, route: str, fallback_depth: int) -> str:
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not set")

        target_model = req.model or self.default_model
        chat_model = target_model if ":" in target_model else f"{target_model}:fastest"
        url = self.hf_chat_url

        # Log which model is actually being used
        model_base = target_model.split(":")[0] if ":" in target_model else target_model
        LOGGER.debug(
            f"📌 Calling HF inference: task={req.task_type} model={model_base} "
            f"route={route} depth={fallback_depth}"
        )

        payload: Dict[str, object] = {
            "model": chat_model,
            "messages": req.messages,
            "stream": False,
            "max_tokens": req.max_new_tokens or self.default_max_new_tokens,
            "temperature": req.temperature,
            "top_p": req.top_p,
        }
        if req.enable_thinking and "Qwen3" in model_base:
            payload["extra_body"] = {
                "chat_template_kwargs": {"enable_thinking": True}
            }
        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json",
            "X-MathPulse-Task": (req.task_type or "default").strip().lower(),
        }
        if route == "pro-priority" and self.pro_route_header_name.strip():
            headers[self.pro_route_header_name.strip()] = self.pro_route_header_value

        timeout = self._timeout_for(req, provider)

        resp, latency_ms, retry_attempt = self._post_with_retry(
            url,
            headers=headers,
            payload=payload,
            timeout=timeout,
            provider=provider,
            model=target_model,
            task_type=req.task_type,
            request_tag=req.request_tag,
            fallback_depth=fallback_depth,
            route=route,
        )
        self._bump_bucket("status_code_counts", str(resp.status_code), 1)
        if resp.status_code != 200:
            self._bump_metric("requests_error", 1)
            raise RuntimeError(f"HF Inference error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = self._extract_text(data)
        
        # Log successful inference with actual model and response time
        LOGGER.info(
            f"✅ HF inference success: task={req.task_type} model={model_base} "
            f"latency={latency_ms:.0f}ms tokens_out={len(text.split())}"
        )
        
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
            retry_attempt=retry_attempt,
            fallback_depth=fallback_depth,
            route=route,
        )
        self._bump_metric("requests_ok", 1)
        return text

    def _call_featherless(self, req: InferenceRequest, *, provider: str, route: str, fallback_depth: int) -> str:
        if not self.featherless_api_key:
            raise RuntimeError("FEATHERLESS_API_KEY is not set")

        target_model = req.model or self.default_model
        url = self.featherless_chat_url

        payload: Dict[str, object] = {
            "model": target_model,
            "messages": req.messages,
            "stream": False,
            "max_tokens": req.max_new_tokens or self.default_max_new_tokens,
            "temperature": req.temperature,
            "top_p": req.top_p,
        }
        headers = {
            "Authorization": f"Bearer {self.featherless_api_key}",
            "Content-Type": "application/json",
            "X-MathPulse-Task": (req.task_type or "default").strip().lower(),
        }

        timeout = self._timeout_for(req, provider)

        resp, latency_ms, retry_attempt = self._post_with_retry(
            url,
            headers=headers,
            payload=payload,
            timeout=timeout,
            provider=provider,
            model=target_model,
            task_type=req.task_type,
            request_tag=req.request_tag,
            fallback_depth=fallback_depth,
            route=route,
        )
        self._bump_bucket("status_code_counts", str(resp.status_code), 1)
        if resp.status_code != 200:
            self._bump_metric("requests_error", 1)
            raise RuntimeError(f"Featherless API error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = self._extract_text(data)
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
            retry_attempt=retry_attempt,
            fallback_depth=fallback_depth,
            route=route,
        )
        self._record_completion(latency_ms=latency_ms)
        self._bump_metric("requests_ok", 1)
        return text

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

        resp, latency_ms, retry_attempt = self._post_with_retry(
            url,
            headers=headers,
            payload=payload,
            timeout=timeout,
            provider=provider,
            model=target_model,
            task_type=req.task_type,
            request_tag=req.request_tag,
            fallback_depth=fallback_depth,
            route=route,
        )
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
            retry_attempt=retry_attempt,
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
        # Strip leading/trailing whitespace
        text = text.strip()
        
        # Remove wrapping JSON braces or artifact markers
        if text.startswith("{") and text.endswith("}"):
            try:
                # Try to parse as JSON - if it fails, return as-is
                parsed = json.loads(text)
                # If it's a dict with a "content" or "text" field, use that
                if isinstance(parsed, dict):
                    if "content" in parsed:
                        text = str(parsed["content"]).strip()
                    elif "text" in parsed:
                        text = str(parsed["text"]).strip()
            except json.JSONDecodeError:
                # Not valid JSON, just clean up braces
                text = text.strip("{}")
        
        # Remove any trailing artifact markers
        if text.startswith("```json") or text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
        if text.endswith("```"):
            text = text[:-3].strip()
        
        return text.strip()


def create_default_client(firestore_client: Optional[Any] = None) -> InferenceClient:
    return InferenceClient(firestore_client=firestore_client)


def is_sequential_model() -> bool:
    model_id = os.getenv("HF_MODEL_ID", "Qwen/Qwen3-235B-A22B")
    return "235B" in model_id
