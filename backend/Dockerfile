FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
PYTHONUNBUFFERED=1 \
PIP_DISABLE_PIP_VERSION_CHECK=1 \
PIP_NO_CACHE_DIR=1 \
HF_HOME=/data/.huggingface \
HUGGINGFACE_HUB_CACHE=/data/.huggingface/hub \
TRANSFORMERS_CACHE=/data/.huggingface/transformers \
MPLCONFIGDIR=/tmp/matplotlib \
CURRICULUM_SOURCE_REPO_ID=Deign86/mathpulse-api-v3test

WORKDIR /app

# Keep OS layer minimal and wheel-friendly.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependency layer first for better cache reuse.
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install --prefer-binary --retries 5 -r /app/requirements.txt

# Copy only runtime sources to reduce invalidation surface.
COPY main.py /app/main.py
COPY startup_validation.py /app/startup_validation.py
COPY analytics.py /app/analytics.py
COPY automation_engine.py /app/automation_engine.py
COPY services /app/services
COPY models /app/models
COPY config /app/config
COPY rag /app/rag
COPY routes /app/routes
COPY scripts/ingest_curriculum.py /app/scripts/ingest_curriculum.py
COPY startup.sh /app/startup.sh

EXPOSE 7860

CMD ["/bin/sh", "/app/startup.sh"]
