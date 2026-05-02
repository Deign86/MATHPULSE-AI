#!/usr/bin/env python3
"""Set HF Space secrets for Deign86/mathpulse-api-v3test."""

from __future__ import annotations

import os
import sys

from huggingface_hub import HfApi


SPACE_ID = "Deign86/mathpulse-api-v3test"

HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HF_PROXY_TOKEN")
if not HF_TOKEN:
    print("ERROR: HF_TOKEN not set. Please set HF_TOKEN env var.")
    sys.exit(1)

api = HfApi(token=HF_TOKEN)

print("Setting secrets for {}...".format(SPACE_ID))

secrets = {
    "HF_TOKEN": HF_TOKEN,
}

for key, value in secrets.items():
    try:
        api.add_space_secret(SPACE_ID, key, value)
        print("  [OK] Set secret: {}".format(key))
    except Exception as e:
        print("  [X] Failed to set {}: {}".format(key, e))

variables = {
    "INFERENCE_INTERACTIVE_TIMEOUT_SEC": "120",
    "INFERENCE_MAX_NEW_TOKENS": "2048",
    "INFERENCE_CHAT_HARD_PROMPT_CHARS": "32000",
    "INFERENCE_CHAT_MODEL_ID": "Qwen/Qwen3-32B",
    "INFERENCE_MODEL_ID_BACKUP": "Qwen/Qwen2.5-72B-Instruct",
    "INFERENCE_CHAT_MODEL_ID_BACKUP": "Qwen/Qwen2.5-72B-Instruct",
    "INFERENCE_PROVIDER": "hf_inference",
    "INFERENCE_ENABLE_PROVIDER_FALLBACK": "true",
    "INFERENCE_GPU_PROVIDER": "sgl",
    "INFERENCE_CPU_PROVIDER": "hf_inference",
    "CHAT_MAX_NEW_TOKENS": "2048",
    "LOCAL_STREAM_CHUNK_SIZE": "8",
    "CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC": "30",
    "MODEL_PROFILE": "dev",
    "FIREBASE_AUTH_PROJECT_ID": "mathpulse-ai-2026",
}

for key, value in variables.items():
    try:
        api.add_space_variable(SPACE_ID, key, value)
        print("  [OK] Set variable: {}={}".format(key, value))
    except Exception as e:
        print("  [X] Failed to set {}: {}".format(key, e))

print("\nDone!")