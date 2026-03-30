import os
import time
import json
import re
from threading import Lock
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
import yaml

from .logging_utils import configure_structured_logging, log_model_call

LOGGER = configure_structured_logging("mathpulse.inference")


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
    max_new_tokens: int = 512
    temperature: float = 0.2
    top_p: float = 0.9
    repetition_penalty: float = 1.15
    timeout_sec: Optional[int] = None


class InferenceClient:
    def __init__(self) -> None:
        root_dir = Path(__file__).resolve().parents[2]
        config_path = root_dir / "config" / "models.yaml"
        config: Dict[str, object] = {}
        if config_path.exists():
            with config_path.open("r", encoding="utf-8") as fh:
                config = yaml.safe_load(fh) or {}

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
        self.hf_token = os.getenv("HF_TOKEN", "")
        self.hf_base_url = os.getenv("INFERENCE_HF_BASE_URL", "https://router.huggingface.co/hf-inference/models")
        self.hf_chat_url = os.getenv("INFERENCE_HF_CHAT_URL", "https://router.huggingface.co/v1/chat/completions")
        self.local_space_url = _normalize_local_space_url(
            os.getenv("INFERENCE_LOCAL_SPACE_URL", "http://127.0.0.1:7860")
        )
        self.local_generate_path = os.getenv("INFERENCE_LOCAL_SPACE_GENERATE_PATH", "/gradio_api/call/generate")
        self.pro_route_header_name = os.getenv("INFERENCE_PRO_ROUTE_HEADER_NAME", "")
        self.pro_route_header_value = os.getenv("INFERENCE_PRO_ROUTE_HEADER_VALUE", "true")

        self.default_model = os.getenv(
            "INFERENCE_MODEL_ID",
            str(primary.get("id", "meta-llama/Llama-3.1-8B-Instruct")),
        )
        self.default_max_new_tokens = int(os.getenv("INFERENCE_MAX_NEW_TOKENS", str(primary.get("max_new_tokens", 512))))
        self.default_temperature = float(os.getenv("INFERENCE_TEMPERATURE", str(primary.get("temperature", 0.2))))
        self.default_top_p = float(os.getenv("INFERENCE_TOP_P", str(primary.get("top_p", 0.9))))

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

        self.task_model_map: Dict[str, str] = {}
        self.task_fallback_model_map: Dict[str, List[str]] = {}
        self.task_provider_map: Dict[str, str] = {}
        if isinstance(config, dict):
            routing_cfg = config.get("routing", {})
            if isinstance(routing_cfg, dict):
                task_models = routing_cfg.get("task_model_map", {})
                if isinstance(task_models, dict):
                    self.task_model_map = {
                        str(task).strip().lower(): str(model).strip()
                        for task, model in task_models.items()
                        if str(task).strip() and str(model).strip()
                    }
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

        self._metrics_started_at = time.time()
        self._metrics_lock = Lock()
        self._metrics: Dict[str, object] = {
            "requests_total": 0,
            "requests_ok": 0,
            "requests_error": 0,
            "retries_total": 0,
            "fallback_attempts": 0,
            "route_counts": {},
            "task_counts": {},
            "provider_counts": {},
            "status_code_counts": {},
        }

    def _bump_metric(self, key: str, inc: int = 1) -> None:
        with self._metrics_lock:
            current = int(self._metrics.get(key, 0))
            self._metrics[key] = current + inc

    def _bump_bucket(self, key: str, bucket: str, inc: int = 1) -> None:
        with self._metrics_lock:
            mapping = self._metrics.get(key)
            if not isinstance(mapping, dict):
                mapping = {}
                self._metrics[key] = mapping
            mapping[bucket] = int(mapping.get(bucket, 0)) + inc

    def _record_attempt(self, *, task_type: str, provider: str, route: str, fallback_depth: int) -> None:
        self._bump_metric("requests_total", 1)
        self._bump_bucket("task_counts", (task_type or "default").strip().lower(), 1)
        self._bump_bucket("provider_counts", provider, 1)
        self._bump_bucket("route_counts", route, 1)
        if fallback_depth > 0:
            self._bump_metric("fallback_attempts", 1)

    def snapshot_metrics(self) -> Dict[str, object]:
        with self._metrics_lock:
            snapshot = {
                "uptime_sec": round(max(0.0, time.time() - self._metrics_started_at), 2),
                "requests_total": int(self._metrics.get("requests_total", 0)),
                "requests_ok": int(self._metrics.get("requests_ok", 0)),
                "requests_error": int(self._metrics.get("requests_error", 0)),
                "retries_total": int(self._metrics.get("retries_total", 0)),
                "fallback_attempts": int(self._metrics.get("fallback_attempts", 0)),
                "route_counts": dict(self._metrics.get("route_counts", {})),
                "task_counts": dict(self._metrics.get("task_counts", {})),
                "provider_counts": dict(self._metrics.get("provider_counts", {})),
                "status_code_counts": dict(self._metrics.get("status_code_counts", {})),
            }
        return snapshot

    def generate_from_messages(self, req: InferenceRequest) -> str:
        effective_task = (req.task_type or "default").strip().lower()
        request_tag = req.request_tag.strip() or f"{effective_task}-{int(time.time() * 1000)}"
        selected_model = req.model or self.task_model_map.get((req.task_type or "default").strip().lower(), self.default_model)
        model_chain = self._model_chain_for_task(effective_task, selected_model)
        last_error: Optional[Exception] = None
        provider_chain = self._provider_chain_for_task(req.task_type)

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
                    return self._generate_with_provider(request_for_model, provider, fallback_depth)
                except Exception as exc:
                    last_error = exc
                    LOGGER.warning(
                        "task=%s provider=%s model=%s fallback_depth=%s failed: %s",
                        request_for_model.task_type,
                        provider,
                        model_name,
                        fallback_depth,
                        exc,
                    )

        if last_error:
            raise last_error
        raise RuntimeError("Inference failed with empty model chain")

    def _model_chain_for_task(self, task_type: str, selected_model: str) -> List[str]:
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
                time.sleep(backoff_sec * attempt)
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
                time.sleep(backoff_sec * attempt)
                continue
            return resp, latency_ms, attempt + 1

    def _call_hf_inference(self, req: InferenceRequest, *, provider: str, route: str, fallback_depth: int) -> str:
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not set")

        target_model = req.model or self.default_model
        chat_model = target_model if ":" in target_model else f"{target_model}:fastest"
        url = self.hf_chat_url

        payload: Dict[str, object] = {
            "model": chat_model,
            "messages": req.messages,
            "stream": False,
            "max_tokens": req.max_new_tokens or self.default_max_new_tokens,
            "temperature": req.temperature,
            "top_p": req.top_p,
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
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                val = (first.get("generated_text") or "").strip()
                if val:
                    return val

        if isinstance(data, dict):
            direct = (data.get("generated_text") or "").strip()
            if direct:
                return direct

            choices = data.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                msg = (message.get("content") or "").strip()
                if msg:
                    return msg
                reasoning = (message.get("reasoning") or "").strip()
                if reasoning:
                    return reasoning

            generic_data = data.get("data")
            if isinstance(generic_data, list) and generic_data:
                first = generic_data[0]
                if isinstance(first, str) and first.strip():
                    return first.strip()

        raise RuntimeError(f"Unexpected inference response format: {data}")


def create_default_client() -> InferenceClient:
    return InferenceClient()
