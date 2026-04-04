# Kaggle Merge Job: DepEd Qwen2.5 LoRA -> Standalone fp16

This folder is a Kaggle-ready bundle for merging a LoRA adapter into a standalone fp16 model and publishing to Hugging Face.
Only the checkpoint-700 adapter is valid for this workflow.

## Fixed model IDs
- Base model: `Qwen/Qwen2.5-7B-Instruct`
- Adapter repo: `Deign86/deped-math-qwen2.5-7b-checkpoint-700-lora`
- Merged repo: `Deign86/deped-math-qwen2.5-7b-deped-math-merged`

## Files
- `merge_deped_qwen_lora.py`: notebook-friendly merge + upload script (`# %%` cells)
- `kernel-metadata.json`: Kaggle kernel metadata
- `model_card_template.md`: model card template for merged repository

## Kaggle CLI commands (exact)
```bash
kaggle kernels init -p ./kaggle_merge_job
kaggle kernels push -p ./kaggle_merge_job
```

## Hugging Face CLI commands (exact)
```bash
hf auth login
huggingface-cli repo create Deign86/deped-math-qwen2.5-7b-deped-math-merged --type model
hf upload Deign86/deped-math-qwen2.5-7b-deped-math-merged ./deped-math-merged . --commit-message "Add merged fp16 model from 700-step LoRA checkpoint"
```

If the repository already exists, treat that as success and continue to upload.

## Python fallback upload
```python
from huggingface_hub import HfApi

api = HfApi()
api.create_repo(
    repo_id="Deign86/deped-math-qwen2.5-7b-deped-math-merged",
    repo_type="model",
    exist_ok=True,
)
api.upload_folder(
    repo_id="Deign86/deped-math-qwen2.5-7b-deped-math-merged",
    repo_type="model",
    folder_path="deped-math-merged",
    path_in_repo=".",
    commit_message="Add merged fp16 model from 700-step LoRA checkpoint",
)
```

## Adding adapter or artifact inputs to Kaggle metadata
Edit `kernel-metadata.json`:
- `dataset_sources`: add dataset IDs like `owner/dataset-name`
- `kernel_sources`: add prior kernel output IDs like `owner/kernel-slug`
- `model_sources`: add Kaggle model sources if used in your setup

## Token handling
- Kaggle notebook: set secret/env `HF_TOKEN`
- Local orchestration: set `HF_TOKEN` for fallback `HfApi` upload
