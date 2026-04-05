# ===== SECTION 1: Environment (Kaggle T4 + Unsloth) =====
import os
import pathlib
import shutil
import subprocess
import sys
from typing import Iterable

import torch

print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU name:", torch.cuda.get_device_name(0))
    props = torch.cuda.get_device_properties(0)
    print("Total VRAM (GB):", round(props.total_memory / 1024**3, 2))

print("Expectation: Kaggle should provide an NVIDIA Tesla T4 16GB GPU for this workflow.")
if torch.cuda.is_available() and "t4" not in torch.cuda.get_device_name(0).lower():
    print("WARNING: Detected GPU is not Tesla T4. The workflow will still run, but behavior may differ.")

# Rerunnable behavior controls.
OVERWRITE = False
ENABLE_LORA_MERGE = False  # Set True later if you want to force adapter merge before export.

MODEL_ID = "Deign86/deped-math-qwen2.5-7b-deped-math-merged"
max_seq_length = 2048
dtype = None
load_in_4bit = True
output_dir = pathlib.Path("/kaggle/working/output/deped-math-qwen25-7b-unsloth-bnb-4bit")
space_dir = pathlib.Path("/kaggle/working/output/deped-math-qwen25-download-space")


def _run(cmd: Iterable[str], quiet: bool = True) -> None:
    cmd_list = list(cmd)
    print("[cmd]", " ".join(cmd_list))
    if quiet:
        subprocess.run(cmd_list, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run(cmd_list, check=True)


def _pip_install(*packages: str, quiet: bool = True) -> None:
    base = [sys.executable, "-m", "pip", "install", "--upgrade"]
    if quiet:
        base.extend(["--quiet", "--disable-pip-version-check"])
    _run([*base, *packages], quiet=quiet)


# Install dependencies idempotently and rerunnable.
print("Installing dependencies (idempotent, rerunnable)...")
_pip_install("pip", quiet=True)

unsloth_install_candidates = [
    'unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git',
    'unsloth @ git+https://github.com/unslothai/unsloth.git',
    "unsloth",
]

installed_unsloth = False
for candidate in unsloth_install_candidates:
    try:
        _pip_install(candidate, quiet=True)
        installed_unsloth = True
        print(f"Installed Unsloth with candidate: {candidate}")
        break
    except Exception as exc:
        print(f"Unsloth install candidate failed: {candidate} | {exc}")

if not installed_unsloth:
    raise RuntimeError("Failed to install unsloth from all candidates.")

_pip_install(
    "transformers",
    "accelerate",
    "bitsandbytes",
    "huggingface_hub",
    "safetensors",
    "sentencepiece",
    quiet=True,
)

# Required imports requested by spec.
from unsloth import FastLanguageModel
from transformers import TextStreamer
from huggingface_hub import HfApi, snapshot_download, login

print("Environment setup complete.")


# ===== SECTION 2: Hugging Face auth (from env) =====
hf_token = os.environ.get("HF_TOKEN")
if hf_token is None or not hf_token.strip():
    hf_token = None
    print("HF_TOKEN not set; skipping upload to Hugging Face.")
else:
    login(token=hf_token, add_to_git_credential=False)
    print("Hugging Face authentication completed using HF_TOKEN environment variable.")

target_model_repo = os.environ.get("HF_TARGET_MODEL_REPO")
create_space = os.environ.get("HF_CREATE_SPACE", "false").lower() == "true"
target_space_repo = os.environ.get("HF_TARGET_SPACE_REPO")

print(f"HF_TARGET_MODEL_REPO: {target_model_repo}")
print(f"HF_CREATE_SPACE: {create_space}")
print(f"HF_TARGET_SPACE_REPO: {target_space_repo}")


def _load_unsloth_model(model_name: str, seq_len: int, four_bit: bool = True):
    """Try vLLM-backed fast inference first, then gracefully fall back if unavailable."""
    try:
        return FastLanguageModel.from_pretrained(
            model_name=model_name,
            max_seq_length=seq_len,
            dtype=dtype,
            load_in_4bit=four_bit,
            fast_inference=True,
        )
    except ImportError as exc:
        msg = str(exc).lower()
        if "vllm" in msg or "fast_inference" in msg:
            print("vLLM is unavailable in this runtime. Falling back to fast_inference=False.")
            return FastLanguageModel.from_pretrained(
                model_name=model_name,
                max_seq_length=seq_len,
                dtype=dtype,
                load_in_4bit=four_bit,
                fast_inference=False,
            )
        raise


# ===== SECTION 3: Load base model with Unsloth on T4 =====
print("Loading model with Unsloth FastLanguageModel...")

try:
    model, tokenizer = _load_unsloth_model(
        model_name=MODEL_ID,
        seq_len=max_seq_length,
        four_bit=load_in_4bit,
    )
except RuntimeError as exc:
    message = str(exc).lower()
    if "out of memory" in message or "cuda" in message:
        print("OOM/CUDA load error detected.")
        print("Hint: lower max_seq_length (for example 1024 or 1536) and retry.")
    raise

first_param_device = next(model.parameters()).device
print(f"Model loaded. First parameter device: {first_param_device}")

if torch.cuda.is_available() and str(first_param_device).startswith("cuda"):
    print("Confirmed model is on CUDA.")
else:
    print("WARNING: Model does not appear to be on CUDA.")


# ===== SECTION 4: (Optional) LoRA merging / preparation =====
def _has_lora_adapters(loaded_model) -> bool:
    for name, _ in loaded_model.named_parameters():
        if "lora_" in name.lower():
            return True
    return False


lora_adapters_detected = _has_lora_adapters(model)
print(f"LoRA adapters detected: {lora_adapters_detected}")

# Toggle ENABLE_LORA_MERGE=True if you want to force merge adapters before export.
if lora_adapters_detected and ENABLE_LORA_MERGE:
    print("LoRA adapters detected and merge enabled. Attempting Unsloth merge flow...")
    merge_tmp_dir = pathlib.Path("/kaggle/working/output/_tmp_merged_for_export")
    if merge_tmp_dir.exists():
        shutil.rmtree(merge_tmp_dir)
    merge_tmp_dir.mkdir(parents=True, exist_ok=True)

    if hasattr(model, "save_pretrained_merged"):
        model.save_pretrained_merged(str(merge_tmp_dir), tokenizer, save_method="merged_4bit")
        model, tokenizer = _load_unsloth_model(
            model_name=str(merge_tmp_dir),
            seq_len=max_seq_length,
            four_bit=True,
        )
        print("LoRA merge completed via save_pretrained_merged(..., save_method='merged_4bit').")
    else:
        print("save_pretrained_merged is unavailable in this runtime. Skipping merge.")
elif lora_adapters_detected:
    print("LoRA adapters are present, but merge is disabled. Set ENABLE_LORA_MERGE=True to merge.")
else:
    print("No adapters detected; source model appears already merged.")


# ===== SECTION 5: Export Unsloth 4-bit model locally =====
print(f"Preparing export directory: {output_dir}")


def _clear_dir(path: pathlib.Path) -> None:
    for item in path.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


existing_files = list(output_dir.glob("*")) if output_dir.exists() else []
if output_dir.exists() and existing_files and not OVERWRITE:
    print("Output directory already populated and OVERWRITE=False. Reusing existing export.")
else:
    output_dir.mkdir(parents=True, exist_ok=True)
    if OVERWRITE and output_dir.exists():
        _clear_dir(output_dir)

    print("Saving model/tokenizer artifacts...")
    save_success = False

    if hasattr(model, "save_pretrained_merged"):
        try:
            model.save_pretrained_merged(str(output_dir), tokenizer, save_method="merged_4bit")
            save_success = True
            print("Saved using Unsloth merged_4bit export.")
        except Exception as exc:
            print(f"save_pretrained_merged(merged_4bit) failed, falling back to save_pretrained: {exc}")

    if not save_success:
        model.save_pretrained(str(output_dir))
        tokenizer.save_pretrained(str(output_dir))
        print("Saved using fallback save_pretrained methods.")

    # Ensure tokenizer files are present.
    tokenizer.save_pretrained(str(output_dir))

    # Save generation config if available.
    gen_cfg = getattr(model, "generation_config", None)
    if gen_cfg is not None:
        try:
            gen_cfg.save_pretrained(str(output_dir))
            print("Saved generation_config.json")
        except Exception as exc:
            print(f"generation_config save skipped: {exc}")

print("Validating exported artifacts...")
all_files = sorted([p.name for p in output_dir.glob("*")])
for name in all_files:
    print(" -", name)

has_model_weights = any((output_dir / f).exists() for f in ["model.safetensors", "pytorch_model.bin", "adapter_model.safetensors"])
has_config = (output_dir / "config.json").exists()
has_tokenizer = any((output_dir / f).exists() for f in ["tokenizer.json", "tokenizer.model", "tokenizer_config.json"])

if not has_model_weights:
    print("WARNING: No obvious model weight file found in export directory.")
if not has_config:
    print("WARNING: config.json not found in export directory.")
if not has_tokenizer:
    print("WARNING: tokenizer files not found in export directory.")


# ===== SECTION 6: Sanity-check inference on T4 =====
print("Reloading saved model for sanity check...")
reloaded_model, reloaded_tokenizer = _load_unsloth_model(
    model_name=str(output_dir),
    seq_len=max_seq_length,
    four_bit=True,
)
FastLanguageModel.for_inference(reloaded_model)

prompt = "Explain how to solve a quadratic equation by factoring for a Grade 11 student."
streamer = TextStreamer(reloaded_tokenizer, skip_prompt=True, skip_special_tokens=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
inputs = reloaded_tokenizer(prompt, return_tensors="pt").to(device)

print("Generating sanity-check response...")
_ = reloaded_model.generate(
    **inputs,
    max_new_tokens=160,
    do_sample=True,
    temperature=0.7,
    top_p=0.9,
    use_cache=True,
    streamer=streamer,
)
print("\nSanity-check inference completed.")


# ===== SECTION 7: Model card (README.md) =====
usage_repo = target_model_repo or "<HF_TARGET_MODEL_REPO>"
readme_path = output_dir / "README.md"

readme_text = f"""---
library_name: transformers
pipeline_tag: text-generation
license: apache-2.0
base_model:
    - {MODEL_ID}
tags:
    - unsloth
    - bitsandbytes
    - 4-bit
    - education
    - mathematics
    - deped
language:
    - en
---

# DepEd Math Qwen2.5 7B (Unsloth 4-bit BnB)

## Source model
- {MODEL_ID}

## Stack
- Unsloth + bitsandbytes 4-bit

## Export environment
- Exported on Kaggle NVIDIA T4 16GB GPU

## Intended use
- DepEd math tutoring for Grades 11-12

## Unsloth usage example
```python
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained(
    \"{usage_repo}\",
    max_seq_length=2048,
    dtype=None,
    load_in_4bit=True,
    fast_inference=True,
)
```

## Optional transformers usage example
```python
from transformers import AutoTokenizer, AutoModelForCausalLM

tokenizer = AutoTokenizer.from_pretrained(\"{usage_repo}\")
model = AutoModelForCausalLM.from_pretrained(\"{usage_repo}\", device_map=\"auto\")
```

## Notes for local RTX 4050 6GB
- Use 4-bit weights.
- Keep max_seq_length moderate (for example 2048).
- Use small batch_size (1 or a few).
- Monitor VRAM usage during generation.
"""

readme_path.write_text(readme_text, encoding="utf-8")
print(f"Wrote model card: {readme_path}")


# ===== SECTION 8: Upload to Hugging Face model repo =====
api = HfApi(token=hf_token) if hf_token else HfApi()

if hf_token and target_model_repo:
    print("Creating/updating Hugging Face model repo...")
    api.create_repo(
        repo_id=target_model_repo,
        repo_type="model",
        exist_ok=True,
    )

    try:
        if hasattr(api, "upload_large_folder"):
            print("Using upload_large_folder for resilient upload...")
            api.upload_large_folder(
                folder_path=str(output_dir),
                repo_id=target_model_repo,
                repo_type="model",
            )
        else:
            print("upload_large_folder not available; using upload_folder...")
            api.upload_folder(
                folder_path=str(output_dir),
                repo_id=target_model_repo,
                repo_type="model",
            )

        print(f"Model repo URL: https://huggingface.co/{target_model_repo}")
    except Exception as exc:
        print(f"Model upload failed: {exc}")
        raise
else:
    print("Skipping model upload because HF_TOKEN and/or HF_TARGET_MODEL_REPO is missing.")


# ===== SECTION 9: Optional tiny Space linking to the model =====
if hf_token and create_space and target_space_repo:
    if not target_model_repo:
        print("Skipping Space creation because HF_TARGET_MODEL_REPO is missing.")
    else:
        print("Creating/updating Hugging Face Space...")
        api.create_repo(
            repo_id=target_space_repo,
            repo_type="space",
            space_sdk="gradio",
            exist_ok=True,
        )

        space_dir.mkdir(parents=True, exist_ok=True)

        app_py = f'''import gradio as gr

MODEL_REPO = "{target_model_repo}"
MODEL_URL = f"https://huggingface.co/{{MODEL_REPO}}"
DOWNLOAD_SNIPPET = f"from huggingface_hub import snapshot_download\\nsnapshot_download(repo_id=\\"{{MODEL_REPO}}\\")"

with gr.Blocks(title="DepEd Math Model Download Helper") as demo:
    gr.Markdown("# DepEd Math Qwen2.5 7B Download Helper")
    gr.Markdown(f"Model repo URL: [{{MODEL_URL}}]({{MODEL_URL}})")
    gr.Markdown("Weights live in the model repo, not in this Space.")
    gr.Code(value=DOWNLOAD_SNIPPET, language="python", label="Python download snippet")
    one_liner = f"python -c \\\"from huggingface_hub import snapshot_download; snapshot_download(repo_id='{{MODEL_REPO}}')\\\""
    gr.Textbox(value=one_liner, label="Optional one-line command", interactive=False)

if __name__ == "__main__":
    demo.launch()
'''

        requirements_txt = """gradio
unsloth
transformers
huggingface_hub
"""

        (space_dir / "app.py").write_text(app_py, encoding="utf-8")
        (space_dir / "requirements.txt").write_text(requirements_txt, encoding="utf-8")

        api.upload_folder(
            folder_path=str(space_dir),
            repo_id=target_space_repo,
            repo_type="space",
        )

        print(f"Space URL: https://huggingface.co/spaces/{target_space_repo}")
else:
    print("Skipping Space creation. Requirements: HF_TOKEN set, HF_CREATE_SPACE=true, HF_TARGET_SPACE_REPO set.")


# ===== SECTION 10: Download & local RTX 4050 usage notes =====
# Later, you can download the exported model repo anywhere with:
# from huggingface_hub import snapshot_download
# snapshot_download(repo_id="<HF_TARGET_MODEL_REPO>")

# Local RTX 4050 (Windows + CUDA) example with Unsloth:
# from unsloth import FastLanguageModel
# model, tokenizer = FastLanguageModel.from_pretrained(
#     "<HF_TARGET_MODEL_REPO>",
#     max_seq_length=2048,
#     dtype=None,
#     load_in_4bit=True,
#     fast_inference=True,
# )

# Notes:
# - 7B in 4-bit should generally fit on RTX 4050 6GB with modest context (~2k),
#   batch_size=1, and without oversized KV cache settings.
# - If OOM occurs, reduce max_seq_length and/or shorten prompts.

print("Notebook workflow completed.")
