# Kaggle LLM API Job

This Kaggle script-kernel bundle serves a merged model through vLLM's OpenAI-compatible API and exposes a public URL via cloudflared.

## Locked Serving Model

- Model: Deign86/deped-math-qwen2.5-7b-deped-math-merged
- Adapter inference is disabled by design.

## Files

- `serve_kaggle_llm_api.py`: Kaggle runtime script that launches vLLM and cloudflared.
- `kernel-metadata.json`: Kaggle kernel metadata for GPU execution.

## Runtime Output Markers

The script prints markers for monitor parsing:

- `PUBLIC_URL: <url>`
- `OPENAI_BASE_URL: <url>/v1`
- `MODEL_ID: Deign86/deped-math-qwen2.5-7b-deped-math-merged`

It also writes runtime status to `/kaggle/working/api_runtime_status.json`.
