"""
Deploy MathPulse AI backend to HuggingFace Spaces.

Usage:
    python deploy-hf.py --token YOUR_HF_TOKEN [--recreate]

This script will:
1. Authenticate with Hugging Face
2. Ensure mathpulse-api space exists (or recreate it when --recreate is used)
3. Upload the backend files to the space

Safety:
- This script only manages the backend space and never touches frontend spaces.
"""
import argparse
import io
import os

from huggingface_hub import HfApi, login

SPACE_ID = "Deign86/mathpulse-api-v3test"
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

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
            if filename == ".gitkeep" or filename.endswith(".pyc"):
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


def main():
    parser = argparse.ArgumentParser(description="Deploy MathPulse backend to HuggingFace Spaces")
    parser.add_argument("--token", required=True, help="HuggingFace API token (write access)")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Delete and recreate the backend space before upload",
    )
    args = parser.parse_args()

    login(token=args.token)
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

    # Step 3: Upload backend files (include ALL Python modules imported by main.py)
    files_to_upload = [
        "main.py",
        "analytics.py",
        "automation_engine.py",
        "requirements.txt",
        "Dockerfile",
    ]
    for filename in files_to_upload:
        filepath = os.path.join(BACKEND_DIR, filename)
        if os.path.exists(filepath):
            api.upload_file(
                path_or_fileobj=filepath,
                path_in_repo=filename,
                repo_id=SPACE_ID,
                repo_type="space",
            )
            print(f"Uploaded: {filename}")
        else:
            print(f"Warning: {filename} not found in {BACKEND_DIR}")

    # Always upload normalized README metadata for stable Space parsing.
    api.upload_file(
        path_or_fileobj=io.BytesIO(SPACE_README.encode("utf-8")),
        path_in_repo="README.md",
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print("Uploaded: README.md (normalized Space metadata)")

    # Upload package directories required at runtime.
    _upload_tree(api, SPACE_ID, os.path.join(BACKEND_DIR, "services"), "services")
    _upload_tree(api, SPACE_ID, os.path.join(BACKEND_DIR, "models"), "models")

    print(f"\nDeployment complete!")
    print(f"Space URL: https://huggingface.co/spaces/{SPACE_ID}")
    print(f"API URL: https://{SPACE_ID.replace('/', '-').lower()}.hf.space")
    print(f"\nNote: Set the HF_TOKEN secret in the space settings:")
    print(f"https://huggingface.co/spaces/{SPACE_ID}/settings")


if __name__ == "__main__":
    main()
