# backend/config/

## Responsibility
Holds model routing and AI API cost configuration: `models.yaml` defines generation/embedding models and task policies; `ai_pricing.py` exposes Claude pricing tiers.

## Design
- `models.yaml` is declarative: `models`, `model_capabilities`, `routing.task_model_map`, and `task_fallback_model_map`.
- With no `MODEL_PROFILE`, the map sends RAG lessons and risk narratives to `claude-opus-5-5` (adaptive thinking). Every profile exports `INFERENCE_MODEL_ID=claude-haiku-5-5`, which overrides the whole map; only `prod` keeps RAG lessons on Opus, via `HF_RAG_MODEL_ID`. Fallback routes use `claude-haiku-5-5`. Embeddings use `BAAI/bge-small-en-v1.5` and are configured separately from generation.
- The pricing table holds per-million-token rates for each model.
- `get_full_pricing(model_id)` returns a copy of the model's rates and raises `ValueError` for unknown IDs.

## Flow
Model-routing consumers resolve a task to a model and its fallback using the YAML mappings; pricing consumers pass model IDs to `get_full_pricing`.

## Integration
`backend/main.py` and inference/model-routing services consume model configuration; RAG uses the embedding model for curriculum retrieval. `services.cost_calculator` imports `config.ai_pricing.get_full_pricing`; YAML embedding configuration is explicitly separate from the admin-swappable generation pipeline.
