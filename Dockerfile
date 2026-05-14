# ============================================================
# MathPulse AI - Full-Stack Development Dockerfile
# Runs both the React frontend (dev server) and FastAPI backend
# ============================================================

# --- Stage 1: Backend ---
FROM python:3.11-slim AS backend

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["/bin/sh", "/app/startup.sh"]

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

# VITE_* environment variables — must be available at build time for Vite to inline them.
# Pass via --build-arg when building:
#   docker build --build-arg VITE_FIREBASE_API_KEY=xxx --build-arg VITE_FIREBASE_AUTH_DOMAIN=yyy ...
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_DATABASE_URL
ARG VITE_API_URL
ARG VITE_ENABLE_IMPORT_GROUNDED_QUIZ
ARG VITE_ENABLE_IMPORT_GROUNDED_LESSON
ARG VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS
ARG VITE_ENABLE_ASYNC_GENERATION
ARG VITE_CHAT_STREAM_IDLE_TIMEOUT_MS
ARG VITE_CHAT_STREAM_TOTAL_TIMEOUT_MS
ARG VITE_QUIZ_BATTLE_STRICT_GENERATION_AUDIT
ARG VITE_HF_MODEL_ID
ARG VITE_HF_USERNAME

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