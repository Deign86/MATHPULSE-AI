"""
Set HF_TOKEN secret in both backend and frontend HF Spaces and redeploy.

Usage:
    python set-hf-secrets.py --hf-token YOUR_HF_API_TOKEN --hf-secret HF_TOKEN_VALUE
    
This script will:
1. Authenticate with Hugging Face
2. Set HF_TOKEN secret in backend space (Deign86/mathpulse-api-v3test)
3. Set HF_TOKEN secret in frontend space (Deign86/mathpulse-ai)
4. Restart both spaces
"""
import argparse
import os
import time
from huggingface_hub import HfApi, login

BACKEND_SPACE = "Deign86/mathpulse-api-v3test"
FRONTEND_SPACE = "Deign86/mathpulse-ai"
WAIT_TIMEOUT_SEC = 300


def set_secret_and_restart(api: HfApi, repo_id: str, secret_key: str, secret_value: str, wait_timeout_sec: int) -> None:
    """Set a secret in a space and restart it."""
    print(f"\n{'='*60}")
    print(f"Setting secret in: {repo_id}")
    print(f"{'='*60}")
    
    try:
        api.add_space_secret(
            repo_id=repo_id,
            key=secret_key,
            value=secret_value,
        )
        print(f"✓ Secret {secret_key} set successfully")
    except Exception as e:
        print(f"✗ Error setting secret: {e}")
        return
    
    try:
        api.restart_space(repo_id=repo_id)
        print(f"✓ Restarted space: {repo_id}")
    except Exception as e:
        print(f"✗ Error restarting space: {e}")
        return
    
    # Wait for runtime to be ready
    _wait_for_runtime(api, repo_id, wait_timeout_sec)


def _wait_for_runtime(api: HfApi, repo_id: str, timeout_sec: int) -> None:
    """Poll runtime stage and print status."""
    if timeout_sec <= 0:
        print(f"Skipping runtime wait (timeout_sec={timeout_sec})")
        return

    print(f"Waiting for {repo_id} runtime to be ready...")
    start_ts = time.time()
    while True:
        try:
            runtime = api.get_space_runtime(repo_id=repo_id)
            stage = str(runtime.stage)
            requested_hardware = getattr(runtime, "requested_hardware", None)
            current_hardware = getattr(runtime, "hardware", None)
            print(
                f"  Runtime status: stage={stage}, "
                f"requested={requested_hardware}, current={current_hardware}"
            )

            if stage == "RUNNING":
                print(f"  ✓ {repo_id} is RUNNING")
                return

            elapsed = time.time() - start_ts
            if elapsed >= timeout_sec:
                print(
                    f"✗ Runtime did not reach RUNNING before timeout ({timeout_sec}s). "
                    f"Check Space logs in HF UI."
                )
                return
            time.sleep(10)
        except Exception as e:
            print(f"  Error checking runtime: {e}")
            break


def main():
    parser = argparse.ArgumentParser(
        description="Set HF_TOKEN secret in both backend and frontend spaces"
    )
    parser.add_argument(
        "--hf-token",
        required=False,
        help="HuggingFace API token with write access (for managing spaces). Can also be set via HF_API_TOKEN env var.",
    )
    parser.add_argument(
        "--hf-secret",
        required=True,
        help="The HF_TOKEN secret value to set in the spaces",
    )
    parser.add_argument(
        "--wait-timeout-sec",
        type=int,
        default=WAIT_TIMEOUT_SEC,
        help="How long to wait for runtime to reach RUNNING (0 disables waiting)",
    )
    args = parser.parse_args()

    hf_token = args.hf_token or os.environ.get("HF_API_TOKEN") or os.environ.get("HF_TOKEN_WRITE")
    
    if hf_token:
        login(token=hf_token)
        print(f"Using provided HF API token for authentication")
    else:
        print("No --hf-token provided and no HF_API_TOKEN env var. Attempting to use cached Hugging Face login.")
    
    api = HfApi()
    
    try:
        user = api.whoami()
        print(f"✓ Authenticated as: {user['name']}")
    except Exception as e:
        print(f"✗ Authentication failed: {e}")
        return

    # Set secret and restart both spaces
    set_secret_and_restart(api, BACKEND_SPACE, "HF_TOKEN", args.hf_secret, args.wait_timeout_sec)
    set_secret_and_restart(api, FRONTEND_SPACE, "HF_TOKEN", args.hf_secret, args.wait_timeout_sec)

    print(f"\n{'='*60}")
    print("✓ Deployment complete!")
    print(f"{'='*60}")
    print(f"Backend Space: https://huggingface.co/spaces/{BACKEND_SPACE}")
    print(f"Frontend Space: https://huggingface.co/spaces/{FRONTEND_SPACE}")
    print(f"\nBoth spaces have been updated with the new HF_TOKEN secret.")


if __name__ == "__main__":
    main()
