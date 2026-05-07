#!/usr/bin/env python3
"""
Pre-deployment validation script for MathPulse AI backend.

This script runs BEFORE deployment to catch issues early and prevent
restart loops on HF Spaces.

Usage:
    python backend/pre_deploy_check.py

Exit codes:
    0: All checks passed, safe to deploy
    1: Critical issue found, deployment should be blocked
"""

import sys
import os

# Add repo root to path (for services/ delegation) AND backend to path
_repo_root = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_repo_root)
_backend = _repo_root

# Add in order: parent first (so services/ can delegate), then backend (for when services/__init__.py tries to import)
if _parent not in sys.path:
    sys.path.insert(0, _parent)
if _backend not in sys.path:
    sys.path.insert(0, _backend)

def main() -> int:
    """Run pre-deployment checks."""
    print("=" * 70)
    print("🔍 PRE-DEPLOYMENT VALIDATION - Backend will run these checks")
    print("=" * 70)
    print()
    
    try:
        # Import the validation module
        from backend.startup_validation import (
            validate_imports,
            validate_environment,
            validate_config_files,
            validate_file_structure,
            validate_inference_client_config,
        )
        
        print("Running pre-deployment checks...\n")
        
        validate_file_structure()
        print()
        
        validate_imports()
        print()
        
        validate_environment()
        print()
        
        validate_config_files()
        print()
        
        validate_inference_client_config()
        print()
        
        print("=" * 70)
        print("✅ PRE-DEPLOYMENT VALIDATION PASSED")
        print("=" * 70)
        print()
        print("Backend is ready for deployment to HF Spaces.")
        print()
        
        return 0
        
    except Exception as e:
        print()
        print("=" * 70)
        print("❌ PRE-DEPLOYMENT VALIDATION FAILED")
        print("=" * 70)
        print()
        print(f"Error: {e}")
        print()
        print("🛑 BLOCK DEPLOYMENT - Fix errors above before pushing to main branch")
        print()
        
        return 1


if __name__ == "__main__":
    sys.exit(main())
