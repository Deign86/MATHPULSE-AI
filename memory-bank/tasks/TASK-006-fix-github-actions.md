# TASK-006: Fix GitHub Actions

## Status
- **Status**: [ ] In Progress
- **Created**: May 3, 2026

## Goal
Fix failing GitHub Actions workflows and get all checks green on the default branch.

## Scope
- Identify failing workflows and root causes
- Implement code/config fixes
- Verify CI passes locally where applicable

## Notes
- Main branch is protected; use PR-based fixes
- Deploy to HF Spaces is currently failing due to large binary files in history
