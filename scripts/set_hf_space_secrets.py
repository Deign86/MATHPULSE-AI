#!/usr/bin/env python3
"""Set HF Space secrets for Deign86/mathpulse-api-v3test.

This sets all required backend secrets:
- FIREBASE_SERVICE_ACCOUNT_JSON (from .secrets/firebase-service-account.json)
- DEEPSEEK_API_KEY
- DEEPSEEK_BASE_URL
- INFERENCE_PROVIDER
"""

from __future__ import annotations

import json
import os
import sys

from huggingface_hub import HfApi


SPACE_ID = "Deign86/mathpulse-api-v3test"

HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HF_PROXY_TOKEN")
if not HF_TOKEN:
    print("ERROR: HF_TOKEN not set. Please set HF_TOKEN env var.")
    sys.exit(1)

api = HfApi(token=HF_TOKEN)

# Read Firebase service account JSON
FIREBASE_SA_FILE = ".secrets/firebase-service-account.json"
if not os.path.exists(FIREBASE_SA_FILE):
    print(f"ERROR: {FIREBASE_SA_FILE} not found. Please place Firebase service account there.")
    sys.exit(1)

with open(FIREBASE_SA_FILE, "r") as f:
    FIREBASE_SERVICE_ACCOUNT_JSON = f.read()

# Validate JSON
try:
    json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
except json.JSONDecodeError as e:
    print(f"ERROR: {FIREBASE_SA_FILE} is not valid JSON: {e}")
    sys.exit(1)

# Read DEEPSEEK_API_KEY from environment
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not DEEPSEEK_API_KEY:
    print("ERROR: DEEPSEEK_API_KEY not set in environment.")
    sys.exit(1)

print(f"Setting secrets for {SPACE_ID}...")

# Secrets (sensitive values - use add_space_secret)
secrets = {
    "FIREBASE_SERVICE_ACCOUNT_JSON": FIREBASE_SERVICE_ACCOUNT_JSON,
    "DEEPSEEK_API_KEY": DEEPSEEK_API_KEY,
    "DEEPSEEK_BASE_URL": "https://api.deepseek.com",
    "INFERENCE_PROVIDER": "deepseek",
}

for key, value in secrets.items():
    try:
        api.add_space_secret(SPACE_ID, key, value)
        print(f"  [OK] Set secret: {key}")
    except Exception as e:
        print(f"  [X] Failed to set {key}: {e}")
        raise

# Variables (non-sensitive config)
variables = {
    "HF_TOKEN": HF_TOKEN,
    "INFERENCE_INTERACTIVE_TIMEOUT_SEC": "120",
    "INFERENCE_MAX_NEW_TOKENS": "2048",
    "INFERENCE_CHAT_HARD_PROMPT_CHARS": "32000",
    "INFERENCE_CHAT_MODEL_ID": "deepseek-chat",
    "INFERENCE_MODEL_ID_BACKUP": "deepseek-reasoner",
    "INFERENCE_CHAT_MODEL_ID_BACKUP": "deepseek-reasoner",
    "INFERENCE_PROVIDER": "deepseek",
    "INFERENCE_ENABLE_PROVIDER_FALLBACK": "false",
    "INFERENCE_GPU_PROVIDER": "deepseek",
    "INFERENCE_CPU_PROVIDER": "deepseek",
    "CHAT_MAX_NEW_TOKENS": "2048",
    "LOCAL_STREAM_CHUNK_SIZE": "8",
    "CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC": "30",
    "MODEL_PROFILE": "prod",
    "FIREBASE_AUTH_PROJECT_ID": "mathpulse-ai-2026",
}

for key, value in variables.items():
    try:
        api.add_space_variable(SPACE_ID, key, value)
        print(f"  [OK] Set variable: {key}={value}")
    except Exception as e:
        print(f"  [X] Failed to set {key}: {e}")

print("\n✅ All secrets and variables set successfully!")