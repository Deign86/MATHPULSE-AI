# ============================================================
# MathPulse AI - Full-Stack Development Dockerfile
# Runs both the React frontend (dev server) and FastAPI backend
# ============================================================

# --- Stage 1: Backend ---
FROM python:3.11-slim AS backend

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY scripts/ingest_curriculum.py /app/scripts/ingest_curriculum.py
COPY scripts/startup.sh /app/scripts/startup.sh
COPY datasets/curriculum/ /app/datasets/curriculum/

EXPOSE 8000

CMD ["/bin/sh", "/app/scripts/startup.sh"]

# --- Stage 2: Frontend ---
FROM node:20-alpine AS frontend

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Stage 3: Production build ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 4: Production serve (Nginx) ---
FROM nginx:alpine AS production

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
