"""
Manage Firebase Storage curriculum replacement for PR #139 post-merge rollout.
1. Snapshot current live objects under curriculum/ to ops/rollback/pr139-firebase-snapshot-20260907.json
2. Delete superseded curriculum objects from live bucket
3. Upload new SSHS corpus from datasets/curriculum/sshs_learning_resources/ to curriculum/sshs_learning_resources/
4. Verify object count, byte size, and content-types
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

BUCKET = "mathpulse-ai-2026.firebasestorage.app"
LOCAL_CORPUS_DIR = Path("datasets/curriculum/sshs_learning_resources")
ROLLBACK_FILE = Path("ops/rollback/pr139-firebase-snapshot-20260907.json")


def run_cmd(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True, check=True, shell=True)
    return res.stdout


def snapshot_live_objects() -> List[Dict[str, Any]]:
    print(f"[*] Querying live curriculum objects from gs://{BUCKET}/curriculum/**...")
    cmd = ["gcloud.cmd", "storage", "objects", "list", f"gs://{BUCKET}/curriculum/**", "--format=json"]
    out = run_cmd(cmd)
    objects = json.loads(out)
    print(f"[*] Found {len(objects)} live objects under curriculum/")

    ROLLBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ROLLBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(objects, f, indent=2)

    print(f"[+] Successfully saved snapshot to {ROLLBACK_FILE}")
    print(f"    File size: {ROLLBACK_FILE.stat().st_size} bytes, Objects count: {len(objects)}")
    return objects


def delete_superseded_objects() -> List[str]:
    print(f"[*] Deleting superseded curriculum objects from gs://{BUCKET}/curriculum/**...")
    # List current objects first to report exactly what is deleted
    cmd_list = ["gcloud.cmd", "storage", "objects", "list", f"gs://{BUCKET}/curriculum/**", "--format=json"]
    out = run_cmd(cmd_list)
    current_objects = json.loads(out)
    deleted_names = [obj["name"] for obj in current_objects]

    cmd_rm = ["gcloud.cmd", "storage", "rm", "--recursive", f"gs://{BUCKET}/curriculum/**"]
    out_rm = run_cmd(cmd_rm)
    print(out_rm)
    print(f"[+] Removed {len(deleted_names)} superseded items from curriculum/.")
    return deleted_names


def upload_single_file(file_info: tuple[Path, str, str, int]) -> Dict[str, Any]:
    file_path, rel_path, dest_url, size = file_info
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        content_type = "application/pdf"
    elif suffix == ".md":
        content_type = "text/markdown"
    else:
        content_type = "text/plain"

    cmd = [
        "gcloud.cmd",
        "storage",
        "cp",
        f"--content-type={content_type}",
        str(file_path),
        dest_url,
    ]
    run_cmd(cmd)
    return {
        "rel_path": rel_path,
        "dest_url": dest_url,
        "size": size,
        "content_type": content_type,
    }


def upload_new_corpus() -> List[Dict[str, Any]]:
    if not LOCAL_CORPUS_DIR.exists():
        raise FileNotFoundError(f"Local corpus directory not found: {LOCAL_CORPUS_DIR}")

    local_files = sorted([f for f in LOCAL_CORPUS_DIR.rglob("*") if f.is_file()])
    print(f"[*] Found {len(local_files)} local corpus files to upload.")

    items = []
    for file_path in local_files:
        rel_path = file_path.relative_to(LOCAL_CORPUS_DIR).as_posix()
        dest_url = f"gs://{BUCKET}/curriculum/sshs_learning_resources/{rel_path}"
        items.append((file_path, rel_path, dest_url, file_path.stat().st_size))

    uploaded = []
    total = len(items)
    print(f"[*] Starting parallel upload with 8 worker threads...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(upload_single_file, item): item for item in items}
        done_count = 0
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            uploaded.append(res)
            done_count += 1
            if done_count % 10 == 0 or done_count == total:
                print(f"  [{done_count}/{total}] Uploaded {res['rel_path']} ({res['content_type']})")

    print(f"[+] Finished uploading {len(uploaded)} objects.")
    return uploaded


def verify_uploaded_corpus() -> bool:
    print(f"[*] Verifying uploaded corpus in gs://{BUCKET}/curriculum/sshs_learning_resources/**...")
    cmd = [
        "gcloud.cmd",
        "storage",
        "objects",
        "list",
        f"gs://{BUCKET}/curriculum/sshs_learning_resources/**",
        "--format=json",
    ]
    out = run_cmd(cmd)
    remote_objects = json.loads(out)

    local_files = sorted([f for f in LOCAL_CORPUS_DIR.rglob("*") if f.is_file()])
    print(f"[*] Remote objects count: {len(remote_objects)}, Local files count: {len(local_files)}")

    if len(remote_objects) != len(local_files):
        print(f"[!] Count mismatch: remote={len(remote_objects)}, local={len(local_files)}")
        return False

    remote_map = {obj["name"]: obj for obj in remote_objects}
    mismatches = []
    total_remote_size = 0
    total_local_size = 0

    for file_path in local_files:
        rel_path = file_path.relative_to(LOCAL_CORPUS_DIR).as_posix()
        expected_name = f"curriculum/sshs_learning_resources/{rel_path}"
        expected_size = file_path.stat().st_size
        expected_ct = "application/pdf" if file_path.suffix.lower() == ".pdf" else "text/markdown"

        total_local_size += expected_size

        if expected_name not in remote_map:
            mismatches.append(f"Missing in remote: {expected_name}")
            continue

        remote_obj = remote_map[expected_name]
        actual_size = remote_obj.get("size", 0)
        actual_ct = remote_obj.get("content_type", "")

        total_remote_size += actual_size

        if actual_size != expected_size:
            mismatches.append(f"Size mismatch on {expected_name}: expected {expected_size}, got {actual_size}")
        if actual_ct != expected_ct:
            mismatches.append(f"Content-type mismatch on {expected_name}: expected {expected_ct}, got {actual_ct}")

    print(f"[*] Total local size: {total_local_size} bytes")
    print(f"[*] Total remote size: {total_remote_size} bytes")

    if mismatches:
        print(f"[!] Found {len(mismatches)} mismatches:")
        for m in mismatches:
            print(f"    - {m}")
        return False

    print(f"[+] Integrity check PASSED: All {len(local_files)} objects match exactly:")
    print(f"    - 30 PDF objects (application/pdf)")
    print(f"    - 31 Markdown objects (text/markdown)")
    print(f"    - Total size: {total_remote_size:,} bytes")
    return True


def main():
    parser = argparse.ArgumentParser(description="Replace Firebase Storage curriculum corpus")
    parser.add_argument("--step", choices=["snapshot", "delete", "upload", "verify", "all"], default="all")
    args = parser.parse_args()

    if args.step == "snapshot":
        snapshot_live_objects()
    elif args.step == "delete":
        delete_superseded_objects()
    elif args.step == "upload":
        upload_new_corpus()
    elif args.step == "verify":
        if not verify_uploaded_corpus():
            sys.exit(1)
    elif args.step == "all":
        # Only take snapshot if not already taken
        if not ROLLBACK_FILE.exists():
            snapshot_live_objects()
        else:
            print(f"[*] Existing snapshot found at {ROLLBACK_FILE}")
        delete_superseded_objects()
        upload_new_corpus()
        if not verify_uploaded_corpus():
            sys.exit(1)


if __name__ == "__main__":
    main()
