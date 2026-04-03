import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional


def _run_command(command: List[str], cwd: Optional[Path] = None, check: bool = True) -> subprocess.CompletedProcess:
    print("[run]", shlex.join(command))
    return subprocess.run(command, cwd=str(cwd) if cwd else None, check=check, text=True, capture_output=not check)


def _build_kaggle_base_command() -> List[str]:
    kaggle_cli = shutil.which("kaggle")
    if kaggle_cli:
        return [kaggle_cli]

    uv_cli = shutil.which("uv")
    if uv_cli:
        return [uv_cli, "run", "--no-project", "--with", "kaggle", "--", "kaggle"]

    raise RuntimeError("Could not find kaggle CLI or uv. Install one of them before launching automation.")


def _resolve_kaggle_username() -> str:
    env_username = os.getenv("KAGGLE_USERNAME", "").strip()
    if env_username:
        return env_username

    kaggle_json_path = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_json_path.exists():
        data = json.loads(kaggle_json_path.read_text(encoding="utf-8"))
        username = str(data.get("username", "")).strip()
        if username:
            return username

    raise RuntimeError("Unable to resolve Kaggle username. Set KAGGLE_USERNAME or configure ~/.kaggle/kaggle.json.")


def _generate_notebooks(workspace_root: Path) -> None:
    generator = workspace_root / "scripts" / "generate_colab_qwen25_notebook.py"
    if not generator.exists():
        raise FileNotFoundError(f"Notebook generator not found: {generator}")

    _run_command([sys.executable, str(generator)], cwd=workspace_root, check=True)


def _prepare_kernel_bundle(
    workspace_root: Path,
    notebook_path: Path,
    kernel_ref: str,
    kernel_title: str,
    stage_root: Path,
    public_kernel: bool,
    enable_internet: bool,
    dataset_sources: List[str],
    model_sources: List[str],
    hf_token: str,
    accelerator: Optional[str],
) -> Path:
    if not notebook_path.exists():
        raise FileNotFoundError(f"Notebook file not found: {notebook_path}")

    bundle_dir = stage_root / kernel_ref.split("/", 1)[-1]
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
    bundle_dir.mkdir(parents=True, exist_ok=True)

    staged_notebook = bundle_dir / notebook_path.name
    shutil.copy2(notebook_path, staged_notebook)

    if hf_token.strip():
        notebook_data = json.loads(staged_notebook.read_text(encoding="utf-8"))
        replaced = False
        for cell in notebook_data.get("cells", []):
            if cell.get("cell_type") != "code":
                continue
            source_lines = cell.get("source", [])
            if not source_lines:
                continue

            updated_lines = []
            for line in source_lines:
                if "HF_TOKEN = ''" in line and not replaced:
                    updated_lines.append(line.replace("HF_TOKEN = ''", f"HF_TOKEN = '{hf_token}'"))
                    replaced = True
                else:
                    updated_lines.append(line)
            cell["source"] = updated_lines

        if replaced:
            staged_notebook.write_text(json.dumps(notebook_data, ensure_ascii=True, indent=2), encoding="utf-8")
            print("Injected HF token into staged notebook bundle for this run.")
        else:
            print("HF token was provided but no matching HF_TOKEN assignment was found in notebook.")

    metadata = {
        "id": kernel_ref,
        "title": kernel_title,
        "code_file": staged_notebook.name,
        "language": "python",
        "kernel_type": "notebook",
        "is_private": not public_kernel,
        "enable_gpu": True,
        "enable_tpu": False,
        "enable_internet": enable_internet,
        "dataset_sources": dataset_sources,
        "competition_sources": [],
        "kernel_sources": [],
        "model_sources": model_sources,
    }
    if accelerator:
        metadata["machine_shape"] = accelerator

    metadata_path = bundle_dir / "kernel-metadata.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"Prepared Kaggle kernel bundle: {bundle_dir}")
    print(f"Kernel metadata: {metadata_path}")
    return bundle_dir


def _extract_kernel_status(output_text: str) -> str:
    lowered = output_text.lower()
    match = re.search(r"\b(status|state)\s*[:=]\s*([a-z_\-]+)", lowered)
    if match:
        return match.group(2)

    for keyword in ["complete", "completed", "running", "queued", "pending", "starting", "failed", "error"]:
        if keyword in lowered:
            return keyword
    return "unknown"


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return re.sub(r"-+", "-", cleaned)


def _kaggle_status(base_command: List[str], kernel_ref: str, workspace_root: Path) -> str:
    cmd = [*base_command, "kernels", "status", kernel_ref]
    print("[run]", shlex.join(cmd))
    proc = subprocess.run(cmd, cwd=str(workspace_root), check=False, text=True, capture_output=True)
    raw_output = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    if raw_output:
        print(raw_output)
    return _extract_kernel_status(raw_output)


def _wait_for_kernel(base_command: List[str], kernel_ref: str, workspace_root: Path, timeout_minutes: int, poll_seconds: int) -> str:
    timeout_seconds = max(timeout_minutes, 1) * 60
    started = time.time()

    while True:
        status = _kaggle_status(base_command, kernel_ref, workspace_root)
        if status in {"complete", "completed"}:
            return "completed"
        if status in {"failed", "error"}:
            return "failed"

        if time.time() - started > timeout_seconds:
            return "timeout"

        print(f"Kernel still in progress (status={status}). Sleeping {poll_seconds}s...")
        time.sleep(max(poll_seconds, 10))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="End-to-end Kaggle notebook launcher for Qwen2.5 LoRA training.")
    parser.add_argument(
        "--notebook",
        default="training/deped_qwen25_pack/deped-math-qlora-training.ipynb",
        help="Notebook file to submit.",
    )
    parser.add_argument("--kernel-slug", default="qwen25-deped-lora-checkpointed", help="Kaggle kernel slug.")
    parser.add_argument(
        "--kernel-title",
        default="MathPulse Qwen2.5 DepEd LoRA Training (Checkpointed)",
        help="Kaggle kernel title.",
    )
    parser.add_argument("--public", action="store_true", help="Publish as a public notebook (default is private).")
    parser.add_argument("--disable-internet", action="store_true", help="Disable internet for the Kaggle run.")
    parser.add_argument("--dataset-source", action="append", default=[], help="Repeatable Kaggle dataset source refs.")
    parser.add_argument("--model-source", action="append", default=[], help="Repeatable Kaggle model source refs.")
    parser.add_argument("--skip-generate", action="store_true", help="Skip notebook regeneration step.")
    parser.add_argument("--wait", action="store_true", help="Wait for kernel completion and print status updates.")
    parser.add_argument("--timeout-minutes", type=int, default=720, help="Timeout when --wait is used.")
    parser.add_argument("--poll-seconds", type=int, default=60, help="Polling interval when --wait is used.")
    parser.add_argument("--stage-root", default=".kaggle-kernels", help="Directory for staged Kaggle kernel bundle.")
    parser.add_argument(
        "--accelerator",
        default="NvidiaTeslaT4",
        help="Kaggle machine shape for this run (for example: NvidiaTeslaT4, NvidiaTeslaP100, Tpu1VmV38).",
    )
    parser.add_argument(
        "--hf-token-env-var",
        default="HF_BOOTSTRAP_TOKEN",
        help="Environment variable name used to read an HF token for one-run staged notebook injection.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    workspace_root = Path(__file__).resolve().parents[1]
    notebook_path = (workspace_root / args.notebook).resolve()

    if not args.skip_generate:
        _generate_notebooks(workspace_root)

    kaggle_username = _resolve_kaggle_username()
    kernel_ref = f"{kaggle_username}/{args.kernel_slug}"

    kernel_title = args.kernel_title
    if _slugify(kernel_title) != args.kernel_slug:
        kernel_title = args.kernel_slug.replace("-", " ")
        print(
            "Adjusted kernel title to match Kaggle slug requirements:",
            kernel_title,
        )

    stage_root = (workspace_root / args.stage_root).resolve()
    hf_token = os.getenv(args.hf_token_env_var, "").strip()
    if hf_token:
        print(f"Using HF token from environment variable: {args.hf_token_env_var}")
    else:
        print(f"No HF token found in environment variable: {args.hf_token_env_var}. Notebook will rely on Kaggle secrets/runtime env.")

    bundle_dir = _prepare_kernel_bundle(
        workspace_root=workspace_root,
        notebook_path=notebook_path,
        kernel_ref=kernel_ref,
        kernel_title=kernel_title,
        stage_root=stage_root,
        public_kernel=args.public,
        enable_internet=not args.disable_internet,
        dataset_sources=args.dataset_source,
        model_sources=args.model_source,
        hf_token=hf_token,
        accelerator=args.accelerator,
    )

    kaggle_command = _build_kaggle_base_command()
    push_command = [*kaggle_command, "kernels", "push", "-p", str(bundle_dir)]
    if args.accelerator:
        push_command.extend(["--accelerator", args.accelerator])
    _run_command(push_command, cwd=workspace_root, check=True)
    print(f"Submitted Kaggle kernel: {kernel_ref}")

    if args.wait:
        final_status = _wait_for_kernel(
            base_command=kaggle_command,
            kernel_ref=kernel_ref,
            workspace_root=workspace_root,
            timeout_minutes=args.timeout_minutes,
            poll_seconds=args.poll_seconds,
        )
        print(f"Final status: {final_status}")
        if final_status == "failed":
            raise SystemExit(1)
        if final_status == "timeout":
            raise SystemExit(2)


if __name__ == "__main__":
    main()
