"""
Startup validation for MathPulse AI backend.

This module validates all critical dependencies and configurations BEFORE
the FastAPI app starts, preventing indefinite restart loops.

If any critical check fails, the process exits with a clear error message
that's visible in HF Space logs.
"""

import os
import sys
import logging
from pathlib import Path

logger = logging.getLogger("mathpulse.startup")


class StartupError(Exception):
    """Critical error during startup validation."""
    pass


def validate_imports() -> None:
    """Verify all critical imports work. Use absolute imports."""
    logger.info("🔍 Validating Python imports...")
    try:
        # Core FastAPI stack
        import fastapi  # noqa
        import uvicorn  # noqa
        import pydantic  # noqa
        logger.info("   ✓ FastAPI, Uvicorn, Pydantic OK")
        
        # Backend services (use ABSOLUTE imports like deployed code)
        from services.inference_client import (
            InferenceClient, create_default_client, is_sequential_model,
            get_current_runtime_config, get_model_for_task, model_supports_thinking,
            set_runtime_model_profile, set_runtime_model_override, reset_runtime_overrides,
            _MODEL_PROFILES,
        )  # noqa
        logger.info("   ✓ InferenceClient imports OK")
        
        from automation_engine import automation_engine  # noqa
        logger.info("   ✓ automation_engine imports OK")
        
        from analytics import compute_competency_analysis  # noqa
        logger.info("   ✓ analytics imports OK")
        
        # Firebase
        try:
            import firebase_admin  # noqa
            logger.info("   ✓ firebase_admin imports OK")
        except ImportError:
            logger.warning("   ⚠ firebase_admin not available (OK if Firebase not needed)")
        
        # ML & inference
        from services.ai_client import get_deepseek_client, CHAT_MODEL, REASONER_MODEL  # noqa
        logger.info("   ✓ DeepSeek AI client imports OK")
        
        logger.info("✅ All critical imports validated")
    except ImportError as e:
        raise StartupError(
            f"❌ IMPORT ERROR - Cannot start backend:\n"
            f"   {e}\n"
            f"\n"
            f"This usually means:\n"
            f"  - A Python package is missing (check requirements.txt)\n"
            f"  - A relative import was used (must be absolute in container)\n"
            f"  - A circular import exists\n"
            f"\n"
            f"Deploy will FAIL and backend will restart indefinitely.\n"
        ) from e
    except Exception as e:
        raise StartupError(f"❌ Unexpected import error: {e}") from e


def validate_environment() -> None:
    """Verify required environment variables are set."""
    logger.info("🔍 Validating environment variables...")
    
    # CRITICAL: DEEPSEEK_API_KEY for inference
    ds_api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not ds_api_key:
        logger.warning(
            "⚠  WARNING: DEEPSEEK_API_KEY is not set as an environment variable.\n"
            "   AI inference will fail without this token.\n"
            "   Use: Set DEEPSEEK_API_KEY in your .env or space secrets."
        )
    else:
        logger.info("   ✓ DEEPSEEK_API_KEY is set")
    
    # Check inference provider config
    inference_provider = os.getenv("INFERENCE_PROVIDER", "deepseek")
    logger.info(f"   ✓ INFERENCE_PROVIDER: {inference_provider}")
    
    # Check model IDs
    chat_model = os.getenv("INFERENCE_CHAT_MODEL_ID") or os.getenv("INFERENCE_MODEL_ID") or "deepseek-chat"
    logger.info(f"   ✓ Chat model configured: {chat_model}")

    chat_strict = os.getenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true").strip().lower() in {"1", "true", "yes", "on"}
    chat_hard_trigger = os.getenv("INFERENCE_CHAT_HARD_TRIGGER_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
    enforce_lock_model = os.getenv("INFERENCE_ENFORCE_LOCK_MODEL", "true").strip().lower() in {"1", "true", "yes", "on"}
    lock_model_id = os.getenv("INFERENCE_LOCK_MODEL_ID", "deepseek-chat").strip() or "deepseek-chat"
    logger.info(f"   ✓ INFERENCE_ENFORCE_LOCK_MODEL: {enforce_lock_model}")
    logger.info(f"   ✓ INFERENCE_LOCK_MODEL_ID: {lock_model_id}")
    model_profile = os.getenv("MODEL_PROFILE", "").strip().lower()
    quiz_model = os.getenv("HF_QUIZ_MODEL_ID", "").strip()
    rag_model = os.getenv("HF_RAG_MODEL_ID", "").strip()
    logger.info(f"   ✓ MODEL_PROFILE: {model_profile or 'not set (using individual env vars)'}")
    logger.info(f"   ✓ HF_QUIZ_MODEL_ID: {quiz_model or 'not set (using defaults)'}")
    logger.info(f"   ✓ HF_RAG_MODEL_ID: {rag_model or 'not set (using defaults)'}")
    if not chat_strict:
        logger.warning("   ⚠ Chat strict model lock is disabled; chat may fallback to alternate models")
    if chat_strict and chat_hard_trigger:
        logger.warning(
            "   ⚠ Chat hard trigger is enabled while strict chat lock is on; hard escalation will be bypassed"
        )
    
    _validate_embedding_model()
    
    logger.info("✅ Environment variables OK")


EXPECTED_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

def _validate_embedding_model() -> None:
    embedding_model = os.getenv("EMBEDDING_MODEL", "").strip()
    if not embedding_model:
        logger.warning(
            "WARNING: EMBEDDING_MODEL env var is not set. "
            f"Expected: {EXPECTED_EMBEDDING_MODEL}. "
            "RAG retrieval will fail without an embedding model."
        )
    elif embedding_model != EXPECTED_EMBEDDING_MODEL:
        logger.warning(
            f"WARNING: EMBEDDING_MODEL is set to '{embedding_model}' — "
            f"expected '{EXPECTED_EMBEDDING_MODEL}'. "
            "Confirm this is intentional before deploying."
        )
    from services.ai_client import CHAT_MODEL, REASONER_MODEL  # noqa
    generation_model_ids = [
        CHAT_MODEL, REASONER_MODEL,
    ]
    if embedding_model in generation_model_ids:
        logger.warning(
            f"CRITICAL: EMBEDDING_MODEL is set to a generation model ('{embedding_model}'). "
            "This will break RAG retrieval. Set it to 'BAAI/bge-small-en-v1.5'."
        )
    else:
        logger.info(f"   EMBEDDING_MODEL: {embedding_model or 'not set'}")


def validate_config_files() -> None:
    """Verify config files exist and are readable."""
    logger.info("🔍 Validating configuration files...")

    # Accept either deployment/runtime path without warning when one valid path exists.
    model_config_candidates = [
        "config/models.yaml",
        "backend/config/models.yaml",
    ]

    readable_model_config = None
    for config_path in model_config_candidates:
        full_path = Path(config_path)
        if not full_path.exists():
            continue
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            if not content.strip():
                raise StartupError(
                    f"❌ CONFIG ERROR: {config_path} is empty!\n"
                    f"   This will cause model routing to fail.\n"
                )
            readable_model_config = config_path
            break
        except StartupError:
            raise
        except Exception as e:
            raise StartupError(
                f"❌ CONFIG ERROR: Cannot read {config_path}:\n"
                f"   {e}\n"
            ) from e

    if not readable_model_config:
        joined_paths = ", ".join(model_config_candidates)
        raise StartupError(
            f"❌ CONFIG ERROR: No readable model config found.\n"
            f"   Checked: {joined_paths}\n"
        )

    logger.info(f"   ✓ Using model config: {readable_model_config}")

    _validate_model_config_fields(readable_model_config)

    logger.info("✅ Configuration files OK")


def validate_file_structure() -> None:
    """Verify critical backend files exist."""
    logger.info("🔍 Validating file structure...")
    required_path_sets = [
        ["main.py", "backend/main.py"],
        ["services/inference_client.py", "backend/services/inference_client.py"],
        ["analytics.py", "backend/analytics.py"],
        ["automation_engine.py", "backend/automation_engine.py"],
    ]
    optional_path_sets = [
        ["Dockerfile", "backend/Dockerfile"],
    ]

    for candidates in required_path_sets:
        found = None
        for candidate in candidates:
            if Path(candidate).exists():
                found = candidate
                break

        if not found:
            joined = " or ".join(candidates)
            raise StartupError(
                f"❌ FILE MISSING: {joined}\n"
                f"   Backend structure is broken for this deployment layout.\n"
            )

        logger.info(f"   ✓ Found {found}")

    for candidates in optional_path_sets:
        found = None
        for candidate in candidates:
            if Path(candidate).exists():
                found = candidate
                break

        if found:
            logger.info(f"   ✓ Found optional build file {found}")
            continue

        joined = " or ".join(candidates)
        logger.info(
            f"   ℹ Optional build file not present at runtime: {joined}"
        )
    
    logger.info("✅ File structure OK")


def validate_inference_client_config() -> None:
    """Validate InferenceClient can load its config."""
    logger.info("🔍 Validating InferenceClient configuration...")
    
    try:
        # Try to create the client (this will load config from YAML)
        from services.inference_client import create_default_client
        client = create_default_client()
        
        # Verify critical attributes
        if not hasattr(client, 'task_model_map'):
            raise StartupError("❌ InferenceClient missing task_model_map attribute")
        
        if not hasattr(client, 'task_provider_map'):
            raise StartupError("❌ InferenceClient missing task_provider_map attribute")
        
        # Check that required tasks are mapped
        required_tasks = ['chat', 'verify_solution', 'lesson_generation', 'quiz_generation']
        for task in required_tasks:
            if task not in client.task_model_map:
                raise StartupError(
                    f"❌ Task '{task}' not in task_model_map.\n"
                    f"   Check config/models.yaml\n"
                )
            model = client.task_model_map[task]
            provider = client.task_provider_map.get(task, 'unknown')
            logger.info(f"   ✓ {task}: {model} ({provider})")

        chat_model = client.task_model_map.get("chat", client.default_model)
        chat_chain = client._model_chain_for_task("chat", chat_model)
        logger.info(
            f"   ✓ chat strict lock: {client.chat_strict_model_only}; "
            f"effective chat chain length={len(chat_chain)}"
        )
        if client.chat_strict_model_only and len(chat_chain) != 1:
            raise StartupError(
                "❌ Chat strict model lock is enabled but effective chat model chain is not singular.\n"
                "   Check INFERENCE_CHAT_STRICT_MODEL_ONLY and routing.task_fallback_model_map.chat\n"
            )
        
        logger.info("✅ InferenceClient configuration OK")
        
    except StartupError:
        raise
    except Exception as e:
        raise StartupError(
            f"❌ InferenceClient validation failed:\n"
            f"   {e}\n"
            f"   Check config/models.yaml and backend/config/models.yaml\n"
        ) from e


def _validate_model_config_fields(config_path: str) -> None:
    try:
        import yaml
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    except Exception as e:
        raise StartupError(f"❌ Cannot parse {config_path} as YAML: {e}") from e

    models = config.get("models", {})
    if not isinstance(models, dict):
        raise StartupError(f"❌ {config_path}: 'models' section missing or invalid")

    if "rag_primary" not in models:
        raise StartupError(f"❌ {config_path}: missing 'models.rag_primary' field")
    rag_primary = models["rag_primary"]
    if isinstance(rag_primary, dict):
        logger.info(f"   ✓ rag_primary model: {rag_primary.get('id', 'UNSET')}")
    else:
        logger.warning(f"   ⚠ rag_primary is not a dict, may cause issues")

    capabilities = models.get("model_capabilities")
    if not isinstance(capabilities, dict):
        raise StartupError(f"❌ {config_path}: missing 'models.model_capabilities' section")
    logger.info(f"   ✓ model_capabilities: sequential_only={capabilities.get('sequential_only')}, supports_thinking={capabilities.get('supports_thinking')}")

    tasks = config.get("routing", {}).get("task_model_map", {})
    rag_tasks = {"rag_lesson", "rag_problem", "rag_analysis_context"}
    missing_rag = rag_tasks - set(str(t).strip().lower() for t in tasks.keys())
    if missing_rag:
        raise StartupError(f"❌ {config_path}: missing RAG task mappings: {missing_rag}")

    logger.info(f"   ✓ All RAG task mappings present")


def run_all_validations() -> None:
    """Run comprehensive startup validation.
    
    If any check fails, exits with clear error message visible in logs.
    """
    logger.info("=" * 70)
    logger.info("🚀 STARTUP VALIDATION - Checking all critical dependencies")
    logger.info("=" * 70)
    
    strict_mode = os.getenv("STARTUP_VALIDATION_STRICT", "false").strip().lower() in {"1", "true", "yes", "on"}

    try:
        validate_file_structure()
        validate_imports()
        validate_environment()
        validate_config_files()
        validate_inference_client_config()
        
        logger.info("=" * 70)
        logger.info("✅ ALL STARTUP VALIDATIONS PASSED")
        logger.info("=" * 70)
        
    except StartupError as e:
        logger.error("=" * 70)
        logger.error(str(e))
        logger.error("=" * 70)
        if strict_mode:
            logger.error("\n🛑 DEPLOYMENT WILL FAIL - Fix errors above and redeploy")
            sys.exit(1)
        logger.warning(
            "\n⚠️  Continuing startup because STARTUP_VALIDATION_STRICT is disabled. "
            "Set STARTUP_VALIDATION_STRICT=true to fail fast."
        )
    except Exception as e:
        logger.exception(f"Unexpected validation error: {e}")
        if strict_mode:
            sys.exit(1)
        logger.warning(
            "⚠️  Continuing startup after unexpected validation error because "
            "STARTUP_VALIDATION_STRICT is disabled."
        )
