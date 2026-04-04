#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from huggingface_hub import HfApi

ROOT_DIR = Path(__file__).resolve().parent

from scripts.mcp_clients import (
    HuggingFaceMCPClient,
    KaggleMCPClient,
    MCPResult,
    hf_mcp_check_repo_exists,
    hf_mcp_get_repo_metadata,
    hf_mcp_search_docs,
    kaggle_mcp_get_run_status,
    kaggle_mcp_get_run_logs,
    kaggle_mcp_wait_until_done,
)


@dataclass(frozen=True)
class WorkflowConfig:
    base_model_id: str = "Qwen/Qwen2.5-7B-Instruct"
    lora_adapter_id: str = "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora"
    merged_repo_id: str = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
    merged_local_dir_name: str = "deped-math-merged"
    commit_message: str = "Add merged fp16 model from 700-step LoRA checkpoint"
    accelerator: str = "NvidiaTeslaT4"


EXPECTED_LORA_ADAPTER_ID = "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora"


def stage(title: str) -> None:
    print(f"\n{'=' * 12} {title} {'=' * 12}")


def _redact_command(command: List[str]) -> List[str]:
    redacted: List[str] = []
    skip_next = False
    for part in command:
        if skip_next:
            redacted.append("***REDACTED***")
            skip_next = False
            continue

        lowered = part.lower()
        if lowered == "--token":
            redacted.append(part)
            skip_next = True
            continue

        if lowered.startswith("--token="):
            redacted.append("--token=***REDACTED***")
            continue

        redacted.append(part)
    return redacted


def run_cli(
    command: List[str],
    cwd: Optional[Path] = None,
    check: bool = False,
    env_overrides: Optional[Dict[str, str]] = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    if env_overrides:
        env.update(env_overrides)

    print("[cli]", " ".join(_redact_command(command)))
    proc = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=False,
        text=True,
        capture_output=True,
        env=env,
    )

    if proc.stdout.strip():
        print(proc.stdout.strip())
    if proc.stderr.strip():
        print(proc.stderr.strip())

    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(command)}")
    return proc


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def assert_adapter_lock(config: WorkflowConfig) -> None:
    if config.lora_adapter_id != EXPECTED_LORA_ADAPTER_ID:
        raise RuntimeError(
            "Adapter lock violation. Only checkpoint-700 is allowed: "
            f"{EXPECTED_LORA_ADAPTER_ID}."
        )


def load_kernel_metadata(job_dir: Path, auto_init_if_missing: bool) -> Dict[str, Any]:
    metadata_path = job_dir / "kernel-metadata.json"

    if not metadata_path.exists() and auto_init_if_missing:
        stage("Kaggle Metadata Initialization")
        run_cli(["kaggle", "kernels", "init", "-p", str(job_dir)], check=True)

    if not metadata_path.exists():
        raise RuntimeError(f"Missing kernel metadata file: {metadata_path}")

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    kernel_id = str(metadata.get("id", "")).strip()
    if not kernel_id:
        raise RuntimeError(
            "kernel-metadata.json is missing required 'id'. "
            "Set it to <kaggle-username>/<kernel-slug> before running."
        )
    return metadata


def hf_cli_login(skip_hf_login: bool) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "skipped": bool(skip_hf_login),
        "used_command": "",
        "ok": False,
        "source": "",
    }
    if skip_hf_login:
        result["ok"] = True
        result["source"] = "skipped_by_flag"
        return result

    token = os.getenv("HF_TOKEN", "").strip()
    candidates: List[List[str]] = []
    if command_exists("hf"):
        if token:
            candidates.append(["hf", "auth", "login", "--token", token])
        else:
            candidates.append(["hf", "auth", "login"])
    if command_exists("huggingface-cli"):
        if token:
            candidates.append(["huggingface-cli", "login", "--token", token])
        else:
            candidates.append(["huggingface-cli", "login"])

    if not candidates:
        raise RuntimeError("Missing Hugging Face CLI. Install 'hf' or 'huggingface-cli'.")

    for command in candidates:
        proc = run_cli(command, check=False)
        if proc.returncode == 0:
            result["ok"] = True
            result["used_command"] = " ".join(command)
            result["source"] = "env_hf_token" if token else "interactive_login"
            return result

    raise RuntimeError("Hugging Face authentication failed for all available CLI commands.")


def hf_cli_create_repo(repo_id: str) -> Dict[str, Any]:
    commands: List[List[str]] = []
    if command_exists("huggingface-cli"):
        commands.append(["huggingface-cli", "repo", "create", repo_id, "--type", "model"])
    if command_exists("hf"):
        commands.append(["hf", "repo", "create", repo_id, "--type", "model"])

    if not commands:
        return {
            "ok": False,
            "used_command": "",
            "already_exists": False,
            "error": "No Hugging Face CLI command available.",
        }

    for command in commands:
        proc = run_cli(command, check=False)
        combined = f"{proc.stdout}\n{proc.stderr}".lower()
        already_exists = "already exists" in combined or "you already created this model repo" in combined
        if proc.returncode == 0 or already_exists:
            return {
                "ok": True,
                "used_command": " ".join(command),
                "already_exists": already_exists,
                "error": "",
            }

    return {
        "ok": False,
        "used_command": "",
        "already_exists": False,
        "error": "Failed to create repo via Hugging Face CLI.",
    }


def hf_python_create_repo_fallback(repo_id: str) -> Dict[str, Any]:
    api = HfApi(token=os.getenv("HF_TOKEN", "").strip() or None)
    try:
        api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
        return {"ok": True, "method": "huggingface_hub.HfApi.create_repo(exist_ok=True)"}
    except Exception as exc:
        return {"ok": False, "method": "huggingface_hub.HfApi.create_repo(exist_ok=True)", "error": str(exc)}


def run_hf_preflight(config: WorkflowConfig, hf_client: HuggingFaceMCPClient) -> Dict[str, Any]:
    base_meta = hf_mcp_get_repo_metadata(config.base_model_id, client=hf_client)
    adapter_exists = hf_mcp_check_repo_exists(config.lora_adapter_id, client=hf_client)
    adapter_meta = hf_mcp_get_repo_metadata(config.lora_adapter_id, client=hf_client)
    target_meta = hf_mcp_get_repo_metadata(config.merged_repo_id, client=hf_client)
    target_name_check = hf_client.validate_repo_name(config.merged_repo_id)
    publish_docs = hf_mcp_search_docs("upload model publishing", client=hf_client)

    preflight = {
        "base_model_metadata": asdict(base_meta),
        "adapter_exists": asdict(adapter_exists),
        "adapter_metadata": asdict(adapter_meta),
        "target_metadata": asdict(target_meta),
        "target_name_check": asdict(target_name_check),
        "publish_docs": asdict(publish_docs),
    }

    exists_flag = bool(adapter_exists.payload.get("exists", False))
    if not adapter_exists.ok or not exists_flag:
        raise RuntimeError(
            "Adapter repo check failed for checkpoint-700 adapter: "
            f"{config.lora_adapter_id}."
        )

    if not bool(target_name_check.payload.get("is_valid", False)):
        raise RuntimeError(f"Target merged repo name is invalid: {config.merged_repo_id}")

    return preflight


def resolve_kernel_id(metadata: Dict[str, Any], kernel_id_override: str) -> str:
    if kernel_id_override.strip():
        return kernel_id_override.strip()
    return str(metadata.get("id", "")).strip()


def push_kaggle_kernel(job_dir: Path, accelerator: str) -> None:
    command = ["kaggle", "kernels", "push", "-p", str(job_dir)]
    if accelerator.strip():
        command.extend(["--accelerator", accelerator.strip()])
    run_cli(command, check=True)


def download_kaggle_outputs(kernel_id: str, output_dir: Path) -> Dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    proc = run_cli(["kaggle", "kernels", "output", kernel_id, "-p", str(output_dir), "--force"], check=False)
    return {"ok": proc.returncode == 0, "output_dir": str(output_dir)}


def inspect_kaggle_outputs(output_dir: Path, config: WorkflowConfig) -> Dict[str, Any]:
    merge_dir = None
    merge_status: Dict[str, Any] = {}
    upload_status: Dict[str, Any] = {}

    for path in output_dir.rglob("*"):
        if path.is_dir() and path.name == config.merged_local_dir_name:
            merge_dir = path
        if path.is_file() and path.name == "merge_status.json":
            try:
                merge_status = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                merge_status = {}
        if path.is_file() and path.name == "upload_status.json":
            try:
                upload_status = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                upload_status = {}

    adapter_in_status = str(merge_status.get("adapter_repo", "")).strip()
    adapter_locked = adapter_in_status == config.lora_adapter_id if merge_status else False
    upload_attempted = bool(upload_status.get("cli_upload", {}).get("attempted", False) or upload_status.get("python_upload", {}).get("attempted", False))

    return {
        "merge_dir_found": merge_dir is not None,
        "merge_dir": str(merge_dir) if merge_dir else "",
        "merge_status": merge_status,
        "upload_status": upload_status,
        "upload_attempted": upload_attempted,
        "upload_success": bool(upload_status.get("success", False)),
        "adapter_locked_to_700": adapter_locked,
    }


def verify_target_repo_files(config: WorkflowConfig, hf_client: HuggingFaceMCPClient) -> Dict[str, Any]:
    files_result = hf_client.inspect_repo_files(config.merged_repo_id)
    metadata_result = hf_mcp_get_repo_metadata(config.merged_repo_id, client=hf_client)

    files = list(files_result.payload.get("files", [])) if files_result.ok else []
    has_readme = "README.md" in files
    has_config = "config.json" in files
    has_tokenizer = any(name in files for name in ["tokenizer.json", "tokenizer.model", "tokenizer_config.json"])
    has_model_weights = any(
        name.endswith(".safetensors")
        or name.startswith("model-")
        or name == "pytorch_model.bin"
        for name in files
    )

    return {
        "files_result": asdict(files_result),
        "metadata_result": asdict(metadata_result),
        "expected_files": {
            "README.md": has_readme,
            "config.json": has_config,
            "tokenizer": has_tokenizer,
            "model_weights": has_model_weights,
        },
        "repo_file_count": len(files),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="End-to-end Kaggle-to-HF merge/publish for checkpoint-700 LoRA.")
    parser.add_argument("--job-dir", default="kaggle_merge_job", help="Path to Kaggle kernel folder.")
    parser.add_argument("--kernel-id", default="", help="Optional kernel id override, format owner/slug.")
    parser.add_argument("--poll-interval", type=int, default=60, help="Kaggle poll interval in seconds.")
    parser.add_argument("--timeout-minutes", type=int, default=240, help="Kaggle monitoring timeout in minutes.")
    parser.add_argument("--skip-hf-login", action="store_true", help="Skip HF CLI login step.")
    parser.add_argument(
        "--no-kaggle-init-if-missing",
        action="store_true",
        help="Do not auto-run 'kaggle kernels init' when metadata is missing.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    config = WorkflowConfig()

    stage("Configuration")
    print(json.dumps(asdict(config), indent=2))

    assert_adapter_lock(config)

    if not command_exists("kaggle"):
        raise RuntimeError("Missing required CLI: kaggle")

    if not command_exists("hf") and not command_exists("huggingface-cli"):
        raise RuntimeError("Missing required CLI: hf or huggingface-cli")

    job_dir = (ROOT_DIR / args.job_dir).resolve()
    if not job_dir.exists():
        raise RuntimeError(f"Kaggle job folder does not exist: {job_dir}")

    merge_script = job_dir / "merge_deped_qwen_lora.py"
    if not merge_script.exists():
        raise RuntimeError(f"Missing Kaggle merge script: {merge_script}")

    metadata = load_kernel_metadata(job_dir, auto_init_if_missing=not args.no_kaggle_init_if_missing)
    kernel_id = resolve_kernel_id(metadata, args.kernel_id)

    hf_client = HuggingFaceMCPClient(token=os.getenv("HF_TOKEN", "").strip())
    kaggle_client = KaggleMCPClient(transport=None)

    stage("HF MCP Preflight")
    preflight = run_hf_preflight(config, hf_client)
    print(json.dumps(preflight, indent=2))

    stage("HF CLI Authentication")
    auth_result = hf_cli_login(skip_hf_login=args.skip_hf_login)
    print(json.dumps(auth_result, indent=2))

    stage("HF Repo Preparation")
    repo_create_cli = hf_cli_create_repo(config.merged_repo_id)
    repo_create_python = hf_python_create_repo_fallback(config.merged_repo_id)
    print(json.dumps({"repo_create_cli": repo_create_cli, "repo_create_python": repo_create_python}, indent=2))

    if not repo_create_cli.get("ok", False) and not repo_create_python.get("ok", False):
        raise RuntimeError("Failed to create/verify target merged repo via both CLI and Python fallback.")

    stage("Kaggle CLI Push")
    print("[info] exact push command: kaggle kernels push -p ./kaggle_merge_job")
    print(f"[info] requested accelerator: {config.accelerator}")
    push_kaggle_kernel(job_dir, accelerator=config.accelerator)

    stage("Kaggle MCP Monitoring")
    initial_status = kaggle_mcp_get_run_status(kernel_id=kernel_id, client=kaggle_client)
    wait_result = kaggle_mcp_wait_until_done(
        kernel_id=kernel_id,
        poll_interval=args.poll_interval,
        timeout_minutes=args.timeout_minutes,
        client=kaggle_client,
    )
    logs_result = kaggle_mcp_get_run_logs(kernel_id=kernel_id, client=kaggle_client)
    print(
        json.dumps(
            {
                "initial_status": asdict(initial_status),
                "wait_result": asdict(wait_result),
                "logs_result": asdict(logs_result),
            },
            indent=2,
        )
    )

    output_dir = job_dir / "_kaggle_outputs"
    stage("Kaggle Output Download")
    outputs_download = download_kaggle_outputs(kernel_id=kernel_id, output_dir=output_dir)
    print(json.dumps(outputs_download, indent=2))

    stage("Local Output Inspection")
    outputs_inspection = inspect_kaggle_outputs(output_dir=output_dir, config=config)
    print(json.dumps(outputs_inspection, indent=2))

    stage("HF Final Verification")
    repo_verify = verify_target_repo_files(config=config, hf_client=hf_client)
    print(json.dumps(repo_verify, indent=2))

    repo_files_ok = all(bool(value) for value in repo_verify["expected_files"].values())
    workflow_ok = all(
        [
            wait_result.ok,
            outputs_download.get("ok", False),
            outputs_inspection.get("merge_dir_found", False),
            outputs_inspection.get("upload_attempted", False),
            outputs_inspection.get("upload_success", False),
            outputs_inspection.get("adapter_locked_to_700", False),
            repo_files_ok,
        ]
    )

    final_summary = {
        "base_model_repo": config.base_model_id,
        "lora_adapter_repo": config.lora_adapter_id,
        "merged_repo": config.merged_repo_id,
        "kaggle_kernel_id": kernel_id,
        "final_status": "success" if workflow_ok else "failed",
        "likely_cause": "" if workflow_ok else "Review wait_result, upload_status, and repo expected_files checks.",
    }

    stage("Final Summary")
    print(json.dumps(final_summary, indent=2))

    if not workflow_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
