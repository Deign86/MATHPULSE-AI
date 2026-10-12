#!/usr/bin/env python3
"""Set HF Space secrets for Deign86/mathpulse-api-v3test.

This sets all required backend secrets:
- FIREBASE_SERVICE_ACCOUNT_JSON (from .secrets/firebase-service-account.json)
- ANTHROPIC_API_KEY
- ANTHROPIC_WORKSPACE_ID (only when set in the environment)
"""

from __future__ import annotations

import json
import os
import sys

import requests
from huggingface_hub import HfApi


SPACE_ID = "Deign86/mathpulse-api-v3test"
HF_API_BASE = "https://huggingface.co/api"

HF_TOKEN = (os.environ.get("HF_TOKEN") or os.environ.get("HF_PROXY_TOKEN") or "").strip().lstrip("\ufeff")
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

# Read ANTHROPIC_API_KEY from environment
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
if not ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not set in environment.")
    sys.exit(1)

# Only needed when the API key is not scoped to a workspace
ANTHROPIC_WORKSPACE_ID = os.environ.get("ANTHROPIC_WORKSPACE_ID", "").strip()

print(f"Setting secrets for {SPACE_ID}...")


def _delete_secret(key: str) -> None:
    """Delete a secret using raw HF API (more reliable than huggingface_hub wrapper)."""
    url = f"{HF_API_BASE}/spaces/{SPACE_ID}/secrets/{key}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    resp = requests.delete(url, headers=headers)
    if resp.status_code == 200:
        print(f"  [CLEANUP] Deleted secret: {key}")
    elif resp.status_code == 404:
        print(f"  [CLEANUP] Secret not found (skip): {key}")
    else:
        print(f"  [CLEANUP] Delete secret {key}: {resp.status_code} {resp.text[:100]}")


# Secrets (sensitive values - use add_space_secret)
secrets = {
    "FIREBASE_SERVICE_ACCOUNT_JSON": FIREBASE_SERVICE_ACCOUNT_JSON,
    "ANTHROPIC_API_KEY": ANTHROPIC_API_KEY,
    # Keep deployments aligned with the canonical curriculum embedding model.
    "EMBEDDING_MODEL": "BAAI/bge-small-en-v1.5",
}
if ANTHROPIC_WORKSPACE_ID:
    secrets["ANTHROPIC_WORKSPACE_ID"] = ANTHROPIC_WORKSPACE_ID

for key, value in secrets.items():
    # Clean up any existing secret/variable with same name FIRST
    _delete_secret(key)
    api.add_space_secret(SPACE_ID, key, value)
    print(f"  [OK] Set secret: {key}")

# Variables (non-sensitive config)
variables = {
    "INFERENCE_INTERACTIVE_TIMEOUT_SEC": "120",
    "INFERENCE_MAX_NEW_TOKENS": "2048",
    "INFERENCE_CHAT_MODEL_ID": "claude-haiku-5-5",
    "CHAT_MAX_NEW_TOKENS": "2048",
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