import os
import time
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote

import requests
import yaml

from .logging_utils import configure_structured_logging, log_model_call

LOGGER = configure_structured_logging("mathpulse.inference")


@dataclass
class InferenceRequest:
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    task_type: str = "default"
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
        self.gpu_provider = os.getenv("INFERENCE_GPU_PROVIDER", "hf_inference").strip().lower()
        self.cpu_provider = os.getenv("INFERENCE_CPU_PROVIDER", "hf_inference").strip().lower()
        self.enable_provider_fallback = os.getenv("INFERENCE_ENABLE_PROVIDER_FALLBACK", "true").strip().lower() in {"1", "true", "yes", "on"}
        self.hf_token = os.getenv("HF_TOKEN", "")
        self.hf_base_url = os.getenv("INFERENCE_HF_BASE_URL", "https://api-inference.huggingface.co/models")
        self.local_space_url = os.getenv("INFERENCE_LOCAL_SPACE_URL", "http://127.0.0.1:7860")
        self.local_generate_path = os.getenv("INFERENCE_LOCAL_SPACE_GENERATE_PATH", "/gradio_api/call/generate")

        self.default_model = os.getenv(
            "INFERENCE_MODEL_ID",
            str(primary.get("id", "Qwen/Qwen2.5-Math-7B-Instruct")),
        )
        self.default_max_new_tokens = int(os.getenv("INFERENCE_MAX_NEW_TOKENS", str(primary.get("max_new_tokens", 512))))
        self.default_temperature = float(os.getenv("INFERENCE_TEMPERATURE", str(primary.get("temperature", 0.2))))
        self.default_top_p = float(os.getenv("INFERENCE_TOP_P", str(primary.get("top_p", 0.9))))

        self.hf_timeout_sec = int(os.getenv("INFERENCE_HF_TIMEOUT_SEC", "90"))
        self.local_timeout_sec = int(os.getenv("INFERENCE_LOCAL_SPACE_TIMEOUT_SEC", "90"))
        self.max_retries = int(os.getenv("INFERENCE_MAX_RETRIES", "3"))
        self.backoff_sec = float(os.getenv("INFERENCE_BACKOFF_SEC", "1.5"))

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

    def generate_from_messages(self, req: InferenceRequest) -> str:
        model_chain = [req.model or self.default_model] + [m for m in self.fallback_models if m]
        last_error: Optional[Exception] = None
        provider_chain = self._provider_chain_for_task(req.task_type)

        for model_name in model_chain:
            request_for_model = InferenceRequest(
                messages=req.messages,
                model=model_name,
                task_type=req.task_type,
                max_new_tokens=req.max_new_tokens or self.default_max_new_tokens,
                temperature=req.temperature if req.temperature is not None else self.default_temperature,
                top_p=req.top_p if req.top_p is not None else self.default_top_p,
                repetition_penalty=req.repetition_penalty,
                timeout_sec=req.timeout_sec,
            )
            for provider in provider_chain:
                try:
                    return self._generate_with_provider(request_for_model, provider)
                except Exception as exc:
                    last_error = exc
                    LOGGER.warning(
                        "task=%s provider=%s model=%s failed: %s",
                        request_for_model.task_type,
                        provider,
                        model_name,
                        exc,
                    )

        if last_error:
            raise last_error
        raise RuntimeError("Inference failed with empty model chain")

    def _provider_chain_for_task(self, task_type: str) -> List[str]:
        normalized = (task_type or "default").strip().lower()
        if normalized in self.cpu_only_tasks:
            return [self.cpu_provider]

        if normalized in self.gpu_required_tasks:
            chain = [self.gpu_provider]
            if self.enable_provider_fallback and self.cpu_provider != self.gpu_provider:
                chain.append(self.cpu_provider)
            return chain

        return [self.provider]

    def _generate_with_provider(self, req: InferenceRequest, provider: str) -> str:
        if provider == "local_space":
            return self._call_local_space(req)
        return self._call_hf_inference(req)

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

    def _post_with_retry(self, url: str, *, headers: Dict[str, str], payload: Dict[str, object], timeout: int, provider: str, model: str) -> requests.Response:
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
                )
                if attempt >= self.max_retries - 1:
                    raise
                attempt += 1
                time.sleep(self.backoff_sec * attempt)
                continue

            latency_ms = (time.perf_counter() - start) * 1000
            if resp.status_code in {408, 429, 500, 502, 503, 504} and attempt < self.max_retries - 1:
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
                )
                attempt += 1
                time.sleep(self.backoff_sec * attempt)
                continue
            return resp

    def _call_hf_inference(self, req: InferenceRequest) -> str:
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not set")

        target_model = req.model or self.default_model
        encoded_model = quote(target_model, safe="")
        url = f"{self.hf_base_url.rstrip('/')}/{encoded_model}"

        prompt = self._latest_user_message(req.messages)
        payload: Dict[str, object] = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": req.max_new_tokens or self.default_max_new_tokens,
                "temperature": req.temperature,
                "top_p": req.top_p,
                "repetition_penalty": req.repetition_penalty,
                "return_full_text": False,
                "do_sample": req.temperature > 0,
                "tool_choice": "none",
            },
            "options": {
                "wait_for_model": True,
                "use_cache": False,
            },
        }
        headers = {"Authorization": f"Bearer {self.hf_token}", "Content-Type": "application/json"}

        resp = self._post_with_retry(
            url,
            headers=headers,
            payload=payload,
            timeout=req.timeout_sec or self.hf_timeout_sec,
            provider="hf_inference",
            model=target_model,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"HF Inference error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = self._extract_text(data)
        log_model_call(
            LOGGER,
            provider="hf_inference",
            model=target_model,
            endpoint=url,
            latency_ms=0.0,
            input_tokens=None,
            output_tokens=None,
            status="ok",
        )
        return text

    def _call_local_space(self, req: InferenceRequest) -> str:
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

        resp = self._post_with_retry(
            url,
            headers=headers,
            payload=payload,
            timeout=req.timeout_sec or self.local_timeout_sec,
            provider="local_space",
            model=target_model,
        )

        if resp.status_code != 200:
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
        return self._extract_text(output_payload)

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
                msg = (choices[0].get("message", {}).get("content") or "").strip()
                if msg:
                    return msg

            generic_data = data.get("data")
            if isinstance(generic_data, list) and generic_data:
                first = generic_data[0]
                if isinstance(first, str) and first.strip():
                    return first.strip()

        raise RuntimeError(f"Unexpected inference response format: {data}")


def create_default_client() -> InferenceClient:
    return InferenceClient()
