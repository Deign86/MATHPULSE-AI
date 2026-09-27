# Backend Validation and Deployment Safety

## Purpose

Backend deployments can fail or enter restart loops when imports, secrets, configuration, or file structure are invalid. This document describes repository validation and startup safeguards without coupling GitHub Actions to any hosting provider.

## Validation layers

### Layer 1: Local validation

Run before pushing backend changes:

```bash
python backend/pre_deploy_check.py
```

Checks include:

- Python imports and package structure
- `config/models.yaml` validity
- Required files and directories
- Inference client configuration
- Provider environment warnings

Run backend tests locally:

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

### Layer 2: Repository CI

`.github/workflows/ci.yml` validates frontend, backend, and Firebase Functions on pull requests and non-main pushes. CI does not deploy backend infrastructure.

The frontend PWA deployment workflow is separate:

```text
.github/workflows/deploy-frontend.yml
```

It builds and deploys the repository-owned frontend to Firebase Hosting. It does not use Hugging Face credentials or deploy Hugging Face Spaces.

### Layer 3: Backend startup validation

When the selected backend platform starts the container, `backend/startup_validation.py` runs first:

- Exits with a clear error when a critical check fails
- Prevents opaque restart loops
- Leaves deployment ownership with the selected backend platform

## Common failure scenarios

### Import errors

Use absolute backend imports, for example:

```python
from services.inference_client import InferenceClient
```

Run `python backend/pre_deploy_check.py` before deployment.

### Missing configuration

Verify:

```text
backend/config/models.yaml
backend/.env.example
```

Do not copy private credentials into frontend `.env` files or `VITE_*` variables.

### Missing provider credentials

Configure required backend provider credentials in the selected backend runtime. Never hardcode them or pass them to the browser.

### CORS failures

Set explicit backend origins:

```env
CORS_ORIGINS=https://mathpulse-ai-2026.web.app
```

Do not use wildcard CORS with credentials in production.

## Deployment flow

```text
Local changes
    ↓
pull request / push
    ↓
Repository CI validates frontend, backend, and functions
    ↓
PASS → deploy selected platform through its approved workflow or CLI
FAIL → deployment blocked; inspect CI logs
    ↓
Backend platform runs startup_validation.py
    ↓
PASS → FastAPI starts
FAIL → clear startup error; no opaque restart loop
```

## Monitoring

- Inspect GitHub Actions **CI** for repository validation.
- Inspect **Deploy MathPulse PWA** for Firebase Hosting frontend deployment.
- Inspect logs in the selected backend platform for FastAPI startup and runtime errors.
- Run `python backend/pre_deploy_check.py` locally before retrying a backend deployment.

## Files

- `backend/startup_validation.py` — backend startup checks
- `backend/pre_deploy_check.py` — local pre-deployment checks
- `.github/workflows/ci.yml` — repository validation
- `.github/workflows/deploy-frontend.yml` — Firebase Hosting PWA deployment
- `docs/PWA.md` — frontend PWA architecture and deployment guide

## Provider migration note

The dedicated GitHub Actions workflow that synchronized secrets, pushed backend files, and enforced model settings on Hugging Face Spaces has been removed. GitHub Actions no longer deploys or manages Hugging Face Spaces. Legitimate backend/provider code and manual migration scripts may remain until the backend hosting provider is separately migrated.
