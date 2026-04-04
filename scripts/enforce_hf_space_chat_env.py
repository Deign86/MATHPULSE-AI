#!/usr/bin/env python3
"""Enforce chat-focused Hugging Face Space environment variables.

This script keeps backend chat routing pinned to the intended model/provider by
setting INFERENCE_CHAT_MODEL_ID and INFERENCE_PROVIDER, and clearing the global
INFERENCE_MODEL_ID override unless explicitly disabled.
"""

from __future__ import annotations

import argparse
import os
import sys

from huggingface_hub import HfApi

DEFAULT_SPACE_ID = "Deign86/mathpulse-api-v3test"
DEFAULT_CHAT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_PROVIDER = "hf_inference"
GLOBAL_MODEL_KEY = "INFERENCE_MODEL_ID"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enforce backend Space chat env variables")
    parser.add_argument("--space-id", default=DEFAULT_SPACE_ID, help="HF Space repo id (owner/name)")
    parser.add_argument("--hf-token", default=os.getenv("HF_TOKEN", ""), help="HF token with write access")
    parser.add_argument("--chat-model", default=DEFAULT_CHAT_MODEL, help="Model id for INFERENCE_CHAT_MODEL_ID")
    parser.add_argument("--provider", default=DEFAULT_PROVIDER, help="Provider id for INFERENCE_PROVIDER")
    parser.add_argument(
        "--global-model-key",
        default=GLOBAL_MODEL_KEY,
        help="Env key to clear so task maps are not globally overridden",
    )
    parser.add_argument(
        "--keep-global-model",
        action="store_true",
        help="Keep global model override key instead of deleting/clearing it",
    )
    return parser.parse_args()


def _set_variable(api: HfApi, *, repo_id: str, key: str, value: str) -> None:
    api.add_space_variable(repo_id=repo_id, key=key, value=value)
    print(f"[ok] set {key}={value}")


def _clear_variable(api: HfApi, *, repo_id: str, key: str) -> None:
    deleted = False
    if hasattr(api, "delete_space_variable"):
        try:
            api.delete_space_variable(repo_id=repo_id, key=key)
            deleted = True
            print(f"[ok] deleted {key}")
        except Exception as exc:
            print(f"[warn] delete {key} failed: {exc}")

    if not deleted:
        api.add_space_variable(repo_id=repo_id, key=key, value="")
        print(f"[ok] cleared {key} by setting empty value")


def main() -> int:
    args = parse_args()

    token = (args.hf_token or "").strip()
    if not token:
        print("[error] HF token is required. Pass --hf-token or set HF_TOKEN.")
        return 1

    space_id = (args.space_id or "").strip()
    if not space_id:
        print("[error] --space-id must not be empty")
        return 1

    api = HfApi(token=token)

    try:
        _set_variable(api, repo_id=space_id, key="INFERENCE_CHAT_MODEL_ID", value=args.chat_model.strip())
        _set_variable(api, repo_id=space_id, key="INFERENCE_PROVIDER", value=args.provider.strip().lower())

        if not args.keep_global_model:
            _clear_variable(api, repo_id=space_id, key=args.global_model_key.strip())

        print("[done] Space env enforcement completed")
        return 0
    except Exception as exc:
        print(f"[error] Failed to enforce Space vars: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
