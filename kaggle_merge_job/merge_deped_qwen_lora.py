# %% [markdown]
"""
# Kaggle GPU Merge + Publish (DepEd Math Qwen2.5)

This script is notebook-friendly (`# %%` cells) and can run as a plain Python script.
It merges a LoRA adapter into a standalone fp16 model and uploads it to Hugging Face.
"""

# %%
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict

# Required variables from task spec.
BASE_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
LORA_ADAPTER_ID = "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora"
MERGED_LOCAL_DIR = "deped-math-merged"
MERGED_REPO_ID = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
EXPECTED_LORA_ADAPTER_ID = "Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora"

UPLOAD_COMMIT_MESSAGE = "Add merged fp16 model from 700-step LoRA checkpoint"


def assert_adapter_lock() -> None:
    if LORA_ADAPTER_ID != EXPECTED_LORA_ADAPTER_ID:
        raise RuntimeError(
            "Adapter lock violation. Only checkpoint-700 is allowed: "
            f"{EXPECTED_LORA_ADAPTER_ID}"
        )


assert_adapter_lock()
print("Merge configuration:")
print("- BASE_MODEL_ID:", BASE_MODEL_ID)
print("- LORA_ADAPTER_ID (700-step only):", LORA_ADAPTER_ID)
print("- MERGED_REPO_ID:", MERGED_REPO_ID)
print("- MERGED_LOCAL_DIR:", MERGED_LOCAL_DIR)


# %% [markdown]
"""
## 1) Install dependencies
Required by task: `unsloth`, `transformers`, `peft`, `huggingface_hub`.
"""

# %%
def pip_install(*packages: str) -> None:
    cmd = [sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", *packages]
    print("[pip]", " ".join(cmd))
    subprocess.run(cmd, check=True)


def pip_uninstall(*packages: str) -> None:
    cmd = [sys.executable, "-m", "pip", "uninstall", "-y", *packages]
    print("[pip]", " ".join(cmd))
    subprocess.run(cmd, check=False)


pip_install("--upgrade", "pip")
# Remove preinstalled packages that often cause resolver noise but are not needed for this merge job.
pip_uninstall("bigframes", "s3fs", "gcsfs")
pip_install("unsloth", "transformers", "peft", "huggingface_hub", "accelerate", "bitsandbytes", "safetensors")


# %% [markdown]
"""
## 2) Login to Hugging Face
Uses `huggingface_hub.login()` so you can paste your token when not provided by env.
"""

# %%
from huggingface_hub import HfApi, login

hf_token = os.getenv("HF_TOKEN", "").strip()
if hf_token:
    login(token=hf_token, add_to_git_credential=False)
    print("Hugging Face login completed from HF_TOKEN environment variable.")
else:
    print("HF_TOKEN not set. You will be prompted to paste your Hugging Face token.")
    login(add_to_git_credential=False)


# %% [markdown]
"""
## 3) Load base model with Unsloth
Task requirement: `FastLanguageModel.from_pretrained(..., max_seq_length=8192, load_in_4bit=True)`.
"""

# %%
import torch

# Keep Unsloth import first among model stack imports to apply expected runtime patches cleanly.
os.environ.setdefault("UNSLOTH_COMPILE_DISABLE", "1")
from unsloth import FastLanguageModel
from peft import PeftModel

base_model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL_ID,
    max_seq_length=8192,
    load_in_4bit=True,
)
if torch.cuda.is_available():
    print("CUDA is available. Base model loaded on GPU-capable runtime.")
print("Loaded base model with Unsloth:", BASE_MODEL_ID)


# %% [markdown]
"""
## 4) Load/apply LoRA adapter and merge to standalone fp16
This block prefers standard PEFT adapter loading, and falls back to an Unsloth-compatible adapter load path.
"""

# %%
adapter_load_method = ""
model_for_merge = None

print(f"Loading 700-step LoRA adapter from {LORA_ADAPTER_ID}...")
try:
    model_for_merge = PeftModel.from_pretrained(base_model, LORA_ADAPTER_ID)
    adapter_load_method = "peft.from_pretrained"
    print("Loaded adapter via PEFT:", LORA_ADAPTER_ID)
except Exception as peft_exc:
    print("PEFT adapter load failed. Falling back to Unsloth adapter repo load.")
    print("PEFT error:", peft_exc)
    model_for_merge, tokenizer = FastLanguageModel.from_pretrained(
        model_name=LORA_ADAPTER_ID,
        max_seq_length=8192,
        load_in_4bit=True,
    )
    adapter_load_method = "unsloth.from_pretrained(adapter_repo)"
    print("Loaded adapter via Unsloth fallback:", LORA_ADAPTER_ID)


# %%
merge_dir = Path(MERGED_LOCAL_DIR)
if merge_dir.exists():
    shutil.rmtree(merge_dir)
merge_dir.mkdir(parents=True, exist_ok=True)

merge_method = ""

if hasattr(model_for_merge, "save_pretrained_merged"):
    try:
        model_for_merge.save_pretrained_merged(
            str(merge_dir),
            tokenizer,
            save_method="merged_16bit",
        )
        merge_method = "unsloth.save_pretrained_merged(merged_16bit)"
    except Exception as merge_exc:
        print("Unsloth merged save failed; falling back to PEFT merge_and_unload(fp16).")
        print("Unsloth merge error:", merge_exc)
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print("Reloading base model in fp16 for a clean PEFT merge fallback...")
        fp16_base = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID,
            torch_dtype=torch.float16,
            device_map="auto",
        )
        fp16_tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
        fp16_peft_model = PeftModel.from_pretrained(fp16_base, LORA_ADAPTER_ID)
        merged_fp16 = fp16_peft_model.merge_and_unload()
        merged_fp16.save_pretrained(str(merge_dir), safe_serialization=True)
        fp16_tokenizer.save_pretrained(str(merge_dir))
        merge_method = "peft.merge_and_unload(fp16) [reloaded_fp16_base_fallback]"
else:
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print("Unsloth merged save API unavailable; reloading base model in fp16 for PEFT merge.")
    fp16_base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_ID,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    fp16_tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
    fp16_peft_model = PeftModel.from_pretrained(fp16_base, LORA_ADAPTER_ID)
    merged_fp16 = fp16_peft_model.merge_and_unload()
    merged_fp16.save_pretrained(str(merge_dir), safe_serialization=True)
    fp16_tokenizer.save_pretrained(str(merge_dir))
    merge_method = "peft.merge_and_unload(fp16) [reloaded_fp16_base]"

print("Merged model saved to:", merge_dir.resolve())
print("Adapter load method:", adapter_load_method)
print("Merge method:", merge_method)

merge_status = {
    "base_model": BASE_MODEL_ID,
    "adapter_repo": LORA_ADAPTER_ID,
    "merged_repo": MERGED_REPO_ID,
    "merged_local_dir": str(merge_dir),
    "adapter_load_method": adapter_load_method,
    "merge_method": merge_method,
    "success": True,
}
(merge_dir / "merge_status.json").write_text(json.dumps(merge_status, indent=2), encoding="utf-8")


# %% [markdown]
"""
## 5) Write model card README.md before upload
Required fields: model name, base model, adapter source, description, intended use, limitations, and quick usage.
"""

# %%
def build_model_card() -> str:
    return f"""---
language: en
base_model: {BASE_MODEL_ID}
tags:
- deped
- mathematics
- grade11
- grade12
- qwen2.5
- lora-merged
pipeline_tag: text-generation
license: apache-2.0
---

# DepEd Math Tutor Qwen2.5-7B (Merged from 700-step LoRA)

## Model Summary
This repository contains a **merged fp16 model** for DepEd Grade 11-12 math tutoring.
The LoRA adapter has been merged into the base model weights, so inference does not require PEFT adapters.

- Base model: `{BASE_MODEL_ID}`
- Source adapter: `{LORA_ADAPTER_ID}`
- Training checkpoint: **step 700**
- Target merged repo: `{MERGED_REPO_ID}`
- Output format: standalone fp16 Transformers model

## Intended Use
- DepEd-aligned tutoring support for Grade 11-12 mathematics
- Step-by-step instructional responses
- Prototyping, evaluation, and classroom assistant workflows

## Limitations
- Not a replacement for teacher assessment and curriculum validation
- May produce incorrect or incomplete reasoning for edge cases
- Requires prompt and output review in real classroom settings

## Quick Usage
```python
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id = "{MERGED_REPO_ID}"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype="auto",
    device_map="auto",
)
```
"""


readme_path = merge_dir / "README.md"
readme_path.write_text(build_model_card(), encoding="utf-8")
print("Wrote model card:", readme_path.resolve())


# %% [markdown]
"""
## 6) Upload merged model
CLI commands are printed first (as requested), then Python fallback runs with `HfApi.upload_folder()`.
"""

# %%
def print_hf_cli_commands() -> None:
    print("\nHF CLI commands:")
    print("hf auth login")
    print(f"hf repo create {MERGED_REPO_ID} --type model")
    print(
        "hf upload "
        f"{MERGED_REPO_ID} ./{MERGED_LOCAL_DIR} . "
        f"--commit-message \"{UPLOAD_COMMIT_MESSAGE}\""
    )


print_hf_cli_commands()

run_hf_cli_upload = os.getenv("RUN_HF_CLI_UPLOAD", "0").strip().lower() in {"1", "true", "yes"}
cli_upload_status: Dict[str, object] = {"attempted": False, "success": False, "error": None}

if run_hf_cli_upload:
    cli_upload_status["attempted"] = True
    try:
        subprocess.run(["hf", "repo", "create", MERGED_REPO_ID, "--type", "model"], check=False)
        subprocess.run(
            [
                "hf",
                "upload",
                MERGED_REPO_ID,
                f"./{MERGED_LOCAL_DIR}",
                ".",
                "--commit-message",
                UPLOAD_COMMIT_MESSAGE,
            ],
            check=True,
        )
        cli_upload_status["success"] = True
    except Exception as cli_exc:
        cli_upload_status["error"] = str(cli_exc)
        print("HF CLI upload failed:", cli_exc)


# %%
api = HfApi()
python_upload_status: Dict[str, object] = {"attempted": True, "success": False, "error": None}

try:
    api.create_repo(repo_id=MERGED_REPO_ID, repo_type="model", exist_ok=True)
    api.upload_folder(
        repo_id=MERGED_REPO_ID,
        repo_type="model",
        folder_path=str(merge_dir),
        path_in_repo=".",
        commit_message=UPLOAD_COMMIT_MESSAGE,
    )
    python_upload_status["success"] = True
    print(f"Upload complete. Files published to {MERGED_REPO_ID}.")
except Exception as py_exc:
    python_upload_status["error"] = str(py_exc)
    print("Python fallback upload failed:", py_exc)


upload_status = {
    "merged_repo": MERGED_REPO_ID,
    "cli_upload": cli_upload_status,
    "python_upload": python_upload_status,
    "success": bool(cli_upload_status["success"] or python_upload_status["success"]),
}
(merge_dir / "upload_status.json").write_text(json.dumps(upload_status, indent=2), encoding="utf-8")

print("Upload status:")
print(json.dumps(upload_status, indent=2))
print("Final merge summary:")
print("- Base model used:", BASE_MODEL_ID)
print("- 700-step adapter used:", LORA_ADAPTER_ID)
print("- Merged repo target:", MERGED_REPO_ID)
