"""
Deploy MathPulse AI backend to HuggingFace Spaces.

Usage:
  python deploy-hf.py --token YOUR_HF_TOKEN

This script will:
1. Delete existing mathpulse-api and mathpulse-frontend spaces
2. Create a new mathpulse-api space (Docker SDK)
3. Upload the backend files to the space
"""
import argparse
import os
import sys

from huggingface_hub import HfApi, login

SPACE_ID = "Deign86/mathpulse-api"
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")


def main():
    parser = argparse.ArgumentParser(description="Deploy MathPulse backend to HuggingFace Spaces")
    parser.add_argument("--token", required=True, help="HuggingFace API token (write access)")
    args = parser.parse_args()

    login(token=args.token)
    api = HfApi()

    user = api.whoami()
    print(f"Authenticated as: {user['name']}")

    # Step 1: Delete existing spaces
    for space_id in ["Deign86/mathpulse-api", "Deign86/mathpulse-frontend"]:
        try:
            api.delete_repo(repo_id=space_id, repo_type="space")
            print(f"Deleted space: {space_id}")
        except Exception as e:
            print(f"Could not delete {space_id}: {e}")

    # Step 2: Create new mathpulse-api space (Docker SDK)
    print(f"\nCreating space: {SPACE_ID}")
    api.create_repo(
        repo_id=SPACE_ID,
        repo_type="space",
        space_sdk="docker",
        private=False,
    )
    print(f"Created space: {SPACE_ID}")

    # Step 3: Upload backend files
    files_to_upload = ["main.py", "requirements.txt", "Dockerfile", "README.md"]
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

    print(f"\nDeployment complete!")
    print(f"Space URL: https://huggingface.co/spaces/{SPACE_ID}")
    print(f"API URL: https://{SPACE_ID.replace('/', '-').lower()}.hf.space")
    print(f"\nNote: Set the HF_TOKEN secret in the space settings:")
    print(f"https://huggingface.co/spaces/{SPACE_ID}/settings")


if __name__ == "__main__":
    main()
