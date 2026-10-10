# backend/config/

## Responsibility
Holds model routing and AI API cost configuration: `models.yaml` defines generation/embedding models and task policies; `ai_pricing.py` exposes DeepSeek pricing tiers.

## Design
- `models.yaml` is declarative: `models`, `model_capabilities`, `routing.task_model_map`, `task_fallback_model_map`, and `task_provider_map`.
- `deepseek-v4-pro` is sequential-only and enabled for reasoning tasks; fallback routes use `deepseek-flash`. Embeddings use `BAAI/bge-small-en-v1.5` and are configured separately from generation.
- `DEEPSEEK_PRICING` contains per-million-token cache-hit, cache-miss, and output rates; promotional expiry is compared with UTC at call time.
- `get_active_pricing(model_id)` and `get_full_pricing(model_id)` return pricing dictionaries and raise `ValueError` for unknown IDs.

## Flow
Model-routing consumers resolve a task to provider/model and fallback using the YAML mappings; pricing consumers pass model IDs to the pricing helpers, which select active promotion or full rates.

## Integration
`backend/main.py` and inference/model-routing services consume model configuration; RAG uses the embedding model for curriculum retrieval. Cost/reporting code imports `config.ai_pricing.get_active_pricing` or `get_full_pricing`; YAML embedding configuration is explicitly separate from the admin-swappable generation pipeline.
