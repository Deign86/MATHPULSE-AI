import argparse
import json
import os
import re
from pathlib import Path
from typing import Iterable

from huggingface_hub import HfApi

PII_PATTERNS = {
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}") ,
    "phone": re.compile(r"\\+?\\d[\\d\\-\\s]{7,}\\d"),
    "lrn": re.compile(r"\\b\\d{10,14}\\b"),
}
PII_KEYS = {"name", "email", "lrn", "phone", "studentName", "studentEmail"}


def iter_text_files(folder: Path) -> Iterable[Path]:
    for path in folder.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".json", ".jsonl", ".csv", ".txt", ".md"}:
            yield path


def assert_no_pii(folder: Path) -> None:
    for path in iter_text_files(folder):
        content = path.read_text(encoding="utf-8")
        lowered = content.lower()
        for key in PII_KEYS:
            if f'"{key.lower()}"' in lowered:
                raise RuntimeError(f"PII-like key '{key}' found in {path}")
        for label, pattern in PII_PATTERNS.items():
            if pattern.search(content):
                raise RuntimeError(f"PII-like {label} pattern found in {path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Push dataset folder to a private Hugging Face dataset repo")
    parser.add_argument("--folder", default="datasets", help="Dataset folder path")
    parser.add_argument("--repo", required=True, help="Dataset repo id, e.g. Deign86/mathpulse-private-datasets")
    parser.add_argument("--branch", default="main")
    parser.add_argument("--private", action="store_true", default=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = os.getenv("HF_TOKEN", "")
    if not token:
        raise RuntimeError("HF_TOKEN is required")

    folder = Path(args.folder)
    if not folder.exists():
        raise RuntimeError(f"Folder does not exist: {folder}")

    assert_no_pii(folder)

    api = HfApi(token=token)
    api.create_repo(repo_id=args.repo, repo_type="dataset", private=args.private, exist_ok=True)
    api.upload_folder(
        repo_id=args.repo,
        repo_type="dataset",
        folder_path=str(folder),
        path_in_repo=".",
        revision=args.branch,
        commit_message="Sync dataset artifacts from MathPulse",
    )

    print(json.dumps({"status": "ok", "repo": args.repo, "folder": str(folder)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
