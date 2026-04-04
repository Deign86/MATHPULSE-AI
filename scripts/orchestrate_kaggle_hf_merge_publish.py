#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from huggingface_hub import HfApi

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from mcp_clients import HuggingFaceMCPClient, KaggleMCPClient, MCPResult  # noqa: E402

BASE_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
LORA_ADAPTER_ID = "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora"
MERGED_REPO_ID = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
MERGED_LOCAL_DIR = "deped-math-merged"
UPLOAD_COMMIT_MESSAGE = "Upload merged fp16 DepEd Grade 11-12 math tutor model"


def run_cli(command: List[str], cwd: Optional[Path] = None, check: bool = False) -> subprocess.CompletedProcess[str]:
    print("[cli]", " ".join(command))
    proc = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=False,
        text=True,
        capture_output=True,
    )

    if proc.stdout.strip():
        print(proc.stdout.strip())
    if proc.stderr.strip():
        print(proc.stderr.strip())

    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(command)}")
    return proc


def ensure_cli(name: str) -> None:
    if shutil.which(name):
        return
    raise RuntimeError(f"Missing required CLI: {name}")


def parse_kaggle_status(raw: str) -> str:
    lowered = raw.lower()
    explicit = re.search(r"\b(status|state)\s*[:=]\s*([a-z_\-]+)", lowered)
    if explicit:
        return explicit.group(2)

    for token in ["complete", "completed", "running", "queued", "pending", "starting", "failed", "error"]:
        if token in lowered:
            return token
    return "unknown"


def safe_hf_repo_create(repo_id: str) -> Dict[str, Any]:
    create_cmd = ["hf", "repo", "create", repo_id, "--type", "model"]
    proc = run_cli(create_cmd)

    combined = f"{proc.stdout}\n{proc.stderr}".lower()
    if proc.returncode == 0:
        return {"ok": True, "created": True, "already_exists": False, "method": "hf_cli"}

    if "already exists" in combined or "exists" in combined:
        return {"ok": True, "created": False, "already_exists": True, "method": "hf_cli"}

    return {
        "ok": False,
        "created": False,
        "already_exists": False,
        "method": "hf_cli",
        "error": combined.strip(),
    }


def hf_python_upload_fallback(repo_id: str, folder_path: Path, commit_message: str) -> Dict[str, Any]:
    api = HfApi(token=os.getenv("HF_TOKEN", "").strip() or None)
    try:
        api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
        api.upload_folder(
            repo_id=repo_id,
            repo_type="model",
            folder_path=str(folder_path),
            path_in_repo=".",
            commit_message=commit_message,
        )
        return {"ok": True, "method": "huggingface_hub"}
    except Exception as exc:
        return {"ok": False, "method": "huggingface_hub", "error": str(exc)}


def read_kernel_ref(metadata_path: Path, fallback_kernel_ref: str) -> str:
    if fallback_kernel_ref.strip():
        return fallback_kernel_ref.strip()

    data = json.loads(metadata_path.read_text(encoding="utf-8"))
    kernel_ref = str(data.get("id", "")).strip()
    if not kernel_ref:
        raise RuntimeError(
            "Kernel reference is missing. Set `id` in kernel-metadata.json or pass --kernel-ref explicitly."
        )
    return kernel_ref


def poll_kaggle_status_cli(kernel_ref: str) -> MCPResult:
    proc = run_cli(["kaggle", "kernels", "status", kernel_ref])
    status = parse_kaggle_status(f"{proc.stdout}\n{proc.stderr}")
    return MCPResult(
        ok=proc.returncode == 0,
        payload={"status": status, "raw": f"{proc.stdout}\n{proc.stderr}"},
        error=None if proc.returncode == 0 else "kaggle kernels status failed",
        retriable=True,
        source="kaggle_cli_fallback",
    )


def monitor_kernel(
    kernel_ref: str,
    kaggle_mcp: KaggleMCPClient,
    timeout_minutes: int,
    poll_seconds: int,
) -> Dict[str, Any]:
    started_at = time.time()
    timeout_seconds = max(1, timeout_minutes) * 60
    latest_status = "unknown"
    used_mcp = False

    while True:
        mcp_status = kaggle_mcp.check_run_status(kernel_ref)
        if mcp_status.ok and mcp_status.payload.get("status"):
            latest_status = str(mcp_status.payload.get("status", "unknown")).lower()
            used_mcp = True
        else:
            cli_status = poll_kaggle_status_cli(kernel_ref)
            latest_status = str(cli_status.payload.get("status", "unknown")).lower()

        print(f"[monitor] kernel={kernel_ref} status={latest_status} source={'mcp' if used_mcp else 'cli'}")

        if latest_status in {"complete", "completed"}:
            return {"ok": True, "final_status": "completed", "used_mcp": used_mcp}
        if latest_status in {"failed", "error"}:
            return {"ok": False, "final_status": latest_status, "used_mcp": used_mcp}

        if time.time() - started_at > timeout_seconds:
            return {"ok": False, "final_status": "timeout", "used_mcp": used_mcp}

        time.sleep(max(10, poll_seconds))


def download_kaggle_outputs(kernel_ref: str, output_dir: Path) -> Dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    proc = run_cli(["kaggle", "kernels", "output", kernel_ref, "-p", str(output_dir), "--force"])
    return {"ok": proc.returncode == 0, "output_dir": str(output_dir), "method": "kaggle_cli"}


def inspect_outputs(
    output_dir: Path,
    expected_merge_dir_name: str,
) -> Dict[str, Any]:
    merge_dir_found = False
    upload_success = False
    upload_payload: Dict[str, Any] = {}

    for path in output_dir.rglob("*"):
        if path.is_dir() and path.name == expected_merge_dir_name:
            merge_dir_found = True

        if path.is_file() and path.name == "upload_status.json":
            try:
                upload_payload = json.loads(path.read_text(encoding="utf-8"))
                upload_success = bool(upload_payload.get("success", False))
            except Exception:
                upload_success = False

    return {
        "merge_dir_found": merge_dir_found,
        "upload_success": upload_success,
        "upload_status": upload_payload,
    }


def run_hf_mcp_preflight(hf_mcp: HuggingFaceMCPClient) -> Dict[str, Any]:
    base_exists = hf_mcp.verify_repo_exists(BASE_MODEL_ID)
    adapter_exists = hf_mcp.verify_repo_exists(LORA_ADAPTER_ID)
    adapter_metadata = hf_mcp.inspect_repo_metadata(LORA_ADAPTER_ID)
    adapter_files = hf_mcp.inspect_repo_files(LORA_ADAPTER_ID)
    target_name_valid = hf_mcp.validate_repo_name(MERGED_REPO_ID)
    publish_docs = hf_mcp.lookup_publish_resources()

    preflight = {
        "base_exists": base_exists.__dict__,
        "adapter_exists": adapter_exists.__dict__,
        "adapter_metadata": adapter_metadata.__dict__,
        "adapter_files": adapter_files.__dict__,
        "target_name_valid": target_name_valid.__dict__,
        "publish_docs": publish_docs.__dict__,
    }

    print("\n=== Hugging Face MCP-first Preflight ===")
    print(json.dumps(preflight, indent=2))
    return preflight


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Kaggle-to-HF merge and publish orchestrator (MCP-first).")
    parser.add_argument("--job-dir", default="kaggle_merge_job", help="Path to Kaggle kernel bundle folder.")
    parser.add_argument("--kernel-ref", default="", help="Optional Kaggle kernel ref owner/slug override.")
    parser.add_argument("--timeout-minutes", type=int, default=240)
    parser.add_argument("--poll-seconds", type=int, default=60)
    parser.add_argument("--skip-hf-auth-login", action="store_true")
    parser.add_argument("--skip-kernels-init", action="store_true")
    parser.add_argument("--attempt-local-upload-fallback", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()

    workspace_root = Path(__file__).resolve().parents[1]
    job_dir = (workspace_root / args.job_dir).resolve()
    metadata_path = job_dir / "kernel-metadata.json"
    script_path = job_dir / "merge_deped_qwen_lora.py"

    if not metadata_path.exists() or not script_path.exists():
        raise RuntimeError(f"Missing Kaggle job files in {job_dir}")

    ensure_cli("hf")
    ensure_cli("kaggle")

    hf_mcp = HuggingFaceMCPClient(token=os.getenv("HF_TOKEN", ""))
    kaggle_mcp = KaggleMCPClient(transport=None)

    preflight = run_hf_mcp_preflight(hf_mcp)

    adapter_exists = preflight["adapter_exists"]["payload"].get("exists", False)
    target_valid = preflight["target_name_valid"]["payload"].get("is_valid", False)

    if not adapter_exists:
        raise RuntimeError("Adapter repo check failed: adapter does not exist or is inaccessible.")
    if not target_valid:
        raise RuntimeError("Target repo name is invalid.")

    if not args.skip_hf_auth_login:
        run_cli(["hf", "auth", "login"], check=True)

    repo_create = safe_hf_repo_create(MERGED_REPO_ID)
    if not repo_create.get("ok", False):
        raise RuntimeError(f"Failed to create/verify target repo: {repo_create}")

    if not args.skip_kernels_init:
        run_cli(["kaggle", "kernels", "init", "-p", str(job_dir)], check=True)

    run_cli(["kaggle", "kernels", "push", "-p", str(job_dir)], check=True)

    kernel_ref = read_kernel_ref(metadata_path, args.kernel_ref)

    start_check = kaggle_mcp.confirm_run_started(kernel_ref)
    if start_check.ok:
        print("Kaggle MCP confirmed run start.")
    else:
        print("Kaggle MCP start confirmation unavailable; continuing with CLI monitoring fallback.")

    monitor = monitor_kernel(
        kernel_ref=kernel_ref,
        kaggle_mcp=kaggle_mcp,
        timeout_minutes=args.timeout_minutes,
        poll_seconds=args.poll_seconds,
    )

    output_dir = job_dir / "_kaggle_outputs"
    outputs_download = download_kaggle_outputs(kernel_ref, output_dir)

    outputs_mcp = kaggle_mcp.list_outputs(kernel_ref)
    merge_mcp = kaggle_mcp.confirm_merge_completed(kernel_ref, MERGED_LOCAL_DIR)
    upload_mcp = kaggle_mcp.confirm_upload_succeeded(kernel_ref)

    outputs_local = inspect_outputs(output_dir, MERGED_LOCAL_DIR)

    upload_fallback_result: Dict[str, Any] = {"ok": False, "skipped": True}
    if args.attempt_local_upload_fallback and not outputs_local.get("upload_success", False):
        merge_dir_candidates = [path for path in output_dir.rglob(MERGED_LOCAL_DIR) if path.is_dir()]
        if merge_dir_candidates:
            upload_fallback_result = hf_python_upload_fallback(
                repo_id=MERGED_REPO_ID,
                folder_path=merge_dir_candidates[0],
                commit_message=UPLOAD_COMMIT_MESSAGE,
            )
            upload_fallback_result["skipped"] = False

    summary = {
        "hf_preflight": {
            "adapter_exists": adapter_exists,
            "target_name_valid": target_valid,
            "repo_create": repo_create,
        },
        "kaggle_submission": {
            "kernel_ref": kernel_ref,
            "monitor": monitor,
            "outputs_download": outputs_download,
        },
        "mcp_monitoring": {
            "outputs": outputs_mcp.__dict__,
            "merge_completed": merge_mcp.__dict__,
            "upload_succeeded": upload_mcp.__dict__,
        },
        "local_output_checks": outputs_local,
        "upload_fallback": upload_fallback_result,
    }

    print("\n=== Final Summary ===")
    print(json.dumps(summary, indent=2))

    merge_ok = bool(
        outputs_local.get("merge_dir_found", False)
        or merge_mcp.ok and bool(merge_mcp.payload.get("completed", False))
    )
    upload_ok = bool(
        outputs_local.get("upload_success", False)
        or upload_mcp.ok and bool(upload_mcp.payload.get("success", False))
        or upload_fallback_result.get("ok", False)
    )
    workflow_ok = bool(monitor.get("ok", False) and merge_ok and upload_ok)

    if not workflow_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
