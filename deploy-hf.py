"""
Deploy MathPulse AI backend to HuggingFace Spaces.

Usage:
    python deploy-hf.py [--recreate] [--skip-restart] [--wait-timeout-sec 600]

This script will:
1. Authenticate with Hugging Face (use: huggingface-cli login)
2. Ensure mathpulse-api space exists (or recreate with --recreate)
3. Upload the backend files to the space
4. Set inference routing configuration variables
5. Optionally restart runtime

SECURITY: HF_TOKEN is NOT set by this script.
Use set-hf-secrets.py to securely set HF_TOKEN as a Space SECRET.

Safety:
- This script only manages backend code and public variables
- No credentials are embedded or passed via CLI arguments
"""
import argparse
import io
import os
import time

from huggingface_hub import HfApi

SPACE_ID = "Deign86/mathpulse-api-v3test"
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
DEFAULT_FRONTEND_SPACE_URL = "https://huggingface.co/spaces/Deign86/mathpulse-ai"

SPACE_README = """---
title: MathPulse AI API
emoji: "🧮"
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# MathPulse AI Backend

FastAPI backend for the MathPulse AI educational platform.
"""


def _upload_tree(api: HfApi, repo_id: str, source_root: str, target_root: str) -> None:
    """Upload a directory recursively while skipping cache/build artifacts."""
    if not os.path.isdir(source_root):
        print(f"Warning: directory not found: {source_root}")
        return

    for current_root, dirnames, filenames in os.walk(source_root):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for filename in filenames:
            if filename.endswith(".pyc"):
                continue

            local_path = os.path.join(current_root, filename)
            relative_path = os.path.relpath(local_path, source_root).replace(os.sep, "/")
            remote_path = f"{target_root}/{relative_path}"
            api.upload_file(
                path_or_fileobj=local_path,
                path_in_repo=remote_path,
                repo_id=repo_id,
                repo_type="space",
            )
            print(f"Uploaded: {remote_path}")


def _wait_for_runtime(api: HfApi, repo_id: str, timeout_sec: int) -> None:
    """Poll runtime stage and print clear status while the Space boots."""
    if timeout_sec <= 0:
        return

    start_ts = time.time()
    while True:
        runtime = api.get_space_runtime(repo_id=repo_id)
        stage = str(runtime.stage)
        requested_hardware = getattr(runtime, "requested_hardware", None)
        current_hardware = getattr(runtime, "hardware", None)
        print(
            "Runtime status:",
            {
                "stage": stage,
                "requested_hardware": str(requested_hardware),
                "current_hardware": str(current_hardware),
            },
        )

        if stage == "RUNNING":
            return

        elapsed = time.time() - start_ts
        if elapsed >= timeout_sec:
            print(
                "Runtime did not reach RUNNING before timeout. "
                "Inspect Space logs in HF UI if stage stays APP_STARTING/BUILDING.",
            )
            return
        time.sleep(10)


def main():
    parser = argparse.ArgumentParser(description="Deploy MathPulse backend to HuggingFace Spaces")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Delete and recreate the backend space before upload",
    )
    parser.add_argument(
        "--local-space-url",
        default=DEFAULT_FRONTEND_SPACE_URL,
        help=(
            "Value for INFERENCE_LOCAL_SPACE_URL. Can be either the Space page URL "
            "(https://huggingface.co/spaces/<owner>/<space>) or hf.space host URL."
        ),
    )
    parser.add_argument(
        "--skip-restart",
        action="store_true",
        help="Do not restart the Space runtime after deployment/variable update.",
    )
    parser.add_argument(
        "--wait-timeout-sec",
        type=int,
        default=300,
        help="How long to wait for runtime to reach RUNNING (0 disables waiting).",
    )
    args = parser.parse_args()

    print("🔐 Using cached Hugging Face login. Authenticate via: huggingface-cli login")
    api = HfApi()

    user = api.whoami()
    print(f"Authenticated as: {user['name']}")

    # Step 1: Optionally recreate backend space only
    if args.recreate:
        try:
            api.delete_repo(repo_id=SPACE_ID, repo_type="space")
            print(f"Deleted space: {SPACE_ID}")
        except Exception as e:
            print(f"Could not delete {SPACE_ID}: {e}")

    # Step 2: Ensure backend space exists
    print(f"\nEnsuring space exists: {SPACE_ID}")
    api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        space_sdk="docker",
        private=False,
        exist_ok=True,
    )
    print(f"Space ready: {SPACE_ID}")

    # Step 3: Upload backend runtime files in ONE commit to avoid rebuild loops.
    allow_patterns = [
        "main.py",
        "analytics.py",
        "automation_engine.py",
        "requirements.txt",
        ".dockerignore",
        "Dockerfile",
        "services/**",
        "models/**",
        "config/**",
    ]
    api.upload_folder(
        folder_path=BACKEND_DIR,
        repo_id=SPACE_ID,
        repo_type="space",
        path_in_repo=".",
        allow_patterns=allow_patterns,
        ignore_patterns=["**/__pycache__/**", "**/*.pyc"],
        commit_message="Deploy backend runtime + config (atomic upload, single rebuild)",
    )
    print("Uploaded backend runtime files and config (single commit)")
    
    # Step 3b removed: config now included in atomic backend upload

    # Always upload normalized README metadata for stable Space parsing.
    api.upload_file(
        path_or_fileobj=io.BytesIO(SPACE_README.encode("utf-8")),
        path_in_repo="README.md",
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print("Uploaded: README.md (normalized Space metadata)")

    # ⚠️  Only set critical variables once, avoid repeated space variable updates
    # which trigger unnecessary restarts. Config is now loaded from config/models.yaml.
    try:
        api.add_space_variable(
            repo_id=SPACE_ID,
            key="INFERENCE_LOCAL_SPACE_URL",
            value=args.local_space_url,
        )
        api.add_space_variable(
            repo_id=SPACE_ID,
            key="INFERENCE_PROVIDER",
            value="hf_inference",
        )
        print(f"✅ Space variables updated (runtime will auto-restart once)")
    except Exception as e:
        print(f"⚠️  Space variable update skipped: {e}")
    
    # ⚠️  HF_TOKEN should NEVER be set as a Space VARIABLE (public/exposed).
    # Use set-hf-secrets.py to set it as a proper SECRET instead.
    print(f"\n⚠️  IMPORTANT: HF_TOKEN must be set as a SECRET (not variable)")
    print(f"   Use: python set-hf-secrets.py --hf-token YOUR_TOKEN --hf-secret YOUR_HF_TOKEN_VALUE")

    if not args.skip_restart:
        print("\n⏳ Waiting for Space runtime to stabilize...")
        time.sleep(5)  # Give Space time to auto-restart from variable update
    
    _wait_for_runtime(api, SPACE_ID, args.wait_timeout_sec if not args.skip_restart else 0)

    print(f"\n✅ Deployment complete!")
    print(f"Space URL: https://huggingface.co/spaces/{SPACE_ID}")
    print(f"API URL: https://{SPACE_ID.replace('/', '-').lower()}.hf.space")
    print(f"\n🔐 NEXT STEP - Set HF_TOKEN as a SECRET (not a variable):")
    print(f"   python set-hf-secrets.py --hf-token <YOUR_HF_TOKEN> --hf-secret <HF_TOKEN_VALUE>")


if __name__ == "__main__":
    main()
