import argparse
import json
import os
from pathlib import Path

from huggingface_hub import snapshot_download


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pull dataset repo snapshot from Hugging Face")
    parser.add_argument("--repo", required=True, help="Dataset repo id, e.g. Deign86/mathpulse-private-datasets")
    parser.add_argument("--output", default="datasets", help="Local output folder")
    parser.add_argument("--revision", default="main")
    return parser.parse_args()


def main() -> None:
    token = os.getenv("HF_TOKEN", "")
    if not token:
        raise RuntimeError("HF_TOKEN is required")

    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    local_path = snapshot_download(
        repo_id=args.repo,
        repo_type="dataset",
        token=token,
        revision=args.revision,
        local_dir=str(output_dir),
        local_dir_use_symlinks=False,
    )

    print(json.dumps({"status": "ok", "repo": args.repo, "local_path": local_path}, ensure_ascii=True))


if __name__ == "__main__":
    main()
