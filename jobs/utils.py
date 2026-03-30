import argparse
import csv
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

from backend.services.logging_utils import configure_structured_logging


def build_common_parser(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--model", default=os.getenv("INFERENCE_MODEL_ID", "meta-llama/Llama-3.1-8B-Instruct"))
    parser.add_argument("--limit", type=int, default=int(os.getenv("JOB_LIMIT", "100")))
    parser.add_argument("--subset", default=os.getenv("JOB_SUBSET", "all"))
    parser.add_argument("--output", default=os.getenv("JOB_OUTPUT", ""))
    return parser


def generate_run_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if not path.exists():
        return items
    with path.open("r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            items.append(json.loads(line))
    return items


def write_csv(path: Path, rows: Iterable[Dict[str, Any]], fieldnames: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def get_logger(name: str):
    return configure_structured_logging(name)
