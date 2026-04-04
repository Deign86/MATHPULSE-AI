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
import importlib
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
        from services.inference_client import InferenceClient, create_default_client  # noqa
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
        from huggingface_hub import InferenceClient as HFInferenceClient  # noqa
        logger.info("   ✓ HuggingFace Hub imports OK")

        inference_provider = os.getenv("INFERENCE_PROVIDER", "hf_inference").strip().lower()
        if inference_provider == "local_peft":
            importlib.import_module("transformers")
            importlib.import_module("peft")
            importlib.import_module("accelerate")
            importlib.import_module("torch")
            logger.info("   ✓ local_peft deps import OK (transformers, peft, accelerate, torch)")

            load_in_4bit = os.getenv("LORA_LOAD_IN_4BIT", "false").strip().lower() in {"1", "true", "yes", "on"}
            if load_in_4bit:
                try:
                    importlib.import_module("bitsandbytes")
                    logger.info("   ✓ bitsandbytes import OK")
                except (ImportError, OSError, RuntimeError) as exc:
                    raise StartupError(
                        "❌ local_peft dependency error: bitsandbytes is required when LORA_LOAD_IN_4BIT=true"
                    ) from exc
        
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
    
    # CRITICAL: HF_TOKEN for inference
    hf_token = os.environ.get("HF_TOKEN")
    api_key = os.environ.get("HUGGING_FACE_API_TOKEN")
    legacy_api_key = os.environ.get("HUGGINGFACE_API_TOKEN")
    if not hf_token and not api_key and not legacy_api_key:
        logger.warning(
            "⚠  WARNING: HF_TOKEN is not set as an environment variable.\n"
            "   On HF Spaces, this should be set as a SPACE SECRET.\n"
            "   AI inference will fail without this token.\n"
            "   Use: python set-hf-secrets.py to set the secret."
        )
    else:
        logger.info("   ✓ HF_TOKEN/HUGGING_FACE_API_TOKEN/HUGGINGFACE_API_TOKEN is set")
    
    # Check inference provider config
    inference_provider = os.getenv("INFERENCE_PROVIDER", "hf_inference")
    logger.info(f"   ✓ INFERENCE_PROVIDER: {inference_provider}")
    
    # Check model IDs
    chat_model = os.getenv("INFERENCE_CHAT_MODEL_ID") or os.getenv("INFERENCE_MODEL_ID") or "Qwen/Qwen2.5-7B-Instruct"
    logger.info(f"   ✓ Chat model configured: {chat_model}")

    if inference_provider.strip().lower() == "local_peft":
        lora_base_model_id = os.getenv("LORA_BASE_MODEL_ID", "").strip()
        lora_adapter_model_id = os.getenv("LORA_ADAPTER_MODEL_ID", "").strip()
        if not lora_base_model_id:
            raise StartupError("❌ LORA_BASE_MODEL_ID is required when INFERENCE_PROVIDER=local_peft")
        if not lora_adapter_model_id:
            raise StartupError("❌ LORA_ADAPTER_MODEL_ID is required when INFERENCE_PROVIDER=local_peft")

        logger.info(f"   ✓ local_peft base model: {lora_base_model_id}")
        logger.info(f"   ✓ local_peft adapter model: {lora_adapter_model_id}")
        logger.info(f"   ✓ local_peft load_in_4bit: {os.getenv('LORA_LOAD_IN_4BIT', 'false')}")
        logger.info(f"   ✓ local_peft device_map: {os.getenv('LORA_DEVICE_MAP', 'auto')}")
        logger.info(f"   ✓ local_peft dtype: {os.getenv('LORA_DTYPE', 'float16')}")
    
    logger.info("✅ Environment variables OK")


def validate_config_files() -> None:
    """Verify config files exist and are readable."""
    logger.info("🔍 Validating configuration files...")
    
    config_paths = [
        "config/models.yaml",
        "backend/config/models.yaml",
    ]
    
    for config_path in config_paths:
        full_path = Path(config_path)
        if not full_path.exists():
            logger.warning(f"   ⚠ Config file not found: {config_path}")
        else:
            try:
                with open(full_path, 'r') as f:
                    content = f.read()
                    if not content.strip():
                        raise StartupError(
                            f"❌ CONFIG ERROR: {config_path} is empty!\n"
                            f"   This will cause model routing to fail.\n"
                        )
                    logger.info(f"   ✓ {config_path} is readable and non-empty")
            except Exception as e:
                raise StartupError(
                    f"❌ CONFIG ERROR: Cannot read {config_path}:\n"
                    f"   {e}\n"
                ) from e
    
    logger.info("✅ Configuration files OK")


def validate_file_structure() -> None:
    """Verify critical backend files exist."""
    logger.info("🔍 Validating file structure...")
    required_path_sets = [
        ["main.py", "backend/main.py"],
        ["services/inference_client.py", "backend/services/inference_client.py"],
        ["analytics.py", "backend/analytics.py"],
        ["automation_engine.py", "backend/automation_engine.py"],
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

        if getattr(client, "provider", "") == "local_peft":
            if not getattr(client, "lora_base_model_id", ""):
                raise StartupError("❌ local_peft missing LORA_BASE_MODEL_ID")
            if not getattr(client, "lora_adapter_model_id", ""):
                raise StartupError("❌ local_peft missing LORA_ADAPTER_MODEL_ID")
            logger.info(
                "   ✓ local_peft runtime config: base=%s adapter=%s",
                client.lora_base_model_id,
                client.lora_adapter_model_id,
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
