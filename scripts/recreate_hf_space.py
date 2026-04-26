#!/usr/bin/env python3
"""Delete and recreate HF Space Deign86/mathpulse-api-v3test with all settings intact."""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

from huggingface_hub import HfApi

SPACE_ID = "Deign86/mathpulse-api-v3test"
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise SystemExit("HF_TOKEN not set in environment")

api = HfApi(token=HF_TOKEN)

backend_dir = Path(__file__).resolve().parent.parent / "backend"
if not backend_dir.exists():
    raise SystemExit(f"Backend dir not found: {backend_dir}")

print("Step 1: Fetch current space settings and secrets...")
try:
    space_info = api.get_space_runtime(SPACE_ID)
    print(f"  SDK: {space_info.sdk}, Stage: {space_info.stage}")
except Exception as e:
    print(f"  Could not get space runtime: {e}")

try:
    config = api.get_space_config(SPACE_ID)
    print(f"  Storage size: {config.get('storageSize', 'N/A')}")
    print(f"  Max offline users: {config.get('maxOfflineUsers', 'N/A')}")
except Exception as e:
    print(f"  Could not get space config: {e}")

print("\nStep 2: Delete existing space...")
try:
    api.delete_repo(SPACE_ID, repo_type="space")
    print("  Deleted successfully")
except Exception as e:
    print(f"  Delete error: {e}")

print("\nStep 3: Recreate space with correct SDK and port...")
try:
    api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        space_sdk="docker",
        exist_ok=False,
    )
    print("  Created successfully")
except Exception as e:
    print(f"  Create error: {e}")
    raise

tmpdir = Path(tempfile.mkdtemp(prefix="hf-space-"))
try:
    hf_dir = tmpdir / "hf-space"
    hf_dir.mkdir()

    print("\nStep 4: Copy backend files to temp dir...")

    import subprocess

    def copy_dir(src: Path, dst: Path, excludes: list[str]):
        dst.mkdir(parents=True, exist_ok=True)
        for item in src.rglob("*"):
            if any(ex in item.parts for ex in excludes):
                continue
            rel = item.relative_to(src)
            dst_item = dst / rel
            if item.is_dir():
                dst_item.mkdir(parents=True, exist_ok=True)
            else:
                dst_item.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dst_item)

    excludes = [".git", "__pycache__"]
    copy_dir(backend_dir, hf_dir, excludes)
    for pyc in hf_dir.rglob("*.pyc"):
        pyc.unlink()
    print(f"  Copied {backend_dir} -> {hf_dir}")

    print("\nStep 5: Upload files to new space...")

    api.upload_folder(
        repo_id=SPACE_ID,
        repo_type="space",
        folder_path=str(hf_dir),
        commit_message="Initial upload from MATHPULSE-AI repo",
    )
    print("  Uploaded successfully")

finally:
    shutil.rmtree(tmpdir, ignore_errors=True)

print("\nStep 6: Set space secrets (read-only keys)...")
secrets_to_set = {
    "HF_TOKEN": HF_TOKEN,
    "FIREBASE_SERVICE_ACCOUNT_JSON": os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
    "FIREBASE_AUTH_PROJECT_ID": os.environ.get("FIREBASE_AUTH_PROJECT_ID", ""),
    "HUGGING_FACE_API_TOKEN": os.environ.get("HUGGING_FACE_API_TOKEN", ""),
    "HUGGINGFACE_API_TOKEN": os.environ.get("HUGGINGFACE_API_TOKEN", ""),
    "NVIDIA_API_KEY": os.environ.get("NVIDIA_API_KEY", ""),
    "LLM_API_KEY": os.environ.get("LLM_API_KEY", ""),
}

for key, value in secrets_to_set.items():
    if value:
        try:
            api.add_space_secret(SPACE_ID, key, value)
            print(f"  Set secret: {key}")
        except Exception as e:
            print(f"  Failed to set secret {key}: {e}")

print("\nStep 7: Set space variables (non-secret env vars)...")
variables_to_set = {
    "INFERENCE_INTERACTIVE_TIMEOUT_SEC": "120",
    "INFERENCE_MAX_NEW_TOKENS": "2048",
    "INFERENCE_CHAT_HARD_PROMPT_CHARS": "32000",
    "INFERENCE_CHAT_HARD_HISTORY_CHARS": "16000",
    "INFERENCE_CHAT_HARD_KEYWORDS": "Qwen,Qwen3,Qwen3-32B",
    "CHAT_MAX_NEW_TOKENS": "2048",
    "INFERENCE_CHAT_MODEL_ID": "Qwen/Qwen3-32B",
    "INFERENCE_MODEL_ID_BACKUP": "Qwen/Qwen2.5-72B-Instruct",
    "INFERENCE_CHAT_MODEL_ID_BACKUP": "Qwen/Qwen2.5-72B-Instruct",
    "INFERENCE_PROVIDER": "hf_inference",
    "INFERENCE_ENABLE_PROVIDER_FALLBACK": "true",
    "INFERENCE_GPU_PROVIDER": "sgl",
    "INFERENCE_CPU_PROVIDER": "hf_inference",
    "LORA_BASE_MODEL_ID": "Qwen/Qwen3-32B",
    "LORA_ADAPTER_MODEL_ID": "",
    "LORA_LOAD_IN_4BIT": "false",
    "LORA_DEVICE_MAP": "auto",
    "LORA_DTYPE": "auto",
    "LORA_MAX_NEW_TOKENS": "2048",
    "LOCAL_STREAM_CHUNK_SIZE": "8",
    "CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC": "30",
    "CHAT_STREAM_TOTAL_TIMEOUT_SEC": "300",
    "LOCAL_PEFT_STREAM_TOKEN_TIMEOUT_SEC": "30",
    "LOCAL_PEFT_WORKER_JOIN_TIMEOUT_SEC": "30",
    "LOCAL_PEFT_GENERATE_MAX_TIME_SEC": "180",
    "LOCAL_PEFT_LOG_MEMORY": "false",
    "LORA_CACHE_DIR": "/tmp/lora_cache",
    "LLM_PROVIDER": "sgl",
    "LLM_BASE_URL": "https://api.nvcf.nvidia.com/v2",
    "LLM_MODEL": "meta/llama-4-maverick-17b-128e-instruct",
    "LLM_FALLBACK_PROVIDER": "openai",
    "LLM_ENABLE_THINKING": "true",
    "INFERENCE_LOCAL_SPACE_URL": "https://deign86-mathpulse-api-v3test.hf.space",
}

for key, value in variables_to_set.items():
    try:
        api.add_space_variable(SPACE_ID, key, value)
        print(f"  Set variable: {key}={value}")
    except Exception as e:
        print(f"  Failed to set variable {key}: {e}")

print(f"\nDone! Space recreated at https://huggingface.co/spaces/{SPACE_ID}")