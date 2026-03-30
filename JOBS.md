# Hugging Face Jobs for MathPulse AI

Use Hugging Face Jobs for offline evaluation and synthetic data generation with controlled cost.

## 0. Single-session launcher

Use the unified launcher to run either local jobs or HF Jobs CLI commands:

python jobs/hf_jobs_launcher.py --job eval --mode local --subset algebra --limit 100

python jobs/hf_jobs_launcher.py --job variants --mode local --limit 200 --variants-per-item 3

HF CLI mode (dry-run first):

python jobs/hf_jobs_launcher.py --job eval --mode hf --flavor cpu-basic --dry-run \
  --env HF_TOKEN=<token> --env INFERENCE_PRO_ENABLED=true

## 1. Prerequisites

1. Hugging Face PRO token in environment as HF_TOKEN.
2. Repository code available in the job image/workspace.
3. Private dataset repo name set if pushing outputs.

## 2. Evaluate a model

Run locally or in a job container:

python jobs/eval_math_model.py \
  --model Qwen/Qwen2.5-Math-7B-Instruct \
  --dataset datasets/eval/grade11_12/problem_bank.jsonl \
  --subset algebra \
  --limit 100 \
  --metrics-csv jobs/output/eval_metrics.csv

Metrics written per row:
- accuracy
- step_correctness
- solution_completeness

## 3. Generate synthetic variants

python jobs/generate_variants.py \
  --model Qwen/Qwen2.5-Math-7B-Instruct \
  --dataset datasets/eval/grade11_12/problem_bank.jsonl \
  --subset all \
  --limit 200 \
  --variants-per-item 3 \
  --output-jsonl datasets/synthetic/variants/generated_variants.jsonl

## 4. Recommended HF Job environment variables

- INFERENCE_PROVIDER=hf_inference
- INFERENCE_PRO_ENABLED=true
- INFERENCE_PRO_PRIORITY_TASKS=eval_generation,variant_generation
- HF_TOKEN=<hf_token>
- INFERENCE_MODEL_ID=Qwen/Qwen2.5-Math-7B-Instruct
- INFERENCE_MAX_RETRIES=3
- INFERENCE_BACKOFF_SEC=1.5
- INFERENCE_BACKGROUND_TIMEOUT_SEC=120
- INFERENCE_BACKGROUND_MAX_RETRIES=3
- INFERENCE_BACKGROUND_BACKOFF_SEC=1.75

## 5. Input and output artifacts

Inputs:
- datasets/eval/grade11_12/problem_bank.jsonl

Outputs:
- jobs/output/eval_metrics.csv
- datasets/synthetic/variants/generated_variants.jsonl

## 6. Privacy controls

- Store synthetic or anonymized records only.
- Do not include student name, email, LRN, or section IDs in dataset artifacts.
- Run dataset sync scripts with privacy checks enabled (default).

## 7. Telemetry and routing tags

- Eval jobs emit task_type=eval_generation and request_tag=<run_id>.
- Variant jobs emit task_type=variant_generation and request_tag=<run_id>.
- These tags are logged by backend/services/inference_client.py for cost attribution and fallback analysis.
