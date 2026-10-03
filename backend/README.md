---
title: MathPulse AI API
emoji: 🧮
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# MathPulse AI Backend

FastAPI backend for the MathPulse AI educational platform.

## Models Used
Model routing is defined in `backend/config/models.yaml` (see `AGENTS.md`). The `prod` profile uses deepseek-reasoner for RAG lessons and deepseek-chat for other tasks; the backend selects models through `services/inference_client.py`.

## API Endpoints
- `POST /api/chat` - AI Math Tutor conversation
- `POST /api/predict-risk` - Student risk classification
- `POST /api/predict-risk/batch` - Batch risk prediction
- `POST /api/learning-path` - Generate personalized learning paths
- `POST /api/analytics/daily-insight` - Daily classroom insights
- `POST /api/upload/class-records` - Smart document parsing

## Curriculum PDFs
The curriculum PDFs are not meant to live in git. Upload them to a Hugging Face dataset or Space repo and set:

- `CURRICULUM_SOURCE_REPO_ID`
- `CURRICULUM_SOURCE_REPO_TYPE` (`dataset` or `space`)
- `CURRICULUM_SOURCE_REVISION`

At build/startup, the backend downloads those PDFs into `datasets/curriculum/` before running ingestion.
