"""Deploy the dedicated ZeroGPU inference Space for MathPulse AI.

Usage:
    python deploy-hf-inference.py --token YOUR_HF_TOKEN [--recreate]

This script uploads the Gradio inference runtime files to:
    Deign86/mathpulse-inference-zerogpu
"""

import argparse
import io
from pathlib import Path

from huggingface_hub import HfApi, SpaceHardware, login

SPACE_ID = "Deign86/mathpulse-inference-zerogpu"
ROOT = Path(__file__).resolve().parent

SPACE_README = """---
title: MathPulse Inference ZeroGPU
emoji: "🧮"
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
python_version: 3.11
pinned: false
---

# MathPulse Inference ZeroGPU

Dedicated inference service for high-GPU MathPulse generation tasks.
"""


def upload_required_file(api: HfApi, local_path: Path, repo_path: str) -> None:
    if not local_path.exists() or not local_path.is_file():
        raise FileNotFoundError(f"Missing required file: {local_path}")
    api.upload_file(
        path_or_fileobj=str(local_path),
        path_in_repo=repo_path,
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print(f"Uploaded: {repo_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy MathPulse ZeroGPU inference Space")
    parser.add_argument("--token", required=True, help="Hugging Face write token")
    parser.add_argument("--recreate", action="store_true", help="Delete and recreate the Space first")
    args = parser.parse_args()

    login(token=args.token)
    api = HfApi(token=args.token)

    user = api.whoami()
    print(f"Authenticated as: {user['name']}")

    if args.recreate:
        try:
            api.delete_repo(repo_id=SPACE_ID, repo_type="space")
            print(f"Deleted Space: {SPACE_ID}")
        except Exception as exc:
            print(f"Delete skipped: {exc}")

    api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        space_sdk="gradio",
        space_hardware=SpaceHardware.ZERO_A10G,
        private=False,
        exist_ok=True,
    )
    print(f"Space ready: {SPACE_ID}")

    upload_required_file(api, ROOT / "app.py", "app.py")
    upload_required_file(api, ROOT / "requirements.txt", "requirements.txt")
    upload_required_file(api, ROOT / "backend" / "services" / "__init__.py", "backend/services/__init__.py")
    upload_required_file(api, ROOT / "backend" / "services" / "logging_utils.py", "backend/services/logging_utils.py")
    upload_required_file(api, ROOT / "config" / "models.yaml", "config/models.yaml")

    api.upload_file(
        path_or_fileobj=io.BytesIO(SPACE_README.encode("utf-8")),
        path_in_repo="README.md",
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print("Uploaded: README.md")

    api.request_space_hardware(repo_id=SPACE_ID, hardware=SpaceHardware.ZERO_A10G)
    api.restart_space(repo_id=SPACE_ID)
    runtime = api.get_space_runtime(repo_id=SPACE_ID)
    print(
        "Runtime status:",
        {
            "stage": str(runtime.stage),
            "requested_hardware": str(runtime.requested_hardware),
            "hardware": str(runtime.hardware),
        },
    )

    print(f"Deployment complete: https://huggingface.co/spaces/{SPACE_ID}")


if __name__ == "__main__":
    main()
