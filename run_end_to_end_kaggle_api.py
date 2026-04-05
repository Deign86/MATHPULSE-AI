#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

from huggingface_hub import HfApi

ROOT_DIR = Path(__file__).resolve().parent

from scripts.mcp_clients import (
    HuggingFaceMCPClient,
    KaggleMCPClient,
    hf_mcp_check_repo_exists,
    hf_mcp_get_repo_metadata,
    hf_mcp_search_docs,
    kaggle_mcp_get_run_logs,
    kaggle_mcp_get_run_status,
    kaggle_mcp_wait_until_ready,
)

TARGET_MODEL_ID = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
UPSTREAM_REPO_URL = "https://github.com/khiwniti/kaggle-llm-api.git"

DISALLOWED_MODEL_REFERENCES = {
    "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora",
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-7B",
    "meta-llama/Llama-3.1-8B-Instruct",
    "microsoft/Phi-3-mini-4k-instruct",
    "microsoft/DialoGPT-medium",
    "gpt2",
}

MODEL_VAR_PATTERN = re.compile(
    r"(?m)^(\s*(?:MODEL_ID|MODEL_NAME|DEFAULT_MODEL(?:_ID)?|VLLM_MODEL(?:_ID)?|HF_MODEL_ID)\s*=\s*)([\"']).*?\2"
)
SHELL_MODEL_VAR_PATTERN = re.compile(
    r"(?m)^(\s*(?:export\s+)?(?:MODEL_ID|MODEL_NAME|DEFAULT_MODEL(?:_ID)?|VLLM_MODEL(?:_ID)?|HF_MODEL_ID)=)([^\n#]+)"
)
MODEL_TOKEN_PATTERN = re.compile(r"\b[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\b")
KAGGLE_CODE_URL_PATTERN = re.compile(r"https?://www\.kaggle\.com/code/([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+)")


@dataclass(frozen=True)
class WorkflowConfig:
    target_model_id: str = TARGET_MODEL_ID
    upstream_repo_url: str = UPSTREAM_REPO_URL
    upstream_dir: str = ".automation_cache/kaggle-llm-api-upstream"
    kaggle_job_dir: str = "kaggle_llm_api_job"
    kernel_slug: str = "deped-math-qwen2-5-merged-openai-api"
    kernel_title: str = "DepEd Math Qwen2.5 Merged OpenAI API"
    accelerator: str = "NvidiaTeslaT4"


@dataclass
class RunSummary:
    success: bool
    payload: Dict[str, Any]


def stage(title: str) -> None:
    print(f"\n{'=' * 12} {title} {'=' * 12}")


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def has_python_hf_cli() -> bool:
    try:
        import huggingface_hub.cli.hf  # noqa: F401

        return True
    except Exception:
        return False


def hf_cli_candidates() -> List[Tuple[str, List[str]]]:
    candidates: List[Tuple[str, List[str]]] = []

    hf_bin = shutil.which("hf")
    if hf_bin:
        candidates.append(("hf", [hf_bin]))

    huggingface_cli_bin = shutil.which("huggingface-cli")
    if huggingface_cli_bin:
        candidates.append(("huggingface-cli", [huggingface_cli_bin]))

    if has_python_hf_cli():
        candidates.append(("python-hf-cli", [sys.executable, "-m", "huggingface_hub.cli.hf"]))

    return candidates


def bootstrap_python_hf_cli() -> bool:
    install_proc = run_cli(
        [sys.executable, "-m", "pip", "install", "-q", "--upgrade", "huggingface_hub>=0.23.0"],
        check=False,
    )
    if install_proc.returncode != 0:
        return False
    return bool(hf_cli_candidates())


def redact_command(command: List[str]) -> List[str]:
    redacted: List[str] = []
    hide_next = False
    for part in command:
        if hide_next:
            redacted.append("***REDACTED***")
            hide_next = False
            continue

        lowered = part.lower()
        if lowered == "--token":
            redacted.append(part)
            hide_next = True
            continue

        if lowered.startswith("--token="):
            redacted.append("--token=***REDACTED***")
            continue

        redacted.append(part)

    return redacted


def run_cli(
    command: List[str],
    cwd: Path | None = None,
    check: bool = False,
    env_overrides: Dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    if env_overrides:
        env.update(env_overrides)

    print("[cli]", " ".join(redact_command(command)))
    proc = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=False,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        env=env,
    )

    stdout_text = (proc.stdout or "").strip()
    stderr_text = (proc.stderr or "").strip()

    if stdout_text:
        print(stdout_text)
    if stderr_text:
        print(stderr_text)

    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(command)}")
    return proc


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def ensure_notebook_kernel_metadata(notebook_path: Path) -> Dict[str, Any]:
    if not notebook_path.exists():
        return {
            "ok": False,
            "path": str(notebook_path),
            "error": "Notebook file not found.",
            "updated": False,
        }

    try:
        payload = json.loads(notebook_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {
            "ok": False,
            "path": str(notebook_path),
            "error": f"Failed to parse notebook JSON: {exc}",
            "updated": False,
        }

    changed = False

    metadata = payload.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}
        payload["metadata"] = metadata
        changed = True

    kernelspec = metadata.get("kernelspec")
    if not isinstance(kernelspec, dict):
        kernelspec = {}
        metadata["kernelspec"] = kernelspec
        changed = True

    required_kernelspec = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    for key, value in required_kernelspec.items():
        if kernelspec.get(key) != value:
            kernelspec[key] = value
            changed = True

    language_info = metadata.get("language_info")
    if not isinstance(language_info, dict):
        language_info = {}
        metadata["language_info"] = language_info
        changed = True
    if language_info.get("name") != "python":
        language_info["name"] = "python"
        changed = True

    if payload.get("nbformat") != 4:
        payload["nbformat"] = 4
        changed = True
    if payload.get("nbformat_minor") != 5:
        payload["nbformat_minor"] = 5
        changed = True

    cells = payload.get("cells", [])
    if isinstance(cells, list):
        for cell in cells:
            if not isinstance(cell, dict):
                continue
            cell_type = str(cell.get("cell_type", "")).strip().lower()
            cell_metadata = cell.get("metadata")
            if not isinstance(cell_metadata, dict):
                cell_metadata = {}
                cell["metadata"] = cell_metadata
                changed = True

            desired_language = "markdown" if cell_type == "markdown" else "python"
            if cell_metadata.get("language") != desired_language:
                cell_metadata["language"] = desired_language
                changed = True

    if changed:
        notebook_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    kernel_name = ""
    metadata_after = payload.get("metadata") if isinstance(payload, dict) else {}
    if isinstance(metadata_after, dict):
        kernelspec_after = metadata_after.get("kernelspec")
        if isinstance(kernelspec_after, dict):
            kernel_name = str(kernelspec_after.get("name", "")).strip()

    return {
        "ok": True,
        "path": str(notebook_path),
        "updated": changed,
        "kernel_name": kernel_name,
    }


def pick_notebook_code_file(job_dir: Path, preferred: str = "") -> str:
    preferred_clean = preferred.strip()
    if preferred_clean and preferred_clean.lower().endswith(".ipynb") and (job_dir / preferred_clean).exists():
        return preferred_clean

    candidates = [
        "deped-math-qwen2-5-merged-openai-api.ipynb",
        "serve_kaggle_llm_api_notebook.ipynb",
        "vLLM_Qwen_Finetuned.ipynb",
    ]
    for name in candidates:
        if (job_dir / name).exists():
            return name

    discovered = sorted(path.name for path in job_dir.glob("*.ipynb"))
    if discovered:
        return discovered[0]

    raise RuntimeError("Editor type mismatch recovery requires an .ipynb file in kaggle job directory.")


def force_notebook_kernel_metadata(job_dir: Path) -> Dict[str, Any]:
    metadata_path = job_dir / "kernel-metadata.json"
    metadata = read_json(metadata_path)

    selected_notebook = pick_notebook_code_file(job_dir=job_dir, preferred=str(metadata.get("code_file", "")))
    notebook_fix = ensure_notebook_kernel_metadata(job_dir / selected_notebook)
    metadata["code_file"] = selected_notebook
    metadata["kernel_type"] = "notebook"
    metadata["language"] = "python"

    write_json(metadata_path, metadata)
    return {
        "metadata_path": str(metadata_path),
        "code_file": selected_notebook,
        "kernel_type": "notebook",
        "notebook_fix": notebook_fix,
    }


def extract_kernel_ref_from_push_output(raw_output: str) -> str:
    match = KAGGLE_CODE_URL_PATTERN.search(raw_output)
    if not match:
        return ""
    return f"{match.group(1)}/{match.group(2)}"


def resolve_kaggle_username() -> str:
    env_username = os.getenv("KAGGLE_USERNAME", "").strip()
    if env_username:
        return env_username

    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_json.exists():
        try:
            parsed = json.loads(kaggle_json.read_text(encoding="utf-8"))
            username = str(parsed.get("username", "")).strip()
            if username:
                return username
        except Exception:
            pass

    raise RuntimeError("Unable to resolve Kaggle username. Set KAGGLE_USERNAME or configure ~/.kaggle/kaggle.json.")


def ensure_required_clis() -> None:
    if not command_exists("git"):
        raise RuntimeError("Missing required CLI: git")

    if not command_exists("kaggle") and not command_exists("uv"):
        raise RuntimeError("Missing required Kaggle launcher: kaggle CLI or uv")

    if not hf_cli_candidates():
        print("[info] No Hugging Face CLI detected. Attempting Python CLI bootstrap...")
        if not bootstrap_python_hf_cli():
            raise RuntimeError("Missing required Hugging Face CLI: hf, huggingface-cli, or python HF CLI")


def build_kaggle_base_command() -> List[str]:
    kaggle_cli = shutil.which("kaggle")
    if kaggle_cli:
        return [kaggle_cli]

    uv_cli = shutil.which("uv")
    if uv_cli:
        return [uv_cli, "run", "--no-project", "--with", "kaggle", "--", "kaggle"]

    raise RuntimeError("Could not find kaggle CLI or uv for Kaggle command execution.")


def run_hf_mcp_preflight(config: WorkflowConfig, hf_client: HuggingFaceMCPClient) -> Dict[str, Any]:
    repo_exists = hf_mcp_check_repo_exists(config.target_model_id, client=hf_client)
    repo_metadata = hf_mcp_get_repo_metadata(config.target_model_id, client=hf_client)
    repo_files = hf_client.inspect_repo_files(config.target_model_id)
    docs_result = hf_mcp_search_docs("vllm openai api serving download model", client=hf_client)

    files = list(repo_files.payload.get("files", [])) if repo_files.ok else []
    loadable_check = {
        "config_json": "config.json" in files,
        "tokenizer": any(name in files for name in ["tokenizer.json", "tokenizer.model", "tokenizer_config.json"]),
        "weights": any(name.endswith(".safetensors") or name == "pytorch_model.bin" for name in files),
    }

    exists_flag = bool(repo_exists.payload.get("exists", False)) if repo_exists.ok else False
    looks_loadable = bool(all(loadable_check.values()))

    summary = {
        "repo_exists": repo_exists.__dict__,
        "repo_metadata": repo_metadata.__dict__,
        "repo_files": repo_files.__dict__,
        "docs": docs_result.__dict__,
        "loadable_check": loadable_check,
        "looks_loadable": looks_loadable,
    }

    if not exists_flag:
        raise RuntimeError(f"Target model repo not found or inaccessible: {config.target_model_id}")

    return summary


def run_hf_cli_validation(skip_hf_login: bool, target_model_id: str) -> Dict[str, Any]:
    token = os.getenv("HF_TOKEN", "").strip()
    login_attempts: List[Dict[str, Any]] = []
    repo_info_attempts: List[Dict[str, Any]] = []
    cli_candidates = hf_cli_candidates()

    if not skip_hf_login:
        for cli_name, base_command in cli_candidates:
            if cli_name in {"hf", "python-hf-cli"}:
                command = [*base_command, "auth", "login"]
            else:
                command = [*base_command, "login"]
            if token:
                command.extend(["--token", token])
            proc = run_cli(command, check=False)
            login_attempts.append(
                {
                    "cli": cli_name,
                    "command": " ".join(redact_command(command)),
                    "ok": proc.returncode == 0,
                    "mode": "token" if token else "interactive",
                }
            )

    for cli_name, base_command in cli_candidates:
        if cli_name == "hf":
            command = [*base_command, "repo", "info", target_model_id, "--repo-type", "model"]
        elif cli_name == "python-hf-cli":
            command = [*base_command, "models", "info", target_model_id]
        else:
            command = [*base_command, "repo", "info", target_model_id]
        proc = run_cli(command, check=False)
        repo_info_attempts.append({"cli": cli_name, "command": " ".join(command), "ok": proc.returncode == 0})

    python_fallback: Dict[str, Any]
    try:
        api = HfApi(token=token or None)
        info = api.repo_info(repo_id=target_model_id, repo_type="model")
        python_fallback = {
            "ok": True,
            "private": bool(getattr(info, "private", False)),
            "sha": str(getattr(info, "sha", "")),
        }
    except Exception as exc:
        python_fallback = {"ok": False, "error": str(exc)}

    return {
        "skip_hf_login": skip_hf_login,
        "token_present": bool(token),
        "cli_candidates": [name for name, _ in cli_candidates],
        "login_attempts": login_attempts,
        "repo_info_attempts": repo_info_attempts,
        "python_fallback": python_fallback,
    }


def sync_upstream_repo(upstream_dir: Path, upstream_repo_url: str) -> Dict[str, Any]:
    upstream_dir.parent.mkdir(parents=True, exist_ok=True)

    if (upstream_dir / ".git").exists():
        run_cli(["git", "-C", str(upstream_dir), "fetch", "--all", "--prune"], check=True)
        run_cli(["git", "-C", str(upstream_dir), "checkout", "main"], check=False)
        run_cli(["git", "-C", str(upstream_dir), "pull", "--ff-only"], check=False)
        head = run_cli(["git", "-C", str(upstream_dir), "rev-parse", "--short", "HEAD"], check=False)
        return {
            "action": "updated",
            "path": str(upstream_dir),
            "head": head.stdout.strip(),
        }

    run_cli(["git", "clone", "--depth", "1", upstream_repo_url, str(upstream_dir)], check=True)
    head = run_cli(["git", "-C", str(upstream_dir), "rev-parse", "--short", "HEAD"], check=False)
    return {
        "action": "cloned",
        "path": str(upstream_dir),
        "head": head.stdout.strip(),
    }


def mirror_upstream_project(upstream_dir: Path, destination_dir: Path) -> None:
    if destination_dir.exists():
        shutil.rmtree(destination_dir)

    shutil.copytree(
        upstream_dir,
        destination_dir,
        ignore=shutil.ignore_patterns(
            ".git",
            "__pycache__",
            "*.pyc",
            ".venv",
            "node_modules",
            "*.pt",
            "*.safetensors",
            ".idea",
            ".vscode",
        ),
    )


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in {".py", ".ipynb", ".json", ".yml", ".yaml", ".env", ".sh", ".md", ".toml", ".txt"}


def patch_model_references_in_text(raw: str, target_model_id: str) -> Tuple[str, int]:
    replaced = 0

    raw, count = MODEL_VAR_PATTERN.subn(rf"\1\2{target_model_id}\2", raw)
    replaced += count

    raw, count = SHELL_MODEL_VAR_PATTERN.subn(rf"\1{target_model_id}", raw)
    replaced += count

    for disallowed in DISALLOWED_MODEL_REFERENCES:
        if disallowed in raw:
            raw = raw.replace(disallowed, target_model_id)
            replaced += 1

    return raw, replaced


def patch_upstream_project(upstream_copy_dir: Path, target_model_id: str) -> Dict[str, Any]:
    touched_files: List[str] = []
    total_replacements = 0

    for file_path in upstream_copy_dir.rglob("*"):
        if not file_path.is_file() or not is_text_file(file_path):
            continue

        try:
            original = file_path.read_text(encoding="utf-8")
        except Exception:
            continue

        patched, replacements = patch_model_references_in_text(original, target_model_id)
        if replacements > 0 and patched != original:
            file_path.write_text(patched, encoding="utf-8")
            touched_files.append(str(file_path.relative_to(upstream_copy_dir)))
            total_replacements += replacements

    return {
        "files_touched": len(touched_files),
        "replacements": total_replacements,
        "touched_paths": touched_files,
    }


def enforce_model_lock(job_dir: Path, target_model_id: str) -> Dict[str, Any]:
    violations: List[Dict[str, Any]] = []
    serving_name_hints = ["serve", "api", "vllm", "main", "app", "run", "start", "config", "docker"]

    for path in job_dir.rglob("*"):
        if not path.is_file() or not is_text_file(path):
            continue

        relative = str(path.relative_to(job_dir))
        if relative.lower().startswith("upstream_project/.git"):
            continue

        extension = path.suffix.lower()
        if extension == ".md":
            continue

        filename_lower = path.name.lower()
        relative_lower = relative.lower()
        should_check = relative_lower in {
            "serve_kaggle_llm_api.py",
            "kernel-metadata.json",
            "model_lock.json",
        }
        if not should_check:
            if relative_lower.startswith("upstream_project/"):
                should_check = any(hint in filename_lower for hint in serving_name_hints)

        if not should_check:
            continue

        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        if "model" not in raw.lower() and "--model" not in raw:
            continue

        for line_number, line in enumerate(raw.splitlines(), start=1):
            if "model" not in line.lower() and "--model" not in line:
                continue
            for token in MODEL_TOKEN_PATTERN.findall(line):
                if token == target_model_id:
                    continue
                if token.startswith("http"):
                    continue
                if token.lower().startswith("v1/"):
                    continue
                violations.append(
                    {
                        "file": relative,
                        "line": line_number,
                        "token": token,
                        "line_text": line.strip(),
                    }
                )

    return {"ok": len(violations) == 0, "violations": violations}


def prepare_kaggle_bundle(
    config: WorkflowConfig,
    kernel_id_override: str,
    kernel_title: str,
    private_kernel: bool,
    accelerator: str,
) -> Dict[str, Any]:
    job_dir = (ROOT_DIR / config.kaggle_job_dir).resolve()
    upstream_copy_dir = (ROOT_DIR / ".automation_cache" / "kaggle-llm-api-prepared").resolve()
    upstream_dir = (ROOT_DIR / config.upstream_dir).resolve()

    if not job_dir.exists():
        raise RuntimeError(f"Kaggle job directory is missing: {job_dir}")

    mirror_upstream_project(upstream_dir=upstream_dir, destination_dir=upstream_copy_dir)
    patch_summary = patch_upstream_project(upstream_copy_dir=upstream_copy_dir, target_model_id=config.target_model_id)

    metadata_path = job_dir / "kernel-metadata.json"
    if not metadata_path.exists():
        kaggle_base = build_kaggle_base_command()
        run_cli([*kaggle_base, "kernels", "init", "-p", str(job_dir)], check=True)

    metadata = read_json(metadata_path)

    kernel_ref = kernel_id_override.strip()
    if not kernel_ref:
        kaggle_username = resolve_kaggle_username()
        kernel_ref = f"{kaggle_username}/{config.kernel_slug}"

    metadata["id"] = kernel_ref
    metadata["title"] = kernel_title
    existing_code_file = str(metadata.get("code_file", "")).strip()
    existing_kernel_type = str(metadata.get("kernel_type", "")).strip().lower()

    if existing_code_file:
        selected_code_file = existing_code_file
    else:
        selected_code_file = "deped-math-qwen2-5-merged-openai-api.ipynb"

    if existing_kernel_type in {"notebook", "script"}:
        selected_kernel_type = existing_kernel_type
    else:
        selected_kernel_type = "notebook" if selected_code_file.lower().endswith(".ipynb") else "script"

    notebook_metadata_fix: Dict[str, Any] | None = None
    if selected_code_file.lower().endswith(".ipynb"):
        notebook_metadata_fix = ensure_notebook_kernel_metadata(job_dir / selected_code_file)

    metadata["code_file"] = selected_code_file
    metadata["language"] = "python"
    metadata["kernel_type"] = selected_kernel_type
    metadata["is_private"] = bool(private_kernel)
    metadata["enable_gpu"] = True
    metadata["enable_tpu"] = False
    metadata["enable_internet"] = True
    metadata["machine_shape"] = accelerator
    metadata.setdefault("dataset_sources", [])
    metadata.setdefault("competition_sources", [])
    metadata.setdefault("kernel_sources", [])
    metadata.setdefault("model_sources", [])

    write_json(metadata_path, metadata)

    lock_file = job_dir / "model_lock.json"
    write_json(
        lock_file,
        {
            "locked_model_id": config.target_model_id,
            "disallowed_model_references": sorted(DISALLOWED_MODEL_REFERENCES),
        },
    )

    lock_result = enforce_model_lock(job_dir=job_dir, target_model_id=config.target_model_id)
    if not lock_result["ok"]:
        first = lock_result["violations"][:10]
        raise RuntimeError(
            "Model lock validation failed. Found non-target model references: "
            f"{json.dumps(first, indent=2)}"
        )

    return {
        "job_dir": str(job_dir),
        "kernel_ref": kernel_ref,
        "metadata_path": str(metadata_path),
        "notebook_metadata_fix": notebook_metadata_fix,
        "upstream_copy_dir": str(upstream_copy_dir),
        "upstream_patch_summary": patch_summary,
        "model_lock": lock_result,
    }


def push_kaggle_kernel(job_dir: Path, accelerator: str) -> Dict[str, Any]:
    kaggle_base = build_kaggle_base_command()
    command = [*kaggle_base, "kernels", "push", "-p", str(job_dir)]
    if accelerator.strip():
        command.extend(["--accelerator", accelerator.strip()])
    first_proc = run_cli(command, check=False)
    stdout_text = (first_proc.stdout or "").strip()
    stderr_text = (first_proc.stderr or "").strip()
    first_output = "\n".join([part for part in [stdout_text, stderr_text] if part]).strip()

    lower_first_output = first_output.lower()
    editor_type_mismatch = "cannot change the editor type of a kernel" in lower_first_output

    metadata_recovery: Dict[str, Any] | None = None
    final_proc = first_proc
    final_output = first_output
    final_attempt_output = first_output

    first_has_push_error = "kernel push error" in lower_first_output or "error:" in lower_first_output

    if editor_type_mismatch and (first_proc.returncode != 0 or first_has_push_error):
        print("[info] Kaggle rejected editor type change. Forcing notebook metadata and retrying push.")
        metadata_recovery = force_notebook_kernel_metadata(job_dir=job_dir)
        second_proc = run_cli(command, check=False)
        second_stdout = (second_proc.stdout or "").strip()
        second_stderr = (second_proc.stderr or "").strip()
        second_output = "\n".join([part for part in [second_stdout, second_stderr] if part]).strip()
        final_proc = second_proc
        final_attempt_output = second_output
        final_output = "\n\n".join(
            [
                "[first attempt]",
                first_output,
                "[second attempt after notebook metadata recovery]",
                second_output,
            ]
        ).strip()

    lower_final_attempt = final_attempt_output.lower()
    push_error_markers = ("kernel push error", "error:")
    has_push_error = any(marker in lower_final_attempt for marker in push_error_markers)
    has_success_marker = "successfully pushed" in lower_final_attempt
    detected_kernel_ref = extract_kernel_ref_from_push_output(final_output)
    return {
        "ok": final_proc.returncode == 0 and (has_success_marker or not has_push_error),
        "command": " ".join(command),
        "returncode": final_proc.returncode,
        "kernel_ref": detected_kernel_ref,
        "raw_output": final_output,
        "final_attempt_output": final_attempt_output,
        "metadata_recovery": metadata_recovery,
    }


def monitor_kaggle_api(kernel_ref: str, timeout_minutes: int, poll_interval: int, kaggle_client: KaggleMCPClient) -> Dict[str, Any]:
    initial_status = kaggle_mcp_get_run_status(kernel_id=kernel_ref, client=kaggle_client)
    ready_result = kaggle_mcp_wait_until_ready(
        kernel_id=kernel_ref,
        timeout_minutes=timeout_minutes,
        poll_interval=poll_interval,
        client=kaggle_client,
    )
    logs_result = kaggle_mcp_get_run_logs(kernel_id=kernel_ref, client=kaggle_client)

    return {
        "ok": bool(ready_result.ok),
        "initial_status": initial_status.__dict__,
        "ready_result": ready_result.__dict__,
        "logs_result": logs_result.__dict__,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="One-command end-to-end automation for Kaggle OpenAI-compatible serving of merged model."
    )
    parser.add_argument("--target-model-id", default=TARGET_MODEL_ID)
    parser.add_argument("--kernel-id", default="", help="Optional override for kernel ref owner/slug.")
    parser.add_argument("--kernel-title", default=WorkflowConfig().kernel_title)
    parser.add_argument("--accelerator", default=WorkflowConfig().accelerator)
    parser.add_argument("--timeout-minutes", type=int, default=240)
    parser.add_argument("--poll-interval", type=int, default=60)
    parser.add_argument("--skip-hf-login", action="store_true")
    parser.add_argument("--skip-push", action="store_true")
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--public-kernel", action="store_true", help="Set kernel visibility to public.")
    return parser


def main() -> None:
    args = build_parser().parse_args()

    config = WorkflowConfig(target_model_id=args.target_model_id)

    if config.target_model_id != TARGET_MODEL_ID:
        raise RuntimeError(
            "This workflow enforces a strict model lock. "
            f"Expected {TARGET_MODEL_ID}, got {config.target_model_id}."
        )

    stage("Configuration")
    print(json.dumps(asdict(config), indent=2))
    print(json.dumps({"kernel_id_override": args.kernel_id, "private_kernel": not args.public_kernel}, indent=2))

    stage("CLI Validation")
    ensure_required_clis()

    hf_client = HuggingFaceMCPClient(token=os.getenv("HF_TOKEN", "").strip())
    kaggle_client = KaggleMCPClient(transport=None)

    stage("Hugging Face MCP Preflight")
    hf_preflight = run_hf_mcp_preflight(config=config, hf_client=hf_client)
    print(json.dumps(hf_preflight, indent=2))

    stage("Hugging Face CLI Auth + Validation")
    hf_cli_summary = run_hf_cli_validation(skip_hf_login=args.skip_hf_login, target_model_id=config.target_model_id)
    print(json.dumps(hf_cli_summary, indent=2))

    stage("Upstream Sync")
    upstream_summary = sync_upstream_repo(
        upstream_dir=(ROOT_DIR / config.upstream_dir).resolve(),
        upstream_repo_url=config.upstream_repo_url,
    )
    print(json.dumps(upstream_summary, indent=2))

    stage("Prepare Kaggle Project")
    prepare_summary = prepare_kaggle_bundle(
        config=config,
        kernel_id_override=args.kernel_id,
        kernel_title=args.kernel_title,
        private_kernel=not args.public_kernel,
        accelerator=args.accelerator,
    )
    print(json.dumps(prepare_summary, indent=2))

    kernel_ref = str(prepare_summary.get("kernel_ref", "")).strip()
    if not kernel_ref:
        raise RuntimeError("Kernel reference could not be resolved.")

    monitor_kernel_ref = kernel_ref

    push_summary: Dict[str, Any] = {"ok": False, "skipped": bool(args.skip_push or args.prepare_only)}
    monitor_summary: Dict[str, Any] = {"ok": False, "skipped": bool(args.skip_push or args.prepare_only)}
    success = bool(args.skip_push or args.prepare_only)

    if not args.skip_push and not args.prepare_only:
        stage("Kaggle CLI Push")
        push_summary = push_kaggle_kernel(job_dir=Path(prepare_summary["job_dir"]), accelerator=args.accelerator)
        print(json.dumps(push_summary, indent=2))
        if not push_summary.get("ok", False):
            raise RuntimeError("kaggle kernels push failed.")

        detected_kernel_ref = str(push_summary.get("kernel_ref", "")).strip()
        if detected_kernel_ref:
            monitor_kernel_ref = detected_kernel_ref
            if detected_kernel_ref != kernel_ref:
                print(
                    json.dumps(
                        {
                            "warning": "Kaggle normalized kernel slug from metadata id; using detected kernel ref for monitoring.",
                            "metadata_kernel_ref": kernel_ref,
                            "detected_kernel_ref": detected_kernel_ref,
                        },
                        indent=2,
                    )
                )

        stage("Kaggle MCP Monitoring")
        monitor_summary = monitor_kaggle_api(
            kernel_ref=monitor_kernel_ref,
            timeout_minutes=args.timeout_minutes,
            poll_interval=args.poll_interval,
            kaggle_client=kaggle_client,
        )
        print(json.dumps(monitor_summary, indent=2, default=str))
        success = bool(monitor_summary.get("ok", False))

    stage("Final Summary")
    final_summary = {
        "success": success,
        "target_model_id": config.target_model_id,
        "kernel_ref": kernel_ref,
        "monitor_kernel_ref": monitor_kernel_ref,
        "upstream": upstream_summary,
        "prepare": prepare_summary,
        "push": push_summary,
        "monitor": monitor_summary,
        "endpoint_discovery": {
            "mode": "manual",
            "note": "Automatic public URL extraction is disabled. Provide the API URL manually from Kaggle logs.",
        },
    }
    print(json.dumps(final_summary, indent=2, default=str))

    if not args.skip_push and not args.prepare_only and not success:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
