import argparse
import os
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List

from jobs.utils import get_logger

LOGGER = get_logger("mathpulse.jobs.launcher")


def _kv_pairs_to_env(pairs: List[str]) -> Dict[str, str]:
    env_map: Dict[str, str] = {}
    for pair in pairs:
        if "=" not in pair:
            raise ValueError(f"Invalid --env pair: {pair}. Expected KEY=VALUE.")
        key, value = pair.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError(f"Invalid --env key in pair: {pair}")
        env_map[key] = value
    return env_map


def _build_python_command(args: argparse.Namespace) -> List[str]:
    if args.job == "eval":
        command = [
            "python",
            "jobs/eval_math_model.py",
            "--model",
            args.model,
            "--dataset",
            args.dataset,
            "--subset",
            args.subset,
            "--limit",
            str(args.limit),
            "--metrics-csv",
            args.output,
        ]
        return command

    command = [
        "python",
        "jobs/generate_variants.py",
        "--model",
        args.model,
        "--dataset",
        args.dataset,
        "--subset",
        args.subset,
        "--limit",
        str(args.limit),
        "--variants-per-item",
        str(args.variants_per_item),
        "--output-jsonl",
        args.output,
    ]
    return command


def _run_local(command: List[str], env_overrides: Dict[str, str]) -> int:
    env = os.environ.copy()
    env.update(env_overrides)
    LOGGER.info("Running local job: %s", shlex.join(command))
    proc = subprocess.run(command, env=env, check=False)
    return proc.returncode


def _run_hf_cli(command: List[str], env_overrides: Dict[str, str], flavor: str, dry_run: bool) -> int:
    hf_cli = shutil.which("hf")
    if not hf_cli:
        raise RuntimeError("Hugging Face CLI 'hf' was not found. Install it or run with --mode local.")

    env_flags: List[str] = []
    for key, value in env_overrides.items():
        env_flags.extend(["--env", f"{key}={value}"])

    command_str = shlex.join(command)
    hf_command = [hf_cli, "jobs", "run", "--flavor", flavor, *env_flags, "--command", command_str]
    LOGGER.info("Prepared HF job command: %s", shlex.join(hf_command))

    if dry_run:
        return 0

    proc = subprocess.run(hf_command, check=False)
    return proc.returncode


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Launch eval/variant jobs locally or via Hugging Face Jobs CLI")
    parser.add_argument("--job", choices=["eval", "variants"], required=True)
    parser.add_argument("--mode", choices=["local", "hf"], default="local")
    parser.add_argument("--model", default=os.getenv("INFERENCE_MODEL_ID", "meta-llama/Llama-3.1-8B-Instruct"))
    parser.add_argument("--dataset", default="datasets/eval/grade11_12/problem_bank.jsonl")
    parser.add_argument("--subset", default="all")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--output", default="")
    parser.add_argument("--variants-per-item", type=int, default=3)
    parser.add_argument("--flavor", default="cpu-basic", help="HF jobs flavor, used only with --mode hf")
    parser.add_argument("--env", action="append", default=[], help="Repeatable KEY=VALUE env override")
    parser.add_argument("--dry-run", action="store_true", help="Print command without executing")
    return parser


def _default_output_for(job: str) -> str:
    if job == "eval":
        return "jobs/output/eval_metrics.csv"
    return "datasets/synthetic/variants/generated_variants.jsonl"


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if not args.output:
        args.output = _default_output_for(args.job)

    # Keep relative paths stable when running from any cwd.
    workspace_root = Path(__file__).resolve().parents[1]
    os.chdir(workspace_root)

    env_overrides = _kv_pairs_to_env(args.env)
    command = _build_python_command(args)

    if args.mode == "local":
        code = _run_local(command, env_overrides)
    else:
        code = _run_hf_cli(command, env_overrides, args.flavor, args.dry_run)

    if code != 0:
        raise SystemExit(code)


if __name__ == "__main__":
    main()
