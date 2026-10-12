from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from services.ai_client import SUPPORTED_MODELS
from services.inference_client import (
    set_runtime_model_profile, set_runtime_model_override,
    reset_runtime_overrides, get_current_runtime_config, _MODEL_PROFILES,
)

router = APIRouter(prefix="/api/admin/model-config", tags=["admin"])

ALLOWED_OVERRIDE_KEYS = {
    "INFERENCE_MODEL_ID", "INFERENCE_CHAT_MODEL_ID",
    "HF_QUIZ_MODEL_ID", "HF_RAG_MODEL_ID", "INFERENCE_LOCK_MODEL_ID",
}


def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class ProfileSwitchRequest(BaseModel):
    profile: str


class OverrideRequest(BaseModel):
    key: str
    value: str


@router.get("")
def get_model_config(_admin=Depends(require_admin)):
    return {
        **get_current_runtime_config(),
        "availableProfiles": list(_MODEL_PROFILES.keys()),
        "profileDescriptions": {
            "dev":    "claude-haiku-5-5 everywhere - fast, $0.10/M input, $0.50/M output",
            "budget": "claude-haiku-5-5 for all tasks - minimal cost",
            "prod":   "claude-opus-5-5 for RAG lessons only ($4/M input, $20/M output), claude-haiku-5-5 for everything else - best lesson quality",
        },
    }


@router.post("/profile")
def switch_profile(req: ProfileSwitchRequest, _admin=Depends(require_admin)):
    try:
        set_runtime_model_profile(req.profile)
        return {"success": True, "applied": get_current_runtime_config()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/override")
def set_override(req: OverrideRequest, _admin=Depends(require_admin)):
    if req.key not in ALLOWED_OVERRIDE_KEYS:
        raise HTTPException(status_code=400, detail=f"Key '{req.key}' is not overridable.")
    if req.value not in SUPPORTED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.value}' is not supported. Use one of: {', '.join(sorted(SUPPORTED_MODELS))}.",
        )
    set_runtime_model_override(req.key, req.value)
    return {"success": True, "applied": get_current_runtime_config()}


@router.delete("/reset")
def reset_to_env(_admin=Depends(require_admin)):
    reset_runtime_overrides()
    return {"success": True, "current": get_current_runtime_config()}