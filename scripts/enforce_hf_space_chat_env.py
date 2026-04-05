#!/usr/bin/env python3
"""Enforce global/default Hugging Face Space model environment variables.

This script keeps backend routing pinned to the intended provider and model by
setting INFERENCE_MODEL_ID, INFERENCE_CHAT_MODEL_ID, INFERENCE_PROVIDER, and
chat strict-mode routing flags.
"""

from __future__ import annotations

import argparse
import os
import sys

from huggingface_hub import HfApi

DEFAULT_SPACE_ID = "Deign86/mathpulse-api-v3test"
DEFAULT_CHAT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_GLOBAL_MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_PROVIDER = "hf_inference"
DEFAULT_CHAT_STRICT_MODEL_ONLY = "true"
DEFAULT_CHAT_HARD_TRIGGER_ENABLED = "false"
DEFAULT_ENFORCE_QWEN_ONLY = "true"
DEFAULT_QWEN_LOCK_MODEL = "Qwen/Qwen2.5-7B-Instruct"
GLOBAL_MODEL_KEY = "INFERENCE_MODEL_ID"
TEMP_CHAT_MODEL_KEY = "INFERENCE_CHAT_MODEL_TEMP_OVERRIDE"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enforce backend Space model env variables")
    parser.add_argument("--space-id", default=DEFAULT_SPACE_ID, help="HF Space repo id (owner/name)")
    parser.add_argument("--hf-token", default=os.getenv("HF_TOKEN", ""), help="HF token with write access")
    parser.add_argument("--chat-model", default=DEFAULT_CHAT_MODEL, help="Model id for INFERENCE_CHAT_MODEL_ID")
    parser.add_argument("--global-model", default=DEFAULT_GLOBAL_MODEL, help="Model id for INFERENCE_MODEL_ID")
    parser.add_argument("--provider", default=DEFAULT_PROVIDER, help="Provider id for INFERENCE_PROVIDER")
    parser.add_argument(
        "--chat-strict-model-only",
        default=DEFAULT_CHAT_STRICT_MODEL_ONLY,
        help="Value for INFERENCE_CHAT_STRICT_MODEL_ONLY (true/false)",
    )
    parser.add_argument(
        "--chat-hard-trigger-enabled",
        default=DEFAULT_CHAT_HARD_TRIGGER_ENABLED,
        help="Value for INFERENCE_CHAT_HARD_TRIGGER_ENABLED (true/false)",
    )
    parser.add_argument(
        "--enforce-qwen-only",
        default=DEFAULT_ENFORCE_QWEN_ONLY,
        help="Value for INFERENCE_ENFORCE_QWEN_ONLY (true/false)",
    )
    parser.add_argument(
        "--qwen-lock-model",
        default=DEFAULT_QWEN_LOCK_MODEL,
        help="Value for INFERENCE_QWEN_LOCK_MODEL",
    )
    parser.add_argument(
        "--global-model-key",
        default=GLOBAL_MODEL_KEY,
        help="Env key used for global model override",
    )
    parser.add_argument(
        "--clear-global-model",
        action="store_true",
        help="Delete/clear global model override key instead of setting it",
    )
    parser.add_argument(
        "--temp-chat-model",
        default="",
        help="Optional temporary chat override model for INFERENCE_CHAT_MODEL_TEMP_OVERRIDE",
    )
    parser.add_argument(
        "--clear-temp-chat-model",
        action="store_true",
        help="Delete/clear temporary chat model override key",
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
        _set_variable(
            api,
            repo_id=space_id,
            key="INFERENCE_CHAT_STRICT_MODEL_ONLY",
            value=args.chat_strict_model_only.strip().lower(),
        )
        _set_variable(
            api,
            repo_id=space_id,
            key="INFERENCE_CHAT_HARD_TRIGGER_ENABLED",
            value=args.chat_hard_trigger_enabled.strip().lower(),
        )
        _set_variable(
            api,
            repo_id=space_id,
            key="INFERENCE_ENFORCE_QWEN_ONLY",
            value=args.enforce_qwen_only.strip().lower(),
        )
        _set_variable(
            api,
            repo_id=space_id,
            key="INFERENCE_QWEN_LOCK_MODEL",
            value=args.qwen_lock_model.strip(),
        )
        _set_variable(
            api,
            repo_id=space_id,
            key="INFERENCE_FALLBACK_MODELS",
            value="",
        )

        if args.clear_global_model:
            _clear_variable(api, repo_id=space_id, key=args.global_model_key.strip())
        else:
            _set_variable(api, repo_id=space_id, key=args.global_model_key.strip(), value=args.global_model.strip())

        temp_chat_model = args.temp_chat_model.strip()
        if args.clear_temp_chat_model:
            _clear_variable(api, repo_id=space_id, key=TEMP_CHAT_MODEL_KEY)
        elif temp_chat_model:
            _set_variable(api, repo_id=space_id, key=TEMP_CHAT_MODEL_KEY, value=temp_chat_model)

        print("[done] Space env enforcement completed")
        return 0
    except Exception as exc:
        print(f"[error] Failed to enforce Space vars: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
