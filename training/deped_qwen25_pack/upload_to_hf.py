import argparse
import os
from pathlib import Path

from huggingface_hub import HfApi, login


def upload_folder_if_exists(api: HfApi, folder_path: str, repo_id: str, commit_message: str) -> None:
    path = Path(folder_path)
    if not path.exists() or not path.is_dir():
        raise FileNotFoundError(f"Folder not found: {folder_path}")

    api.upload_folder(
        folder_path=str(path),
        repo_id=repo_id,
        repo_type="model",
        commit_message=commit_message,
    )
    print(f"Uploaded {folder_path} -> {repo_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload LoRA adapters and merged model to Hugging Face Hub.")
    parser.add_argument("--repo-id", default="yourusername/deped-math-qwen2.5-7b")
    parser.add_argument("--merged-repo-id", help="Optional explicit merged model repo id. Defaults to <repo-id>-merged")
    parser.add_argument("--lora-dir", default="deped-math-lora")
    parser.add_argument("--merged-dir", default="deped-math-7b-merged")
    parser.add_argument("--token-env", default="HF_TOKEN")
    args = parser.parse_args()

    token = os.getenv(args.token_env, "").strip()
    if token:
        login(token=token, add_to_git_credential=False)
    else:
        login()

    api = HfApi()
    lora_repo = args.repo_id
    merged_repo = args.merged_repo_id or f"{args.repo_id}-merged"

    api.create_repo(repo_id=lora_repo, repo_type="model", exist_ok=True)
    api.create_repo(repo_id=merged_repo, repo_type="model", exist_ok=True)

    upload_folder_if_exists(
        api=api,
        folder_path=args.lora_dir,
        repo_id=lora_repo,
        commit_message="Initial LoRA adapters v1.0",
    )
    upload_folder_if_exists(
        api=api,
        folder_path=args.merged_dir,
        repo_id=merged_repo,
        commit_message="Merged 16bit model v1.0",
    )


if __name__ == "__main__":
    main()
