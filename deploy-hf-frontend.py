"""Deploy the static full-app frontend Space for MathPulse AI.

Usage:
    python deploy-hf-frontend.py --token YOUR_HF_TOKEN

This script uploads built frontend assets from build/ to:
    Deign86/mathpulse-ai
"""

import argparse
import io
from pathlib import Path

from huggingface_hub import HfApi, login

SPACE_ID = "Deign86/mathpulse-ai"
ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT / "build"

SPACE_README = """---
title: MathPulse AI
emoji: "📐"
colorFrom: blue
colorTo: purple
sdk: static
pinned: false
---
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy MathPulse static frontend Space")
    parser.add_argument("--token", required=True, help="Hugging Face write token")
    args = parser.parse_args()

    login(token=args.token)
    api = HfApi(token=args.token)

    user = api.whoami()
    print(f"Authenticated as: {user['name']}")

    if not BUILD_DIR.exists():
        raise FileNotFoundError("build/ directory not found. Run npm run build first.")

    api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        space_sdk="static",
        private=False,
        exist_ok=True,
    )
    print(f"Space ready: {SPACE_ID}")

    api.upload_folder(
        repo_id=SPACE_ID,
        repo_type="space",
        folder_path=str(BUILD_DIR),
        path_in_repo=".",
        commit_message="Deploy static frontend build",
    )
    print("Uploaded build/ folder")

    api.upload_file(
        path_or_fileobj=io.BytesIO(SPACE_README.encode("utf-8")),
        path_in_repo="README.md",
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print("Uploaded: README.md")

    api.restart_space(repo_id=SPACE_ID)
    runtime = api.get_space_runtime(repo_id=SPACE_ID)
    print("Runtime status:", {"stage": str(runtime.stage), "hardware": str(runtime.hardware)})

    print(f"Deployment complete: https://huggingface.co/spaces/{SPACE_ID}")


if __name__ == "__main__":
    main()
