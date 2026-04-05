#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import threading
import time
import http.client
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from socketserver import TCPServer, ThreadingMixIn
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

MODEL_ID = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
DISALLOWED_MODEL_IDS = {
    "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora",
    "Qwen/Qwen2.5-7B-Instruct",
}

HOST = "0.0.0.0"
PORT = int(os.getenv("API_PORT", "8000"))
VLLM_PORT = int(os.getenv("VLLM_PORT", str(PORT + 1)))
DTYPE = os.getenv("VLLM_DTYPE", "float16").strip() or "float16"
MAX_MODEL_LEN = int(os.getenv("VLLM_MAX_MODEL_LEN", "2048"))
GPU_MEMORY_UTILIZATION = float(os.getenv("VLLM_GPU_MEMORY_UTILIZATION", "0.82"))
TENSOR_PARALLEL_SIZE = int(os.getenv("VLLM_TENSOR_PARALLEL_SIZE", "1"))
MAX_NUM_SEQS = int(os.getenv("VLLM_MAX_NUM_SEQS", "2"))
CPU_OFFLOAD_GB = float(os.getenv("VLLM_CPU_OFFLOAD_GB", "10"))
ATTENTION_BACKEND = os.getenv("VLLM_ATTENTION_BACKEND", "TRITON_ATTN").strip() or "TRITON_ATTN"
ENFORCE_EAGER = os.getenv("VLLM_ENFORCE_EAGER", "1").strip().lower() in {"1", "true", "yes"}
TRUST_REMOTE_CODE = os.getenv("VLLM_TRUST_REMOTE_CODE", "0").strip().lower() in {"1", "true", "yes"}

WORK_DIR = Path("/kaggle/working")
MODEL_LOCAL_DIR = WORK_DIR / "model"
RUNTIME_STATUS_PATH = WORK_DIR / "api_runtime_status.json"
CURRENT_PUBLIC_URL = ""


def stage(title: str) -> None:
    print(f"\n{'=' * 12} {title} {'=' * 12}")


def run_cli(command: list[str], check: bool = True, env: Optional[Dict[str, str]] = None) -> subprocess.CompletedProcess[str]:
    cmd_env = os.environ.copy()
    if env:
        cmd_env.update(env)

    print("[cli]", " ".join(command))
    proc = subprocess.run(
        command,
        check=False,
        text=True,
        capture_output=True,
        env=cmd_env,
    )

    if proc.stdout.strip():
        print(proc.stdout.strip())
    if proc.stderr.strip():
        print(proc.stderr.strip())

    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(command)}")
    return proc


def pip_install(*packages: str) -> None:
    run_cli([sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", *packages], check=True)


def assert_model_lock() -> None:
    env_model_id = os.getenv("MODEL_ID", "").strip()
    if env_model_id and env_model_id != MODEL_ID:
        raise RuntimeError(
            "MODEL_ID override is not allowed for this kernel. "
            f"Expected {MODEL_ID}, got {env_model_id}."
        )
    if MODEL_ID in DISALLOWED_MODEL_IDS:
        raise RuntimeError(f"Configured MODEL_ID is disallowed: {MODEL_ID}")


def configure_hf_auth() -> Dict[str, str]:
    token = os.getenv("HF_TOKEN", "").strip()
    if not token:
        return {"used_token": "false", "source": "missing"}

    os.environ["HF_TOKEN"] = token
    os.environ["HUGGING_FACE_HUB_TOKEN"] = token

    try:
        from huggingface_hub import login

        login(token=token, add_to_git_credential=False)
        return {"used_token": "true", "source": "HF_TOKEN", "method": "huggingface_hub.login"}
    except Exception as exc:
        print(f"HF login warning: {exc}")
        return {"used_token": "true", "source": "HF_TOKEN", "method": "env_only", "warning": str(exc)}


def _extract_special_token(item: object) -> str:
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        for key in ["token", "content", "value", "text"]:
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def prepare_model_artifacts() -> Path:
    from huggingface_hub import snapshot_download

    MODEL_LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(repo_id=MODEL_ID, local_dir=str(MODEL_LOCAL_DIR))

    tokenizer_config_path = MODEL_LOCAL_DIR / "tokenizer_config.json"
    if not tokenizer_config_path.exists():
        return MODEL_LOCAL_DIR

    try:
        tokenizer_config = json.loads(tokenizer_config_path.read_text(encoding="utf-8"))
    except Exception:
        return MODEL_LOCAL_DIR

    changed = False
    extra_special_tokens = tokenizer_config.get("extra_special_tokens")

    if isinstance(extra_special_tokens, list):
        extracted_tokens = [
            token
            for token in (_extract_special_token(item) for item in extra_special_tokens)
            if token
        ]
        additional_tokens = tokenizer_config.get("additional_special_tokens", [])
        if not isinstance(additional_tokens, list):
            additional_tokens = []
        merged = list(dict.fromkeys([*additional_tokens, *extracted_tokens]))
        tokenizer_config["additional_special_tokens"] = merged
        tokenizer_config["extra_special_tokens"] = {}
        changed = True
    elif extra_special_tokens is not None and not isinstance(extra_special_tokens, dict):
        tokenizer_config["extra_special_tokens"] = {}
        changed = True

    if changed:
        tokenizer_config_path.write_text(json.dumps(tokenizer_config, indent=2), encoding="utf-8")

    return MODEL_LOCAL_DIR


def _looks_like_ngrok_api_key(value: str) -> bool:
    return value.strip().lower().startswith("api_")


def _token_suffix(value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) <= 6:
        return "***"
    return f"...{cleaned[-6:]}"


def configure_ngrok_mcp_credentials() -> Dict[str, str]:
    authtoken = os.getenv("NGROK_AUTHTOKEN", "").strip()
    api_key = os.getenv("NGROK_API_KEY", "").strip()
    fallback_token = os.getenv("NGROK_TOKEN", "").strip()

    selected_source = ""
    selected_token = ""

    # Prefer explicit authtoken. NGROK_TOKEN can also hold a valid authtoken.
    for source_name, value in (
        ("NGROK_AUTHTOKEN", authtoken),
        ("NGROK_TOKEN", fallback_token),
        ("NGROK_API_KEY", api_key),
    ):
        cleaned = value.strip()
        if not cleaned:
            continue
        # API keys (api_*) cannot replace the authtoken used by the ngrok agent.
        if source_name == "NGROK_API_KEY" and _looks_like_ngrok_api_key(cleaned):
            continue
        selected_source = source_name
        selected_token = cleaned
        break

    if not selected_token:
        raise RuntimeError(
            "Missing ngrok authtoken. Set NGROK_AUTHTOKEN in Kaggle secrets. "
            "NGROK_API_KEY is optional and cannot replace NGROK_AUTHTOKEN."
        )

    try:
        import ngrok

        ngrok.set_auth_token(selected_token)
    except Exception as exc:
        message = str(exc)
        if "ERR_NGROK_107" in message or "authentication failed" in message.lower():
            raise RuntimeError(
                "ngrok authentication failed (ERR_NGROK_107). "
                "The configured NGROK_AUTHTOKEN is invalid or revoked. "
                "Update Kaggle secrets with a fresh token from "
                "https://dashboard.ngrok.com/get-started/your-authtoken"
            ) from exc
        raise RuntimeError(f"Failed to initialize ngrok auth token from {selected_source}: {exc}") from exc

    os.environ["NGROK_AUTHTOKEN"] = selected_token
    if api_key:
        os.environ["NGROK_API_KEY"] = api_key

    return {
        "has_authtoken": str(bool(authtoken)).lower(),
        "has_api_key": str(bool(api_key)).lower(),
        "token_source": selected_source,
        "token_suffix": _token_suffix(selected_token),
    }


def _listener_url(listener: Any) -> str:
    raw = getattr(listener, "url", "")
    if callable(raw):
        try:
            return str(raw()).strip()
        except Exception:
            return ""
    return str(raw).strip()


def launch_ngrok_mcp_tunnel() -> tuple[Any, str]:
    try:
        import ngrok

        listener = ngrok.forward(addr=f"127.0.0.1:{PORT}", proto="http")
        public_url = _listener_url(listener)
        if not public_url.startswith("https://"):
            raise RuntimeError(f"ngrok listener did not return an https URL: {public_url or '<empty>'}")
        return listener, public_url
    except Exception as exc:
        message = str(exc)
        lowered = message.lower()
        if "err_ngrok_107" in lowered or "authentication failed" in lowered:
            raise RuntimeError(
                "ngrok authentication failed (ERR_NGROK_107). "
                "The configured NGROK_AUTHTOKEN is invalid or revoked."
            ) from exc
        raise RuntimeError(f"Failed to start ngrok MCP tunnel: {exc}") from exc


def ngrok_listener_running(listener: Optional[Any]) -> bool:
    if listener is None:
        return False

    try:
        import ngrok

        listeners = ngrok.get_listeners() or []
        if not listeners:
            return False

        current_id_raw = getattr(listener, "id", "")
        current_id = str(current_id_raw() if callable(current_id_raw) else current_id_raw).strip()
        if not current_id:
            return True

        for item in listeners:
            item_id_raw = getattr(item, "id", "")
            item_id = str(item_id_raw() if callable(item_id_raw) else item_id_raw).strip()
            if item_id == current_id:
                return True
        return False
    except Exception:
        return False


def close_ngrok_listener(listener: Optional[Any]) -> None:
    if listener is None:
        return

    print("Stopping ngrok listener...")
    try:
        close_fn = getattr(listener, "close", None)
        if callable(close_fn):
            close_fn()
            return
    except Exception as exc:
        print(f"ngrok listener close warning: {exc}")

    try:
        import ngrok

        public_url = _listener_url(listener)
        if public_url:
            ngrok.disconnect(public_url)
        ngrok.kill()
    except Exception:
        pass


def wait_for_local_api(vllm_proc: subprocess.Popen[Any], timeout_seconds: int = 600) -> None:
    import requests

    endpoint = f"http://127.0.0.1:{VLLM_PORT}/v1/models"
    started = time.time()
    last_error = ""

    while time.time() - started < timeout_seconds:
        if vllm_proc.poll() is not None:
            raise RuntimeError("vLLM process exited before API became ready.")
        try:
            response = requests.get(endpoint, timeout=10)
            if response.status_code < 500:
                print(f"Local API reachable at {endpoint} (status={response.status_code}).")
                return
            last_error = f"status={response.status_code}"
        except Exception as exc:
            last_error = str(exc)
        time.sleep(3)

    raise RuntimeError(f"Timed out waiting for local vLLM API readiness: {last_error}")


def wait_for_ngrok_public_url(ngrok_proc: subprocess.Popen[Any], timeout_seconds: int = 120) -> str:
    import requests

    started = time.time()
    last_error = ""

    while time.time() - started < timeout_seconds:
        if ngrok_proc.poll() is not None:
            raise RuntimeError("ngrok process exited before tunnel URL was available.")
        try:
            response = requests.get(f"{NGROK_API_BASE}/api/tunnels", timeout=5)
            response.raise_for_status()
            payload = response.json()
            tunnels = payload.get("tunnels", [])
            for tunnel in tunnels:
                public_url = str(tunnel.get("public_url", "")).strip()
                if public_url.startswith("https://"):
                    return public_url
        except Exception as exc:
            last_error = str(exc)
        time.sleep(2)

    raise RuntimeError(f"Timed out waiting for ngrok public URL: {last_error}")


def launch_ngrok_tunnel(ngrok_bin: Path) -> tuple[subprocess.Popen[Any], str]:
    ngrok_command = build_ngrok_command(ngrok_bin)
    ngrok_proc = subprocess.Popen(ngrok_command, text=True)
    public_url = wait_for_ngrok_public_url(ngrok_proc=ngrok_proc, timeout_seconds=180)
    return ngrok_proc, public_url


def write_runtime_status(payload: Dict[str, object]) -> None:
    RUNTIME_STATUS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def landing_payload() -> Dict[str, object]:
    root_url = CURRENT_PUBLIC_URL or ""
    openai_base = f"{root_url}/v1" if root_url else "/v1"
    return {
        "status": "online",
        "message": "DepEd Math vLLM OpenAI-compatible API is running.",
        "openai_base_url": openai_base,
        "health_url": f"{root_url}/health" if root_url else "/health",
        "routes": {
            "models": "/v1/models",
            "chat_completions": "/v1/chat/completions",
            "health": "/health",
        },
        "note": "Use /v1/models to check availability and POST /v1/chat/completions for inference.",
    }


class ThreadedTCPServer(ThreadingMixIn, TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class GatewayRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        print("[gateway]", format % args)

    def _read_body(self) -> bytes:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except Exception:
            length = 0
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def _send_json(self, payload: Dict[str, object], status_code: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_to_vllm(self) -> None:
        parsed = urlsplit(self.path)
        target_path = parsed.path or "/"
        target_query = f"?{parsed.query}" if parsed.query else ""
        target = f"{target_path}{target_query}"

        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "connection", "content-length", "accept-encoding"}
        }
        body = self._read_body()

        conn = http.client.HTTPConnection("127.0.0.1", VLLM_PORT, timeout=90)
        try:
            conn.request(self.command, target, body=body, headers=headers)
            response = conn.getresponse()
            response_body = response.read()

            self.send_response(response.status)
            for key, value in response.getheaders():
                lowered = key.lower()
                if lowered in {"transfer-encoding", "connection", "content-length"}:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(response_body)))
            self.end_headers()
            if response_body:
                self.wfile.write(response_body)
        except Exception as exc:
            self._send_json(
                {
                    "status": "error",
                    "message": "Gateway failed to reach vLLM backend.",
                    "error": str(exc),
                    "backend_port": VLLM_PORT,
                },
                status_code=502,
            )
        finally:
            conn.close()

    def _handle(self) -> None:
        path = urlsplit(self.path).path or "/"

        if path in {"/", "/v1"}:
            self._send_json(landing_payload())
            return

        self._proxy_to_vllm()

    def do_GET(self) -> None:  # noqa: N802
        self._handle()

    def do_POST(self) -> None:  # noqa: N802
        self._handle()

    def do_PUT(self) -> None:  # noqa: N802
        self._handle()

    def do_PATCH(self) -> None:  # noqa: N802
        self._handle()

    def do_DELETE(self) -> None:  # noqa: N802
        self._handle()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._handle()


def start_gateway_server() -> ThreadedTCPServer:
    server = ThreadedTCPServer((HOST, PORT), GatewayRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def stop_gateway_server(server: Optional[ThreadedTCPServer]) -> None:
    if server is None:
        return
    print("Stopping gateway server...")
    try:
        server.shutdown()
    except Exception:
        pass
    try:
        server.server_close()
    except Exception:
        pass


def terminate_process(proc: Optional[subprocess.Popen[Any]], name: str) -> None:
    if proc is None or proc.poll() is not None:
        return
    print(f"Stopping {name}...")
    proc.terminate()
    try:
        proc.wait(timeout=20)
    except Exception:
        proc.kill()


def main() -> None:
    global CURRENT_PUBLIC_URL

    stage("Model Lock")
    assert_model_lock()
    print(f"MODEL_ID locked to: {MODEL_ID}")

    if VLLM_PORT == PORT:
        raise RuntimeError(
            "VLLM_PORT must be different from API_PORT when gateway mode is enabled. "
            f"Received API_PORT={PORT} and VLLM_PORT={VLLM_PORT}."
        )

    stage("Install Dependencies")
    pip_install("--upgrade", "pip")
    pip_install("vllm>=0.6.0", "huggingface_hub>=0.23.0", "requests>=2.31.0")
    pip_install("protobuf>=4.25.3,<6")
    pip_install("ngrok>=1.7.0")

    stage("Hugging Face Auth")
    hf_auth = configure_hf_auth()
    print(json.dumps(hf_auth, indent=2))

    stage("Prepare Model Artifacts")
    model_path = prepare_model_artifacts()
    print(f"MODEL_PATH: {model_path}")

    stage("Launch vLLM OpenAI API")
    vllm_command = [
        sys.executable,
        "-m",
        "vllm.entrypoints.openai.api_server",
        "--model",
        str(model_path),
        "--tokenizer",
        str(model_path),
        "--host",
        HOST,
        "--port",
        str(VLLM_PORT),
        "--dtype",
        DTYPE,
        "--max-model-len",
        str(MAX_MODEL_LEN),
        "--gpu-memory-utilization",
        str(GPU_MEMORY_UTILIZATION),
        "--tensor-parallel-size",
        str(TENSOR_PARALLEL_SIZE),
        "--max-num-seqs",
        str(MAX_NUM_SEQS),
        "--cpu-offload-gb",
        str(CPU_OFFLOAD_GB),
        "--download-dir",
        "/kaggle/working/hf-cache",
        "--attention-backend",
        ATTENTION_BACKEND,
    ]
    if ENFORCE_EAGER:
        vllm_command.append("--enforce-eager")
    if TRUST_REMOTE_CODE:
        vllm_command.append("--trust-remote-code")

    vllm_proc = subprocess.Popen(vllm_command, text=True)

    gateway_server: Optional[ThreadedTCPServer] = None
    ngrok_listener: Optional[Any] = None
    ngrok_public_url = ""

    def handle_signal(signum: int, _frame: object) -> None:
        print(f"Received signal {signum}; shutting down.")
        close_ngrok_listener(ngrok_listener)
        stop_gateway_server(gateway_server)
        terminate_process(vllm_proc, "vLLM")
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        wait_for_local_api(vllm_proc=vllm_proc, timeout_seconds=900)

        stage("Start API Gateway")
        gateway_server = start_gateway_server()
        print(f"Gateway listening at http://127.0.0.1:{PORT} and proxying to vLLM port {VLLM_PORT}.")

        stage("Launch ngrok MCP Tunnel")
        ngrok_auth = configure_ngrok_mcp_credentials()
        ngrok_listener, ngrok_public_url = launch_ngrok_mcp_tunnel()
        CURRENT_PUBLIC_URL = ngrok_public_url

        runtime_payload: Dict[str, object] = {
            "success": True,
            "model_id": MODEL_ID,
            "host": HOST,
            "port": PORT,
            "vllm_backend_port": VLLM_PORT,
            "dtype": DTYPE,
            "max_model_len": MAX_MODEL_LEN,
            "gpu_memory_utilization": GPU_MEMORY_UTILIZATION,
            "max_num_seqs": MAX_NUM_SEQS,
            "cpu_offload_gb": CPU_OFFLOAD_GB,
            "attention_backend": ATTENTION_BACKEND,
            "enforce_eager": ENFORCE_EAGER,
            "tunnel_provider": "ngrok",
            "ngrok_public_url": ngrok_public_url,
            "openai_base_url": f"{ngrok_public_url}/v1",
            "ngrok_auth": ngrok_auth,
        }
        write_runtime_status(runtime_payload)

        print("SERVER_READY: true")
        print(f"NGROK_PUBLIC_URL: {ngrok_public_url}")
        print(f"OPENAI_BASE_URL: {ngrok_public_url}/v1")
        print(f"LANDING_URL: {ngrok_public_url}/")
        print(f"MODEL_ID: {MODEL_ID}")
        print(json.dumps(runtime_payload, indent=2))

        stage("Keep Server Running")
        while True:
            if vllm_proc.poll() is not None:
                print("vLLM exited; restarting vLLM and refreshing tunnel.")
                try:
                    vllm_proc = subprocess.Popen(vllm_command, text=True)
                    wait_for_local_api(vllm_proc=vllm_proc, timeout_seconds=900)
                    close_ngrok_listener(ngrok_listener)
                    ngrok_listener = None
                    print("vLLM restart complete.")
                except Exception as restart_exc:
                    print(f"vLLM restart failed: {restart_exc}")
                    time.sleep(10)
                    continue

            if ngrok_listener is None or not ngrok_listener_running(ngrok_listener):
                print("ngrok listener not running; attempting restart.")
                try:
                    ngrok_listener, ngrok_public_url = launch_ngrok_mcp_tunnel()
                    CURRENT_PUBLIC_URL = ngrok_public_url
                    runtime_payload["ngrok_public_url"] = ngrok_public_url
                    runtime_payload["openai_base_url"] = f"{ngrok_public_url}/v1"
                    write_runtime_status(runtime_payload)
                    print(f"ngrok restart complete: {ngrok_public_url}")
                except Exception as tunnel_exc:
                    print(f"ngrok restart exception: {tunnel_exc}")
                    ngrok_listener = None
                    time.sleep(10)
                    continue
            time.sleep(15)

    except Exception as exc:
        error_payload: Dict[str, object] = {
            "success": False,
            "model_id": MODEL_ID,
            "error": str(exc),
        }
        write_runtime_status(error_payload)
        print(json.dumps(error_payload, indent=2))
        close_ngrok_listener(ngrok_listener)
        stop_gateway_server(gateway_server)
        terminate_process(vllm_proc, "vLLM")
        raise


if __name__ == "__main__":
    main()
