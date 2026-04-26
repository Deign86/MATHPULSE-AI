FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/data/.huggingface \
    HUGGINGFACE_HUB_CACHE=/data/.huggingface/hub \
    TRANSFORMERS_CACHE=/data/.huggingface/transformers \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install --prefer-binary --retries 5 -r /app/requirements.txt

COPY . /app

EXPOSE 7860

CMD ["/bin/sh", "/app/startup.sh"]